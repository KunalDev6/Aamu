/** Clinic heuristics from U14/U16/U17/U20. No I/O, clock, personal text or diagnosis. */
export type ClinicLevel = 'easy' | 'medium' | 'hard' | 'stopped' | 'no_response' | 'off';
export type ClassifiedStatus = 'might_need_call' | 'drifting' | 'steady';
export type ClinicStatus = ClassifiedStatus | 'insufficient';
export type ClinicMorning = {
  localDate: string; level: ClinicLevel | null; upAt: number | null; stepDone: boolean | null;
};
export type LastClassified = { status: ClassifiedStatus; localDate: string };
export type ClinicRecord = {
  id: string; startedOn: string; mornings: readonly ClinicMorning[]; lastClassified: LastClassified | null;
};
export const clinicLabels: Record<ClinicStatus, string> = {
  might_need_call: 'Might need a call', drifting: 'Drifting',
  insufficient: 'Not enough recent mornings', steady: 'Steady',
};
export const clinicValues: Readonly<Record<Exclude<ClinicLevel, 'off'>, number>> = Object.freeze({
  easy: 0, medium: 1, hard: 2, stopped: 2, no_response: 3,
});
export type ClinicConfig = {
  recentDays: number; comparisonDays: number; completionComparisonDays: number;
  recentMinimum: number; comparisonMinimum: number; offReasonMinimum: number;
  callNoResponse: number; callHeavy: number; callAverageIncrease: number;
  driftHardStopped: number; driftAverageIncrease: number;
  doneRecentMaximum: number; donePreviousMinimum: number;
};
export const clinicConfig: Readonly<ClinicConfig> = Object.freeze({
  recentDays: 7, comparisonDays: 14, completionComparisonDays: 7,
  recentMinimum: 3, comparisonMinimum: 5, offReasonMinimum: 7,
  callNoResponse: 3, callHeavy: 5, callAverageIncrease: 1,
  driftHardStopped: 3, driftAverageIncrease: 0.5,
  doneRecentMaximum: 2, donePreviousMinimum: 4,
});
export type RuleId = 'no_response' | 'heavy_mornings' | 'call_average'
  | 'hard_stopped' | 'drift_average' | 'completion_decline';
export type ClinicRule = { id: RuleId; status: 'might_need_call' | 'drifting'; reason: string };
export type ClinicSummary = {
  observed: number; average: number | null; noResponse: number; hardStopped: number; heavy: number;
  done: number; stoppedConfirmed: number; stoppedUnconfirmed: number; noResponseConfirmed: number;
};
export type ClinicWindow = ClinicSummary & { start: string; end: string };
export type ClinicResult = {
  id: string; status: ClinicStatus; label: string; reason: string; rules: ClinicRule[];
  recent: ClinicWindow; comparison: ClinicWindow; previousDone: number;
  limitedHistory: boolean; consecutiveOff: number; lastObservedOn: string | null;
  previousClassification: LastClassified | null; nextLastClassified: LastClassified | null;
};

const dayMs = 86_400_000;
function dayNumber(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Expected a local calendar date');
  const milliseconds = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0, 10) !== value) {
    throw new Error('Invalid local calendar date');
  }
  return milliseconds / dayMs;
}
export function shiftClinicDate(date: string, days: number): string {
  if (!Number.isInteger(days)) throw new Error('Expected whole calendar days');
  return new Date((dayNumber(date) + days) * dayMs).toISOString().slice(0, 10);
}
const observed = (morning: ClinicMorning) => morning.level !== null && morning.level !== 'off';
function summarize(rows: readonly ClinicMorning[]): ClinicSummary {
  const samples = rows.filter(observed);
  const count = (predicate: (row: ClinicMorning) => boolean) => samples.filter(predicate).length;
  return {
    observed: samples.length,
    average: samples.length ? samples.reduce((sum, row) => sum + clinicValues[row.level as Exclude<ClinicLevel, 'off'>], 0) / samples.length : null,
    noResponse: count(row => row.level === 'no_response'),
    hardStopped: count(row => row.level === 'hard' || row.level === 'stopped'),
    heavy: count(row => row.level === 'hard' || row.level === 'stopped' || row.level === 'no_response'),
    done: count(row => row.stepDone === true),
    stoppedConfirmed: count(row => row.level === 'stopped' && row.upAt !== null),
    stoppedUnconfirmed: count(row => row.level === 'stopped' && row.upAt === null),
    noResponseConfirmed: count(row => row.level === 'no_response' && row.upAt !== null),
  };
}

