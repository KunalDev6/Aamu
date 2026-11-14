import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceDemoTime, completeDemoStep, currentDemoMorning, demoSky, demoTiming, emptyDemoSession, finishDemoVoice,
  demoRemovalNoticeVisible, holdDemo, offerDemoStep, restDemoMessage, ringDemo, showDemoHome, shrinkDemoStep, snoozeDemo,
  undoDemoRemoval, type DemoResources } from '../../shared/demo/session.ts';
import { homeConfig } from '../../src/home/presentation.ts';
import type { LocalGoal } from '../../src/goals/approval.ts';
import type { MessageMetadata } from '../../shared/messages/engine.ts';

const now = Date.parse('2026-11-14T08:00:00Z');
const goal = (id: string, localOnly = false): LocalGoal => ({ id, goalText: 'Read', steps: { tiny: 'Open a book.', small: 'Read a page.', full: 'Read a chapter.' },
  localOnly, approved: true, latestVerdict: localOnly ? 'needs_support' : 'ok', revision: 1 });
const message = (id: string, level: MessageMetadata['level']): MessageMetadata => ({ id, level, blocked: false, createdAt: 1, lastPlayedAt: null, timesPlayed: 0, timesFollowedByDoneStep: 0 });
const resources = (): DemoResources => ({ goals: [goal('A'), goal('B', true)], messages: [] });

test('Ring now and the whole manual demo change only a separate session, never real resources', () => {
  const real = resources(); const before = JSON.stringify(real);
  Object.freeze(real); real.goals.forEach(item => { Object.freeze(item.steps); Object.freeze(item); }); Object.freeze(real.goals); Object.freeze(real.messages);
  let session = ringDemo(emptyDemoSession(), now, '2026-11-14', 120);
  session = holdDemo(session, real, now + 2000); session = finishDemoVoice(session, real);
  session = completeDemoStep(session, true); session = showDemoHome(session);
  assert.equal(currentDemoMorning(session)?.stepDone, true); assert.equal(currentDemoMorning(session)?.goalId, 'A');
  assert.equal(JSON.stringify(real), before);
  assert.equal('upSyncPending' in currentDemoMorning(session)!, false); assert.equal('syncPending' in currentDemoMorning(session)!, false);
});

test('selected difficulty applies to the labelled demo while real message selection waits to offer until playback', () => {
  const real = { ...resources(), messages: [message('easy', 'easy'), message('hard', 'hard')] };
  let session = ringDemo({ ...emptyDemoSession(), selectedLevel: 'hard' }, now, '2026-11-14', 120);
  session = holdDemo(session, real, now + 2000); session = finishDemoVoice(session, real);
  assert.equal(currentDemoMorning(session)?.level, 'hard'); assert.equal(currentDemoMorning(session)?.messageId, 'hard');
  assert.equal(currentDemoMorning(session)?.stepOffered, false);
  session = offerDemoStep(session, real); assert.equal(currentDemoMorning(session)?.stepSize, 'tiny');
  assert.equal(offerDemoStep(session, real), session);
  assert.equal(currentDemoMorning(session)?.voiceState, null); // No invented real speech measurement.
});

test('no personal recordings gives step-only flow; a picked level keeps the five-second stage', () => {
  const real = resources(); let session = ringDemo({ ...emptyDemoSession(), selectedLevel: 'medium' }, now, '2026-11-14', 120);
  session = holdDemo(session, real, now + 2000);
  assert.equal(currentDemoMorning(session)?.phase, 'voice');
  assert.equal(advanceDemoTime(session, real, now + 6999), session);
  session = advanceDemoTime(session, real, now + 7000);
  assert.equal(currentDemoMorning(session)?.phase, 'message'); assert.equal(currentDemoMorning(session)?.messageId, null);
  assert.equal(currentDemoMorning(session)?.stepSize, 'small'); assert.equal(real.messages.length, 0);
});

