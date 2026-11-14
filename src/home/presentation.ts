import type { MorningLevel } from '../../shared/mornings/engine.ts';

/** Shared with the native morning flow; all times here use the device's clock. */
export const homeConfig = Object.freeze({
  afternoonHour: 12,
  eveningHour: 18,
  earlyWindowMinutes: 180,
  removalUndoMs: 5_000,
});

export const homeCopy = Object.freeze({
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  alarmOff: 'Alarm is off today.',
  removed: 'That’s enough for today.',
  undo: 'Undo',
  sleepWell: 'Sleep well',
  up: 'You’re up.',
  bothUp: 'You’re both up.',
  gotUpToday: 'You got up today.',
  bothGotUpToday: 'You both got up today.',
  partnerNotUp: 'Your partner isn’t up yet.',
  nextAlarmToday: (time: string) => `Next alarm: today ${time}`,
  nextAlarmTomorrow: (time: string) => `Next alarm: tomorrow ${time}`,
});

export type HomeMorning = {
  upAt?: number | null; level?: MorningLevel | null;
  stepDone?: boolean | null; stepOffered?: boolean; stepRemoved?: boolean;
};
export type HomePresentationState = 'off' | 'early' | 'up' | 'evening' | 'night';

/** Presentation only: this never changes a schedule, confirms a hold or sends up. */
export function homePresentation(input: {
  now: number;
  alarm: { hour: number; minute: number; enabled: boolean } | null;
  today?: HomeMorning;
  paired: boolean;
  partnerUp: boolean;
}) {
  const now = new Date(input.now);
  const hour = now.getHours();
  const greeting = hour < homeConfig.afternoonHour ? homeCopy.morning
    : hour < homeConfig.eveningHour ? homeCopy.afternoon : homeCopy.evening;
  const alarmOffToday = !input.alarm?.enabled || input.today?.level === 'off';
  const confirmed = input.today?.upAt != null;
  const scheduled = new Date(now);
  if (input.alarm) scheduled.setHours(input.alarm.hour, input.alarm.minute, 0, 0);
  const tomorrow = input.now > scheduled.getTime() || confirmed || input.today?.level === 'off';
  const formattedTime = scheduled.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const earlyWindowStart = Math.max(midnight, scheduled.getTime() - homeConfig.earlyWindowMinutes * 60_000);
  const earlyWindow = !alarmOffToday && !confirmed && input.now < scheduled.getTime()
    && input.now >= earlyWindowStart;
  // Explicit Not today is false, not unanswered. A removed/nonexistent step
  // must never turn into an evening completion prompt.
  const unansweredStep = input.today?.stepOffered === true && !input.today.stepRemoved
    && input.today.stepDone === null;
  const state: HomePresentationState = alarmOffToday ? 'off' : earlyWindow ? 'early'
    : confirmed && unansweredStep && hour >= homeConfig.eveningHour ? 'evening'
      : confirmed ? 'up' : 'night';
  const eveningClock = hour >= homeConfig.eveningHour;
  const partnerUp = input.paired && input.partnerUp;
  const showConfirmedCopy = confirmed && !alarmOffToday;
  const heroTitle = !showConfirmedCopy ? null : eveningClock
    ? (partnerUp ? homeCopy.bothGotUpToday : homeCopy.gotUpToday) : homeCopy.up;
  const partnerLine = !showConfirmedCopy || !input.paired || (eveningClock && partnerUp) ? null
    : partnerUp ? homeCopy.bothUp : homeCopy.partnerNotUp;
  return {
    state,
    showSleepWell: state === 'night' && (eveningClock || input.now < earlyWindowStart),
    heroTitle,
    partnerLine,
    greeting,
    alarmOffToday,
    formattedAlarmTime: input.alarm ? formattedTime : null,
    alarmDayLabel: input.alarm ? (tomorrow ? 'tomorrow' as const : 'today' as const) : null,
    confirmed,
    partnerUp,
    nextAlarmText: input.alarm?.enabled
      ? (tomorrow ? homeCopy.nextAlarmTomorrow(formattedTime) : homeCopy.nextAlarmToday(formattedTime))
      : null,
    ownSunUp: !alarmOffToday && confirmed,
    partnerSunUp: !alarmOffToday && input.paired && input.partnerUp,
    earlyWindow,
  };
}

export type StepRemovalUndo = { expiresAt: number; stepText: string | null; stepDone: boolean | null };
export type RemovalNoticeMorning = {
  localDate: string; utcOffsetMinutes: number; level: MorningLevel | null;
  stepOffered: boolean; stepRemoved: boolean; stepRemovalUndo?: StepRemovalUndo;
};

export function removalNoticeVisible(morning: RemovalNoticeMorning | undefined, alarmEnabled: boolean, now: number): boolean {
  return Boolean(morning && alarmEnabled && morning.level !== 'off'
    && morning.stepOffered && morning.stepRemoved && morning.stepRemovalUndo
    && now < morning.stepRemovalUndo.expiresAt
    && new Date(now + morning.utcOffsetMinutes * 60_000).toISOString().slice(0, 10) === morning.localDate);
}