/** Evaluate every fired rule so reasons remain complete even when a higher tier wins. */
export function evaluateClinicRules(
  recent: ClinicSummary, comparison: ClinicSummary, previousDone: number,
  config: Readonly<ClinicConfig> = clinicConfig,
): ClinicRule[] {
  if (recent.observed < config.recentMinimum) return [];
  const rules: ClinicRule[] = [];
  const add = (id: RuleId, status: ClinicRule['status'], reason: string) => rules.push({ id, status, reason });
  if (recent.noResponse >= config.callNoResponse) add('no_response', 'might_need_call',
    `${recent.noResponse} no-response mornings in the recent ${config.recentDays} days`);
  if (recent.heavy >= config.callHeavy) add('heavy_mornings', 'might_need_call',
    `${recent.heavy} hard, stopped or no-response mornings in the recent ${config.recentDays} days`);
  const difference = comparison.observed >= config.comparisonMinimum && comparison.average !== null && recent.average !== null
    ? recent.average - comparison.average : null;
  if (difference !== null && difference >= config.callAverageIncrease) add('call_average', 'might_need_call',
    `Recent average increased by ${Number(difference.toFixed(2))} (call threshold ${config.callAverageIncrease})`);
  if (recent.hardStopped >= config.driftHardStopped) add('hard_stopped', 'drifting',
    `${recent.hardStopped} hard or stopped mornings in the recent ${config.recentDays} days`);
  if (difference !== null && difference >= config.driftAverageIncrease) add('drift_average', 'drifting',
    `Recent average increased by ${Number(difference.toFixed(2))} (drifting threshold ${config.driftAverageIncrease})`);
  if (recent.done <= config.doneRecentMaximum && previousDone >= config.donePreviousMinimum) add('completion_decline', 'drifting',
    `Steps completed on ${recent.done} recent days, compared with ${previousDone} of the preceding ${config.completionComparisonDays} days`);
  return rules;
}

