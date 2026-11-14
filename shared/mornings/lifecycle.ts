import { classifyUnconfirmed, scoreMorning, type MorningRecord } from './engine.ts';

export type AlarmScheduleChange = { effectiveAt: number; hour: number; minute: number; enabled: boolean; utcOffsetMinutes: number };
export type AlarmEvent = {
  sequence: number; type: 'ring' | 'stop' | 'snooze' | 'app_open';
  source: 'system_intent' | 'native_observer' | 'app'; occurredAt: string;
  alarmId: string; originalScheduledAt: string; localDate: string; offsetMinutes: number;
};
export type LifecycleMorning = MorningRecord & {
  goalId: string | null; messageId: string | null;
  phase?: 'dawn' | 'snoozed' | 'voice' | 'message' | 'home';
  interactionAt?: number[]; dawnProgress?: number; snoozeUntil?: number; voiceStartedAt?: number;
  ringObserved?: boolean; nativeAlarmId?: string; syncPending?: boolean;
};
export type LifecycleState = { mornings: LifecycleMorning[]; nativeEventSequence?: number;
  alarmScheduleHistory?: AlarmScheduleChange[]; nativeScheduleHorizonEnd?: number | null };
export type MorningNavigation = { screen: 'alarm' | 'voice' | 'message'; localDate: string; kind?: 'foreground' | 'landing' | 'late' };
export const lifecycleConfig = { pollMs: 1_000, snoozeMs: 300_000 } as const;
const dayMs = 86_400_000;
export const dateAtOffset = (time: number, offsetMinutes: number) => new Date(time + offsetMinutes * 60_000).toISOString().slice(0, 10);
export const morningMidnight = (morning: Pick<MorningRecord, 'localDate' | 'utcOffsetMinutes'>) =>
  Date.parse(`${morning.localDate}T00:00:00Z`) + dayMs - morning.utcOffsetMinutes * 60_000;

export function morningIsLate(morning: MorningRecord | undefined, now: number, fast = false): boolean {
  return Boolean(morning && morning.upAt === null && (morning.level === 'stopped' || morning.level === 'no_response' ||
    classifyUnconfirmed(morning.firstRingAt, now, [], fast) !== 'pending'));
}
export function needsMorningNavigation(destination: MorningNavigation, pathname: string, params: { date?: string; kind?: string }): boolean {
  if (pathname !== `/${destination.screen}` || params.date !== destination.localDate) return true;
  if (destination.screen !== 'alarm') return false;
  // A delayed ring observation must not restart a hold already in a normal
  // dawn. Date changes and early/normal/late mode changes still update the route.
  const mode = (kind?: string) => kind === 'early' || kind === 'late' ? kind : 'normal';
  return mode(destination.kind) !== mode(params.kind);
}

function blank(localDate: string, scheduledAt: number, utcOffsetMinutes: number, enabled: boolean): LifecycleMorning {
  return { localDate, scheduledAt, firstRingAt: enabled ? scheduledAt : null, upAt: null,
    minutesToUp: null, minutesBeforeAlarm: null, snoozeCount: 0, voiceState: null,
    speechShare: null, speechOnsetMs: null, stepSize: null, stepDone: null,
    stepOffered: false, stepRemoved: false, utcOffsetMinutes, level: enabled ? null : 'off',
    goalId: null, messageId: null, phase: enabled ? 'dawn' : 'home', interactionAt: [], dawnProgress: 0,
    ringObserved: false, syncPending: !enabled };
}

// Only explicit schedule intervals create dates. An alarm edited/disabled after
// its old due time cannot rewrite that morning, and no pre-setup dates are made.
export function scheduledMornings(history: readonly AlarmScheduleChange[], now: number): LifecycleMorning[] {
  const changes = [...history].sort((a, b) => a.effectiveAt - b.effectiveAt);
  const dates = new Map<string, LifecycleMorning>();
  for (let index = 0; index < changes.length; index++) {
    const change = changes[index];
    const end = Math.min(now, changes[index + 1]?.effectiveAt ?? now);
    if (!Number.isFinite(change.effectiveAt) || change.effectiveAt > now) continue;
    const firstDate = dateAtOffset(change.effectiveAt, change.utcOffsetMinutes);
    const firstDay = Date.parse(`${firstDate}T00:00:00Z`);
    const lastDay = Date.parse(`${dateAtOffset(end, change.utcOffsetMinutes)}T00:00:00Z`);
    for (let day = firstDay; day <= lastDay; day += dayMs) {
      const scheduledAt = day + (change.hour * 60 + change.minute - change.utcOffsetMinutes) * 60_000;
      if (scheduledAt < change.effectiveAt || scheduledAt > now || (index + 1 < changes.length && scheduledAt >= changes[index + 1].effectiveAt)) continue;
      const localDate = new Date(day).toISOString().slice(0, 10);
      // Duplicate/skipped travel dates are the documented one-record-per-date limitation.
      if (!dates.has(localDate)) dates.set(localDate, blank(localDate, scheduledAt, change.utcOffsetMinutes, change.enabled));
    }
  }
  return [...dates.values()];
}

