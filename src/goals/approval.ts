// Framework-independent mobile logic. Wire to Expo storage/navigation during app build.
import { hasAnyIntentPhrase } from '../../shared/safety/checker.mjs';
import type { Steps } from '../../api/src/goals/contracts.ts';
import type { HintResult, ShrinkResult } from '../../api/src/goals/service.ts';
import { withGoalDeadline } from './client.ts';
import { goalRemoteEligibility } from './eligibility.ts';

export type LocalGoal = {
  id: string; goalText: string; steps: Steps; localOnly: boolean;
  latestVerdict: 'ok' | 'too_big' | 'too_vague' | 'needs_support' | null;
  revision: number;
  approved: boolean;
  // Local coordination only; neither field appears in a remote goal payload.
  supportEvidence?: { goalText: string; revision: number };
  goalCheck?: {
    requestId: string; goalText: string; state: 'pending' | 'complete';
    supportEvidenceAtStart?: { goalText: string; revision: number };
  };
  hintCheckRevision?: number;
};
type RemoteGoal = { id: string; goalText: string; steps: Steps };
const isPrivate = (goal: LocalGoal) => goal.localOnly || goal.latestVerdict === 'needs_support' || hasAnyIntentPhrase(goal.goalText);
export function remoteGoalSnapshot(goals: LocalGoal[]): RemoteGoal[] | null {
  // PUT is an authoritative replacement. Omitting a merely pending goal would erase
  // its previous server copy, so defer the whole PUT instead of sending a partial list.
  if (goals.some(goal => goalRemoteEligibility(goal) === 'pending')) return null;
  return goals.filter(goal => goalRemoteEligibility(goal) === 'eligible')
    .map(({ id, goalText, steps }) => ({ id, goalText, steps }));
}

export type ApprovalPorts = {
  allGoals(): LocalGoal[];
  saveLocal(goal: LocalGoal): void;
  requestHints(body: { goalText: string; steps: Steps }, signal: AbortSignal): Promise<HintResult>;
  syncGoals(goals: RemoteGoal[]): Promise<void>;
  showHelp(): void;
};
export type ApprovalResult =
  | { status: 'invalid_steps' | 'blocked_manual_step' | 'stale' | 'local_only' | 'approved' | 'needs_support' }
  | { status: 'approved_deferred'; hints?: HintResult }
  | { status: 'approved_with_hints'; hints: HintResult };

// Serialize replacement PUTs; a slow older save must never arrive after a removal.
const syncQueues = new WeakMap<ApprovalPorts, Promise<unknown>>();
export function syncApprovedGoals(ports: ApprovalPorts): Promise<'synced' | 'deferred'> {
  const previous = syncQueues.get(ports) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    const snapshot = remoteGoalSnapshot(ports.allGoals());
    if (snapshot === null) return 'deferred' as const;
    await ports.syncGoals(snapshot);
    return 'synced' as const;
  });
  syncQueues.set(ports, next);
  return next;
}

export function beginGoalCheck(goalId: string, requestId: string, ports: ApprovalPorts): boolean {
  const current = ports.allGoals().find(goal => goal.id === goalId);
  if (!current) return false;
  ports.saveLocal({ ...current, goalCheck: {
    requestId, goalText: current.goalText, state: 'pending',
    supportEvidenceAtStart: current.supportEvidence ? { ...current.supportEvidence } : undefined,
  } });
  return true;
}

