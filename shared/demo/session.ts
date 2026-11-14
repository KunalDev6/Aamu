import { classifyUnconfirmed, dawnDuration, getCarrySize, scoreMorning, sizeForMorning, type MorningRecord, type StepSize } from '../mornings/engine.ts';
import { selectMessage, type MessageLevel, type MessageMetadata } from '../messages/engine.ts';
import type { LocalGoal } from '../../src/goals/approval.ts';
import type { Steps } from '../../api/src/goals/contracts.ts';
import { homeConfig, type StepRemovalUndo } from '../../src/home/presentation.ts';

/** 'sensed' scores the demo morning from its own snoozes and getting-up time,
 * using the same rules as a real morning. A picked level is a labelled override. */
export type DemoLevelChoice = MessageLevel | 'sensed';
export type DemoMorning = MorningRecord & {
  selectedLevel: DemoLevelChoice; snoozedMs?: number; snoozedAt?: number; phase: 'dawn' | 'snoozed' | 'voice' | 'message' | 'home';
  dawnStartedAt: number; dawnDurationMs: number; dawnLowerStart: boolean; dawnProgress: number; holdSky?: number;
  snoozeUntil?: number; voiceEndsAt?: number; goalId: string | null; stepText: string | null;
  stepLadder?: Steps; messageId: string | null; stepRemovalUndo?: StepRemovalUndo;
};
export type DemoSession = { version: 1; history: DemoMorning[]; fast: boolean; selectedLevel: DemoLevelChoice;
  rotationGoalId: string | null; paired: boolean; partnerUp: boolean; callbackRequested: boolean; restedMessageIds: string[];
  /** Guided demo only: offer this one goal every morning, and start from this carried size. */
  onlyGoalId?: string | null; initialCarry?: StepSize };
export type DemoResources = { goals: readonly LocalGoal[]; messages: readonly MessageMetadata[] };
// Fast time: a snooze re-rings after eight seconds and still counts as the
// five minutes it stands for; ringing time counts twelvefold (10 s ≈ 2 min).
export const demoTiming = { holdMs: 2_000, voiceMs: 5_000, snoozeMs: 300_000, fastSnoozeMs: 8_000,
  snoozeMinutes: 5, fastRingScale: 12, finishSkyMs: 3_000, fadeMs: 2_000 } as const;
export const emptyDemoSession = (): DemoSession => ({ version: 1, history: [], fast: false, selectedLevel: 'sensed', rotationGoalId: null,
  paired: false, partnerUp: false, callbackRequested: false, restedMessageIds: [] });
export const currentDemoMorning = (session: DemoSession) => session.history.at(-1);
const replace = (session: DemoSession, morning: DemoMorning): DemoSession => ({ ...session,
  history: session.history.map(item => item.localDate === morning.localDate ? morning : item) });
const resumed = (morning: DemoMorning, now: number): DemoMorning => ({ ...morning, phase: 'dawn', dawnStartedAt: now,
  snoozeUntil: undefined, snoozedAt: undefined,
  snoozedMs: (morning.snoozedMs ?? 0) + Math.max(0, now - (morning.snoozedAt ?? now)) });
