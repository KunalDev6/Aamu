import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import Fastify from 'fastify';
import { createBrowserIdentity } from '../../shared/demo/browser-identity.ts';
import { reconcileDemoIdentity } from '../../shared/demo/identity-state.ts';
import { requestClinicCallback } from '../../shared/demo/callback.ts';
import { createClinicSynchronizer, type ClinicSharing } from '../../shared/demo/clinic.ts';
import { registerDemoClinicRoutes } from '../src/demo/clinic-routes.ts';
import type { GoalSyncMetadata } from '../../src/goals/sync.ts';

const digest = async (value: string) => createHash('sha256').update(value).digest('hex');
function sessionStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const browser = (storage: ReturnType<typeof sessionStorage>, demo = true, scope = 'http://localhost:3000') =>
  createBrowserIdentity({ demo, scope, storage: () => storage, digest });

type State = { demoIdentityHash?: string; clinicSharing: ClinicSharing; goalSync: GoalSyncMetadata;
  mornings: { localDate: string; syncPending: boolean; upSyncPending: boolean }[];
  privateLocalContent: string; goals: { id: string }[] };
function savedState(hash = 'old-identity'): State {
  return { demoIdentityHash: hash,
    clinicSharing: { enabled: true, code: 'AAMU-DEMO', revision: 3, syncedRevision: 3, syncPending: false, callbackRequestedAt: 1_700_000_000_000 },
    goalSync: { generation: 4, lastAllocatedRevision: 8, acknowledgedRevision: 8, pending: false },
    mornings: [{ localDate: '2026-11-14', syncPending: false, upSyncPending: false }],
    privateLocalContent: 'untouched', goals: [{ id: 'approved-demo-goal' }] };
}

test('demo browser refresh restores the same tab token and non-secret binding', async () => {
  const storage = sessionStorage(); const first = browser(storage);
  await first.setToken('synthetic-demo-token');
  const refreshed = browser(storage);
  assert.equal(refreshed.getToken(), first.getToken());
  assert.equal(await refreshed.getHash(), await first.getHash());
  assert.notEqual(await refreshed.getHash(), first.getToken());
  assert.equal(browser(sessionStorage()).getToken(), null);
  assert.equal(browser(storage, true, 'http://localhost:3001').getToken(), null);
});

test('non-demo web identity never reads or writes browser storage', async () => {
  const identity = createBrowserIdentity({ demo: false, scope: 'normal', digest,
    storage: () => { assert.fail('Normal preview must stay memory-only'); } });
  assert.equal(identity.getToken(), null); await identity.setToken('synthetic-normal-token');
  assert.equal(identity.getToken(), 'synthetic-normal-token'); assert.equal(await identity.getHash(), null);
});

test('denied session storage remains memory-only without dropping the current identity', async () => {
  const identity = createBrowserIdentity({ demo: true, scope: 'denied', digest,
    storage: () => { throw Error('Storage blocked'); } });
  assert.equal(identity.getToken(), null); await identity.setToken('synthetic-token');
  assert.equal(identity.getToken(), 'synthetic-token'); assert.ok(await identity.getHash());
});

test('identity change is published before requests can use the new token, and unsubscribe works', async () => {
  const identity = browser(sessionStorage()); const changes: string[] = [];
  const unsubscribe = identity.subscribe(hash => changes.push(hash));
  await identity.setToken('synthetic-first'); assert.deepEqual(changes, [await identity.getHash()]);
  unsubscribe(); await identity.setToken('synthetic-next'); assert.equal(changes.length, 1);
});

test('same-identity refresh preserves callback and all acknowledgements unchanged', () => {
  const state = savedState(); assert.equal(reconcileDemoIdentity(state, 'old-identity'), state);
});

test('missing session identity clears stale success before display and resets only remote acknowledgements', () => {
  const before = savedState(); const next = reconcileDemoIdentity(before, null);
  assert.equal(next.demoIdentityHash, undefined); assert.equal(next.clinicSharing.callbackRequestedAt, undefined);
  assert.equal(next.clinicSharing.syncPending, true); assert.equal(next.clinicSharing.syncedRevision, undefined);
  assert.equal(next.goalSync.acknowledgedRevision, undefined); assert.equal(next.goalSync.pending, true);
  assert.equal(next.goalSync.generation, before.goalSync.generation + 1);
  assert.equal(next.mornings[0].syncPending, true); assert.equal(next.mornings[0].upSyncPending, false);
  assert.equal(next.goals, before.goals); assert.equal(next.privateLocalContent, before.privateLocalContent);
  assert.equal(reconcileDemoIdentity(next, null), next);
});

test('new identity also clears legacy acknowledgement state with no stored binding', () => {
  const before = { ...savedState(), demoIdentityHash: undefined };
  const next = reconcileDemoIdentity(before, 'new-identity');
  assert.equal(next.demoIdentityHash, 'new-identity'); assert.equal(next.clinicSharing.callbackRequestedAt, undefined);
  assert.equal(next.clinicSharing.revision, before.clinicSharing.revision + 1);
  assert.doesNotMatch(JSON.stringify(next), /synthetic-demo-token/);
});