export async function finishGoalCheck(goalId: string, requestId: string, result: ShrinkResult, ports: ApprovalPorts): Promise<'stale' | 'needs_support' | 'synced' | 'deferred'> {
  const current = ports.allGoals().find(goal => goal.id === goalId);
  if (!current || current.goalCheck?.requestId !== requestId || current.goalCheck.state !== 'pending' || current.goalCheck.goalText !== current.goalText) return 'stale';
  const complete = { requestId, goalText: current.goalText, state: 'complete' as const };
  if (result.verdict === 'needs_support') {
    ports.saveLocal({ ...current, goalCheck: complete, localOnly: true, latestVerdict: 'needs_support',
      supportEvidence: { goalText: current.goalText, revision: current.revision + 1 },
      hintCheckRevision: undefined, revision: current.revision + 1 });
    ports.showHelp();
    await syncApprovedGoals(ports);
    return 'needs_support';
  }
  // A completed failure releases saving too (U21). Never replace approved manual
  // steps with the returned ladder; suggestions have their own editor flow.
  const previousSupport = current.goalCheck.supportEvidenceAtStart;
  const currentSupport = current.supportEvidence;
  // Only a clean rewording can release the privacy state this request started
  // with. A newer support result must win, even if this clean response is late.
  const clearsPreviousSupport = result.verdict !== null && previousSupport && currentSupport &&
    previousSupport.revision === currentSupport.revision &&
    previousSupport.goalText === currentSupport.goalText &&
    current.goalText !== currentSupport.goalText && !hasAnyIntentPhrase(current.goalText);
  ports.saveLocal({ ...current, goalCheck: complete,
    localOnly: clearsPreviousSupport ? false : current.localOnly,
    supportEvidence: clearsPreviousSupport ? undefined : current.supportEvidence,
    latestVerdict: !isPrivate(current) || clearsPreviousSupport
      ? result.verdict ?? current.latestVerdict : current.latestVerdict });
  return syncApprovedGoals(ports);
}

export async function approveGoal(goal: LocalGoal, steps: Steps, edited: boolean, ports: ApprovalPorts): Promise<ApprovalResult> {
  const stored = ports.allGoals().find(item => item.id === goal.id);
  if (!stored || stored.goalText !== goal.goalText) return { status: 'stale' };
  const values = [steps.tiny, steps.small, steps.full];
  if (values.some(value => !value.trim() || value.length > 60)) return { status: 'invalid_steps' };
  if (values.some(hasAnyIntentPhrase)) return { status: 'blocked_manual_step' }; // Inline Help link; no save/request.
  const saved: LocalGoal = {
    ...stored, steps: { ...steps }, revision: stored.revision + 1,
    approved: true, localOnly: isPrivate(stored),
    hintCheckRevision: edited && !isPrivate(stored) ? stored.revision + 1 : undefined,
  };
  ports.saveLocal(saved); // Synchronous local save precedes any provider/network work.
  if (saved.localOnly) {
    await syncApprovedGoals(ports);
    return { status: 'local_only' }; // No title, steps or existence marker is submitted.
  }
  if (!edited) {
    const sync = await syncApprovedGoals(ports);
    return { status: sync === 'deferred' ? 'approved_deferred' : 'approved' };
  }
  const hints = await withGoalDeadline(signal => ports.requestHints({ goalText: saved.goalText, steps: saved.steps }, signal), (): HintResult => ({ status: 'unavailable' }));
  const current = ports.allGoals().find(item => item.id === saved.id);
  if (!current || current.revision !== saved.revision) return { status: 'stale' };
  if (current.goalText !== saved.goalText) {
    // Retire only this old hint's marker. Do not classify or sync the new title.
    if (current.hintCheckRevision === saved.revision) ports.saveLocal({ ...current, hintCheckRevision: undefined });
    return { status: 'stale' };
  }
  if (hints.status === 'needs_support') {
    ports.saveLocal({ ...current, localOnly: true, latestVerdict: 'needs_support',
      supportEvidence: { goalText: current.goalText, revision: current.revision + 1 },
      hintCheckRevision: undefined, revision: current.revision + 1 });
    ports.showHelp();
    // An authoritative snapshot omission also causes existing server text redaction (U17).
    await syncApprovedGoals(ports);
    return { status: 'needs_support' };
  }
  ports.saveLocal({ ...current, hintCheckRevision: undefined });
  const sync = await syncApprovedGoals(ports);
  if (sync === 'deferred') return { status: 'approved_deferred', hints };
  return { status: 'approved_with_hints', hints }; // Never alter the approved text.
}
