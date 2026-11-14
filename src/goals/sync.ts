import { remoteGoalSnapshot, type LocalGoal } from './approval.ts';

export type GoalSyncMetadata = { generation: number; pending: boolean; lastAllocatedRevision: number; acknowledgedRevision?: number };
export type GoalSyncState = { goals: LocalGoal[]; goalSync?: GoalSyncMetadata };
type RemoteGoals = NonNullable<ReturnType<typeof remoteGoalSnapshot>>;
export type GoalSyncRequest = { goals: RemoteGoals; revision: number; baseRevision: number };
export type GoalSyncResponse = { status: 'applied' | 'conflict'; revision: number };
export type GoalSyncStatus = 'idle' | 'synced' | 'pending' | 'deferred';
export const goalSyncConfig = { requestTimeoutMs: 5_000, maximumAttemptsPerFlush: 3 } as const;

export function markGoalSyncPending<T extends GoalSyncState>(state: T): T {
  const previous = state.goalSync ?? { generation: 0, pending: false, lastAllocatedRevision: 0 };
  return { ...state, goalSync: { ...previous, generation: previous.generation + 1, pending: true } };
}
/** Call once when loading persisted storage, before any live editor request.
 * An interrupted check is a technical failure: retain approved text/privacy and
 * release its sync deferral. No provider request survives a process restart. */
export function recoverInterruptedGoalSync<T extends GoalSyncState>(state: T): T {
  let recovered = false;
  const goals = state.goals.map(goal => {
    if (!goal.approved || (goal.goalCheck?.state !== 'pending' && goal.hintCheckRevision === undefined)) return goal;
    recovered = true;
    return { ...goal, hintCheckRevision: undefined,
      goalCheck: goal.goalCheck?.state === 'pending' ? { ...goal.goalCheck, state: 'complete' as const } : goal.goalCheck };
  });
  const needsAcknowledgement = goals.some(goal => goal.approved && !goal.localOnly) && state.goalSync?.acknowledgedRevision === undefined;
  return recovered || needsAcknowledgement ? markGoalSyncPending({ ...state, goals }) : state;
}
async function bounded<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(Error('Goal sync unavailable')); }, timeoutMs);
  });
  try { return await Promise.race([work(controller.signal), deadline]); }
  finally { clearTimeout(timer); }
}

/** One instance per local store. All persistence is injected and every remote
 * body is projected afresh; no queued body contains private flags or drafts. */
export function createGoalSynchronizer<T extends GoalSyncState>(ports: {
  read(): T; update(change: (state: T) => T): void;
  getRevision(signal: AbortSignal): Promise<number>;
  put(snapshot: GoalSyncRequest, signal: AbortSignal): Promise<GoalSyncResponse>;
}, timeoutMs: number = goalSyncConfig.requestTimeoutMs) {
  let active: Promise<GoalSyncStatus> | null = null;
  async function run(): Promise<GoalSyncStatus> {
    let wrote = false;
    for (let attempt = 0; attempt < goalSyncConfig.maximumAttemptsPerFlush; attempt++) {
      const initial = ports.read();
      if (!initial.goalSync?.pending) return wrote ? 'synced' : 'idle';
      if (remoteGoalSnapshot(initial.goals) === null) return 'deferred';
      let attemptedGeneration = initial.goalSync.generation;
      try {
        const baseRevision = await bounded(signal => ports.getRevision(signal), timeoutMs);
        if (!Number.isSafeInteger(baseRevision) || baseRevision < 0) throw Error('Invalid sync revision');
        // The goal may have become private or gained another pending check while
        // the revision request was in flight. Never send the earlier snapshot.
        const current = ports.read();
        if (!current.goalSync?.pending) return wrote ? 'synced' : 'idle';
        const goals = remoteGoalSnapshot(current.goals);
        if (goals === null) return 'deferred';
        attemptedGeneration = current.goalSync.generation;
        const revision = Math.max(baseRevision, current.goalSync.lastAllocatedRevision) + 1;
        if (!Number.isSafeInteger(revision)) throw Error('Invalid sync revision');
        ports.update(state => ({ ...state, goalSync: { ...state.goalSync!, lastAllocatedRevision: revision } }));
        const result = await bounded(signal => ports.put({ goals, revision, baseRevision }, signal), timeoutMs);
        if (result.status === 'conflict') continue;
        if (result.revision !== revision) throw Error('Invalid sync acknowledgement');
        wrote = true;
        ports.update(state => {
          const latest = remoteGoalSnapshot(state.goals);
          const metadata = { ...state.goalSync!, acknowledgedRevision: revision };
          if (state.goalSync?.generation !== attemptedGeneration || latest === null || JSON.stringify(latest) !== JSON.stringify(goals)) return { ...state, goalSync: metadata };
          return { ...state, goalSync: { ...metadata, pending: false } };
        });
      } catch {
        // A newer privacy change can immediately supersede a timed-out old PUT.
        // Otherwise keep the persisted pending flag for explicit/foreground retry.
        if ((ports.read().goalSync?.generation ?? 0) > attemptedGeneration) continue;
        return 'pending';
      }
    }
    return ports.read().goalSync?.pending ? 'pending' : 'synced';
  }
  return {
    flush(): Promise<GoalSyncStatus> {
      if (!active) active = run().finally(() => { active = null; });
      return active;
    },
  };
}
