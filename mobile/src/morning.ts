import type { AppMorning, AppState } from './store';
import { localDate } from './store';
import { buildBaselines, classifyUnconfirmed, getCarrySize, scoreMorning, sizeForMorning, type VoiceState } from '../../shared/mornings/engine';
import { setMessageCompletion } from '../../shared/messages/engine';
import { homeConfig } from '../../src/home/presentation';
import { shrinkOfferedStep, undoRemovedStep } from '../../src/home/removal';

export const morningTiming = { holdMs: 2000, snoozeSeconds: 300, landingDawnMs: 20_000, earlyWindowMinutes: homeConfig.earlyWindowMinutes, skyFinishMs: 3000, soundFadeMs: 2000 };
export function scheduledTime(state: AppState, now = new Date()): number | null {
  if (!state.alarm) return null;
  const scheduled = new Date(now); scheduled.setHours(state.alarm.hour, state.alarm.minute, 0, 0); return scheduled.getTime();
}
export function newMorning(scheduledAt: number, early = false): AppMorning {
  const date = new Date(scheduledAt);
  return { localDate: localDate(date), scheduledAt, firstRingAt: early ? null : scheduledAt,
    upAt: null, minutesToUp: null, minutesBeforeAlarm: null, snoozeCount: 0,
    voiceState: null, speechShare: null, speechOnsetMs: null, stepSize: null, stepDone: null,
    stepOffered: false, stepRemoved: false, utcOffsetMinutes: -date.getTimezoneOffset(),
    level: null, goalId: null, messageId: null, phase: 'dawn', interactionAt: [], dawnProgress: 0 };
}
export function replaceMorning(state: AppState, morning: AppMorning): AppState {
  const found = state.mornings.some(item => item.localDate === morning.localDate);
  return { ...state, mornings: found ? state.mornings.map(item => item.localDate === morning.localDate ? morning : item) : [...state.mornings, morning] };
}
export function recordMidnight(morning: AppMorning): number {
  return Date.parse(`${morning.localDate}T00:00:00Z`) + 86_400_000 - morning.utcOffsetMinutes * 60_000;
}
export function confirmHold(state: AppState, morning: AppMorning, now: number): AppState {
  if (morning.upAt !== null || now >= recordMidnight(morning) || morning.level === 'off') return state;
  const early = now < morning.scheduledAt;
  const category = classifyUnconfirmed(morning.firstRingAt, now, morning.interactionAt ?? []);
  const level = morning.level ?? (category === 'pending' ? null : category);
  const late = level === 'stopped' || level === 'no_response';
  const updated: AppMorning = { ...morning, upAt: now, level, minutesToUp: early ? 0 : (now - morning.scheduledAt) / 60_000,
    minutesBeforeAlarm: early ? Math.max(0, Math.floor((morning.scheduledAt - now) / 60_000)) : null,
    snoozeCount: early ? 0 : morning.snoozeCount, phase: late ? 'home' : 'voice', dawnProgress: 1, upSyncPending: true, syncPending: true };
  const next = replaceMorning(state, updated);
  return late ? offerToday(next, updated.localDate) : next;
}
export function finishVoice(state: AppState, date: string, voiceState: VoiceState,
  measurement?: { speechShare: number; speechOnsetMs: number | null }): AppState {
  const morning = state.mornings.find(item => item.localDate === date);
  if (!morning || morning.upAt === null || morning.phase !== 'voice') return state;
  const measured = { ...morning, voiceState, speechShare: measurement?.speechShare ?? null,
    speechOnsetMs: measurement?.speechOnsetMs ?? null };
  const score = scoreMorning(measured, state.mornings);
  if (score.level === null) return state;
  const updated = replaceMorning(state, { ...measured, level: score.level, phase: 'message' });
  // Persisting the frozen baseline snapshot is handled alongside the store; this
  // pure derivation uses first-14 dates, so later observations cannot change it.
  return { ...updated, sensingBaselines: buildBaselines(updated.mornings) };
}
export function offerToday(state: AppState, date: string, now = Date.now()): AppState {
  const morning = state.mornings.find(item => item.localDate === date);
  if (!morning || morning.stepOffered || !morning.upAt || !morning.level || morning.level === 'off') return state;
  const goals = state.goals.filter(goal => goal.approved);
  if (!goals.length) return state;
  const index = Math.max(0, goals.findIndex(goal => goal.id === state.rotationGoalId));
  const goal = goals[index];
  const carry = getCarrySize(state.mornings.filter(item => item.localDate < date));
  const stepSize = sizeForMorning(morning.level, carry);
  if (!stepSize) return state;
  const next = replaceMorning(state, { ...morning, goalId: goal.id, stepSize, stepText: goal.steps[stepSize], stepLadder: { ...goal.steps }, stepOffered: true, stepOfferedAt: now, stepDone: null, syncPending: true });
  return { ...next, rotationGoalId: goals[(index + 1) % goals.length].id };
}
export function updateStepDone(state: AppState, date: string, done: boolean | null): AppState {
  const morning = state.mornings.find(item => item.localDate === date);
  if (!morning?.stepOffered || !morning.stepSize || morning.stepRemoved) return state;
  const dayNow = new Date(Date.now() + morning.utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
  if (dayNow !== date) return state;
  const learned = morning.messageLedger ? setMessageCompletion(state.messages, morning.messageLedger, done, dayNow) : null;
  return replaceMorning({ ...state, messages: learned?.messages ?? state.messages }, {
    ...morning, stepDone: done, syncPending: true, messageLedger: learned?.ledger ?? morning.messageLedger,
  });
}
export function shrinkToday(state: AppState, date: string, now = Date.now()): AppState {
  return shrinkOfferedStep(state, date, now);
}
export function undoTodayRemoval(state: AppState, date: string, now = Date.now()): AppState {
  return undoRemovedStep(state, date, now);
}
