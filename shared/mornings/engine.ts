// Pure, local morning rules. Callers own clocks, native evidence, persistence and
// one-record-per-localDate reconciliation; this module never fabricates events.
export type MorningLevel = 'easy' | 'medium' | 'hard' | 'stopped' | 'no_response' | 'off';
export type StepSize = 'tiny' | 'small' | 'full';
export type VoiceState = 'spoke' | 'silent' | 'skipped' | 'unavailable' | 'failed';
export type MorningRecord = {
  localDate: string;
  scheduledAt: number;
  firstRingAt: number | null;
  upAt: number | null;
  minutesToUp: number | null;
  minutesBeforeAlarm: number | null;
  snoozeCount: number;
  voiceState: VoiceState | null;
  speechShare: number | null;
  speechOnsetMs: number | null;
  stepSize: StepSize | null;
  stepDone: boolean | null;
  stepOffered: boolean;
  stepRemoved: boolean;
  utcOffsetMinutes: number;
  level: MorningLevel | null;
};

export type MorningConfig = {
  baselineWindow: number; baselineMinimum: number;
  defaultSnoozes: number; defaultMinutes: number;
  snoozeBaselineCeiling: number; minutesBaselineCeiling: number; speechBaselineFloor: number;
  comparisonMinutesFloor: number;
  usualSpeakingWindow: number; usualSpeakingMinimum: number; usualSpeakingRatio: number;
  delayedOnsetMs: number; quietSpeechRatio: number;
  normalWindowMs: number; fastWindowMs: number;
  dawnHistoryDays: number; dawnObservationCount: number; dawnMajority: number;
  dawnLightMs: number; dawnMiddleMs: number; dawnHeavyMs: number;
  fastDawnLightMs: number; fastDawnMiddleMs: number; fastDawnHeavyMs: number;
};
export const morningConfig: Readonly<MorningConfig> = Object.freeze({
  baselineWindow: 14, baselineMinimum: 5,
  defaultSnoozes: 0, defaultMinutes: 8,
  snoozeBaselineCeiling: 1, minutesBaselineCeiling: 12, speechBaselineFloor: 0.4,
  comparisonMinutesFloor: 1,
  usualSpeakingWindow: 14, usualSpeakingMinimum: 5, usualSpeakingRatio: 0.5,
  delayedOnsetMs: 2_500, quietSpeechRatio: 0.6,
  normalWindowMs: 60 * 60_000, fastWindowMs: 60_000,
  dawnHistoryDays: 14, dawnObservationCount: 3, dawnMajority: 2,
  dawnLightMs: 2 * 60_000, dawnMiddleMs: 4 * 60_000, dawnHeavyMs: 6 * 60_000,
  fastDawnLightMs: 10_000, fastDawnMiddleMs: 15_000, fastDawnHeavyMs: 20_000,
});

const normalLevel = (level: MorningLevel | null) => level === 'easy' || level === 'medium' || level === 'hard';
const ordered = (history: readonly MorningRecord[]) => [...history].sort((a, b) => a.localDate.localeCompare(b.localDate));
const finiteNonnegative = (value: number | null): value is number => value !== null && Number.isFinite(value) && value >= 0;
const validShare = (value: number | null): value is number => finiteNonnegative(value) && value <= 1;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function qualifyingHold(morning: MorningRecord, config: Readonly<MorningConfig>): boolean {
  if (!normalLevel(morning.level) || morning.upAt === null || !Number.isFinite(morning.upAt)) return false;
  if (!finiteNonnegative(morning.minutesToUp) || !finiteNonnegative(morning.snoozeCount)) return false;
  if (morning.upAt < morning.scheduledAt) return true; // Confirmed early holds qualify without a ring.
  return morning.firstRingAt !== null && morning.upAt >= morning.firstRingAt &&
    morning.upAt - morning.firstRingAt <= config.normalWindowMs;
}

