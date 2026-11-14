import type { GoalSyncMetadata } from '../../src/goals/sync.ts';
import type { ClinicSharing } from './clinic.ts';

type IdentityState = {
  demoIdentityHash?: string;
  goalSync?: GoalSyncMetadata;
  clinicSharing?: ClinicSharing;
  mornings: { syncPending?: boolean; upSyncPending?: boolean }[];
};

/** Only call for the browser demo store. A token is never copied into app data.
 * Reset acknowledgements, not content. In particular this cannot create a
 * partner wake or transfer the separate guided tour's history. */
export function reconcileDemoIdentity<T extends IdentityState>(state: T, hash: string | null): T {
  const identity = hash ?? undefined;
  if (identity && state.demoIdentityHash === identity) return state;
  const staleAcknowledgement = state.goalSync?.acknowledgedRevision !== undefined ||
    state.clinicSharing?.syncedRevision !== undefined || state.clinicSharing?.callbackRequestedAt !== undefined ||
    state.mornings.some(morning => morning.syncPending === false);
  if (!identity && !state.demoIdentityHash && !staleAcknowledgement) return state;
  const goalSync = state.goalSync ?? { generation: 0, pending: false, lastAllocatedRevision: 0 };
  return { ...state, demoIdentityHash: identity,
    goalSync: { ...goalSync, generation: goalSync.generation + 1, pending: true, acknowledgedRevision: undefined },
    mornings: state.mornings.map(morning => ({ ...morning, syncPending: true })),
    clinicSharing: state.clinicSharing ? { ...state.clinicSharing,
      revision: state.clinicSharing.revision + 1, syncPending: true,
      syncedRevision: undefined, callbackRequestedAt: undefined } : undefined };
}
