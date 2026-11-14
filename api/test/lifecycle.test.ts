import test from 'node:test';
import assert from 'node:assert/strict';
import { morningIsLate, morningMidnight, needsMorningNavigation, reconcileLifecycle, scheduledMornings, type AlarmEvent, type AlarmScheduleChange, type LifecycleMorning, type LifecycleState } from '../../shared/mornings/lifecycle.ts';

const time = (value: string) => Date.parse(value);
const first: AlarmScheduleChange = { effectiveAt: time('2026-11-10T20:00:00Z'), hour: 7, minute: 0, enabled: true, utcOffsetMinutes: 120 };
const due = time('2026-11-11T05:00:00Z');
const base = (): LifecycleState => ({ mornings: [], alarmScheduleHistory: [first], nativeEventSequence: 0 });
function event(sequence: number, type: AlarmEvent['type'], at: number, source: AlarmEvent['source'] = 'system_intent'): AlarmEvent {
  return { sequence, type, source, occurredAt: new Date(at).toISOString(), alarmId: `alarm-${sequence}`,
    originalScheduledAt: new Date(due).toISOString(), localDate: '2026-11-11', offsetMinutes: 120 };
}
const row = (): LifecycleMorning => scheduledMornings([first], due)[0];

test('backfill uses successful schedule history only and creates each enabled missed day after first setup', () => {
  const now = time('2026-11-14T04:00:00Z');
  const result = reconcileLifecycle(base(), { now, openedAt: now });
  assert.deepEqual(result.state.mornings.map(morning => morning.localDate), ['2026-11-11', '2026-11-12', '2026-11-13']);
  assert.ok(result.state.mornings.every(morning => morning.level === 'no_response' && morning.ringObserved === false && morning.syncPending));
  assert.equal(result.navigation, null);
  assert.deepEqual(reconcileLifecycle({ mornings: [] }, { now }).state.mornings, []);
});

test('off intervals and re-enable before/after alarm time preserve the agreed calendar outcomes', () => {
  const off = { ...first, effectiveAt: time('2026-11-12T04:00:00Z'), enabled: false };
  const before = { ...first, effectiveAt: time('2026-11-13T04:00:00Z') };
  const after = { ...first, effectiveAt: time('2026-11-13T06:00:00Z') };
  const rows = (on: AlarmScheduleChange) => scheduledMornings([first, off, on], time('2026-11-14T06:00:00Z'));
  assert.equal(rows(before).find(morning => morning.localDate === '2026-11-12')?.level, 'off');
  assert.equal(rows(before).find(morning => morning.localDate === '2026-11-13')?.level, null);
  assert.equal(rows(after).find(morning => morning.localDate === '2026-11-13')?.level, 'off');
  assert.equal(rows(after).find(morning => morning.localDate === '2026-11-14')?.level, null);
});

test('observed open or native snooze yields stopped; an unseen system Stop is never fabricated', () => {
  const now = due + 3_600_000;
  assert.equal(reconcileLifecycle(base(), { now }).state.mornings[0].level, 'no_response');
  assert.equal(reconcileLifecycle(base(), { now, openedAt: due + 1_000 }).state.mornings[0].level, 'stopped');
  assert.equal(reconcileLifecycle(base(), { now, events: [event(1, 'snooze', due + 1_000)] }).state.mornings[0].level, 'stopped');
});

test('native sequence cursor deduplicates app/system snoozes and commits alongside the records', () => {
  const events = [event(2, 'snooze', due + 10_000, 'app'), event(1, 'snooze', due + 1_000), event(2, 'snooze', due + 10_000, 'app')];
  const firstPass = reconcileLifecycle(base(), { now: due + 20_000, events });
  assert.equal(firstPass.state.nativeEventSequence, 2); assert.equal(firstPass.state.mornings[0].snoozeCount, 2);
  const second = reconcileLifecycle(firstPass.state, { now: due + 20_000, events });
  assert.equal(second.state, firstPass.state); assert.equal(second.state.mornings[0].snoozeCount, 2);
});

test('a delayed ring observation and re-ring never move the original classification deadline', () => {
  const events = [event(1, 'ring', due + 20 * 60_000, 'native_observer'), event(2, 'snooze', due + 45 * 60_000), event(3, 'ring', due + 50 * 60_000, 'native_observer')];
  const result = reconcileLifecycle(base(), { now: due + 60 * 60_000, events });
  const morning = result.state.mornings[0];
  assert.equal(morning.firstRingAt, due); assert.equal(morning.ringObserved, true); assert.equal(morning.level, 'stopped');
});

test('a frozen no_response remains unchanged after a late open, late hold or newly delivered old interaction', () => {
  const final = reconcileLifecycle(base(), { now: due + 3_600_000 }).state;
  const reopened = reconcileLifecycle(final, { now: due + 3_700_000, openedAt: due + 3_700_000, events: [event(1, 'stop', due + 1_000)] });
  assert.equal(reopened.state.mornings[0].level, 'no_response'); assert.equal(reopened.navigation?.kind, 'late');
  const held = { ...reopened.state, mornings: [{ ...reopened.state.mornings[0], upAt: due + 3_800_000, phase: 'home' as const }] };
  assert.equal(reconcileLifecycle(held, { now: due + 3_900_000, openedAt: due + 3_900_000 }).state.mornings[0].level, 'no_response');
});

test('due foreground crossing, system landing and late opening choose distinct alarm entry routes', () => {
  assert.deepEqual(reconcileLifecycle(base(), { now: due, previousCheckAt: due - 1 }).navigation,
    { screen: 'alarm', localDate: '2026-11-11', kind: 'foreground' });
  assert.equal(reconcileLifecycle(base(), { now: due + 10_000, openedAt: due + 10_000 }).navigation?.kind, 'landing');
  assert.equal(reconcileLifecycle(base(), { now: due + 3_700_000, openedAt: due + 3_700_000 }).navigation?.kind, 'late');
});