test('demo history owns rotation and shared carry independently from real history', () => {
  const real = resources(); let session = ringDemo(emptyDemoSession(), now, '2026-11-14', 120);
  session = finishDemoVoice(holdDemo(session, real, now + 2000), real);
  session = completeDemoStep(session, true);
  session = ringDemo({ ...session, selectedLevel: 'easy' }, now + 10_000, '2026-11-14', 120);
  session = finishDemoVoice(holdDemo(session, real, now + 12_000), real, true);
  assert.equal(currentDemoMorning(session)?.localDate, '2026-11-15'); assert.equal(currentDemoMorning(session)?.goalId, 'B');
  assert.equal(currentDemoMorning(session)?.stepSize, 'full'); assert.equal(currentDemoMorning(session)?.voiceState, 'skipped');
  session = completeDemoStep(session, true); session = completeDemoStep(session, null);
  assert.equal(currentDemoMorning(session)?.stepDone, null);
});

test('snooze keeps five minutes, preserves the sky and Ring now resumes the same demo occurrence', () => {
  let session = ringDemo(emptyDemoSession(), now, '2026-11-14', 120);
  const before = demoSky(currentDemoMorning(session), now + 3000);
  session = snoozeDemo(session, now + 3000);
  assert.equal(currentDemoMorning(session)?.snoozeUntil, now + 3000 + demoTiming.snoozeMs);
  assert.equal(demoSky(currentDemoMorning(session), now + 4000), before);
  session = ringDemo(session, now + 4000, '2026-11-14', 120);
  assert.equal(session.history.length, 1); assert.equal(currentDemoMorning(session)?.snoozeCount, 1);
  assert.equal(currentDemoMorning(session)?.firstRingAt, now); assert.equal(demoSky(currentDemoMorning(session), now + 4000), before);
});

test('fast time uses confirmed dawn/window durations and late hold skips the simulated voice stage', () => {
  const real = resources(); let session = ringDemo({ ...emptyDemoSession(), fast: true }, now, '2026-11-14', 120);
  assert.equal(currentDemoMorning(session)?.dawnDurationMs, 15_000);
  session = advanceDemoTime(session, real, now + 60_000); assert.equal(currentDemoMorning(session)?.level, 'stopped');
  session = holdDemo(session, real, now + 61_000);
  assert.equal(currentDemoMorning(session)?.phase, 'home'); assert.equal(currentDemoMorning(session)?.stepSize, 'tiny');
  assert.equal(currentDemoMorning(session)?.level, 'stopped'); assert.equal(currentDemoMorning(session)?.voiceEndsAt, undefined);
});

test('removal and Rest are demo-local and reset discards only demo history and overrides', () => {
  const real = { ...resources(), messages: [message('clip', 'medium')] }; const before = JSON.stringify(real);
  let session = ringDemo(emptyDemoSession(), now, '2026-11-14', 120);
  session = finishDemoVoice(holdDemo(session, real, now + 2000), real);
  session = restDemoMessage(session, real); assert.deepEqual(session.restedMessageIds, ['clip']);
  session = shrinkDemoStep(shrinkDemoStep(session)); assert.equal(currentDemoMorning(session)?.stepRemoved, true);
  const reset = emptyDemoSession(); assert.deepEqual(reset.history, []); assert.deepEqual(reset.restedMessageIds, []);
  assert.equal(reset.paired, false); assert.equal(reset.partnerUp, false); assert.equal(reset.callbackRequested, false);
  assert.equal(JSON.stringify(real), before);
});

test('three hard demo mornings give the next heavy dawn without reading or seeding real mornings', () => {
  const real = resources(); let session = { ...emptyDemoSession(), fast: true, selectedLevel: 'hard' as const };
  for (let i = 0; i < 3; i++) {
    const start = now + i * 10_000;
    session = finishDemoVoice(holdDemo(ringDemo(session, start, '2026-11-14', 120), real, start + 2000), real) as typeof session;
  }
  const fourth = ringDemo(session, now + 30_000, '2026-11-14', 120);
  assert.equal(currentDemoMorning(fourth)?.dawnDurationMs, 20_000); assert.equal(currentDemoMorning(fourth)?.dawnLowerStart, true);
});

