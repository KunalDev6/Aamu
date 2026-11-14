import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyClinic, clinicConfig, evaluateClinicRules, shiftClinicDate, sortClinicRows,
  type ClinicLevel, type ClinicMorning, type ClinicRecord, type ClinicSummary } from '../../shared/clinic/engine.ts';

const today = '2026-11-14';
const date = (offset: number) => shiftClinicDate(today, offset);
const morning = (offset: number, level: ClinicLevel | null = 'easy', stepDone: boolean | null = null,
  upAt: number | null = null): ClinicMorning => ({ localDate: date(offset), level, stepDone, upAt });
const sequence = (count: number, start: number, level: ClinicLevel = 'easy', done: boolean | null = null) =>
  Array.from({ length: count }, (_, i) => morning(start + i, level, done));
function record(mornings: ClinicMorning[], extra: Partial<ClinicRecord> = {}): ClinicRecord {
  return { id: 'demo', startedOn: date(-60), mornings, lastClassified: null, ...extra };
}
function summary(extra: Partial<ClinicSummary> = {}): ClinicSummary {
  return { observed: 7, average: 0, noResponse: 0, hardStopped: 0, heavy: 0, done: 3,
    stoppedConfirmed: 0, stoppedUnconfirmed: 0, noResponseConfirmed: 0, ...extra };
}
const ids = (recent: Partial<ClinicSummary>, comparison: Partial<ClinicSummary> = {}, previousDone = 0) =>
  evaluateClinicRules(summary(recent), summary(comparison), previousDone).map(rule => rule.id);

test('brand-new and two-observation records are insufficient, never steady', () => {
  const empty = classifyClinic(record([], { startedOn: today }), today);
  assert.equal(empty.status, 'insufficient');
  assert.equal(empty.label, 'Not enough recent mornings');
  assert.equal(empty.reason, 'Started 0 days ago. 0 mornings recorded.');
  const two = classifyClinic(record([morning(-1, 'no_response'), morning(0, 'no_response')]), today);
  assert.equal(two.status, 'insufficient'); assert.deepEqual(two.rules, []);
  assert.equal(two.recent.observed, 2); assert.equal(two.recent.average, 3);
});

test('all-off seven and twenty-one days keep historical status factual, without an empty average', () => {
  for (const days of [7, 21]) {
    const history = { status: 'drifting' as const, localDate: date(-days) };
    const result = classifyClinic(record(sequence(days, 1 - days, 'off'), { lastClassified: history }), today);
    assert.equal(result.status, 'insufficient'); assert.equal(result.consecutiveOff, days);
    assert.equal(result.recent.average, null); assert.equal(result.recent.observed, 0);
    assert.equal(result.reason, `Alarm off for ${days} days. Last status: Drifting, ${days} days ago.`);
    assert.deepEqual(result.nextLastClassified, history);
  }
});

test('an off run is stated even when no prior classification exists', () => {
  const result = classifyClinic(record(sequence(7, -6, 'off'), { startedOn: date(-7) }), today);
  assert.equal(result.status, 'insufficient');
  assert.equal(result.reason, 'Started 7 days ago. 0 mornings recorded. Alarm off for 7 days.');
  assert.equal(result.nextLastClassified, null);
});

test('no recent records and one/two observations report accurate historical reasons', () => {
  const history = { status: 'might_need_call' as const, localDate: date(-10) };
  const empty = classifyClinic(record([], { lastClassified: history }), today);
  assert.equal(empty.reason, 'No mornings recorded in the last 7 days. Last status: Might need a call, 10 days ago.');
  const two = classifyClinic(record([morning(-1), morning(0)], { lastClassified: history }), today);
  assert.equal(two.status, 'insufficient');
  assert.match(two.reason, /^2 mornings recorded/); assert.doesNotMatch(two.reason, /No mornings/);
});

test('thin comparison history skips both average rules but retains count/completion rules', () => {
  const thin = summary({ observed: 4, average: 0 });
  assert.deepEqual(evaluateClinicRules(summary({ average: 3 }), thin, 0), []);
  assert.deepEqual(evaluateClinicRules(summary({ average: 3, noResponse: 3, done: 2 }), thin, 4)
    .map(rule => rule.id), ['no_response', 'completion_decline']);
  const result = classifyClinic(record([morning(-2, 'medium'), morning(-1), morning(0)]), today);
  assert.equal(result.status, 'steady'); assert.equal(result.limitedHistory, true);
  assert.match(result.reason, /limited history\./);
});