export type Baselines = {
  main: { count: number; ready: boolean; frozen: boolean; snoozeCount: number; minutesToUp: number; dates: string[] };
  voice: { count: number; ready: boolean; frozen: boolean; speechShare: number | null; dates: string[] };
};
export function buildBaselines(history: readonly MorningRecord[], config: Readonly<MorningConfig> = morningConfig): Baselines {
  const qualifying = ordered(history).filter(morning => qualifyingHold(morning, config));
  const main = qualifying.slice(0, config.baselineWindow);
  // Voice may take longer than the main collection to reach fourteen recordings.
  const voice = qualifying.filter(morning => morning.voiceState === 'spoke' && validShare(morning.speechShare))
    .slice(0, config.baselineWindow);
  const mainReady = main.length >= config.baselineMinimum;
  const voiceReady = voice.length >= config.baselineMinimum;
  return {
    main: {
      count: main.length, ready: mainReady, frozen: main.length >= config.baselineWindow,
      snoozeCount: mainReady ? Math.min(median(main.map(morning => morning.snoozeCount)), config.snoozeBaselineCeiling) : config.defaultSnoozes,
      minutesToUp: mainReady ? Math.min(median(main.map(morning => morning.minutesToUp!)), config.minutesBaselineCeiling) : config.defaultMinutes,
      dates: main.map(morning => morning.localDate),
    },
    voice: {
      count: voice.length, ready: voiceReady, frozen: voice.length >= config.baselineWindow,
      speechShare: voiceReady ? Math.max(median(voice.map(morning => morning.speechShare!)), config.speechBaselineFloor) : null,
      dates: voice.map(morning => morning.localDate),
    },
  };
}

export type MorningScore = {
  level: MorningLevel | null; points: number | null;
  snoozePoints: number; timingPoints: number; voicePoints: number;
  baselines: Baselines; usuallySpeaks: boolean; voiceHistoryCount: number;
};
export function scoreMorning(today: MorningRecord, priorHistory: readonly MorningRecord[], config: Readonly<MorningConfig> = morningConfig): MorningScore {
  // Deliberately filter by the recorded local date: today can never score itself.
  const prior = ordered(priorHistory.filter(morning => morning.localDate < today.localDate));
  const baselines = buildBaselines(prior, config);
  const usualHistory = prior.filter(morning => normalLevel(morning.level) &&
    (morning.voiceState === 'spoke' || morning.voiceState === 'silent' || morning.voiceState === 'skipped'))
    .slice(-config.usualSpeakingWindow);
  const spokenCount = usualHistory.filter(morning => morning.voiceState === 'spoke').length;
  const usuallySpeaks = usualHistory.length >= config.usualSpeakingMinimum &&
    spokenCount >= Math.ceil(usualHistory.length * config.usualSpeakingRatio);
  const empty = { points: null, snoozePoints: 0, timingPoints: 0, voicePoints: 0, baselines,
    usuallySpeaks, voiceHistoryCount: usualHistory.length };
  if (today.level === 'stopped' || today.level === 'no_response' || today.level === 'off') return { ...empty, level: today.level };
  // No inferred hold, voice outcome or late classification. Caller completes those stages first.
  if (today.upAt === null || !finiteNonnegative(today.minutesToUp) || today.voiceState === null ||
    !qualifyingHold({ ...today, level: 'easy' }, config)) return { ...empty, level: null };
  const snoozePoints = today.snoozeCount >= baselines.main.snoozeCount + 2 ? 2 :
    today.snoozeCount >= baselines.main.snoozeCount + 1 ? 1 : 0;
  const timingBaseline = Math.max(config.comparisonMinutesFloor, baselines.main.minutesToUp);
  const timingPoints = today.minutesToUp >= Math.max(10, 2 * timingBaseline) ? 2 :
    today.minutesToUp >= 1.5 * timingBaseline ? 1 : 0;
  let voicePoints = 0;
  if (today.voiceState === 'silent' || today.voiceState === 'skipped') voicePoints = usuallySpeaks ? 1 : 0;
  if (today.voiceState === 'spoke' && baselines.voice.ready) {
    const delayed = finiteNonnegative(today.speechOnsetMs) && today.speechOnsetMs >= config.delayedOnsetMs;
    const quiet = validShare(today.speechShare) && today.speechShare <= config.quietSpeechRatio * baselines.voice.speechShare!;
    voicePoints = delayed || quiet ? 1 : 0;
  }
  const points = snoozePoints + timingPoints + voicePoints;
  return { level: points <= 1 ? 'easy' : points === 2 ? 'medium' : 'hard', points,
    snoozePoints, timingPoints, voicePoints, baselines, usuallySpeaks, voiceHistoryCount: usualHistory.length };
}

