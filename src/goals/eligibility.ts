import { hasAnyIntentPhrase } from '../../shared/safety/checker.mjs';
import type { LocalGoal } from './approval.ts';

export type GoalRemoteEligibility = 'eligible' | 'pending' | 'excluded';
/** Shared by goal replacement and morning text projection. Privacy/check state
 * never becomes a field in either remote payload. */
export function goalRemoteEligibility(goal: LocalGoal | undefined): GoalRemoteEligibility {
  if (!goal || !goal.approved || goal.localOnly || goal.latestVerdict === 'needs_support' || hasAnyIntentPhrase(goal.goalText)) return 'excluded';
  if (goal.goalCheck?.state === 'pending' || goal.hintCheckRevision === goal.revision) return 'pending';
  return 'eligible';
}