test('Tiny removal offers five-second Undo that restores the same demo step without real writes', () => {
  const real = resources(); const realBefore = JSON.stringify(real);
  let session = ringDemo({ ...emptyDemoSession(), selectedLevel: 'hard' }, now, '2026-11-14', 120);
  session = finishDemoVoice(holdDemo(session, real, now + 2000), real);
  const original = currentDemoMorning(session)!;
  const removed = shrinkDemoStep(session, now + 8000);
  assert.equal(currentDemoMorning(removed)?.stepRemoved, true);
  assert.equal(demoRemovalNoticeVisible(currentDemoMorning(removed), now + 8000), true);
  const restored = undoDemoRemoval(removed, now + 8000 + homeConfig.removalUndoMs - 1);
  assert.equal(currentDemoMorning(restored)?.stepSize, 'tiny');
  assert.equal(currentDemoMorning(restored)?.stepText, original.stepText);
  assert.equal(currentDemoMorning(restored)?.stepRemoved, false);
  assert.equal(currentDemoMorning(restored)?.stepDone, original.stepDone);
  assert.equal(currentDemoMorning(restored)?.stepRemovalUndo, undefined);
  assert.equal(restored.rotationGoalId, session.rotationGoalId);
  assert.equal('syncPending' in currentDemoMorning(restored)!, false);
  assert.equal(JSON.stringify(real), realBefore);
});

test('removal notice dismisses at exactly five seconds; expired Undo cannot restore a removed step', () => {
  const real = resources(); let session = ringDemo({ ...emptyDemoSession(), selectedLevel: 'hard' }, now, '2026-11-14', 120);
  session = finishDemoVoice(holdDemo(session, real, now + 2000), real);
  session = shrinkDemoStep(session, now + 8000);
  const expiry = now + 8000 + homeConfig.removalUndoMs;
  assert.equal(demoRemovalNoticeVisible(currentDemoMorning(session), expiry - 1), true);
  assert.equal(demoRemovalNoticeVisible(currentDemoMorning(session), expiry), false);
  assert.equal(undoDemoRemoval(session, expiry), session);
  const dismissed = advanceDemoTime(session, real, expiry);
  assert.equal(currentDemoMorning(dismissed)?.stepRemoved, true);
  assert.equal(currentDemoMorning(dismissed)?.stepRemovalUndo, undefined);
  assert.equal(undoDemoRemoval(dismissed, expiry + 1), dismissed);
  assert.equal(advanceDemoTime(dismissed, real, expiry + 1), dismissed);
});

test('Done preserves original step text and removal feedback never appears for Done, no offer or off', () => {
  const real = resources(); let session = ringDemo(emptyDemoSession(), now, '2026-11-14', 120);
  assert.equal(demoRemovalNoticeVisible(currentDemoMorning(session), now), false);
  assert.equal(shrinkDemoStep(session, now), session);
  session = finishDemoVoice(holdDemo(session, real, now + 2000), real);
  const original = currentDemoMorning(session)!;
  const done = completeDemoStep(session, true);
  assert.equal(currentDemoMorning(done)?.stepText, original.stepText);
  assert.equal(demoRemovalNoticeVisible(currentDemoMorning(done), now + 8000), false);
  assert.equal(currentDemoMorning(completeDemoStep(done, null))?.stepText, original.stepText);
  const removed = currentDemoMorning(shrinkDemoStep(shrinkDemoStep(session, now + 8000), now + 8000))!;
  assert.equal(demoRemovalNoticeVisible({ ...removed, stepOffered: false }, now + 8001), false);
  assert.equal(demoRemovalNoticeVisible({ ...removed, stepDone: true }, now + 8001), false);
  const off = { ...removed, level: 'off' as const };
  assert.equal(demoRemovalNoticeVisible(off, now + 8001), false);
  assert.equal(demoRemovalNoticeVisible(undefined, now + 8001), false);
});

test('Demo Undo works on simulated future days and preserves earlier history and removal carry', () => {
  const real = resources(); let session = ringDemo(emptyDemoSession(), now, '2026-11-14', 120);
  session = finishDemoVoice(holdDemo(session, real, now + 2000), real);
  const earlier = session.history[0];
  session = ringDemo(session, now + 10000, '2026-11-14', 120);
  session = finishDemoVoice(holdDemo(session, real, now + 12000), real);
  assert.equal(currentDemoMorning(session)?.localDate, '2026-11-15');
  session = shrinkDemoStep(shrinkDemoStep(session, now + 18000), now + 18000);
  assert.equal(demoRemovalNoticeVisible(currentDemoMorning(session), now + 18001), true);
  assert.equal(undoDemoRemoval(session, now + 18001).history[0], earlier);
  session = advanceDemoTime(session, real, now + 23000);
  assert.equal(session.history[0], earlier);
  session = ringDemo(session, now + 30000, '2026-11-14', 120);
  session = finishDemoVoice(holdDemo(session, real, now + 32000), real);
  assert.equal(currentDemoMorning(session)?.stepSize, 'tiny');
  assert.equal(demoRemovalNoticeVisible(currentDemoMorning(session), now + 32001), false);
});