function callbackFixture() {
  let state = savedState(); const events: string[] = []; let joined = false; let joinFails = false;
  const store = { read: () => state, update: (change: (current: State) => State) => { state = change(state); } };
  const synchronizer = createClinicSynchronizer({ ...store, put: async payload => {
    events.push('join'); if (joinFails) throw Error('offline'); joined = payload.enabled;
    return { demo: true, enabled: payload.enabled };
  } });
  const ports = { ...store, prepareIdentity: async () => { state = reconcileDemoIdentity(state, 'new-identity'); },
    flushSharing: synchronizer.flush,
    post: async () => { events.push('callback'); assert.equal(joined, true); return { demo: true as const, callbackRequestedAt: 1_700_000_100_000 }; } };
  return { ports, store, events, failJoin: () => { joinFails = true; } };
}

test('fresh identity rejoins first and confirms only the actual callback response', async () => {
  const fixture = callbackFixture(); const result = await requestClinicCallback(fixture.ports);
  assert.deepEqual(fixture.events, ['join', 'callback']); assert.equal(result, 1_700_000_100_000);
  assert.equal(fixture.store.read().clinicSharing.callbackRequestedAt, result);
});

test('saved connected flag never skips rejoin, even with the same identity', async () => {
  const fixture = callbackFixture(); fixture.ports.prepareIdentity = async () => {};
  await requestClinicCallback(fixture.ports); assert.deepEqual(fixture.events, ['join', 'callback']);
});

test('failed rejoin cannot send a callback or preserve an old success', async () => {
  const fixture = callbackFixture(); fixture.failJoin();
  await assert.rejects(requestClinicCallback(fixture.ports), /could not connect/);
  assert.deepEqual(fixture.events, ['join']); assert.equal(fixture.store.read().clinicSharing.callbackRequestedAt, undefined);
});

test('failed callback remains unconfirmed even after membership succeeded', async () => {
  const fixture = callbackFixture(); fixture.ports.post = async () => { throw Error('offline'); };
  await assert.rejects(requestClinicCallback(fixture.ports), /offline/);
  assert.equal(fixture.store.read().clinicSharing.callbackRequestedAt, undefined);
});

test('late callback from an old identity or changed sharing setting cannot confirm', async () => {
  for (const change of ['identity', 'disabled'] as const) {
    const fixture = callbackFixture();
    fixture.ports.post = async () => {
      fixture.store.update(state => change === 'identity' ? reconcileDemoIdentity(state, 'another-identity') :
        { ...state, clinicSharing: { ...state.clinicSharing, enabled: false, revision: state.clinicSharing.revision + 1 } });
      return { demo: true, callbackRequestedAt: 1_700_000_100_000 };
    };
    await assert.rejects(requestClinicCallback(fixture.ports), /settings changed/);
    assert.equal(fixture.store.read().clinicSharing.callbackRequestedAt, undefined);
  }
});

test('malformed callback timestamps cannot produce success', async () => {
  for (const timestamp of [0, -1, NaN, Infinity, 1.5]) {
    const fixture = callbackFixture(); fixture.ports.post = async () => ({ demo: true, callbackRequestedAt: timestamp });
    await assert.rejects(requestClinicCallback(fixture.ports), /Invalid clinic response/);
    assert.equal(fixture.store.read().clinicSharing.callbackRequestedAt, undefined);
  }
});

test('actual clinic routes rejoin a new demo identity and preserve callback idempotence after browser refresh', async t => {
  const app = Fastify({ logger: false }); t.after(() => app.close());
  const memberships = new Map<string, number | null>(); const now = 1_700_000_200_000;
  registerDemoClinicRoutes(app, { dashboardToken: 'synthetic-dashboard-secret', now: () => now,
    authorize: async request => request.headers.authorization?.replace(/^Bearer /, '') ?? null,
    repository: {
      async setSharing(id, enabled) { if (!enabled) memberships.delete(id); else if (!memberships.has(id)) memberships.set(id, null); },
      async requestCallback(id, at) { if (!memberships.has(id)) return null; const value = memberships.get(id) ?? at; memberships.set(id, value); return value; },
      async patients() { return []; },
    } });
  const storage = sessionStorage(); let identity = browser(storage); await identity.setToken('synthetic-current-user');
  let state = savedState();
  const store = { read: () => state, update: (change: (current: State) => State) => { state = change(state); } };
  const request = async (method: 'PUT' | 'POST', path: string, payload: object) => {
    const result = await app.inject({ method, url: path, payload, headers: { authorization: `Bearer ${identity.getToken()}` } });
    assert.equal(result.statusCode, 200); return result.json();
  };
  const sync = createClinicSynchronizer({ ...store, put: payload => request('PUT', '/clinic/sharing', payload) });
  const ports = { ...store,
    prepareIdentity: async () => { const hash = await identity.getHash(); store.update(current => reconcileDemoIdentity(current, hash)); },
    flushSharing: sync.flush, post: () => request('POST', '/clinic/callback', {}) };
  assert.equal(memberships.size, 0); assert.equal(await requestClinicCallback(ports), now);
  assert.equal(memberships.get('synthetic-current-user'), now);
  identity = browser(storage);
  assert.equal(await requestClinicCallback(ports), now); assert.equal(memberships.size, 1);
  identity = browser(sessionStorage()); await identity.setToken('synthetic-second-user');
  assert.equal(await requestClinicCallback(ports), now); assert.equal(memberships.size, 2);
  assert.equal(state.clinicSharing.callbackRequestedAt, now); assert.equal(state.demoIdentityHash, await identity.getHash());
});
