import { buildBaselines, type Baselines, type MorningRecord } from '../../../shared/mornings/engine.ts';
import type { LocalGoal } from '../../../src/goals/approval.ts';

export type DemoSeedMorning = MorningRecord & { goalId: null; messageId: null; phase: 'home'; syncPending: true; upSyncPending: false };
export type DemoSeedState = {
  version: 1; setupStep: number; setupComplete: true; goals: LocalGoal[];
  alarm: { hour: number; minute: number; enabled: true }; messages: []; place: 'sea'; placeClip: null;
  mornings: DemoSeedMorning[]; rotationGoalId: string; sensingBaselines: Baselines; replyNotes: [];
  goalSync: { generation: number; pending: true; lastAllocatedRevision: number };
  clinicSharing: { enabled: true; code: string; revision: number; syncPending: true };
  demoSeed: { version: 1; seededAt: number; nativeAlarmSetupPending: true };
};

export const demoSeedConfig = Object.freeze({
  stateKey: 'aamu.presenter-demo.v1',
  normalStateKey: 'aamu.local.v1',
  safePersonKey: 'aamu.demo-safe-person',
  normalSafePersonKey: 'aamu.safe-person',
  clinicCode: 'AAMU-DEMO',
  historyDays: 14,
});
export const demoSafePerson = Object.freeze({ name: 'Sam (demo)', number: '' });
/** Demo data uses separate server tables; real auth and pairing stay shared. */
export function demoDataHeaders(path: string, enabled: boolean): Record<string, string> {
  return enabled && (path === '/goals' || path === '/goals/revision' || path.startsWith('/mornings/'))
    ? { 'X-Aamu-Demo': 'true' } : {};
}
const dateLabel = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Presenter fixtures only. No audio, recorded voice, identity or pairing. */
export function createDemoSeed(now: number, goalId: string): DemoSeedState {
  const mornings: DemoSeedMorning[] = [];
  for (let daysAgo = demoSeedConfig.historyDays; daysAgo > 0; daysAgo--) {
    const day = new Date(now); day.setDate(day.getDate() - daysAgo); day.setHours(7, 0, 0, 0);
    const scheduledAt = day.getTime(); const upAt = scheduledAt + 8 * 60_000;
    mornings.push({ localDate: dateLabel(day), scheduledAt, firstRingAt: scheduledAt, upAt,
      minutesToUp: 8, minutesBeforeAlarm: null, snoozeCount: 0, voiceState: 'unavailable',
      speechShare: null, speechOnsetMs: null, stepSize: null, stepDone: null,
      stepOffered: false, stepRemoved: false, utcOffsetMinutes: -day.getTimezoneOffset(), level: 'easy',
      goalId: null, messageId: null, phase: 'home', syncPending: true, upSyncPending: false });
  }
  return {
    version: 1, setupStep: 5, setupComplete: true,
    goals: [{ id: goalId, goalText: 'Let a little fresh air into my day.',
      steps: { tiny: 'Open the curtains.', small: 'Stand outside for a few minutes.', full: 'Take a gentle walk.' },
      approved: true, revision: 1, localOnly: false, latestVerdict: 'ok' }],
    alarm: { hour: 7, minute: 0, enabled: true }, messages: [], place: 'sea', placeClip: null,
    mornings, rotationGoalId: goalId, sensingBaselines: buildBaselines(mornings), replyNotes: [],
    goalSync: { generation: 1, pending: true, lastAllocatedRevision: 0 },
    clinicSharing: { enabled: true, code: demoSeedConfig.clinicCode, revision: 1, syncPending: true },
    demoSeed: { version: 1, seededAt: now, nativeAlarmSetupPending: true },
  };
}

/** Reload never appends/reseeds history or replaces edited goals and contacts. */
export function initialAppState<T extends object>(input: {
  demo: boolean; stored: T | null; empty: T; now: number; goalId: string;
}): T | DemoSeedState {
  return input.stored ?? (input.demo ? createDemoSeed(input.now, input.goalId) : input.empty);
}

export type SafeContact = { name: string; number: string };
export function safeContactAction(contact: SafeContact, action: 'call' | 'text', demo: boolean):
  { simulation: true; notice: string } | { simulation: false; url: string } | null {
  if (demo) return { simulation: true,
    notice: `Demo: would ${action} ${contact.name.replace(/\s*\(demo\)\s*$/i, '').trim() || 'your safe person'}` };
  const number = contact.number.replace(/[^+\d]/g, '');
  return number ? { simulation: false, url: `${action === 'call' ? 'tel' : 'sms'}:${number}` } : null;
}
