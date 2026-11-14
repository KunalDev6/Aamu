import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { createRuntimeApp } from '../src/runtime/app.ts';
import { ConfigurationError, readRuntimeConfig } from '../src/runtime/config.ts';
import { createPostgresClinicRepository } from '../src/runtime/clinic-postgres.ts';
import { createDemoDataRepository, type DemoDataRepository } from '../src/demo/data-postgres.ts';
import { demoClinicPatients } from '../src/demo/clinic-fixtures.ts';
import { classifyClinic } from '../../shared/clinic/engine.ts';
import type { ClinicPatient, ClinicRepository } from '../src/runtime/clinic-contracts.ts';
import type { GoalSnapshot, LiveStore, MorningPayload, Repository } from '../src/runtime/contracts.ts';
import type { GoalService } from '../src/goals/service.ts';

const dashboardToken = 'test-dashboard-only-token-32-characters';
const now = Date.parse('2026-11-14T12:00:00Z');
const morning: MorningPayload = { scheduledAt: 10, firstRingAt: 10, upAt: 20, minutesToUp: 0,
  minutesBeforeAlarm: null, snoozeCount: 0, voiceState: 'unavailable', speechShare: null, speechOnsetMs: null,
  stepSize: 'small', stepDone: true, stepOffered: true, stepRemoved: false, level: 'easy', goalId: 'opaque', stepText: null };
const snapshot: GoalSnapshot = { revision: 1, baseRevision: 0,
  goals: [{ id: 'opaque', goalText: 'Read', steps: { tiny: 'Open a book', small: 'Read one page', full: 'Read a chapter' } }] };
function fixture() {
  const identities = new Map<string, string>(); const connected = new Map<string, number | null>();
  const realWrites: string[] = []; const demoWrites: string[] = []; const revisions = { real: 0, demo: 0 };
  const repository: Repository = {
    async health() {}, async createUser(id, hash) { identities.set(hash, id); }, async userForTokenHash(hash) { return identities.get(hash) ?? null; },
    async goalsRevision() { return revisions.real; },
    async replaceGoals(_id, value) { realWrites.push('goals'); revisions.real = value.revision; return { applied: true, revision: value.revision }; },
    async saveMorning() { realWrites.push('morning'); return revisions.real; },
    async partnerFor() { return null; }, async pair() { return 'conflict'; }, async recordUp() { return true; }, async isUp() { return false; },
  };
  const data: DemoDataRepository = {
    async goalsRevision() { return revisions.demo; },
    async replaceGoals(_id, value) { demoWrites.push('goals'); revisions.demo = value.revision; return { applied: true, revision: value.revision }; },
    async saveMorning() { demoWrites.push('morning'); return revisions.demo; },
  };
  const clinic: ClinicRepository = {
    async setSharing(id, enabled) { if (enabled) { if (!connected.has(id)) connected.set(id, null); } else connected.delete(id); },
    async requestCallback(id, timestamp) { if (!connected.has(id)) return null; if (connected.get(id) === null) connected.set(id, timestamp); return connected.get(id)!; },
    async patients() { return [...connected].map(([id, callbackRequestedAt]) => ({ id: `presenter-${id}`, presenter: true,
      startedOn: '2026-11-01', mornings: [{ localDate: '2026-11-14', level: 'easy', upAt: 20, stepDone: true }], lastClassified: null, callbackRequestedAt })); },
  };
  const live: LiveStore = { async health() {}, async createCode() { return false; }, async codeOwner() { return null; },
    async consumeCode() { return false; }, async publish() {}, onEvent() { return () => {}; } };
  const service: GoalService = { async shrink() { throw Error('No model expected'); }, async hints() { throw Error('No model expected'); } };
  const options = { repository, live, service, pairCodeTtlSeconds: 0,
    demo: { enabled: true, dashboardToken, repository: clinic, dataRepository: data, now: () => now } };
  return { options, connected, realWrites, demoWrites, revisions, clinic };
}
async function user(app: Awaited<ReturnType<typeof createRuntimeApp>>) {
  const result = (await app.inject({ method: 'POST', url: '/users', payload: {} })).json();
  return { id: result.userId as string, headers: { authorization: `Bearer ${result.token}` } };
}
const dashboard = { 'x-demo-dashboard-token': dashboardToken };

