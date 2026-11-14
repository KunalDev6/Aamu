import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBaselines, classifyUnconfirmed, dawnDuration, getCarrySize, morningConfig, scoreMorning, sizeForMorning,
  type MorningRecord, type VoiceState } from '../../shared/mornings/engine.ts';

const dayMs = 86_400_000;
function morning(day: number, overrides: Partial<MorningRecord> = {}): MorningRecord {
  const date = Date.UTC(2026, 8, 1) + day * dayMs;
  const scheduledAt = date + 7 * 60 * 60_000;
  return {
    localDate: new Date(date).toISOString().slice(0, 10), scheduledAt, firstRingAt: scheduledAt,
    upAt: scheduledAt + 8 * 60_000, minutesToUp: 8, minutesBeforeAlarm: null,
    snoozeCount: 0, voiceState: 'spoke', speechShare: 0.8, speechOnsetMs: 500,
    stepSize: 'small', stepDone: null, stepOffered: true, stepRemoved: false,
    utcOffsetMinutes: 0, level: 'easy', ...overrides,
  };
}
const history = (count: number, overrides: Partial<MorningRecord> = {}) => Array.from({ length: count }, (_, day) => morning(day, overrides));

test('main baselines use defaults before five, clamped medians at five/thirteen and freeze first fourteen', () => {
  for (const count of [4, 5, 13, 14, 20]) {
    const rows = history(count, { snoozeCount: 4, minutesToUp: 20 });
    const main = buildBaselines(rows.reverse()).main;
    assert.equal(main.count, Math.min(count, 14));
    assert.equal(main.snoozeCount, count < 5 ? 0 : 1);
    assert.equal(main.minutesToUp, count < 5 ? 8 : 12);
    assert.equal(main.ready, count >= 5);
    assert.equal(main.frozen, count >= 14);
    assert.deepEqual(main.dates, history(Math.min(count, 14)).map(row => row.localDate));
  }
  const original = history(14, { minutesToUp: 4, snoozeCount: 0 });
  assert.deepEqual(buildBaselines([...original, ...history(8).map((row, i) => morning(i + 14, { minutesToUp: 45, snoozeCount: 9 }))]).main,
    buildBaselines(original).main);
});

test('even-sample medians average the two central values without rounding', () => {
  const rows = history(6).map((row, index) => ({ ...row, minutesToUp: index + 1 }));
  assert.equal(buildBaselines(rows).main.minutesToUp, 3.5);
});

test('hard and early holds qualify; stopped/no_response/off, absent and late holds do not', () => {
  const early = morning(1); early.upAt = early.scheduledAt - 30 * 60_000;
  early.firstRingAt = null; early.minutesToUp = 0; early.minutesBeforeAlarm = 30;
  const rows = [morning(0, { level: 'hard' }), early,
    morning(2, { level: 'stopped' }), morning(3, { level: 'no_response' }), morning(4, { level: 'off' }),
    morning(5, { upAt: null }), morning(6, { upAt: morning(6).scheduledAt + 61 * 60_000 }),
    morning(7, { level: null }), morning(8, { minutesToUp: null })];
  assert.deepEqual(buildBaselines(rows).main.dates, [morning(0).localDate, early.localDate]);
});

test('voice collects its own valid spoke samples and may freeze after the main baseline', () => {
  const rows = history(14).map((row, i) => ({ ...row, voiceState: (i < 4 ? 'spoke' : 'silent') as VoiceState }));
  const first = buildBaselines(rows);
  assert.equal(first.main.frozen, true); assert.equal(first.voice.count, 4);
  assert.equal(first.voice.ready, false); assert.equal(first.voice.speechShare, null);
  const fifth = morning(14, { speechShare: 0.1 });
  assert.equal(buildBaselines([...rows, fifth]).voice.speechShare, 0.8);
  const completed = [...rows, ...Array.from({ length: 10 }, (_, i) => morning(14 + i, { speechShare: 0.2 }))];
  const frozen = buildBaselines(completed).voice;
  assert.equal(frozen.frozen, true); assert.equal(frozen.speechShare, 0.4);
  assert.deepEqual(frozen.dates, [...history(4), ...history(10).map((_, i) => morning(14 + i))].map(row => row.localDate));
  assert.deepEqual(buildBaselines([...completed, morning(24, { speechShare: 1 })]).voice, frozen);
  assert.equal(buildBaselines(history(6, { speechShare: Number.NaN })).voice.count, 0);
  assert.equal(buildBaselines(history(6, { speechShare: 1.1 })).voice.count, 0);
});