export function reconcileLifecycle<T extends LifecycleState>(state: T, input: {
  now: number; events?: readonly AlarmEvent[]; openedAt?: number | null;
  previousCheckAt?: number | null; recoverInterruptedVoice?: boolean; fast?: boolean;
}): { state: T; navigation: MorningNavigation | null; changedDates: string[]; nativeHorizonExpired: boolean } {
  const { now, fast = false } = input;
  const mornings = new Map(state.mornings.map(morning => [morning.localDate, morning]));
  const changed = new Set<string>(); const ringing = new Set<string>();
  let cursor = state.nativeEventSequence ?? 0;
  function save(morning: LifecycleMorning) { mornings.set(morning.localDate, morning); changed.add(morning.localDate); }
  for (const proposed of scheduledMornings(state.alarmScheduleHistory ?? [], now)) {
    if (!mornings.has(proposed.localDate)) save(proposed);
  }
  for (const event of [...(input.events ?? [])].sort((a, b) => a.sequence - b.sequence)) {
    if (!Number.isSafeInteger(event.sequence) || event.sequence <= cursor) continue;
    cursor = event.sequence;
    const occurredAt = Date.parse(event.occurredAt); const scheduledAt = Date.parse(event.originalScheduledAt);
    if (!Number.isFinite(occurredAt) || !Number.isFinite(scheduledAt) || !/^\d{4}-\d{2}-\d{2}$/.test(event.localDate)) continue;
    let morning = mornings.get(event.localDate) ?? blank(event.localDate, scheduledAt, event.offsetMinutes, true);
    if (morning.level === 'off') continue; // A deliberate off record is never changed by a stale native event.
    if (morning.upAt !== null && occurredAt > morning.upAt) continue; // Wake sensing ended with the hold.
    morning = { ...morning, nativeAlarmId: event.alarmId };
    if (event.type === 'ring') {
      // An observer can first see an already-ringing alarm much later. Keep the
      // original scheduled origin rather than resetting the first-ring window.
      morning = { ...morning, ringObserved: true };
      if (occurredAt <= now) ringing.add(event.localDate);
      if (morning.phase === 'snoozed' && occurredAt >= (morning.snoozeUntil ?? scheduledAt)) morning = { ...morning, phase: 'dawn', snoozeUntil: undefined };
    } else {
      const interactionAt = morning.interactionAt ?? [];
      morning = { ...morning, interactionAt: interactionAt.includes(occurredAt) ? interactionAt : [...interactionAt, occurredAt] };
      if (event.type === 'snooze') morning = { ...morning, snoozeCount: morning.snoozeCount + 1,
        ...(morning.upAt === null && morning.level === null ? { phase: 'snoozed', snoozeUntil: occurredAt + lifecycleConfig.snoozeMs } as const : {}) };
    }
    if (morning.level !== null) morning.syncPending = true;
    save(morning);
  }
  for (const original of mornings.values()) {
    let morning = original;
    if (input.openedAt !== null && input.openedAt !== undefined && morning.firstRingAt !== null && morning.upAt === null && morning.level !== 'off' &&
      input.openedAt >= morning.firstRingAt && input.openedAt < morningMidnight(morning)) {
      const interactionAt = morning.interactionAt ?? [];
      if (!interactionAt.includes(input.openedAt)) morning = { ...morning, interactionAt: [...interactionAt, input.openedAt] };
    }
    if (morning.upAt === null && morning.level === null) {
      const outcome = classifyUnconfirmed(morning.firstRingAt, now, morning.interactionAt ?? [], fast);
      if (outcome !== 'pending') morning = { ...morning, level: outcome, syncPending: true };
    }
    if (input.recoverInterruptedVoice && morning.upAt !== null && morning.phase === 'voice' && morning.voiceStartedAt !== undefined && morning.voiceState === null) {
      const failed = { ...morning, voiceState: 'failed' as const, speechShare: null, speechOnsetMs: null };
      const score = scoreMorning(failed, [...mornings.values()]);
      if (score.level !== null) morning = { ...failed, level: score.level, phase: 'message', syncPending: true };
    }
    if (morning !== original) save(morning);
  }
  const current = [...mornings.values()].filter(morning => (morning.scheduledAt <= now || (morning.upAt !== null && morning.upAt <= now)) && now < morningMidnight(morning))
    .sort((a, b) => b.scheduledAt - a.scheduledAt)[0];
  let navigation: MorningNavigation | null = null;
  const opening = input.openedAt !== undefined && input.openedAt !== null;
  if (current && current.level !== 'off') {
    if (current.upAt !== null) {
      if (opening && (current.phase === 'voice' || current.phase === 'message')) navigation = { screen: current.phase, localDate: current.localDate };
    } else {
      const dueCrossed = input.previousCheckAt !== null && input.previousCheckAt !== undefined && current.scheduledAt > input.previousCheckAt;
      const snoozeExpired = current.phase === 'snoozed' && current.snoozeUntil !== undefined && now >= current.snoozeUntil;
      // Returning to Aamu takes over/cancels the native snooze; staying on Home
      // after an in-app Snooze waits for the next ring instead.
      const waitingSnooze = current.phase === 'snoozed' && !snoozeExpired && !opening;
      const windowJustEnded = (current.level === 'stopped' || current.level === 'no_response') &&
        state.mornings.find(morning => morning.localDate === current.localDate)?.level == null;
      if (!waitingSnooze && (opening || dueCrossed || ringing.has(current.localDate) || snoozeExpired || windowJustEnded)) {
        const late = current.level === 'stopped' || current.level === 'no_response';
        navigation = { screen: 'alarm', localDate: current.localDate, kind: late ? 'late' : opening ? 'landing' : 'foreground' };
        if (snoozeExpired || (opening && current.phase === 'snoozed')) save({ ...current, phase: 'dawn', snoozeUntil: undefined });
      }
    }
  }
  const next = changed.size || cursor !== (state.nativeEventSequence ?? 0)
    ? { ...state, mornings: [...mornings.values()].sort((a, b) => a.localDate.localeCompare(b.localDate)), nativeEventSequence: cursor } : state;
  return { state: next as T, navigation, changedDates: [...changed],
    nativeHorizonExpired: state.nativeScheduleHorizonEnd != null && now > state.nativeScheduleHorizonEnd };
}