test('local demo preview preflights allow the namespace header without bypassing authentication', async t => {
  const f = fixture(); const app = await createRuntimeApp(f.options); t.after(() => app.close());
  for (const origin of ['http://localhost:8081', 'http://127.0.0.1:8082']) {
    for (const method of ['GET', 'PUT']) {
      const response = await app.inject({ method: 'OPTIONS', url: method === 'GET' ? '/goals/revision' : '/goals',
        headers: { origin, 'access-control-request-method': method,
          'access-control-request-headers': 'authorization,content-type,x-aamu-demo' } });
      assert.equal(response.statusCode, 204);
      assert.equal(response.headers['access-control-allow-origin'], origin);
      assert.equal(response.headers.vary, 'Origin');
      assert.deepEqual(String(response.headers['access-control-allow-headers']).split(',').map(value => value.trim()),
        ['authorization', 'content-type', 'x-aamu-demo']);
      assert.equal(response.headers['access-control-allow-credentials'], undefined);
    }
    assert.equal((await app.inject({ url: '/goals/revision', headers: { origin, 'x-aamu-demo': 'true' } })).statusCode, 401);
  }
  assert.deepEqual(f.realWrites, []); assert.deepEqual(f.demoWrites, []);
});

test('preview CORS stays disabled for other origins and outside demo mode', async t => {
  for (const enabled of [true, false]) {
    const f = fixture(); const app = await createRuntimeApp({ ...f.options, demo: { ...f.options.demo, enabled } });
    t.after(() => app.close());
    const origins = enabled
      ? ['https://localhost:8081', 'http://localhost.attacker.invalid:8081', 'http://192.168.1.2:8081']
      : ['http://localhost:8081', 'http://127.0.0.1:8082'];
    for (const origin of origins) {
      const response = await app.inject({ method: 'OPTIONS', url: '/goals', headers: { origin,
        'access-control-request-method': 'PUT', 'access-control-request-headers': 'x-aamu-demo' } });
      assert.equal(response.headers['access-control-allow-origin'], undefined);
      assert.equal(response.headers['access-control-allow-headers'], undefined);
      assert.notEqual(response.statusCode, 204);
    }
  }
});

test('U28 demo defaults true, requires a private dashboard token, and can be explicitly disabled', async () => {
  const services = { DATABASE_URL: 'postgres://db.invalid/aamu', VALKEY_URL: 'rediss://cache.invalid' };
  await assert.rejects(readRuntimeConfig(services), error => error instanceof ConfigurationError && error.fields.includes('DEMO_DASHBOARD_TOKEN'));
  assert.equal((await readRuntimeConfig({ ...services, DEMO_DASHBOARD_TOKEN: dashboardToken })).demoMode, true);
  assert.equal((await readRuntimeConfig({ ...services, DEMO_MODE: 'false' })).demoMode, false);
  await assert.rejects(readRuntimeConfig({ ...services, DEMO_MODE: 'TRUE', DEMO_DASHBOARD_TOKEN: dashboardToken }), ConfigurationError);
});

test('clinic routes are absent with demo disabled; demo headers never fall back to ordinary storage', async t => {
  const f = fixture(); const app = await createRuntimeApp({ ...f.options, demo: { ...f.options.demo, enabled: false } }); t.after(() => app.close());
  const owner = await user(app); const headers = { ...owner.headers, 'x-aamu-demo': 'true' };
  for (const [method, url, payload] of [['PUT', '/clinic/sharing', { enabled: true, code: 'AAMU-DEMO' }],
    ['POST', '/clinic/callback', {}], ['GET', '/clinic/patients', undefined]] as const) {
    assert.equal((await app.inject({ method, url, headers: { ...headers, ...dashboard }, payload })).statusCode, 404);
  }
  assert.equal((await app.inject({ url: '/goals/revision', headers })).statusCode, 403);
  assert.equal((await app.inject({ method: 'PUT', url: '/goals', headers, payload: snapshot })).statusCode, 403);
  assert.equal((await app.inject({ method: 'PUT', url: '/mornings/2026-11-14', headers, payload: morning })).statusCode, 403);
  assert.deepEqual(f.realWrites, []); assert.deepEqual(f.demoWrites, []);
});

