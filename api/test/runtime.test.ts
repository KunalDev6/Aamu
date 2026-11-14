import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Pool } from 'pg';
import { createRuntimeApp, tokenHash } from '../src/runtime/app.ts';
import { readRuntimeConfig, ConfigurationError } from '../src/runtime/config.ts';
import { createPostgresRepository } from '../src/runtime/postgres.ts';
import type { GoalSnapshot, LiveStore, MorningPayload, PartnerEvent, RemoteGoal, Repository, Wake } from '../src/runtime/contracts.ts';
import type { GoalService } from '../src/goals/service.ts';

// Injection fixtures only. The production listener requires actual PG and Valkey.
function fixtures() {
  const identities = new Map<string, string>(); const partners = new Map<string, string>();
  const revisions = new Map<string, number>();
  const codes = new Map<string, string>(); const wakes = new Map<string, Wake>();
  const saved: { userId: string; goals: RemoteGoal[] }[] = [];
  const morningWrites: { userId: string; date: string; payload: MorningPayload }[] = [];
  const listeners = new Set<(userId: string, event: PartnerEvent) => void>();
  const published: { userId: string; event: PartnerEvent }[] = [];
  let modelCalls = 0;
  const repository: Repository = {
    async health() {}, async createUser(userId, hash) { identities.set(hash, userId); },
    async userForTokenHash(hash) { return identities.get(hash) ?? null; },
    async goalsRevision(userId) { return revisions.get(userId) ?? 0; },
    async replaceGoals(userId, snapshot) {
      const current = revisions.get(userId) ?? 0;
      if (snapshot.baseRevision !== current || snapshot.revision <= current) return { applied: false, revision: current };
      saved.push({ userId, goals: snapshot.goals }); revisions.set(userId, snapshot.revision);
      return { applied: true, revision: snapshot.revision };
    },
    async saveMorning(userId, date, payload) { morningWrites.push({ userId, date, payload }); return revisions.get(userId) ?? 0; },
    async partnerFor(id) { return partners.get(id) ?? null; },
    async pair(id, other) {
      if (id === other || partners.has(id) || partners.has(other)) return 'conflict';
      partners.set(id, other); partners.set(other, id); return 'paired';
    },
    async recordUp(userId, wake) { const key = `${userId}:${wake.localDate}`; if (wakes.has(key)) return false; wakes.set(key, wake); return true; },
    async isUp(userId, date) { return wakes.has(`${userId}:${date}`); },
  };
  const live: LiveStore = {
    async health() {}, async createCode(code, owner) { if (codes.has(code)) return false; codes.set(code, owner); return true; },
    async codeOwner(code) { return codes.get(code) ?? null; },
    async consumeCode(code, owner) { if (codes.get(code) !== owner) return false; codes.delete(code); return true; },
    async publish(userId, event) { published.push({ userId, event }); for (const listener of listeners) listener(userId, event); },
    onEvent(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
  const service: GoalService = {
    async shrink() { modelCalls++; return { verdict: null, steps: null, source: 'fallback', error: 'suggestions_unavailable' }; },
    async hints() { modelCalls++; return { status: 'unavailable' }; },
  };
  return { repository, live, service, identities, saved, morningWrites, published, codes, partners, modelCalls: () => modelCalls };
}
const options = (f: ReturnType<typeof fixtures>) => ({ service: f.service, repository: f.repository, live: f.live, pairCodeTtlSeconds: 300 }); // Test-only selected TTL.
async function user(app: Awaited<ReturnType<typeof createRuntimeApp>>) {
  const response = await app.inject({ method: 'POST', url: '/users', payload: {} });
  assert.equal(response.statusCode, 201); const value = response.json() as { userId: string; token: string };
  return { ...value, headers: { authorization: `Bearer ${value.token}` } };
}
const steps = { tiny: 'Open a book.', small: 'Read a page.', full: 'Read a chapter.' };
const goal = { id: 'phone-opaque-id', goalText: 'Read', steps };
const snapshot = (goals: RemoteGoal[], revision = 1, baseRevision = 0): GoalSnapshot => ({ goals, revision, baseRevision });

test('runtime fails safely without store configuration; pairing expiry has no default', async () => {
  await assert.rejects(readRuntimeConfig({}), error => error instanceof ConfigurationError && error.message.includes('DATABASE_URL') && error.message.includes('VALKEY_URL'));
  const config = await readRuntimeConfig({ DATABASE_URL: 'postgres://example:private@db.invalid/db?sslmode=disable', VALKEY_URL: 'rediss://cache.invalid:123', DEMO_MODE: 'false' });
  assert.equal(config.pairCodeTtlSeconds, null); assert.equal(new URL(config.databaseUrl).searchParams.has('sslmode'), false);
  const configured = { DATABASE_URL: 'postgres://db.invalid/db', VALKEY_URL: 'rediss://cache.invalid', DEMO_MODE: 'false' };
  assert.equal((await readRuntimeConfig({ ...configured, PAIR_CODE_TTL_SECONDS: '0' })).pairCodeTtlSeconds, 0);
  assert.equal((await readRuntimeConfig({ ...configured, PAIR_CODE_TTL_SECONDS: '300' })).pairCodeTtlSeconds, 300);
  await assert.rejects(readRuntimeConfig({ ...configured, PAIR_CODE_TTL_SECONDS: '-1' }), ConfigurationError);
  await assert.rejects(readRuntimeConfig({ DATABASE_URL: 'postgres://db.invalid/db', VALKEY_URL: 'redis://private@cache.invalid' }), error => error instanceof ConfigurationError && !error.message.includes('private'));
});

test('users receive random opaque tokens; repository stores hashes and authenticated routes reject forged tokens', async t => {
  const f = fixtures(); const app = await createRuntimeApp(options(f)); t.after(() => app.close());
  const first = await user(app); const second = await user(app);
  assert.notEqual(first.token, second.token); assert.match(first.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(f.identities.get(tokenHash(first.token)), first.userId); assert.equal(f.identities.has(first.token), false);
  const rejected = await app.inject({ method: 'POST', url: '/goals/shrink', headers: { authorization: `Bearer ${'x'.repeat(43)}` }, payload: { goalText: 'Read' } });
  assert.equal(rejected.statusCode, 401); assert.equal(f.modelCalls(), 0);
  assert.equal((await app.inject({ method: 'POST', url: '/users', payload: { name: 'not accepted' } })).statusCode, 400);
});

test('goal snapshot validates privacy boundary and passes only the authenticated user to storage', async t => {
  const f = fixtures(); const app = await createRuntimeApp(options(f)); t.after(() => app.close()); const owner = await user(app);
  const saved = await app.inject({ method: 'PUT', url: '/goals', headers: owner.headers, payload: snapshot([goal]) });
  assert.equal(saved.statusCode, 200); assert.deepEqual(f.saved, [{ userId: owner.userId, goals: [goal] }]);
  for (const invalid of [{ ...goal, localOnly: true }, { ...goal, latestVerdict: 'needs_support' }, { ...goal, goalText: 'I intend to harm myself' }]) {
    assert.equal((await app.inject({ method: 'PUT', url: '/goals', headers: owner.headers, payload: snapshot([invalid]) })).statusCode, 400);
  }
  assert.equal(f.saved.length, 1);
  assert.equal((await app.inject({ method: 'PUT', url: '/goals', headers: owner.headers, payload: snapshot([], 2, 1) })).statusCode, 200);
  assert.deepEqual(f.saved.at(-1)?.goals, []);
});

test('database errors and unhealthy services never expose credentials or return success', async t => {
  const f = fixtures(); f.repository.replaceGoals = async () => { throw Error('postgres://private-secret@database:5432/records'); };
  f.live.health = async () => { throw Error('cache-private-secret'); };
  const app = await createRuntimeApp(options(f)); t.after(() => app.close()); const owner = await user(app);
  const failed = await app.inject({ method: 'PUT', url: '/goals', headers: owner.headers, payload: snapshot([goal]) });
  assert.equal(failed.statusCode, 503); assert.deepEqual(failed.json(), { error: 'service_unavailable' });
  assert.doesNotMatch(failed.body, /secret|postgres|records/);
  assert.equal((await app.inject({ url: '/health' })).statusCode, 503);
});

test('opaque private-goal morning IDs are accepted with null text; unknown personal fields are rejected', async t => {
  const f = fixtures(); const app = await createRuntimeApp(options(f)); t.after(() => app.close()); const owner = await user(app);
  const body: MorningPayload = { scheduledAt: 10, firstRingAt: 10, upAt: 20, minutesToUp: 0, minutesBeforeAlarm: null,
    snoozeCount: 0, voiceState: 'failed', speechShare: null, speechOnsetMs: null, stepSize: 'tiny', stepDone: null,
    stepOffered: true, stepRemoved: false, level: 'easy', goalId: 'unknown-phone-only-goal', stepText: null, utcOffsetMinutes: 120 };
  assert.equal((await app.inject({ method: 'PUT', url: '/mornings/2026-11-14', headers: owner.headers, payload: body })).statusCode, 200);
  assert.equal(f.morningWrites[0].payload.stepText, null); assert.equal(f.morningWrites[0].payload.goalId, body.goalId);
  assert.equal((await app.inject({ method: 'PUT', url: '/mornings/2026-11-14', headers: owner.headers, payload: { ...body, audio: 'not accepted' } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'PUT', url: '/mornings/2026-02-31', headers: owner.headers, payload: body })).statusCode, 400);
  assert.equal((await app.inject({ method: 'PUT', url: '/mornings/2026-11-14', headers: owner.headers, payload: { ...body, stepText: 'Read one sentence' } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'PUT', url: '/mornings/2026-11-14', headers: owner.headers, payload: { ...body, goalSnapshotRevision: 1 } })).statusCode, 400);
});

test('morning text is bound to the locked user snapshot even after erasure and clean re-addition of the same goal ID', async () => {
  let revision = 0; const goals = new Set<string>(); let storedText: unknown = null; let storedData = '';
  let locked = false;
  const client = { async query(sql: string, values: unknown[] = []) {
    if (sql === 'BEGIN') locked = false;
    if (sql.startsWith('SELECT goals_revision')) { assert.match(sql, /FOR UPDATE/); locked = true; return { rows: [{ goals_revision: String(revision) }] }; }
    if (sql.startsWith('UPDATE aamu_users SET goals_revision')) revision = values[1] as number;
    if (sql.startsWith('DELETE FROM aamu_goals')) for (const id of goals) if (!(values[1] as string[]).includes(id)) goals.delete(id);
    if (sql.startsWith('UPDATE aamu_mornings')) storedText = null;
    if (sql.startsWith('INSERT INTO aamu_goals')) goals.add(values[1] as string);
    if (sql.startsWith('INSERT INTO aamu_mornings')) {
      assert.equal(locked, true); assert.match(sql, /CASE WHEN EXISTS/);
      storedText = goals.has(values[2] as string) ? values[3] : null; storedData = values[4] as string;
    }
    return { rows: [], rowCount: 1 };
  }, release() {} };
  const pool = { connect: async () => client, query: client.query, end: async () => {} } as unknown as Pool;
  const repository = createPostgresRepository(pool);
  const morning: MorningPayload = { scheduledAt: 10, firstRingAt: 10, upAt: 20, minutesToUp: 0, minutesBeforeAlarm: null,
    snoozeCount: 0, voiceState: 'failed', speechShare: null, speechOnsetMs: null, stepSize: 'small', stepDone: true,
    stepOffered: true, stepRemoved: false, level: 'easy', goalId: goal.id, stepText: 'Original approved step', goalSnapshotRevision: 1 };
  await repository.replaceGoals('user', snapshot([goal]));
  assert.equal(await repository.saveMorning('user', '2026-11-14', morning), 1); assert.equal(storedText, morning.stepText);
  await repository.replaceGoals('user', snapshot([], 2, 1)); assert.equal(storedText, null);
  await repository.replaceGoals('user', snapshot([{ ...goal, goalText: 'Clean reworded goal' }], 3, 2));
  assert.equal(await repository.saveMorning('user', '2026-11-14', morning), 3); assert.equal(storedText, null);
  await repository.saveMorning('user', '2026-11-14', { ...morning, stepText: 'Current approved step', goalSnapshotRevision: 3 });
  assert.equal(storedText, 'Current approved step');
  assert.equal(JSON.parse(storedData).stepDone, true); assert.doesNotMatch(storedData, /goalSnapshotRevision|stepText|localOnly/);
});

test('pairing creates a real code, consumes it on join, and preserves identity-backed pairing across app recreation', async t => {
  const f = fixtures(); const app = await createRuntimeApp(options(f)); t.after(() => app.close());
  const a = await user(app); const b = await user(app);
  const created = await app.inject({ method: 'POST', url: '/partner/match', headers: a.headers, payload: { mode: 'code' } });
  const code = created.json().code; assert.match(code, /^[A-Z2-9]{6}$/);
  assert.equal((await app.inject({ method: 'POST', url: '/partner/match', headers: b.headers, payload: { mode: 'code', code } })).statusCode, 200);
  assert.equal(f.codes.has(code), false);
  const reopened = await createRuntimeApp(options(f)); t.after(() => reopened.close());
  const state = await reopened.inject({ url: '/partner?localDate=2026-11-14', headers: a.headers });
  assert.deepEqual(state.json(), { paired: true, partnerUpToday: false, partnerQuietDays: null });
  assert.doesNotMatch(state.body, new RegExp(b.userId));
});

test('unset code expiry blocks only code creation; first-pair conflicts never replace an existing pair', async t => {
  const f = fixtures(); const app = await createRuntimeApp({ ...options(f), pairCodeTtlSeconds: null }); t.after(() => app.close());
  const a = await user(app); const b = await user(app); const c = await user(app);
  assert.equal((await app.inject({ url: '/health' })).statusCode, 200);
  assert.deepEqual((await app.inject({ method: 'POST', url: '/partner/match', headers: a.headers, payload: { mode: 'code' } })).json(), { error: 'pairing_not_configured' });
  await f.repository.pair(a.userId, b.userId); f.codes.set('ABC234', c.userId);
  assert.equal((await app.inject({ method: 'POST', url: '/partner/match', headers: a.headers, payload: { mode: 'code', code: 'ABC234' } })).statusCode, 409);
  assert.equal(await f.repository.partnerFor(a.userId), b.userId);
});

test('until-used code permits only one successful redemption even for simultaneous identical joins', async t => {
  const f = fixtures(); const originalPair = f.repository.pair;
  f.repository.pair = async (id, other) => f.partners.get(id) === other ? 'paired' : originalPair(id, other);
  const app = await createRuntimeApp({ ...options(f), pairCodeTtlSeconds: 0 }); t.after(() => app.close());
  const owner = await user(app); const joining = await user(app);
  const created = await app.inject({ method: 'POST', url: '/partner/match', headers: owner.headers, payload: { mode: 'code' } });
  assert.equal(created.statusCode, 200); const code = created.json().code;
  let reads = 0; let release: () => void = () => {};
  const bothRead = new Promise<void>(resolve => { release = resolve; });
  f.live.codeOwner = async value => {
    const found = f.codes.get(value) ?? null; if (++reads === 2) release();
    await bothRead; return found;
  };
  const submit = () => app.inject({ method: 'POST', url: '/partner/match', headers: joining.headers, payload: { mode: 'code', code } });
  const results = await Promise.all([submit(), submit()]);
  assert.deepEqual(results.map(result => result.statusCode).sort(), [200, 400]);
  assert.equal(f.codes.has(code), false); assert.equal(f.partners.get(joining.userId), owner.userId);
  assert.equal((await submit()).statusCode, 400);
});

test('authenticated wake reaches only the paired socket; duplicate up is not republished and polling survives socket closure', async t => {
  const f = fixtures(); const app = await createRuntimeApp(options(f)); t.after(() => app.close());
  const a = await user(app); const b = await user(app); await f.repository.pair(a.userId, b.userId);
  await app.ready(); const socket = await app.injectWS('/live', { headers: b.headers });
  const received = once(socket, 'message');
  const wake = { localDate: '2026-11-14', upAt: 1234, utcOffsetMinutes: 120 };
  assert.equal((await app.inject({ method: 'POST', url: '/partner/up', headers: a.headers, payload: wake })).statusCode, 200);
  const [message] = await received; assert.deepEqual(JSON.parse(message.toString()), { type: 'partner_up', localDate: wake.localDate });
  socket.terminate(); await once(socket, 'close');
  await app.inject({ method: 'POST', url: '/partner/up', headers: a.headers, payload: wake });
  assert.equal(f.published.length, 1); assert.equal(f.published[0].userId, b.userId);
  assert.equal((await app.inject({ url: '/partner?localDate=2026-11-14', headers: b.headers })).json().partnerUpToday, true);
  assert.equal((await app.inject({ url: '/partner?localDate=2026-11-15', headers: b.headers })).json().partnerUpToday, false);
});

test('Postgres replacement locks the user, redacts historical text, omits private markers and rolls back on error', async () => {
  const calls: { sql: string; values?: unknown[] }[] = []; let released = 0; let fail = false;
  const client = { async query(sql: string, values?: unknown[]) {
    calls.push({ sql, values }); if (fail && sql.startsWith('INSERT INTO aamu_goals')) throw Error('storage unavailable');
    return { rows: sql.startsWith('SELECT goals_revision') ? [{ goals_revision: '0' }] : [], rowCount: 0 };
  }, release() { released++; } };
  const pool = { async connect() { return client; }, query: client.query, async end() {} } as unknown as Pool;
  const repository = createPostgresRepository(pool);
  await repository.replaceGoals('opaque-user', snapshot([goal]));
  assert.equal(calls[0].sql, 'BEGIN'); assert.match(calls[1].sql, /FOR UPDATE/);
  const redaction = calls.find(call => call.sql.startsWith('UPDATE aamu_mornings'))!;
  assert.match(redaction.sql, /step_text = NULL/); assert.deepEqual(redaction.values, ['opaque-user', [goal.id]]);
  assert.equal(calls.at(-1)?.sql, 'COMMIT'); assert.equal(released, 1);
  assert.ok(calls.every(call => !call.sql.includes(goal.goalText)));
  calls.length = 0; fail = true;
  await assert.rejects(repository.replaceGoals('opaque-user', snapshot([goal])));
  assert.equal(calls.at(-1)?.sql, 'ROLLBACK'); assert.equal(released, 2);
});

test('revision-only endpoint exposes no goal data and rejects a delayed old PUT after a newer omission', async t => {
  const f = fixtures(); const originalReplace = f.repository.replaceGoals;
  let release: () => void = () => {}; let started: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; }); const waiting = new Promise<void>(resolve => { started = resolve; });
  f.repository.replaceGoals = async (userId, value) => {
    if (value.revision === 1) { started(); await gate; }
    return originalReplace(userId, value);
  };
  const app = await createRuntimeApp(options(f)); t.after(() => app.close()); const owner = await user(app);
  assert.equal((await app.inject({ url: '/goals/revision' })).statusCode, 401);
  assert.deepEqual((await app.inject({ url: '/goals/revision', headers: owner.headers })).json(), { revision: 0 });
  const older = app.inject({ method: 'PUT', url: '/goals', headers: owner.headers, payload: snapshot([goal], 1, 0) });
  await waiting;
  assert.equal((await app.inject({ method: 'PUT', url: '/goals', headers: owner.headers, payload: snapshot([], 2, 0) })).statusCode, 200);
  release(); assert.equal((await older).statusCode, 409);
  assert.deepEqual(f.saved.at(-1)?.goals, []);
  assert.deepEqual((await app.inject({ url: '/goals/revision', headers: owner.headers })).json(), { revision: 2 });
});

test('Postgres revision check rejects both lower revisions and an old higher revision with a stale base before touching goal text', async () => {
  const calls: string[] = [];
  const client = { async query(sql: string) {
    calls.push(sql); return { rows: sql.startsWith('SELECT goals_revision') ? [{ goals_revision: '8' }] : [], rowCount: 0 };
  }, release() {} };
  const repository = createPostgresRepository({ async connect() { return client; } } as unknown as Pool);
  for (const value of [snapshot([goal], 7, 8), snapshot([goal], 100, 7)]) {
    calls.length = 0;
    assert.deepEqual(await repository.replaceGoals('opaque-user', value), { applied: false, revision: 8 });
    assert.equal(calls.length, 3); assert.equal(calls[0], 'BEGIN'); assert.match(calls[1], /goals_revision.*FOR UPDATE/); assert.equal(calls[2], 'COMMIT');
  }
});