export function classifyClinic(
  record: ClinicRecord, today: string, config: Readonly<ClinicConfig> = clinicConfig,
): ClinicResult {
  const nowDay = dayNumber(today);
  const startedDay = dayNumber(record.startedOn);
  if (startedDay > nowDay) throw new Error('Start date cannot be in the future');
  for (const [name, value] of Object.entries(config)) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid clinic config: ${name}`);
  }
  for (const name of ['recentDays', 'comparisonDays', 'completionComparisonDays', 'recentMinimum', 'comparisonMinimum', 'offReasonMinimum'] as const) {
    if (!Number.isInteger(config[name]) || config[name] < 1) throw new Error(`Invalid clinic config: ${name}`);
  }
  const byDate = new Map<string, ClinicMorning>();
  for (const morning of record.mornings) {
    dayNumber(morning.localDate);
    if (byDate.has(morning.localDate)) throw new Error('Duplicate morning date');
    byDate.set(morning.localDate, morning);
  }
  if (record.lastClassified && dayNumber(record.lastClassified.localDate) > nowDay) throw new Error('Future historical classification');
  const todayRow = byDate.get(today);
  const recentEnd = todayRow && todayRow.level !== null ? today : shiftClinicDate(today, -1);
  const recentStart = shiftClinicDate(recentEnd, 1 - config.recentDays);
  const comparisonEnd = shiftClinicDate(recentStart, -1);
  const comparisonStart = shiftClinicDate(comparisonEnd, 1 - config.comparisonDays);
  const rowsBetween = (start: string, end: string) => record.mornings.filter(row => row.localDate >= start && row.localDate <= end);
  const recent: ClinicWindow = { start: recentStart, end: recentEnd, ...summarize(rowsBetween(recentStart, recentEnd)) };
  const comparison: ClinicWindow = { start: comparisonStart, end: comparisonEnd, ...summarize(rowsBetween(comparisonStart, comparisonEnd)) };
  const previousDone = summarize(rowsBetween(shiftClinicDate(comparisonEnd, 1 - config.completionComparisonDays), comparisonEnd)).done;
  const lastObservedOn = record.mornings.filter(row => row.localDate <= recentEnd && observed(row))
    .map(row => row.localDate).sort().at(-1) ?? null;
  // Missing/pending today does not establish that the alarm is still off today.
  let consecutiveOff = 0;
  for (let date = today; byDate.get(date)?.level === 'off'; date = shiftClinicDate(date, -1)) consecutiveOff += 1;
  const limitedHistory = comparison.observed < config.comparisonMinimum;
  const rules = evaluateClinicRules(recent, comparison, previousDone, config);
  const status: ClinicStatus = recent.observed < config.recentMinimum ? 'insufficient'
    : rules.some(rule => rule.status === 'might_need_call') ? 'might_need_call'
      : rules.length ? 'drifting' : 'steady';
  const reasons: string[] = [];
  if (status === 'insufficient') {
    if (!record.lastClassified) {
      reasons.push(`Started ${nowDay - startedDay} days ago. ${recent.observed} mornings recorded.`);
      if (consecutiveOff >= config.offReasonMinimum) reasons.push(`Alarm off for ${consecutiveOff} days.`);
    } else {
      if (consecutiveOff >= config.offReasonMinimum) reasons.push(`Alarm off for ${consecutiveOff} days.`);
      else if (recent.observed === 0) reasons.push(`No mornings recorded in the last ${config.recentDays} days.`);
      else reasons.push(`${recent.observed} mornings recorded in the last ${config.recentDays} days.`);
      reasons.push(`Last status: ${clinicLabels[record.lastClassified.status]}, ${nowDay - dayNumber(record.lastClassified.localDate)} days ago.`);
    }
  } else {
    reasons.push(...rules.map(rule => `${rule.reason}.`));
    if (!rules.length) reasons.push('No selected pattern rule fired.');
    if (status === 'steady' && limitedHistory) reasons.push('limited history.');
    if (consecutiveOff >= config.offReasonMinimum) reasons.push(`Alarm off for ${consecutiveOff} days.`);
  }
  if (recent.stoppedConfirmed) reasons.push(`${recent.stoppedConfirmed} alarm stopped; getting up confirmed later.`);
  if (recent.stoppedUnconfirmed) reasons.push(`${recent.stoppedUnconfirmed} alarm stopped but getting up not confirmed.`);
  if (recent.noResponseConfirmed) reasons.push(`${recent.noResponseConfirmed} no response in the first hour; getting up confirmed later.`);
  return { id: record.id, status, label: clinicLabels[status], reason: reasons.join(' '), rules,
    recent, comparison, previousDone, limitedHistory, consecutiveOff, lastObservedOn,
    previousClassification: record.lastClassified,
    nextLastClassified: status === 'insufficient' ? record.lastClassified : { status, localDate: today } };
}

/** Unknown last-observation dates retain their supplied slots; no priority is invented. */
export function sortClinicRows<T extends ClinicResult>(rows: readonly T[]): T[] {
  const statuses: readonly ClinicStatus[] = ['might_need_call', 'drifting', 'insufficient', 'steady'];
  return statuses.flatMap(status => {
    const group = rows.filter(row => row.status === status);
    if (status !== 'insufficient') return group;
    const known = group.filter(row => row.lastObservedOn !== null).sort((left, right) =>
      left.lastObservedOn! < right.lastObservedOn! ? -1 : left.lastObservedOn! > right.lastObservedOn! ? 1 : 0);
    let index = 0;
    return group.map(row => row.lastObservedOn === null ? row : known[index++]);
  });
}