test('no-response and heavy call triggers are inclusive at three and five', () => {
  assert.ok(ids({ noResponse: 3 }).includes('no_response'));
  assert.ok(!ids({ noResponse: 2 }).includes('no_response'));
  assert.ok(ids({ heavy: 5 }).includes('heavy_mornings'));
  assert.ok(!ids({ heavy: 4 }).includes('heavy_mornings'));
});

test('average thresholds compare exact unrounded values at 1/.99 and .5/.49', () => {
  assert.ok(ids({ average: 2 }, { average: 1 }).includes('call_average'));
  assert.ok(!ids({ average: 1.99 }, { average: 1 }).includes('call_average'));
  assert.ok(ids({ average: 1.5 }, { average: 1 }).includes('drift_average'));
  assert.ok(!ids({ average: 1.49 }, { average: 1 }).includes('drift_average'));
  assert.ok(ids({ average: 1 }, { observed: 5, average: 0 }).includes('call_average'));
  assert.ok(!ids({ average: 1 }, { observed: 4, average: 0 }).includes('call_average'));
});

test('hard/stopped drifting threshold and completion thresholds are inclusive', () => {
  assert.ok(ids({ hardStopped: 3 }).includes('hard_stopped'));
  assert.ok(!ids({ hardStopped: 2 }).includes('hard_stopped'));
  for (const [recent, previous, expected] of [[2, 4, true], [3, 4, false], [2, 3, false]] as const) {
    assert.equal(ids({ done: recent }, {}, previous).includes('completion_decline'), expected);
  }
});

test('three stopped means drifting and five stopped means might need call, never no-response', () => {
  for (const [count, expected] of [[3, 'drifting'], [5, 'might_need_call']] as const) {
    const rows = sequence(count, 1 - count, 'stopped'); rows[0].upAt = 123;
    const result = classifyClinic(record(rows), today);
    assert.equal(result.status, expected); assert.equal(result.recent.average, 2);
    assert.equal(result.recent.noResponse, 0); assert.equal(result.recent.stoppedConfirmed, 1);
    assert.equal(result.recent.stoppedUnconfirmed, count - 1);
    assert.match(result.reason, /1 alarm stopped; getting up confirmed later\./);
    assert.match(result.reason, new RegExp(`${count - 1} alarm stopped but getting up not confirmed\\.`));
    assert.ok(!result.rules.some(rule => rule.id === 'no_response'));
  }
});

test('late-confirmed no_response keeps value three, no-response counts and exact approved wording', () => {
  const result = classifyClinic(record([morning(-2, 'no_response', true, 42),
    morning(-1, 'no_response'), morning(0, 'no_response')]), today);
  assert.equal(result.status, 'might_need_call'); assert.equal(result.recent.average, 3);
  assert.equal(result.recent.noResponse, 3); assert.equal(result.recent.noResponseConfirmed, 1);
  assert.match(result.reason, /1 no response in the first hour; getting up confirmed later\./);
});

test('pending today shifts the recent seven and preceding fourteen; final today enters them', () => {
  const rows = [...sequence(21, -21), morning(0, null)];
  const pending = classifyClinic(record(rows), today);
  assert.equal(pending.recent.end, date(-1)); assert.equal(pending.recent.start, date(-7));
  assert.equal(pending.comparison.start, date(-21)); assert.equal(pending.comparison.end, date(-8));
  assert.equal(pending.recent.observed, 7); assert.equal(pending.comparison.observed, 14);
  const final = classifyClinic(record([...rows.slice(0, -1), morning(0, 'hard')]), today);
  assert.equal(final.recent.start, date(-6)); assert.equal(final.recent.end, today);
  assert.equal(final.comparison.start, date(-20)); assert.equal(final.comparison.end, date(-7));
  assert.equal(final.recent.average, 2 / 7);
});

test('off is final for calendar placement but off/missing/pending never enter denominators or done counts', () => {
  const result = classifyClinic(record([morning(-6, 'easy', true), morning(-4, 'medium', true),
    morning(-3, null, true), morning(-2, 'hard', false), morning(0, 'off', true),
    morning(-8, 'easy'), morning(-10, 'off'), morning(-11, 'hard')]), today);
  assert.equal(result.recent.end, today); assert.equal(result.recent.observed, 3);
  assert.equal(result.recent.average, 1); assert.equal(result.recent.done, 2);
  assert.equal(result.comparison.observed, 2); assert.equal(result.comparison.average, 1);
});