const sizes: StepSize[] = ['tiny', 'small', 'full'];
const moveSize = (size: StepSize, change: number): StepSize => sizes[Math.max(0, Math.min(sizes.length - 1, sizes.indexOf(size) + change))];
export function getCarrySize(history: readonly MorningRecord[], initial: StepSize = 'small'): StepSize {
  let carry = initial;
  // Supply completed prior dates, not today's still-editable outcome. No missing
  // date is invented here; the native/store layer owns missed-day backfill.
  for (const morning of ordered(history)) {
    if (morning.level === null || morning.level === 'off') continue;
    if (morning.stepOffered) {
      if (morning.stepRemoved) carry = 'tiny';
      else if (morning.stepSize !== null) carry = moveSize(morning.stepSize, morning.stepDone === true ? 1 : morning.stepDone === false ? -1 : 0);
    } else if (morning.level === 'stopped' || morning.level === 'no_response') carry = moveSize(carry, -1);
  }
  return carry;
}

export function sizeForMorning(level: MorningLevel | null, carry: StepSize): StepSize | null {
  if (level === null || level === 'off') return null;
  // For stopped/no_response the caller must first confirm the separate late hold.
  const limit = level === 'easy' ? 'full' : level === 'medium' ? 'small' : 'tiny';
  return sizes[Math.min(sizes.indexOf(carry), sizes.indexOf(limit))];
}

export type DawnDuration = { tier: 'light' | 'middle' | 'heavy'; durationMs: number; lowerStartingVolume: boolean; dates: string[] };
export function dawnDuration(history: readonly MorningRecord[], nowLocalDate: string, fast = false, config: Readonly<MorningConfig> = morningConfig): DawnDuration {
  // ISO local dates are calendar labels; UTC arithmetic avoids host timezone/DST drift.
  const today = Date.parse(`${nowLocalDate}T00:00:00Z`);
  const earliest = today - config.dawnHistoryDays * 86_400_000;
  const observed = ordered(history).filter(morning => {
    const date = Date.parse(`${morning.localDate}T00:00:00Z`);
    return morning.level !== null && morning.level !== 'off' && date >= earliest && date < today;
  }).slice(-config.dawnObservationCount);
  let tier: DawnDuration['tier'] = 'middle';
  if (observed.length >= config.dawnObservationCount) {
    const heavy = observed.filter(morning => morning.level === 'hard' || morning.level === 'stopped' || morning.level === 'no_response').length;
    const light = observed.filter(morning => morning.level === 'easy').length;
    tier = heavy >= config.dawnMajority ? 'heavy' : light >= config.dawnMajority ? 'light' : 'middle';
  }
  const normal = { light: config.dawnLightMs, middle: config.dawnMiddleMs, heavy: config.dawnHeavyMs };
  const accelerated = { light: config.fastDawnLightMs, middle: config.fastDawnMiddleMs, heavy: config.fastDawnHeavyMs };
  return { tier, durationMs: (fast ? accelerated : normal)[tier], lowerStartingVolume: tier === 'heavy', dates: observed.map(morning => morning.localDate) };
}

export function classifyUnconfirmed(firstRingAt: number | null, now: number, interactionAt: readonly number[], fast = false, config: Readonly<MorningConfig> = morningConfig): 'pending' | 'stopped' | 'no_response' {
  // Call only without a timely completed hold and before a category is frozen.
  if (firstRingAt === null || !Number.isFinite(firstRingAt)) return 'pending';
  const cutoff = firstRingAt + (fast ? config.fastWindowMs : config.normalWindowMs);
  if (now < cutoff) return 'pending';
  return interactionAt.some(time => Number.isFinite(time) && time >= firstRingAt && time <= cutoff) ? 'stopped' : 'no_response';
}