test('demo snapshots/mornings and ordinary storage keep independent revisions and writes', async t => {
  const f = fixture(); const app = await createRuntimeApp(f.options); t.after(() => app.close()); const owner = await user(app);
  const headers = { ...owner.headers, 'x-aamu-demo': 'true' };
  assert.equal((await app.inject({ method: 'PUT', url: '/goals', headers, payload: snapshot })).statusCode, 200);
  assert.equal((await app.inject({ method: 'PUT', url: '/mornings/2026-11-14', headers, payload: morning })).statusCode, 200);
  assert.deepEqual((await app.inject({ url: '/goals/revision', headers })).json(), { revision: 1, demo: true });
  assert.deepEqual((await app.inject({ url: '/goals/revision', headers: owner.headers })).json(), { revision: 0 });
  assert.equal((await app.inject({ method: 'PUT', url: '/mornings/2026-11-14', headers, payload: morning })).json().demo, true);
  assert.deepEqual(f.demoWrites, ['goals', 'morning', 'morning']); assert.deepEqual(f.realWrites, []);
  assert.equal((await app.inject({ method: 'PUT', url: '/goals', headers: owner.headers, payload: snapshot })).statusCode, 200);
  assert.deepEqual(f.realWrites, ['goals']);
});

test('dashboard secret is separate from the connection code and ordinary user token', async t => {
  const f = fixture(); const app = await createRuntimeApp(f.options); t.after(() => app.close()); const owner = await user(app);
  for (const headers of [{}, owner.headers, { 'x-demo-dashboard-token': 'AAMU-DEMO' }]) {
    assert.equal((await app.inject({ url: '/clinic/patients', headers })).statusCode, 401);
  }
  const response = await app.inject({ url: '/clinic/patients', headers: dashboard });
  assert.equal(response.statusCode, 200); assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.json().patients.length, 4);
  assert.equal((await app.inject({ url: '/clinic/patients', headers: { authorization: `Bearer ${dashboardToken}` } })).statusCode, 200);
});

test('sharing validates consent/code; callback is real, connected-only, idempotent and survives app recreation', async t => {
  const f = fixture(); const app = await createRuntimeApp(f.options); t.after(() => app.close()); const owner = await user(app);
  assert.equal((await app.inject({ method: 'PUT', url: '/clinic/sharing', payload: { enabled: true, code: 'AAMU-DEMO' } })).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: '/clinic/callback', headers: owner.headers, payload: {} })).statusCode, 409);
  assert.equal((await app.inject({ method: 'PUT', url: '/clinic/sharing', headers: owner.headers, payload: { enabled: true, code: 'OTHER' } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'PUT', url: '/clinic/sharing', headers: owner.headers, payload: { enabled: true, code: 'AAMU-DEMO', name: 'not accepted' } })).statusCode, 400);
  const shared = await app.inject({ method: 'PUT', url: '/clinic/sharing', headers: owner.headers, payload: { enabled: true, code: ' aamu-demo ' } });
  assert.deepEqual(shared.json(), { demo: true, enabled: true });
  const requested = await app.inject({ method: 'POST', url: '/clinic/callback', headers: owner.headers, payload: {} });
  assert.deepEqual(requested.json(), { demo: true, callbackRequestedAt: now });
  const reopened = await createRuntimeApp({ ...f.options, demo: { ...f.options.demo, now: () => now + 600_000 } }); t.after(() => reopened.close());
  assert.deepEqual((await reopened.inject({ method: 'POST', url: '/clinic/callback', headers: owner.headers, payload: {} })).json(), requested.json());
  assert.equal((await reopened.inject({ url: '/clinic/patients', headers: dashboard })).json().patients.find((patient: ClinicPatient) => patient.presenter).callbackRequestedAt, now);
  await app.inject({ method: 'PUT', url: '/clinic/sharing', headers: owner.headers, payload: { enabled: false } });
  assert.equal((await app.inject({ url: '/clinic/patients', headers: dashboard })).json().patients.length, 4);
  assert.equal((await app.inject({ method: 'POST', url: '/clinic/callback', headers: owner.headers, payload: {} })).statusCode, 409);
});

test('clinic does not accept contact/audio/text, and repository failures never claim a successful callback', async t => {
  const f = fixture(); const app = await createRuntimeApp(f.options); t.after(() => app.close()); const owner = await user(app);
  for (const payload of [{ phone: 'not accepted' }, { audio: 'not accepted' }, { goalText: 'not accepted' }]) {
    assert.equal((await app.inject({ method: 'POST', url: '/clinic/callback', headers: owner.headers, payload })).statusCode, 400);
  }
  f.clinic.requestCallback = async () => { throw Error('private-db-credential'); };
  const response = await app.inject({ method: 'POST', url: '/clinic/callback', headers: owner.headers, payload: {} });
  assert.equal(response.statusCode, 503); assert.doesNotMatch(response.body, /private-db/);
});

