import type { LocalGoal } from './approval.ts';
import { markGoalSyncPending, type GoalSyncState } from './sync.ts';
import type { Steps } from '../../api/src/goals/contracts.ts';

export type GoalCounts = { offered: number; done: number; removed: number };
type GoalDay = { localDate: string; goalId: string | null; stepOffered: boolean;
  stepDone?: boolean | null; stepRemoved?: boolean; utcOffsetMinutes?: number;
  stepSize?: string | null; stepText?: string | null; stepLadder?: Steps };
export type GoalSettingsState = GoalSyncState & { rotationGoalId: string | null; mornings?: GoalDay[] };
type CountState = GoalSyncState & { mornings: GoalDay[]; goalCounts?: Record<string, GoalCounts> };

/** U23 counters represent dated outcomes, not button presses. Rebuilding from
 * canonical mornings is idempotent and makes Undo remove the day's Done count. */
export function reconcileGoalCounts<T extends CountState>(state: T): T {
  const counts = new Map(state.goals.map(goal => [goal.id, { offered: 0, done: 0, removed: 0 }]));
  const days = new Map(state.mornings.map(morning => [morning.localDate, morning]));
  for (const morning of days.values()) {
    if (!morning.stepOffered || !morning.goalId) continue;
    const value = counts.get(morning.goalId) ?? { offered: 0, done: 0, removed: 0 };
    value.offered++;
    if (morning.stepDone === true) value.done++;
    if (morning.stepRemoved) value.removed++;
    counts.set(morning.goalId, value);
  }
  const previous = state.goalCounts;
  if (previous && Object.keys(previous).length === counts.size && [...counts].every(([id, value]) =>
    previous[id]?.offered === value.offered && previous[id]?.done === value.done && previous[id]?.removed === value.removed)) return state;
  return { ...state, goalCounts: Object.fromEntries(counts) };
}

export function nextGoalAfterDeletion(state: GoalSettingsState, goalId: string): string | null {
  if (state.rotationGoalId !== goalId) return state.rotationGoalId;
  const index = state.goals.findIndex(goal => goal.id === goalId);
  if (index < 0) return state.rotationGoalId;
  for (let offset = 1; offset < state.goals.length; offset++) {
    const next = state.goals[(index + offset) % state.goals.length];
    if (next.approved) return next.id;
  }
  return null;
}

/** Accept only a complete permutation; identities, private state and pointer
 * survive moving rows. Reordering never advances the daily rotation. */
export function reorderGoals<T extends GoalSettingsState>(state: T, orderedIds: string[]): T {
  if (orderedIds.length !== state.goals.length || new Set(orderedIds).size !== orderedIds.length) return state;
  const byId = new Map(state.goals.map(goal => [goal.id, goal]));
  if (orderedIds.some(id => !byId.has(id)) || orderedIds.every((id, index) => state.goals[index].id === id)) return state;
  const goals = orderedIds.map(id => byId.get(id) as LocalGoal);
  return { ...state, goals };
}

/** U23 keeps today's offered step and follows the pre-delete circular order.
 * All snapshot text stays local; deleting the goal queues authoritative omission. */
export function deleteGoal<T extends GoalSettingsState>(state: T, goalId: string,
  successorId = nextGoalAfterDeletion(state, goalId), now = Date.now()): T {
  const deleted = state.goals.find(goal => goal.id === goalId);
  if (!deleted) return state;
  const goals = state.goals.filter(goal => goal.id !== goalId);
  if (state.rotationGoalId === goalId && successorId !== null && !goals.some(goal => goal.id === successorId && goal.approved)) return state;
  let changedMorning = false;
  const mornings = state.mornings?.map(morning => {
    const dateNow = new Date(now + (morning.utcOffsetMinutes ?? 0) * 60_000).toISOString().slice(0, 10);
    if (morning.goalId !== goalId || !morning.stepOffered || morning.localDate !== dateNow || morning.stepLadder) return morning;
    changedMorning = true;
    const size = morning.stepSize;
    return { ...morning, stepLadder: { ...deleted.steps },
      stepText: morning.stepText ?? (size === 'tiny' || size === 'small' || size === 'full' ? deleted.steps[size] : null) };
  });
  return markGoalSyncPending({ ...state, goals, ...(changedMorning ? { mornings } : {}),
    rotationGoalId: state.rotationGoalId === goalId ? successorId : state.rotationGoalId });
}
