import { useEffect } from 'react';
import { AppState } from 'react-native';
import { usePathname } from 'expo-router';
import { useStore } from './store';
import { apiGet, apiPutGoals } from './api';
import { createGoalSynchronizer } from '../../src/goals/sync';

type StoreAccess = Pick<ReturnType<typeof useStore>, 'read' | 'update'>;
const synchronizers = new WeakMap<StoreAccess['read'], ReturnType<typeof createGoalSynchronizer>>();
export function goalSynchronizer(store: StoreAccess) {
  let synchronizer = synchronizers.get(store.read);
  if (!synchronizer) {
    synchronizer = createGoalSynchronizer({ read: store.read, update: store.update,
      getRevision: async signal => (await apiGet<{ revision: number }>('/goals/revision', signal)).revision,
      put: apiPutGoals });
    synchronizers.set(store.read, synchronizer);
  }
  return synchronizer;
}

export function GoalSyncCoordinator() {
  const { read, update, ready, state } = useStore();
  const pathname = usePathname(); const preview = pathname === '/preview';
  const pending = state.goalSync?.pending; const generation = state.goalSync?.generation;
  useEffect(() => {
    if (!ready || preview) return;
    const synchronizer = goalSynchronizer({ read, update });
    if (pending && AppState.currentState === 'active') void synchronizer.flush();
    const lifecycle = AppState.addEventListener('change', next => {
      if (next === 'active' && read().goalSync?.pending) void synchronizer.flush();
    });
    return () => lifecycle.remove();
  }, [ready, preview, pending, generation, read, update]);
  return null;
}

export default GoalSyncCoordinator;