/** Minutes from first ring to the hold. Fast time reports the minutes it stands for. */
export function demoMinutesToUp(morning: DemoMorning, now: number, fast: boolean): number {
  const elapsed = Math.max(0, now - morning.scheduledAt);
  if (!fast) return elapsed / 60_000;
  const ringing = Math.max(0, elapsed - (morning.snoozedMs ?? 0));
  return morning.snoozeCount * demoTiming.snoozeMinutes + ringing * demoTiming.fastRingScale / 60_000;
}
/** The level this demo morning ends with: sensed from its own record, or the labelled pick. */
export function demoLevel(session: DemoSession, morning: DemoMorning): MessageLevel {
  if (morning.selectedLevel !== 'sensed') return morning.selectedLevel;
  // Demo never measures speech, so the voice term is left out rather than invented.
  const scored = scoreMorning({ ...morning, level: null, voiceState: 'unavailable' },
    session.history.filter(item => item.localDate !== morning.localDate)).level;
  return scored === 'easy' || scored === 'medium' || scored === 'hard' ? scored : 'medium';
}
export function demoSky(morning: DemoMorning | undefined, now: number): number {
  if (!morning) return 0;
  if (morning.upAt !== null) {
    const from = morning.holdSky ?? morning.dawnProgress;
    return Math.min(1, from + (1 - from) * Math.max(0, now - morning.upAt) / demoTiming.finishSkyMs);
  }
  return Math.min(1, morning.dawnProgress + (morning.phase === 'dawn' ? Math.max(0, now - morning.dawnStartedAt) / morning.dawnDurationMs : 0));
}
export function ringDemo(session: DemoSession, now: number, today: string, utcOffsetMinutes: number): DemoSession {
  const previous = currentDemoMorning(session);
  if (previous?.phase === 'snoozed') return replace(session, resumed(previous, now));
  const localDate = previous ? new Date(Date.parse(`${previous.localDate}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : today;
  const dawn = dawnDuration(session.history, localDate, session.fast);
  const morning: DemoMorning = { localDate, scheduledAt: now, firstRingAt: now, upAt: null, minutesToUp: null, minutesBeforeAlarm: null,
    snoozeCount: 0, voiceState: null, speechShare: null, speechOnsetMs: null, stepSize: null, stepDone: null,
    stepOffered: false, stepRemoved: false, utcOffsetMinutes, level: null, selectedLevel: session.selectedLevel,
    phase: 'dawn', dawnStartedAt: now, dawnDurationMs: dawn.durationMs, dawnLowerStart: dawn.lowerStartingVolume, dawnProgress: 0, goalId: null, stepText: null, messageId: null };
  return { ...session, partnerUp: false, history: [...session.history, morning] };
}
export function offerDemoStep(session: DemoSession, resources: DemoResources): DemoSession {
  const morning = currentDemoMorning(session);
  if (!morning || morning.upAt === null || !morning.level || morning.stepOffered) return session;
  const goals = resources.goals.filter(goal => goal.approved); if (!goals.length) return session;
  const only = session.onlyGoalId ? goals.findIndex(goal => goal.id === session.onlyGoalId) : -1;
  const index = only >= 0 ? only : Math.max(0, goals.findIndex(goal => goal.id === session.rotationGoalId)); const goal = goals[index];
  const size = sizeForMorning(morning.level, getCarrySize(session.history.slice(0, -1), session.initialCarry ?? 'small')); if (!size) return session;
  return { ...replace(session, { ...morning, goalId: goal.id, stepSize: size, stepText: goal.steps[size], stepLadder: { ...goal.steps }, stepOffered: true }),
    rotationGoalId: only >= 0 ? session.rotationGoalId : goals[(index + 1) % goals.length].id };
}
export function finishDemoVoice(session: DemoSession, resources: DemoResources, skipped = false, random?: () => number): DemoSession {
  const morning = currentDemoMorning(session); if (!morning || morning.phase !== 'voice') return session;
  const eligible = resources.messages.filter(message => !session.restedMessageIds.includes(message.id));
  const level = demoLevel(session, morning);
  const message = selectMessage(eligible, level, session.history.at(-2)?.messageId, random);
  const next = replace(session, { ...morning, voiceState: skipped ? 'skipped' : null, phase: 'message',
    level, voiceEndsAt: undefined, messageId: message?.id ?? null });
  return message ? next : offerDemoStep(next, resources);
}
export function holdDemo(session: DemoSession, resources: DemoResources, now: number): DemoSession {
  const morning = currentDemoMorning(session); if (!morning || morning.upAt !== null || morning.phase !== 'dawn') return session;
  const outcome = morning.level ?? classifyUnconfirmed(morning.firstRingAt, now, [morning.scheduledAt], session.fast);
  const late = outcome === 'stopped' || outcome === 'no_response';
  const message = late ? selectMessage(resources.messages.filter(item => !session.restedMessageIds.includes(item.id)), 'hard') : null;
  // A sensed morning has no simulated voice stage: the sunrise finishes, then the step appears.
  const pause = morning.selectedLevel === 'sensed' ? demoTiming.finishSkyMs : demoTiming.voiceMs;
  const next = replace(session, { ...morning, upAt: now, minutesToUp: demoMinutesToUp(morning, now, session.fast),
    holdSky: demoSky(morning, now), level: late ? outcome : null, phase: late ? 'home' : 'voice',
    voiceEndsAt: late ? undefined : now + pause, messageId: message?.id ?? null });
  return late ? offerDemoStep(next, resources) : next;
}
export function advanceDemoTime(session: DemoSession, resources: DemoResources, now: number, random?: () => number): DemoSession {
  const morning = currentDemoMorning(session); if (!morning) return session;
  if (morning.stepRemovalUndo && now >= morning.stepRemovalUndo.expiresAt) {
    return replace(session, { ...morning, stepRemovalUndo: undefined });
  }
  if (morning.phase === 'voice' && now >= (morning.voiceEndsAt ?? Infinity)) return finishDemoVoice(session, resources, false, random);
  if (morning.phase === 'snoozed' && now >= (morning.snoozeUntil ?? Infinity)) return replace(session, resumed(morning, now));
  if (morning.upAt === null && morning.level === null) {
    const outcome = classifyUnconfirmed(morning.firstRingAt, now, [morning.scheduledAt], session.fast);
    if (outcome !== 'pending') return replace(session, { ...morning, level: outcome });
  }
  return session;
}
export function snoozeDemo(session: DemoSession, now: number): DemoSession {
  const morning = currentDemoMorning(session);
  if (!morning || morning.phase !== 'dawn' || morning.upAt !== null || morning.level !== null) return session;
  return replace(session, { ...morning, phase: 'snoozed', snoozeCount: morning.snoozeCount + 1, snoozedAt: now,
    dawnProgress: demoSky(morning, now), snoozeUntil: now + (session.fast ? demoTiming.fastSnoozeMs : demoTiming.snoozeMs) });
}
export function completeDemoStep(session: DemoSession, done: boolean | null): DemoSession {
  const morning = currentDemoMorning(session); if (!morning?.stepOffered || morning.stepRemoved) return session;
  return replace(session, { ...morning, stepDone: done });
}
export function shrinkDemoStep(session: DemoSession, now = Date.now()): DemoSession {
  const morning = currentDemoMorning(session);
  if (!morning?.stepOffered || !morning.stepSize || morning.stepRemoved || morning.level === 'off') return session;
  const size = morning.stepSize === 'full' ? 'small' : morning.stepSize === 'small' ? 'tiny' : null;
  return replace(session, { ...morning, stepSize: size, stepText: size ? morning.stepLadder?.[size] ?? null : null,
    stepDone: null, stepRemoved: size === null, stepRemovalUndo: size === null ? {
      expiresAt: now + homeConfig.removalUndoMs, stepText: morning.stepText, stepDone: morning.stepDone,
    } : undefined });
}
/** Demo dates advance independently of the real phone date. Only its own expiry applies. */
export function demoRemovalNoticeVisible(morning: DemoMorning | undefined, now: number): boolean {
  return Boolean(morning?.stepOffered && morning.stepRemoved && morning.stepDone !== true
    && morning.level !== 'off' && morning.stepRemovalUndo && now < morning.stepRemovalUndo.expiresAt);
}
export function undoDemoRemoval(session: DemoSession, now: number): DemoSession {
  const morning = currentDemoMorning(session);
  if (!demoRemovalNoticeVisible(morning, now) || !morning?.stepRemovalUndo) return session;
  const undo = morning.stepRemovalUndo;
  return replace(session, { ...morning, stepSize: 'tiny', stepText: undo.stepText,
    stepDone: undo.stepDone, stepRemoved: false, stepRemovalUndo: undefined });
}
export function restDemoMessage(session: DemoSession, resources: DemoResources): DemoSession {
  const morning = currentDemoMorning(session); if (!morning?.messageId) return session;
  return offerDemoStep({ ...session, restedMessageIds: [...new Set([...session.restedMessageIds, morning.messageId])] }, resources);
}
export function showDemoHome(session: DemoSession): DemoSession {
  const morning = currentDemoMorning(session); return morning ? replace(session, { ...morning, phase: 'home' }) : session;
}