test('completion comparison uses the preceding seven, not every fourteen comparison day', () => {
  const oldDone = sequence(7, -20, 'easy', true);
  const recent = sequence(7, -6);
  const without = classifyClinic(record([...oldDone, ...recent]), today);
  assert.equal(without.previousDone, 0); assert.ok(!without.rules.some(rule => rule.id === 'completion_decline'));
  const withPrevious = classifyClinic(record([...oldDone, ...sequence(4, -10, 'easy', true), ...recent]), today);
  assert.equal(withPrevious.previousDone, 4); assert.ok(withPrevious.rules.some(rule => rule.id === 'completion_decline'));
});

test('highest tier wins while every fired rule remains in the reason', () => {
  const recent = [morning(-6, 'no_response'), morning(-5, 'no_response'), morning(-4, 'no_response'),
    morning(-3, 'hard'), morning(-2, 'stopped'), morning(-1, 'hard'), morning(0, 'medium')];
  const result = classifyClinic(record([...sequence(14, -20, 'easy', true), ...recent]), today);
  assert.equal(result.status, 'might_need_call');
  assert.deepEqual(result.rules.map(rule => rule.id), ['no_response', 'heavy_mornings', 'call_average',
    'hard_stopped', 'drift_average', 'completion_decline']);
  for (const rule of result.rules) assert.ok(result.reason.includes(rule.reason));
});

test('every configured threshold participates without changing the selected defaults', () => {
  const config = { ...clinicConfig, recentMinimum: 2, comparisonMinimum: 2, callNoResponse: 2,
    callHeavy: 2, callAverageIncrease: 0.2, driftHardStopped: 2, driftAverageIncrease: 0.1,
    doneRecentMaximum: 1, donePreviousMinimum: 2 };
  const rules = evaluateClinicRules(summary({ observed: 2, average: 0.2, noResponse: 2, heavy: 2, hardStopped: 2, done: 1 }),
    summary({ observed: 2 }), 2, config);
  assert.equal(rules.length, 6); assert.equal(clinicConfig.recentMinimum, 3);
  const windows = classifyClinic(record(sequence(10, -9)), today,
    { ...clinicConfig, recentDays: 3, comparisonDays: 5, completionComparisonDays: 2 });
  assert.equal(windows.recent.start, date(-2)); assert.equal(windows.comparison.start, date(-7));
});

test('classified output proposes a new historical fact; insufficient preserves its prior fact', () => {
  const prior = { status: 'drifting' as const, localDate: date(-9) };
  const input = record(sequence(3, -2), { lastClassified: prior });
  const before = JSON.stringify(input); const result = classifyClinic(input, today);
  assert.deepEqual(result.previousClassification, prior);
  assert.deepEqual(result.nextLastClassified, { status: 'steady', localDate: today });
  assert.equal(JSON.stringify(input), before);
  assert.equal(classifyClinic(record([], { lastClassified: prior }), today).nextLastClassified, prior);
});

test('status sorting is prioritized; insufficient known dates sort oldest first without inventing unknown/tie priority', () => {
  const old = classifyClinic(record([morning(-30)], { id: 'old' }), today);
  const newer = classifyClinic(record([morning(-10)], { id: 'newer' }), today);
  const unknown = classifyClinic(record([], { id: 'unknown' }), today);
  const tie = { ...newer, id: 'tie' };
  const steady = classifyClinic(record(sequence(3, -2), { id: 'steady' }), today);
  const drifting = classifyClinic(record(sequence(3, -2, 'stopped'), { id: 'drift' }), today);
  const call = classifyClinic(record(sequence(3, -2, 'no_response'), { id: 'call' }), today);
  const input = [steady, newer, unknown, old, tie, drifting, call];
  assert.deepEqual(sortClinicRows(input).map(row => row.id), ['call', 'drift', 'old', 'unknown', 'newer', 'tie', 'steady']);
  assert.equal(input[0].id, 'steady');
});

test('missing or pending today never fabricates a current consecutive off run', () => {
  for (const todayRows of [[], [morning(0, null)]]) {
    const result = classifyClinic(record([...sequence(8, -8, 'off'), ...todayRows]), today);
    assert.equal(result.consecutiveOff, 0);
  }
  assert.equal(classifyClinic(record([...sequence(8, -8, 'off'), morning(0, 'off')]), today).consecutiveOff, 9);
});

test('calendar arithmetic crosses month/year boundaries without device timezone dependence', () => {
  assert.equal(shiftClinicDate('2026-01-01', -1), '2025-12-31');
  assert.equal(shiftClinicDate('2028-03-01', -1), '2028-02-29');
  assert.throws(() => shiftClinicDate('2026-02-30', 1));
  assert.throws(() => classifyClinic(record([morning(0), morning(0)]), today), /Duplicate/);
  assert.throws(() => classifyClinic(record([], { startedOn: date(1) }), today));
});