test('staying on Home waits for snooze expiry; reopening Aamu takes over the pending snooze', () => {
  const snoozed = { ...row(), phase: 'snoozed' as const, snoozeUntil: due + 300_000, dawnProgress: 0.4, snoozeCount: 1 };
  const state = { ...base(), mornings: [snoozed] };
  assert.equal(reconcileLifecycle(state, { now: due + 120_000 }).navigation, null);
  const opening = reconcileLifecycle(state, { now: due + 120_000, openedAt: due + 120_000 });
  assert.equal(opening.navigation?.kind, 'landing'); assert.equal(opening.state.mornings[0].snoozeUntil, undefined);
  const resumed = reconcileLifecycle(state, { now: due + 300_000, previousCheckAt: due + 299_000 });
  assert.equal(resumed.navigation?.kind, 'foreground'); assert.equal(resumed.state.mornings[0].phase, 'dawn');
  assert.equal(resumed.state.mornings[0].dawnProgress, 0.4); assert.equal(resumed.state.mornings[0].firstRingAt, due);
});

test('recorded offset governs midnight even if the phone now has a different timezone', () => {
  const morning = { ...row(), level: 'stopped' as const };
  const midnight = time('2026-11-11T22:00:00Z'); assert.equal(morningMidnight(morning), midnight);
  const state = { mornings: [morning] };
  assert.equal(reconcileLifecycle(state, { now: midnight - 1, openedAt: midnight - 1 }).navigation?.kind, 'late');
  assert.equal(reconcileLifecycle(state, { now: midnight, openedAt: midnight }).navigation, null);
});

test('started voice sample recovers as failed/zero into message; ordinary active polling never interrupts it', () => {
  const morning = { ...row(), upAt: due + 120_000, minutesToUp: 2, phase: 'voice' as const, voiceStartedAt: due + 120_001 };
  const state = { mornings: [morning] }; const now = due + 130_000;
  assert.equal(reconcileLifecycle(state, { now }).state.mornings[0].voiceState, null);
  const resumed = reconcileLifecycle(state, { now, openedAt: now, recoverInterruptedVoice: true });
  assert.equal(resumed.state.mornings[0].voiceState, 'failed'); assert.equal(resumed.state.mornings[0].level, 'easy');
  assert.equal(resumed.state.mornings[0].phase, 'message'); assert.equal(resumed.navigation?.screen, 'message');
  assert.equal(resumed.state.mornings[0].speechShare, null);
});

test('early voice recovery works before scheduled alarm; a sample not yet started remains eligible to start', () => {
  const early = { ...row(), firstRingAt: null, upAt: due - 120_000, minutesToUp: 0, minutesBeforeAlarm: 2, phase: 'voice' as const };
  const now = due - 60_000;
  const notStarted = reconcileLifecycle({ mornings: [early] }, { now, openedAt: now, recoverInterruptedVoice: true });
  assert.equal(notStarted.state.mornings[0].voiceState, null); assert.equal(notStarted.navigation?.screen, 'voice');
  const started = reconcileLifecycle({ mornings: [{ ...early, voiceStartedAt: due - 119_000 }] }, { now, openedAt: now, recoverInterruptedVoice: true });
  assert.equal(started.state.mornings[0].voiceState, 'failed'); assert.equal(started.navigation?.screen, 'message');
});

test('an expired native scheduling horizon is explicit and does not falsely mark backfilled rings as observed', () => {
  const result = reconcileLifecycle({ ...base(), nativeScheduleHorizonEnd: due }, { now: due + 2 * 86_400_000 + 3_600_000 });
  assert.equal(result.nativeHorizonExpired, true);
  assert.equal(result.state.mornings.length, 3); assert.ok(result.state.mornings.every(morning => morning.ringObserved === false));
});

test('the first-hour cutoff transitions the visible alarm to late without resetting its sky', () => {
  const opened = reconcileLifecycle(base(), { now: due + 1_000, openedAt: due + 1_000 });
  const active = { ...opened.state, mornings: opened.state.mornings.map(morning => ({ ...morning, dawnProgress: 0.75 })) };
  const cutoff = reconcileLifecycle(active, { now: due + 3_600_000, previousCheckAt: due + 3_599_000 });
  assert.equal(cutoff.navigation?.kind, 'late'); assert.equal(cutoff.state.mornings[0].level, 'stopped');
  assert.equal(cutoff.state.mornings[0].dawnProgress, 0.75);
  assert.equal(morningIsLate(active.mornings[0], due + 3_600_000), true);
  assert.equal(morningIsLate(active.mornings[0], due + 3_599_999), false);
  assert.equal(needsMorningNavigation(cutoff.navigation!, '/alarm', { date: '2026-11-11', kind: 'landing' }), true);
});

test('route identity includes date and late mode, while duplicate normal ring reports do not restart the hold', () => {
  const normal = { screen: 'alarm' as const, localDate: '2026-11-11', kind: 'foreground' as const };
  assert.equal(needsMorningNavigation(normal, '/alarm', { date: normal.localDate, kind: 'landing' }), false);
  assert.equal(needsMorningNavigation({ ...normal, localDate: '2026-11-12' }, '/alarm', { date: normal.localDate, kind: 'foreground' }), true);
  assert.equal(needsMorningNavigation({ ...normal, kind: 'late' }, '/alarm', { date: normal.localDate, kind: 'foreground' }), true);
  assert.equal(needsMorningNavigation({ ...normal, kind: 'late' }, '/alarm', { date: normal.localDate, kind: 'late' }), false);
});