test('a sensed demo morning scores its own snoozes and time with the real rules', () => {
  const real = resources();
  // Immediate hold: no snooze, a few seconds of ringing.
  let quick = ringDemo({ ...emptyDemoSession(), fast: true }, now, '2026-11-14', 120);
  assert.equal(currentDemoMorning(quick)?.selectedLevel, 'sensed');
  quick = holdDemo(quick, real, now + 4000);
  assert.equal(currentDemoMorning(quick)?.voiceEndsAt, now + 4000 + demoTiming.finishSkyMs);
  quick = advanceDemoTime(quick, real, now + 4000 + demoTiming.finishSkyMs);
  assert.equal(currentDemoMorning(quick)?.level, 'easy'); assert.equal(currentDemoMorning(quick)?.stepSize, 'small');
  assert.equal(currentDemoMorning(quick)?.voiceState, null); // Still no invented speech measurement.

  // Two fast snoozes re-ring on their own after eight seconds each, then the hold.
  let slow = ringDemo({ ...emptyDemoSession(), fast: true }, now, '2026-11-14', 120);
  slow = snoozeDemo(slow, now + 3000);
  assert.equal(currentDemoMorning(slow)?.snoozeUntil, now + 3000 + demoTiming.fastSnoozeMs);
  slow = advanceDemoTime(slow, real, now + 11_000); assert.equal(currentDemoMorning(slow)?.phase, 'dawn');
  slow = snoozeDemo(slow, now + 14_000); slow = advanceDemoTime(slow, real, now + 22_000);
  slow = holdDemo(slow, real, now + 26_000);
  const held = currentDemoMorning(slow)!;
  assert.equal(held.snoozeCount, 2); assert.equal(held.snoozedMs, 16_000);
  assert.equal(held.minutesToUp, 2 * demoTiming.snoozeMinutes + 10_000 * demoTiming.fastRingScale / 60_000);
  slow = finishDemoVoice(slow, real);
  assert.equal(currentDemoMorning(slow)?.level, 'hard'); assert.equal(currentDemoMorning(slow)?.stepSize, 'tiny');

  // One snooze alone stays within an ordinary morning.
  let once = ringDemo({ ...emptyDemoSession(), fast: true }, now, '2026-11-14', 120);
  once = advanceDemoTime(snoozeDemo(once, now + 3000), real, now + 11_000);
  once = finishDemoVoice(holdDemo(once, real, now + 15_000), real);
  assert.equal(currentDemoMorning(once)?.level, 'easy');
});

test('guided demo offers its one goal every morning and starts from the chosen carried size', () => {
  const real = resources();
  let session = ringDemo({ ...emptyDemoSession(), fast: true, onlyGoalId: 'B', initialCarry: 'full' }, now, '2026-11-14', 120);
  session = finishDemoVoice(holdDemo(session, real, now + 3000), real);
  assert.equal(currentDemoMorning(session)?.level, 'easy'); assert.equal(currentDemoMorning(session)?.goalId, 'B');
  assert.equal(currentDemoMorning(session)?.stepSize, 'full'); assert.equal(session.rotationGoalId, null);
  session = ringDemo(session, now + 20_000, '2026-11-14', 120);
  session = advanceDemoTime(snoozeDemo(session, now + 23_000), real, now + 31_000);
  session = advanceDemoTime(snoozeDemo(session, now + 34_000), real, now + 42_000);
  session = finishDemoVoice(holdDemo(session, real, now + 46_000), real);
  assert.equal(currentDemoMorning(session)?.level, 'hard'); assert.equal(currentDemoMorning(session)?.goalId, 'B');
  assert.equal(currentDemoMorning(session)?.stepSize, 'tiny');
});
