import test from 'node:test';
import assert from 'node:assert/strict';
import { homeConfig, homeCopy, homePresentation, removalNoticeVisible } from '../../src/home/presentation.ts';
import { shrinkOfferedStep, undoRemovedStep, type RemovalState } from '../../src/home/removal.ts';
import { createMessageLedger, setMessageCompletion, restMessage } from '../../shared/messages/engine.ts';
import { reconcileGoalCounts } from '../../src/goals/settings.ts';
import type { LocalGoal } from '../../src/goals/approval.ts';

const at = (hour: number, minute = 0) => new Date(2026, 10, 14, hour, minute).getTime();
const alarm = { hour: 8, minute: 0, enabled: true };
const present = (hour: number, minute = 0) => homePresentation({ now: at(hour, minute), alarm, paired: false, partnerUp: false });
const formatted = (hour: number) => new Date(at(hour)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

for (const [hour, minute, expected] of [
  [7, 0, 'Good morning'], [12, 0, 'Good afternoon'], [17, 59, 'Good afternoon'],
  [18, 0, 'Good evening'], [19, 30, 'Good evening'],
] as const) {
  test(`local greeting at ${hour}:${minute} is ${expected}`, () => assert.equal(present(hour, minute).greeting, expected));
}

test('next alarm uses the local locale time before and after today’s scheduled time', () => {
  assert.equal(present(7).nextAlarmText, `Next alarm: today ${formatted(8)}`);
  assert.equal(present(19, 30).nextAlarmText, `Next alarm: tomorrow ${formatted(8)}`);
  assert.equal(present(7).alarmOffToday, false);
});

test('an early confirmed hold cancels today’s occurrence and points to tomorrow', () => {
  const view = homePresentation({ now: at(7), alarm, today: { upAt: at(6, 59), level: 'easy' }, paired: false, partnerUp: false });
  assert.equal(view.nextAlarmText, `Next alarm: tomorrow ${formatted(8)}`);
  assert.equal(view.earlyWindow, false); assert.equal(view.ownSunUp, true);
});

test('disabled and absent alarms have no next-alarm claim; re-enabled off day says tomorrow', () => {
  for (const disabled of [null, { ...alarm, enabled: false }]) {
    const view = homePresentation({ now: at(7), alarm: disabled, paired: false, partnerUp: false });
    assert.equal(view.alarmOffToday, true); assert.equal(view.nextAlarmText, null); assert.equal(view.earlyWindow, false);
  }
  const enabledTomorrow = homePresentation({ now: at(19, 30), alarm, today: { level: 'off', upAt: null }, paired: true, partnerUp: true });
  assert.equal(enabledTomorrow.alarmOffToday, true);
  assert.equal(enabledTomorrow.nextAlarmText, `Next alarm: tomorrow ${formatted(8)}`);
  assert.equal(enabledTomorrow.ownSunUp, false); assert.equal(enabledTomorrow.partnerSunUp, false);
});

test('sun fills require the corresponding confirmed up, with off overriding both halves', () => {
  const input = { now: at(9), alarm, paired: true, partnerUp: false };
  assert.equal(homePresentation({ ...input, today: { level: 'stopped', upAt: null } }).ownSunUp, false);
  assert.equal(homePresentation({ ...input, today: { level: 'no_response', upAt: at(9) } }).ownSunUp, true);
  assert.equal(homePresentation({ ...input, partnerUp: true }).partnerSunUp, true);
  assert.equal(homePresentation({ ...input, paired: false, partnerUp: true }).partnerSunUp, false);
  const off = homePresentation({ ...input, alarm: { ...alarm, enabled: false }, partnerUp: true, today: { upAt: at(7), level: 'easy' } });
  assert.equal(off.ownSunUp, false); assert.equal(off.partnerSunUp, false);
});

test('early control opens at the configured three-hour boundary and closes at the ring', () => {
  assert.equal(homeConfig.earlyWindowMinutes, 180);
  assert.equal(present(4, 59).earlyWindow, false); assert.equal(present(5).earlyWindow, true);
  assert.equal(present(7, 59).earlyWindow, true); assert.equal(present(8).earlyWindow, false);
  assert.equal(homePresentation({ now: at(0), alarm: { hour: 1, minute: 0, enabled: true }, paired: false, partnerUp: false }).earlyWindow, true);
  assert.equal(homePresentation({ now: at(7), alarm, today: { level: 'off' }, paired: false, partnerUp: false }).earlyWindow, false);
});

test('U26 off state takes priority over early, confirmed and unanswered evening states', () => {
  for (const hour of [7, 21]) {
    const base = { now: at(hour), paired: true, partnerUp: true,
      today: { upAt: at(6), level: 'easy' as const, stepOffered: true, stepDone: null } };
    assert.equal(homePresentation({ ...base, alarm: { ...alarm, enabled: false } }).state, 'off');
    assert.equal(homePresentation({ ...base, alarm, today: { ...base.today, level: 'off' } }).state, 'off');
  }
});

test('U26 early state uses the actual alarm window and never a screenshot scenario override', () => {
  const seven = { hour: 7, minute: 0, enabled: true };
  const view = (hour: number, minute = 0) => homePresentation({ now: at(hour, minute), alarm: seven, paired: false, partnerUp: false });
  assert.equal(view(3, 59).state, 'night'); assert.equal(view(4).state, 'early');
  assert.equal(view(6, 59).state, 'early'); assert.equal(view(7, 30).state, 'night'); assert.equal(view(21).state, 'night');
});

test('U26 a confirmed hold is required for up even if a level, partner or step exists', () => {
  const base = { now: at(9), alarm, paired: true, partnerUp: true,
    today: { level: 'easy' as const, stepOffered: true, stepDone: null } };
  const pending = homePresentation(base);
  assert.equal(pending.state, 'night'); assert.equal(pending.confirmed, false);
  assert.equal(pending.partnerUp, true); assert.equal(pending.ownSunUp, false);
  const up = homePresentation({ ...base, today: { ...base.today, upAt: at(8, 2) } });
  assert.equal(up.state, 'up'); assert.equal(up.confirmed, true);
});

test('U26 evening prompt starts at 18:00 only for a confirmed offered unanswered step', () => {
  const base = { alarm, paired: false, partnerUp: false,
    today: { upAt: at(8, 2), level: 'easy' as const, stepOffered: true, stepRemoved: false, stepDone: null } };
  assert.equal(homePresentation({ ...base, now: at(17, 59) }).state, 'up');
  assert.equal(homePresentation({ ...base, now: at(18) }).state, 'evening');
  assert.equal(homePresentation({ ...base, now: at(21) }).state, 'evening');
  assert.equal(homePresentation({ ...base, now: at(23, 59) }).state, 'evening');
  assert.equal(homePresentation({ ...base, now: at(21), today: { ...base.today, upAt: null } }).state, 'night');
});

test('U26 explicit Not today and Done are answered; removal/no-offer/missing outcome never prompt', () => {
  const base = { now: at(21), alarm, paired: false, partnerUp: false,
    today: { upAt: at(8), level: 'easy' as const, stepOffered: true, stepRemoved: false, stepDone: null } };
  for (const stepDone of [false, true, undefined]) {
    assert.equal(homePresentation({ ...base, today: { ...base.today, stepDone } }).state, 'up');
  }
  assert.equal(homePresentation({ ...base, today: { ...base.today, stepRemoved: true } }).state, 'up');
  assert.equal(homePresentation({ ...base, today: { ...base.today, stepOffered: false } }).state, 'up');
  assert.equal(homePresentation({ ...base, today: { upAt: at(8) } }).state, 'up');
});

test('U26 alarm heading says today before a 07:00 alarm and tomorrow after it, using locale time', () => {
  const seven = { hour: 7, minute: 0, enabled: true };
  const base = { alarm: seven, paired: false, partnerUp: false };
  const before = homePresentation({ ...base, now: at(2) });
  assert.equal(before.state, 'night'); assert.equal(before.alarmDayLabel, 'today');
  assert.equal(before.formattedAlarmTime, formatted(7));
  const later = homePresentation({ ...base, now: at(21) });
  assert.equal(later.state, 'night'); assert.equal(later.alarmDayLabel, 'tomorrow');
  assert.equal(later.formattedAlarmTime, formatted(7));
  const earlyConfirmed = homePresentation({ ...base, now: at(6), today: { upAt: at(5, 59) } });
  assert.equal(earlyConfirmed.alarmDayLabel, 'tomorrow');
  const missing = homePresentation({ ...base, now: at(21), alarm: null });
  assert.equal(missing.formattedAlarmTime, null); assert.equal(missing.alarmDayLabel, null);
});

test('U26 partner confirmation is exposed separately without changing own confirmation or off priority', () => {
  const base = { now: at(21), alarm, paired: false, partnerUp: true };
  assert.equal(homePresentation(base).partnerUp, false);
  const paired = homePresentation({ ...base, paired: true });
  assert.equal(paired.partnerUp, true); assert.equal(paired.confirmed, false); assert.equal(paired.state, 'night');
  const off = homePresentation({ ...base, paired: true, alarm: { ...alarm, enabled: false } });
  assert.equal(off.partnerUp, true); assert.equal(off.partnerSunUp, false); assert.equal(off.state, 'off');
});

test('U26 midnight without today’s record cannot reuse yesterday’s confirmation or unanswered step', () => {
  const nextMidnight = new Date(2026, 10, 15, 0, 0).getTime();
  const view = homePresentation({ now: nextMidnight, alarm, today: undefined, paired: true, partnerUp: false });
  assert.equal(view.state, 'night'); assert.equal(view.confirmed, false); assert.equal(view.ownSunUp, false);
  assert.equal(view.alarmDayLabel, 'today');
});

test('U27 Sleep well follows the real overnight resting interval for a 07:00 alarm', () => {
  const seven = { hour: 7, minute: 0, enabled: true };
  for (const [hour, minute, expected] of [
    [0, 0, true], [3, 59, true], [4, 0, false], [6, 59, false], [7, 0, false],
    [7, 30, false], [12, 0, false], [17, 59, false], [18, 0, true], [21, 0, true], [23, 59, true],
  ] as const) {
    const view = homePresentation({ now: at(hour, minute), alarm: seven, paired: false, partnerUp: false });
    assert.equal(view.showSleepWell, expected, `${hour}:${minute}`);
  }
});

test('U27 overnight Sleep well never extends a clipped early window into the previous date', () => {
  const one = { hour: 1, minute: 0, enabled: true };
  const beforeMidnight = homePresentation({ now: new Date(2026, 10, 13, 23, 59).getTime(), alarm: one, paired: false, partnerUp: false });
  assert.equal(beforeMidnight.state, 'night'); assert.equal(beforeMidnight.showSleepWell, true);
  const midnight = homePresentation({ now: at(0), alarm: one, paired: false, partnerUp: false });
  assert.equal(midnight.state, 'early'); assert.equal(midnight.showSleepWell, false);
  const afterRing = homePresentation({ now: at(1), alarm: one, paired: false, partnerUp: false });
  assert.equal(afterRing.showSleepWell, false);
});

test('U27 Sleep well is limited to resting, never off, confirmed or unanswered evening', () => {
  const base = { now: at(21), alarm, paired: false, partnerUp: false };
  assert.equal(homePresentation({ ...base, alarm: { ...alarm, enabled: false } }).showSleepWell, false);
  assert.equal(homePresentation({ ...base, today: { upAt: at(8) } }).showSleepWell, false);
  assert.equal(homePresentation({ ...base, today: { upAt: at(8), stepOffered: true, stepDone: null } }).showSleepWell, false);
});

test('U27 before evening, confirmed own-up retains morning title and truthful partner wording', () => {
  const base = { now: at(7, 30), alarm, today: { upAt: at(7, 2) }, paired: true, partnerUp: false };
  assert.equal(homePresentation(base).heroTitle, 'You’re up.');
  assert.equal(homePresentation(base).partnerLine, 'Your partner isn’t up yet.');
  const both = homePresentation({ ...base, partnerUp: true });
  assert.equal(both.heroTitle, 'You’re up.'); assert.equal(both.partnerLine, 'You’re both up.');
  assert.equal(homePresentation({ ...base, now: at(17, 59) }).heroTitle, 'You’re up.');
});

test('U27 at 18:00 both confirmed collapses to one retrospective line without duplicate partner copy', () => {
  const base = { alarm, today: { upAt: at(7, 2), stepOffered: true, stepDone: null }, paired: true, partnerUp: true };
  for (const hour of [18, 21, 23]) {
    const view = homePresentation({ ...base, now: at(hour) });
    assert.equal(view.heroTitle, 'You both got up today.'); assert.equal(view.partnerLine, null);
  }
});

test('U27 evening never says both when the partner or own hold is unconfirmed', () => {
  const base = { now: at(21), alarm, today: { upAt: at(7, 2) }, paired: true, partnerUp: false };
  assert.equal(homePresentation(base).heroTitle, 'You got up today.');
  assert.equal(homePresentation(base).partnerLine, 'Your partner isn’t up yet.');
  const unpaired = homePresentation({ ...base, paired: false, partnerUp: true });
  assert.equal(unpaired.heroTitle, 'You got up today.'); assert.equal(unpaired.partnerLine, null);
  const noOwnHold = homePresentation({ ...base, today: { upAt: null }, partnerUp: true });
  assert.equal(noOwnHold.heroTitle, null); assert.equal(noOwnHold.partnerLine, null);
  const off = homePresentation({ ...base, alarm: { ...alarm, enabled: false }, partnerUp: true });
  assert.equal(off.heroTitle, null); assert.equal(off.partnerLine, null);
});

test('U27 evening unanswered rule stays null-only at the real boundary, without fixture overrides', () => {
  const base = { alarm: { hour: 7, minute: 0, enabled: true }, paired: false, partnerUp: false,
    today: { upAt: at(7, 2), stepOffered: true, stepRemoved: false, stepDone: null } };
  assert.equal(homePresentation({ ...base, now: at(7, 30) }).state, 'up');
  assert.equal(homePresentation({ ...base, now: at(17, 59) }).state, 'up');
  assert.equal(homePresentation({ ...base, now: at(18) }).state, 'evening');
  for (const stepDone of [true, false, undefined]) {
    assert.equal(homePresentation({ ...base, now: at(21), today: { ...base.today, stepDone } }).state, 'up');
  }
  assert.equal(homePresentation({ ...base, now: at(21), today: { ...base.today, stepRemoved: true } }).state, 'up');
});

const now = Date.parse('2026-11-14T07:00:00Z');
const date = '2026-11-14';
type Fixture = RemovalState & { goals: LocalGoal[]; rotationGoalId: string | null; goalCounts?: Record<string, { offered: number; done: number; removed: number }> };
function fixture(done: boolean | null = true): Fixture {
  const message = { id: 'message', level: 'easy' as const, blocked: false, createdAt: 1, lastPlayedAt: null, timesPlayed: 2, timesFollowedByDoneStep: 1 };
  const learned = setMessageCompletion([message], createMessageLedger(date, message.id), done, date);
  return { goals: [{ id: 'goal', goalText: 'Read', approved: true, revision: 1, localOnly: false, latestVerdict: 'ok',
      steps: { tiny: 'New tiny text.', small: 'Read a page.', full: 'Read a chapter.' } }],
    messages: learned.messages, rotationGoalId: 'next-goal', mornings: [{ localDate: date, utcOffsetMinutes: 120, level: 'easy',
      goalId: 'goal', stepSize: 'tiny', stepText: 'Exactly what was offered.', stepDone: done, stepOffered: true, stepRemoved: false,
      messageLedger: learned.ledger }] };
}

test('Tiny removal captures exact prior text and Done before removing today’s credit', () => {
  const before = fixture(); const after = shrinkOfferedStep(before, date, now);
  const morning = after.mornings[0];
  assert.deepEqual(morning.stepRemovalUndo, { expiresAt: now + 5_000, stepText: 'Exactly what was offered.', stepDone: true });
  assert.equal(morning.stepSize, null); assert.equal(morning.stepText, null); assert.equal(morning.stepDone, null);
  assert.equal(morning.stepRemoved, true); assert.equal(morning.syncPending, true);
  assert.equal(after.messages[0].timesFollowedByDoneStep, before.messages[0].timesFollowedByDoneStep - 1);
  assert.equal(after.rotationGoalId, before.rotationGoalId);
  assert.equal(homeCopy.removed, 'That’s enough for today.');
});

test('Undo before five seconds restores exact Tiny, Done, credit and counters once', () => {
  const before = fixture(); const removed = reconcileGoalCounts(shrinkOfferedStep(before, date, now));
  assert.deepEqual(removed.goalCounts?.goal, { offered: 1, done: 0, removed: 1 });
  const restored = reconcileGoalCounts(undoRemovedStep(removed, date, now + 4_999));
  assert.equal(restored.mornings[0].stepSize, 'tiny'); assert.equal(restored.mornings[0].stepText, before.mornings[0].stepText);
  assert.equal(restored.mornings[0].stepDone, true); assert.equal(restored.mornings[0].stepRemoved, false);
  assert.equal(restored.mornings[0].stepRemovalUndo, undefined); assert.equal(restored.mornings[0].syncPending, true);
  assert.equal(restored.messages[0].timesFollowedByDoneStep, before.messages[0].timesFollowedByDoneStep);
  assert.deepEqual(restored.goalCounts?.goal, { offered: 1, done: 1, removed: 0 });
  assert.equal(restored.rotationGoalId, before.rotationGoalId);
  assert.equal(undoRemovedStep(restored, date, now + 4_999), restored);
});

test('at five seconds the notice disappears and Undo cannot restore the removed step', () => {
  const removed = shrinkOfferedStep(fixture(), date, now); const morning = removed.mornings[0];
  assert.equal(removalNoticeVisible(morning, true, now + 4_999), true);
  assert.equal(removalNoticeVisible(morning, true, now + 5_000), false);
  assert.equal(undoRemovedStep(removed, date, now + 5_000), removed);
  assert.equal(undoRemovedStep(removed, date, now + 10_000), removed);
});

test('no offered step, off days and disabled alarms never show removal copy', () => {
  const morning = shrinkOfferedStep(fixture(), date, now).mornings[0];
  assert.equal(removalNoticeVisible(undefined, true, now), false);
  assert.equal(removalNoticeVisible({ ...morning, stepOffered: false }, true, now), false);
  assert.equal(removalNoticeVisible({ ...morning, level: 'off' }, true, now), false);
  assert.equal(removalNoticeVisible(morning, false, now), false);
  assert.equal(removalNoticeVisible({ ...morning, stepRemovalUndo: undefined }, true, now), false);
});

test('Undo uses the recorded midnight and cannot restore yesterday even inside five seconds', () => {
  const beforeMidnight = Date.parse('2026-11-14T21:59:58Z');
  const removed = shrinkOfferedStep(fixture(), date, beforeMidnight);
  const midnight = Date.parse('2026-11-14T22:00:00Z');
  assert.equal(removalNoticeVisible(removed.mornings[0], true, midnight), false);
  assert.equal(undoRemovedStep(removed, date, midnight), removed);
  const unchanged = fixture(); assert.equal(shrinkOfferedStep(unchanged, date, midnight), unchanged);
});

test('Undo preserves null or explicit noncompletion without adding message credit', () => {
  for (const done of [null, false]) {
    const before = fixture(done); const restored = undoRemovedStep(shrinkOfferedStep(before, date, now), date, now + 1_000);
    assert.equal(restored.mornings[0].stepDone, done);
    assert.equal(restored.messages[0].timesFollowedByDoneStep, before.messages[0].timesFollowedByDoneStep);
  }
});

test('Undo cannot re-credit a message rested during the removal interval', () => {
  const removed = shrinkOfferedStep(fixture(), date, now); const morning = removed.mornings[0];
  const rested = restMessage(removed.messages, morning.messageLedger!, 'message');
  const afterRest = { ...removed, messages: rested.messages, mornings: [{ ...morning, messageLedger: rested.ledger }] };
  const restored = undoRemovedStep(afterRest, date, now + 1_000);
  assert.equal(restored.mornings[0].stepDone, true); assert.equal(restored.messages[0].timesFollowedByDoneStep, rested.messages[0].timesFollowedByDoneStep);
  assert.equal(restored.mornings[0].messageLedger?.entries[0].credited, false);
});

test('larger reductions clear old Undo metadata and preserve the regular one-size flow', () => {
  const before = fixture(); before.mornings[0] = { ...before.mornings[0], stepSize: 'full',
    stepRemovalUndo: { expiresAt: now + 100, stepText: 'stale', stepDone: true } };
  const smaller = shrinkOfferedStep(before, date, now);
  assert.equal(smaller.mornings[0].stepSize, 'small'); assert.equal(smaller.mornings[0].stepText, 'Read a page.');
  assert.equal(smaller.mornings[0].stepRemovalUndo, undefined); assert.equal(smaller.mornings[0].stepRemoved, false);
  const tiny = shrinkOfferedStep(smaller, date, now + 1);
  assert.equal(tiny.mornings[0].stepSize, 'tiny'); assert.equal(tiny.mornings[0].stepRemovalUndo, undefined);
});

test('deleted goal can be shrunk from its saved ladder and Undo retains its offered text', () => {
  const before = fixture(); before.goals = []; before.mornings[0].stepLadder = { tiny: 'Saved tiny.', small: 'Saved small.', full: 'Saved full.' };
  before.mornings[0].stepSize = 'small';
  const tiny = shrinkOfferedStep(before, date, now);
  assert.equal(tiny.mornings[0].stepText, 'Saved tiny.');
  const restored = undoRemovedStep(shrinkOfferedStep(tiny, date, now + 1), date, now + 2);
  assert.equal(restored.mornings[0].stepText, 'Saved tiny.'); assert.deepEqual(restored.goals, []);
});