test('today is excluded even if supplied in history; fifth uses defaults and sixth uses prior-five medians', () => {
  const previous = history(4, { minutesToUp: 2 });
  const fifth = morning(4, { minutesToUp: 4, speechOnsetMs: 3_000 });
  const score5 = scoreMorning(fifth, [...previous, fifth, morning(9)]);
  assert.equal(score5.baselines.main.count, 4); assert.equal(score5.baselines.main.minutesToUp, 8);
  assert.equal(score5.timingPoints, 0); assert.equal(score5.voicePoints, 0);
  const sixth = scoreMorning(morning(5, { minutesToUp: 4, speechOnsetMs: 3_000 }), [...previous, fifth]);
  assert.equal(sixth.baselines.main.minutesToUp, 2); assert.equal(sixth.timingPoints, 1);
  assert.equal(sixth.baselines.voice.count, 5); assert.equal(sixth.voicePoints, 1);
});

test('timing comparisons floor zero at one without changing stored early-hold baselines', () => {
  const rows = history(5).map(row => ({ ...row, upAt: row.scheduledAt - 60_000, firstRingAt: null, minutesToUp: 0, minutesBeforeAlarm: 1 }));
  for (const [minutesToUp, expected] of [[0, 0], [1.49, 0], [1.5, 1], [9.99, 1], [10, 2]]) {
    const score = scoreMorning(morning(5, { minutesToUp, voiceState: 'unavailable' }), rows);
    assert.equal(score.baselines.main.minutesToUp, 0); assert.equal(score.timingPoints, expected);
  }
});

test('snooze and timing boundaries produce the selected easy/medium/hard levels', () => {
  const rows = history(5);
  const cases = [
    { snoozes: 0, minutes: 8, points: 0, level: 'easy' },
    { snoozes: 1, minutes: 8, points: 1, level: 'easy' },
    { snoozes: 2, minutes: 8, points: 2, level: 'medium' },
    { snoozes: 0, minutes: 12, points: 1, level: 'easy' },
    { snoozes: 0, minutes: 16, points: 2, level: 'medium' },
    { snoozes: 1, minutes: 16, points: 3, level: 'hard' },
  ];
  for (const row of cases) {
    const scored = scoreMorning(morning(5, { snoozeCount: row.snoozes, minutesToUp: row.minutes, voiceState: 'failed' }), rows);
    assert.equal(scored.points, row.points); assert.equal(scored.level, row.level);
  }
});

test('usually-speaking rolling gate handles four/five/fourteen histories and silent denominator', () => {
  for (const [count, spoken, expected] of [[4, 4, false], [5, 3, true], [5, 2, false], [14, 7, true], [14, 5, false]] as const) {
    const rows = history(count).map((row, i) => ({ ...row, voiceState: (i < spoken ? 'spoke' : 'silent') as VoiceState }));
    for (const voiceState of ['silent', 'skipped'] as const) {
      const score = scoreMorning(morning(20, { voiceState, speechShare: null, speechOnsetMs: null }), rows);
      assert.equal(score.usuallySpeaks, expected); assert.equal(score.voiceHistoryCount, count);
      assert.equal(score.voicePoints, expected ? 1 : 0);
    }
  }
});

