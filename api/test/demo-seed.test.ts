import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoSeed, initialAppState, demoSafePerson, demoSeedConfig, safeContactAction, demoDataHeaders } from '../../mobile/src/demo/seed.ts';
import { buildBaselines } from '../../shared/mornings/engine.ts';
import { reconcileLifecycle } from '../../shared/mornings/lifecycle.ts';
import { projectMorningUpload } from '../../shared/mornings/sync.ts';
import { remoteGoalSnapshot } from '../../src/goals/approval.ts';
import { acknowledgeClinicSharing, changeClinicSharing, clinicSharingPayload, createClinicSynchronizer, type ClinicState } from '../../shared/demo/clinic.ts';

const now = new Date(2026, 10, 14, 13, 30).getTime();
const empty = { version: 1, setupComplete: false, goals: [], mornings: [], alarm: null, messages: [], placeClip: null };

test('U28 seeds one approved cached ladder, 07:00 on and setup complete without calling a provider', () => {
  const state = createDemoSeed(now, 'opaque-demo-goal');
  assert.equal(state.goals.length, 1); assert.equal(state.goals[0].approved, true);
  assert.deepEqual(Object.keys(state.goals[0].steps), ['tiny', 'small', 'full']);
  assert.ok(Object.values(state.goals[0].steps).every(text => text.trim().length > 0 && text.length <= 60));
  assert.equal(remoteGoalSnapshot(state.goals)?.length, 1);
  assert.deepEqual(state.alarm, { hour: 7, minute: 0, enabled: true });
  assert.equal(state.setupComplete, true); assert.equal(state.goalSync.pending, true);
});

test('U28 fourteen prior qualifying holds freeze main baseline without inventing voice measurements', () => {
  const state = createDemoSeed(now, 'goal');
  assert.equal(state.mornings.length, 14); assert.equal(new Set(state.mornings.map(row => row.localDate)).size, 14);
  assert.ok(state.mornings.every(row => row.localDate < '2026-11-14' && row.upAt! - row.firstRingAt! === 8 * 60_000));
  assert.deepEqual(state.sensingBaselines, buildBaselines(state.mornings));
  assert.equal(state.sensingBaselines.main.frozen, true); assert.equal(state.sensingBaselines.main.count, 14);
  assert.equal(state.sensingBaselines.main.snoozeCount, 0); assert.equal(state.sensingBaselines.main.minutesToUp, 8);
  assert.equal(state.sensingBaselines.voice.count, 0); assert.equal(state.sensingBaselines.voice.frozen, false);
  assert.ok(state.mornings.every(row => row.voiceState === 'unavailable' && row.speechShare === null && row.speechOnsetMs === null));
});

test('U28 first seed opens Home without fabricating a missed occurrence or native permission', () => {
  const state = createDemoSeed(now, 'goal');
  const result = reconcileLifecycle(state, { now, openedAt: now });
  assert.equal(result.navigation, null); assert.equal(result.state.mornings.length, 14);
  assert.equal('alarmScheduleHistory' in state, false); assert.equal('nativeScheduleHorizonEnd' in state, false);
  assert.equal(state.demoSeed.nativeAlarmSetupPending, true);
});

