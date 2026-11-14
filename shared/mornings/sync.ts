import type { MorningRecord } from './engine.ts';
import type { LocalGoal } from '../../src/goals/approval.ts';
import { goalRemoteEligibility } from '../../src/goals/eligibility.ts';
import type { GoalSyncMetadata } from '../../src/goals/sync.ts';

export type SyncMorning = MorningRecord & { goalId: string | null; stepText?: string | null;
  syncPending?: boolean; stepTextSyncPending?: boolean };
type SnapshotState = Pick<GoalSyncMetadata, 'pending' | 'acknowledgedRevision'>;
export function projectMorningUpload(morning: SyncMorning, goals: readonly LocalGoal[], goalSnapshot?: SnapshotState) {
  const checked = goalRemoteEligibility(goals.find(goal => goal.id === morning.goalId));
  // The server only saves text for an existing approved goal. Wait for its
  // authoritative snapshot acknowledgement as well as the local check gate.
  const revision = goalSnapshot?.acknowledgedRevision;
  const eligibility = checked === 'eligible' && (goalSnapshot?.pending || !Number.isSafeInteger(revision) || revision! < 1) ? 'pending' : checked;
  const stepText = eligibility === 'eligible' ? morning.stepText ?? null : null;
  const { scheduledAt, firstRingAt, upAt, minutesToUp, minutesBeforeAlarm, snoozeCount, voiceState,
    speechShare, speechOnsetMs, stepSize, stepDone, stepOffered, stepRemoved, utcOffsetMinutes, level, goalId } = morning;
  return {
    payload: { scheduledAt, firstRingAt, upAt, minutesToUp, minutesBeforeAlarm, snoozeCount, voiceState,
      speechShare, speechOnsetMs, stepSize, stepDone, stepOffered, stepRemoved, utcOffsetMinutes, level, goalId,
      stepText, ...(stepText !== null ? { goalSnapshotRevision: revision! } : {}) },
    deferredText: eligibility === 'pending' && morning.stepText != null,
  };
}
export function morningNeedsUpload(morning: SyncMorning, goals: readonly LocalGoal[], goalSnapshot?: SnapshotState): boolean {
  return morning.level !== null && (morning.syncPending !== false || Boolean(morning.stepTextSyncPending &&
    !projectMorningUpload(morning, goals, goalSnapshot).deferredText));
}
export function acknowledgeMorningUpload<T extends SyncMorning>(morning: T, goals: readonly LocalGoal[], sent: ReturnType<typeof projectMorningUpload>, goalSnapshot?: SnapshotState): T {
  const current = projectMorningUpload(morning, goals, goalSnapshot);
  // A gate resolving while the request is in flight must schedule another pass,
  // even if an excluded result leaves the outward null payload unchanged.
  if (current.deferredText !== sent.deferredText || JSON.stringify(current.payload) !== JSON.stringify(sent.payload)) return morning;
  return { ...morning, syncPending: false, stepTextSyncPending: current.deferredText };
}