test('usual-speaking window skips unavailable/failed/late/off and uses most recent fourteen eligible dates', () => {
  const rows = [
    ...history(10), ...Array.from({ length: 14 }, (_, i) => morning(10 + i, { voiceState: 'skipped' })),
    morning(24, { voiceState: 'failed' }), morning(25, { voiceState: 'unavailable' }),
    morning(26, { level: 'stopped' }), morning(27, { level: 'off' }), morning(28, { level: 'no_response' }),
  ];
  const result = scoreMorning(morning(30, { voiceState: 'silent' }), rows.reverse());
  assert.equal(result.voiceHistoryCount, 14); assert.equal(result.usuallySpeaks, false); assert.equal(result.voicePoints, 0);
  const configured = scoreMorning(morning(4, { voiceState: 'skipped' }), [morning(0), morning(1), morning(2, { voiceState: 'silent' })],
    { ...morningConfig, usualSpeakingWindow: 3, usualSpeakingMinimum: 2, usualSpeakingRatio: 2 / 3 });
  assert.equal(configured.voicePoints, 1);
});

test('spoke rules require five prior valid samples and onset plus quietness contribute only one', () => {
  for (const count of [4, 5]) {
    const score = scoreMorning(morning(20, { speechOnsetMs: 2_500, speechShare: 0.1, snoozeCount: 2, minutesToUp: 16 }), history(count));
    assert.equal(score.voicePoints, count === 5 ? 1 : 0);
    assert.equal(score.points, count === 5 ? 5 : 4);
  }
  assert.equal(scoreMorning(morning(20, { speechOnsetMs: null, speechShare: 0.8 }), history(5)).voicePoints, 0);
  for (const voiceState of ['unavailable', 'failed'] as const) {
    assert.equal(scoreMorning(morning(20, { voiceState, speechShare: 0, speechOnsetMs: 3_000 }), history(5)).voicePoints, 0);
  }
});

test('unconfirmed or unfinished normal mornings stay pending; frozen outcomes never rescore after a late hold', () => {
  for (const overrides of [{ upAt: null }, { voiceState: null }, { minutesToUp: null }]) {
    const score = scoreMorning(morning(5, overrides), history(5));
    assert.equal(score.level, null); assert.equal(score.points, null);
  }
  for (const level of ['stopped', 'no_response', 'off'] as const) {
    const score = scoreMorning(morning(5, { level, snoozeCount: 10, minutesToUp: 90 }), history(5));
    assert.equal(score.level, level); assert.equal(score.points, null);
  }
});

test('initial carry is Small; morning cap, completion, explicit noncompletion and unknown use final offered size', () => {
  assert.equal(getCarrySize([]), 'small');
  assert.equal(sizeForMorning('easy', getCarrySize([])), 'small');
  assert.equal(sizeForMorning('medium', 'full'), 'small'); assert.equal(sizeForMorning('hard', 'full'), 'tiny');
  for (const [stepDone, expected] of [[true, 'full'], [false, 'tiny'], [null, 'small']] as const) {
    assert.equal(getCarrySize([morning(0, { stepSize: 'small', stepDone })]), expected);
  }
  assert.equal(getCarrySize([morning(0, { stepSize: 'full', stepDone: true })]), 'full');
  assert.equal(getCarrySize([morning(0, { stepSize: 'tiny', stepDone: false })]), 'tiny');
  assert.equal(sizeForMorning('off', 'full'), null); assert.equal(sizeForMorning(null, 'full'), null);
});

test('late Tiny offered outcomes progress independently of stopped/no_response labels', () => {
  for (const level of ['stopped', 'no_response'] as const) {
    for (const [stepDone, expected] of [[true, 'small'], [false, 'tiny'], [null, 'tiny']] as const) {
      assert.equal(getCarrySize([morning(0, { level, stepSize: 'tiny', stepDone })]), expected);
    }
    assert.equal(sizeForMorning(level, 'full'), 'tiny');
  }
});