test('U28 no pairing, access token, safe contact or personal audio enters the seed state', () => {
  const state = createDemoSeed(now, 'goal');
  assert.deepEqual(state.messages, []); assert.equal(state.placeClip, null); assert.deepEqual(state.replyNotes, []);
  assert.equal(state.place, 'sea');
  assert.doesNotMatch(JSON.stringify(state), /Sam|safePerson|userToken|partnerId|pairing|"uri"|file:\/\/|https?:\/\//);
  assert.ok(state.mornings.every(row => row.syncPending && row.upSyncPending === false));
  assert.deepEqual(demoSafePerson, { name: 'Sam (demo)', number: '' });
});

test('U28 existing demo edits/history/audio are restored verbatim and never reseeded', () => {
  const seed = createDemoSeed(now, 'original');
  const existing = { ...seed, goals: [{ ...seed.goals[0], goalText: 'My edited goal' }],
    messages: [{ id: 'real-local-recording', uri: 'file:///private/mine.m4a' }] };
  const restored = initialAppState({ demo: true, stored: existing, empty: existing, now: now + 86_400_000, goalId: 'must-not-be-used' });
  assert.equal(restored, existing); assert.equal(restored.mornings.length, 14);
});

test('U28 explicit off gives normal empty first run or preserves existing normal data unchanged', () => {
  assert.equal(initialAppState({ demo: false, stored: null, empty, now, goalId: 'unused' }), empty);
  const existing = { ...empty, goals: ['existing-normal-goal'], safeData: 'unchanged' };
  assert.equal(initialAppState({ demo: false, stored: existing, empty: existing, now, goalId: 'unused' }), existing);
  assert.notEqual(demoSeedConfig.stateKey, demoSeedConfig.normalStateKey);
  assert.notEqual(demoSeedConfig.safePersonKey, demoSeedConfig.normalSafePersonKey);
});

test('U28 seeded mornings project only allowed fields and never trigger historical partner wake', () => {
  const state = createDemoSeed(now, 'goal');
  for (const row of state.mornings) {
    const projected = projectMorningUpload(row, state.goals, state.goalSync).payload;
    assert.equal(projected.stepText, null);
    assert.doesNotMatch(JSON.stringify(projected), /demoSeed|clinic|Sam|safePerson|syncPending|upSyncPending|callback/);
    assert.equal(row.upSyncPending, false);
  }
});

test('U28 every demo contact action stays simulated even after replacement with a real number', () => {
  for (const contact of [demoSafePerson, { name: 'A replacement', number: '+358401234567' }]) {
    for (const action of ['call', 'text'] as const) {
      const result = safeContactAction(contact, action, true);
      assert.equal(result?.simulation, true); assert.equal(result && 'url' in result, false);
    }
  }
  assert.deepEqual(safeContactAction(demoSafePerson, 'call', true), { simulation: true, notice: 'Demo: would call Sam' });
  assert.deepEqual(safeContactAction(demoSafePerson, 'text', true), { simulation: true, notice: 'Demo: would text Sam' });
  assert.equal(safeContactAction(demoSafePerson, 'call', false), null);
});

test('U28 demo data header is restricted to goal snapshots/revision and mornings, never auth/pairing', () => {
  for (const path of ['/goals', '/goals/revision', '/mornings/2026-11-13']) {
    assert.deepEqual(demoDataHeaders(path, true), { 'X-Aamu-Demo': 'true' });
    assert.deepEqual(demoDataHeaders(path, false), {});
  }
  for (const path of ['/users', '/partner', '/partner/match', '/partner/up', '/goals/shrink', '/clinic/callback']) {
    assert.deepEqual(demoDataHeaders(path, true), {});
  }
});

test('U28 clinic request projection contains only connection settings and no contact or goal text', () => {
  const state = createDemoSeed(now, 'goal');
  const sharing = { ...state.clinicSharing, code: ' aamu-demo ', safePerson: demoSafePerson, goals: state.goals };
  assert.deepEqual(clinicSharingPayload(sharing), { enabled: true, code: 'AAMU-DEMO' });
  assert.deepEqual(clinicSharingPayload({ ...sharing, enabled: false }), { enabled: false });
});

test('U28 failed clinic connection remains pending and a later explicit retry acknowledges success', async () => {
  let state: ClinicState = { clinicSharing: { enabled: true, code: 'AAMU-DEMO', revision: 1, syncPending: true } };
  let fail = true; const sent: unknown[] = [];
  const sync = createClinicSynchronizer({ read: () => state, update: change => { state = change(state); },
    put: async payload => { sent.push(payload); if (fail) throw Error('offline'); return { demo: true, enabled: payload.enabled }; } });
  assert.equal(await sync.flush(), false); assert.equal(state.clinicSharing?.syncPending, true);
  fail = false; assert.equal(await sync.flush(), true); assert.equal(state.clinicSharing?.syncPending, false);
  assert.equal(state.clinicSharing?.syncedRevision, 1); assert.equal(sent.length, 2);
});

test('U28 concurrent clinic flushes serialize, and a stale acknowledgement cannot undo a changed setting', async () => {
  let state: ClinicState = { clinicSharing: { enabled: true, code: 'AAMU-DEMO', revision: 1, syncPending: true } };
  let release: () => void = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }); const sent: boolean[] = [];
  const first = state.clinicSharing!;
  const sync = createClinicSynchronizer({ read: () => state, update: change => { state = change(state); },
    put: async payload => { sent.push(payload.enabled); if (sent.length === 1) await gate; return { demo: true, enabled: payload.enabled }; } });
  const running = sync.flush(); assert.equal(sync.flush(), running);
  state = changeClinicSharing(state, false, 'AAMU-DEMO');
  assert.equal(acknowledgeClinicSharing(state, first), state);
  release(); assert.equal(await running, true);
  assert.deepEqual(sent, [true, false]); assert.equal(state.clinicSharing?.enabled, false);
  assert.equal(state.clinicSharing?.syncPending, false); assert.equal(state.clinicSharing?.syncedRevision, 2);
});