test('four removable fictional profiles actually cover all statuses through the unchanged engine', () => {
  const patients = demoClinicPatients('2026-11-14');
  assert.equal(patients.length, 4);
  assert.deepEqual(patients.map(patient => classifyClinic(patient, '2026-11-14').status), ['might_need_call', 'drifting', 'insufficient', 'steady']);
  assert.ok(patients.every(patient => !patient.presenter && patient.callbackRequestedAt === null));
  assert.match(classifyClinic(patients[2], '2026-11-14').reason, /Alarm off for 21 days.*Last status: Drifting/);
});

test('PostgreSQL clinic query projects only demo numeric/categories and atomically preserves an outstanding timestamp', async () => {
  const queries: { sql: string; args: unknown[] }[] = []; let stored: number | null = null;
  const pool = { async query(sql: string, args: unknown[] = []) {
    queries.push({ sql, args });
    if (sql.includes('SET callback_requested_at')) { stored ??= args[1] as number; return { rows: [{ callback_requested_at: String(stored) }] }; }
    if (sql.includes('jsonb_agg')) return { rows: [{ user_id: 'opaque-user-id', started_on: '2026-11-01', callback_requested_at: null,
      mornings: [{ localDate: '2026-11-14', level: 'easy', upAt: 20, stepDone: true }] }] };
    return { rows: [] };
  } } as unknown as Pool;
  const repository = createPostgresClinicRepository(pool);
  await repository.migrate(); await repository.setSharing('opaque-user-id', true);
  assert.equal(await repository.requestCallback('opaque-user-id', now), now);
  assert.equal(await repository.requestCallback('opaque-user-id', now + 100), now);
  const patients = await repository.patients();
  assert.match(patients[0].id, /^P-[0-9a-f]{16}$/); assert.doesNotMatch(JSON.stringify(patients), /opaque-user-id|goal|speech|contact|token/i);
  const query = queries.find(item => item.sql.includes('jsonb_agg'))!.sql;
  assert.match(query, /FROM aamu_demo_clinic_memberships/); assert.match(query, /LEFT JOIN aamu_demo_mornings/);
  assert.doesNotMatch(query, /aamu_mornings\b|step_text|goal_text|speech|SELECT \*/);
  await repository.setSharing('opaque-user-id', false); assert.match(queries.at(-1)!.sql, /^DELETE FROM aamu_demo_clinic_memberships/);
});

test('demo SQL retains revision locks/redaction semantics and never writes the ordinary tables', async () => {
  let revision = 0; const goals = new Set<string>(); let text: unknown = null; const queries: string[] = [];
  const client = { async query(sql: string, args: unknown[] = []) {
    queries.push(sql);
    if (sql.startsWith('SELECT revision')) return { rows: [{ revision: String(revision) }] };
    if (sql.startsWith('UPDATE aamu_demo_goal_revisions')) revision = args[1] as number;
    if (sql.startsWith('DELETE FROM aamu_demo_goals')) for (const id of goals) if (!(args[1] as string[]).includes(id)) goals.delete(id);
    if (sql.startsWith('UPDATE aamu_demo_mornings')) text = null;
    if (sql.startsWith('INSERT INTO aamu_demo_goals')) goals.add(args[1] as string);
    if (sql.startsWith('INSERT INTO aamu_demo_mornings')) { assert.match(sql, /CASE WHEN EXISTS/); text = goals.has(args[2] as string) ? args[3] : null; }
    return { rows: [] };
  }, release() {} };
  const pool = { connect: async () => client, query: client.query } as unknown as Pool;
  const data = createDemoDataRepository(pool); await data.migrate();
  await data.replaceGoals('id', snapshot);
  await data.saveMorning('id', '2026-11-14', { ...morning, stepText: 'Read one page', goalSnapshotRevision: 1 }); assert.equal(text, 'Read one page');
  await data.replaceGoals('id', { goals: [], revision: 2, baseRevision: 1 }); assert.equal(text, null);
  assert.deepEqual(await data.replaceGoals('id', snapshot), { applied: false, revision: 2 });
  await data.replaceGoals('id', { ...snapshot, revision: 3, baseRevision: 2 });
  await data.saveMorning('id', '2026-11-14', { ...morning, stepText: 'Stale text', goalSnapshotRevision: 1 }); assert.equal(text, null);
  assert.ok(queries.some(sql => sql.includes('FOR UPDATE')));
  assert.doesNotMatch(queries.join('\n'), /(?:INSERT INTO|UPDATE|DELETE FROM) aamu_(?:goals|mornings|users)\b/);
});