test('each finalized no-offer day lowers carry once; off/pending preserve it; removal leaves Tiny', () => {
  const monday = morning(0, { stepDone: true });
  const tuesday = morning(1, { level: 'stopped', stepOffered: false, stepSize: null });
  const wednesday = morning(2, { level: 'no_response', stepOffered: false, stepSize: null });
  const thursday = morning(3, { level: 'stopped', stepOffered: false, stepSize: null });
  assert.equal(getCarrySize([monday]), 'full');
  assert.equal(getCarrySize([tuesday, monday]), 'small');
  assert.equal(getCarrySize([monday, tuesday, wednesday]), 'tiny');
  assert.equal(getCarrySize([monday, tuesday, wednesday, thursday]), 'tiny');
  assert.equal(getCarrySize([monday, morning(1, { level: 'off', stepOffered: false }), morning(2, { level: null, stepOffered: false })]), 'full');
  assert.equal(getCarrySize([monday, morning(1, { stepRemoved: true, stepSize: null })]), 'tiny');
});

test('dawn uses latest three prior observed calendar days, classifies all heavy levels and skips off', () => {
  const today = morning(20).localDate;
  assert.equal(dawnDuration([morning(17), morning(18), morning(19, { level: 'medium' })], today).durationMs, 120_000);
  for (const level of ['hard', 'stopped', 'no_response'] as const) {
    const dawn = dawnDuration([morning(16, { level }), morning(17, { level }), morning(18), morning(19, { level: 'off' })], today);
    assert.equal(dawn.tier, 'heavy'); assert.equal(dawn.durationMs, 360_000); assert.equal(dawn.lowerStartingVolume, true);
  }
  const mixed = dawnDuration([morning(17), morning(18, { level: 'medium' }), morning(19, { level: 'hard' })], today);
  assert.equal(mixed.durationMs, 240_000); assert.equal(mixed.lowerStartingVolume, false);
  assert.equal(dawnDuration([morning(17), morning(18), morning(19, { level: null }), morning(20), morning(21)], today).durationMs, 240_000);
});

test('dawn defaults to middle with insufficient history or a fifteen-day gap; fast tiers are 10/15/20 seconds', () => {
  const today = morning(20).localDate;
  for (const rows of [[], [morning(19)], [morning(18), morning(19)], [morning(3), morning(4), morning(5)]]) {
    assert.equal(dawnDuration(rows, today).durationMs, 240_000);
  }
  for (const [level, expected] of [['easy', 10_000], ['medium', 15_000], ['hard', 20_000]] as const) {
    assert.equal(dawnDuration([morning(17, { level }), morning(18, { level }), morning(19, { level })], today, true).durationMs, expected);
  }
});

test('unconfirmed classification waits for first-ring deadline and uses any observed in-window interaction', () => {
  const firstRing = 1_000; const cutoff = firstRing + 3_600_000;
  assert.equal(classifyUnconfirmed(null, cutoff, []), 'pending');
  assert.equal(classifyUnconfirmed(firstRing, cutoff - 1, []), 'pending');
  assert.equal(classifyUnconfirmed(firstRing, cutoff, []), 'no_response');
  for (const event of ['system snooze', 'system stop', 'app open', 'in-app snooze']) {
    assert.equal(classifyUnconfirmed(firstRing, cutoff, [firstRing + 5_000]), 'stopped', event);
  }
  assert.equal(classifyUnconfirmed(firstRing, cutoff + 60_000, [firstRing - 1, cutoff + 1]), 'no_response');
  assert.equal(classifyUnconfirmed(firstRing, cutoff + 60_000, [firstRing + 5_000, cutoff + 1]), 'stopped');
  assert.equal(classifyUnconfirmed(firstRing, firstRing + 59_999, [], true), 'pending');
  assert.equal(classifyUnconfirmed(firstRing, firstRing + 60_000, [], true), 'no_response');
});
