import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useStore } from './store';
import { apiPost, apiPut } from './api';
import { createClinicSynchronizer } from '../../shared/demo/clinic';
import { acknowledgeMorningUpload, morningNeedsUpload, projectMorningUpload } from '../../shared/mornings/sync';
import { demoEnabled } from './demo/config';
import { markGoalSyncPending } from '../../src/goals/sync';

type StoreAccess = Pick<ReturnType<typeof useStore>, 'read' | 'update'>;
const synchronizers = new WeakMap<StoreAccess['read'], ReturnType<typeof createClinicSynchronizer<ReturnType<StoreAccess['read']>>>>();
export function clinicSynchronizer(store: StoreAccess) {
  let synchronizer = synchronizers.get(store.read);
  if (!synchronizer) {
    synchronizer = createClinicSynchronizer({ ...store,
      put: (payload, signal) => apiPut<{ demo: true; enabled: boolean }>('/clinic/sharing', payload, signal) });
    synchronizers.set(store.read, synchronizer);
  }
  return synchronizer;
}
async function bounded<T>(work: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 5_000);
  try { return await work(controller.signal); } finally { clearTimeout(timeout); }
}

export async function askClinicToCall(store: StoreAccess): Promise<number> {
  if (!demoEnabled || !store.read().clinicSharing?.enabled) throw Error('Clinic is not connected');
  if (!await clinicSynchronizer(store).flush()) throw Error('Clinic could not connect');
  const current = store.read().clinicSharing;
  if (!current?.enabled || current.syncPending) throw Error('Clinic is not connected');
  const response = await bounded(signal => apiPost<{ demo: true; callbackRequestedAt: number }>('/clinic/callback', {}, signal));
  if (response.demo !== true || !Number.isFinite(response.callbackRequestedAt)) throw Error('Invalid clinic response');
  store.update(state => ({ ...state, clinicSharing: state.clinicSharing
    ? { ...state.clinicSharing, callbackRequestedAt: response.callbackRequestedAt } : undefined }));
  return response.callbackRequestedAt;
}

/** Seed history can sync before OS alarm permission; it never emits partner_up. */
export function ClinicSyncCoordinator() {
  const { read, update, ready, state } = useStore();
  const revision = state.clinicSharing?.revision;
  useEffect(() => {
    if (!ready || !demoEnabled) return;
    let stopped = false; let running = false;
    async function sync() {
      if (running || stopped || AppState.currentState !== 'active') return;
      running = true;
      try {
        await clinicSynchronizer({ read, update }).flush();
        // Normal MorningCoordinator takes over after actual native setup. Until
        // then upload only the explicit prior-day fixtures, not fabricated today.
        if (!read().demoSeed?.nativeAlarmSetupPending) return;
        // Only genuine new holds can set this flag. Every seeded record has it
        // false, so history upload cannot fabricate a partner wake event.
        for (const row of read().mornings.filter(morning => morning.upSyncPending && morning.upAt !== null)) {
          await bounded(signal => apiPost('/partner/up', { localDate: row.localDate, upAt: row.upAt, utcOffsetMinutes: row.utcOffsetMinutes }, signal));
          if (stopped) return;
          update(current => ({ ...current, mornings: current.mornings.map(morning => morning.localDate === row.localDate && morning.upAt === row.upAt
            ? { ...morning, upSyncPending: false } : morning) }));
        }
        for (const row of read().mornings.filter(morning => morningNeedsUpload(morning, read().goals, read().goalSync))) {
          if (stopped) return;
          const sent = projectMorningUpload(row, read().goals, read().goalSync);
          const result = await bounded(signal => apiPut<{ goalSnapshotRevision?: number }>(`/mornings/${row.localDate}`, sent.payload, signal));
          if (stopped) return;
          if (sent.payload.stepText !== null && result.goalSnapshotRevision !== sent.payload.goalSnapshotRevision) {
            update(current => markGoalSyncPending(current)); continue;
          }
          update(current => ({ ...current, mornings: current.mornings.map(morning => morning.localDate === row.localDate
            ? acknowledgeMorningUpload(morning, current.goals, sent, current.goalSync) : morning) }));
        }
      } catch { /* Keep pending flags. Retry later without a false success notice. */ }
      finally { running = false; }
    }
    void sync(); const timer = setInterval(() => { void sync(); }, 5_000);
    const lifecycle = AppState.addEventListener('change', next => { if (next === 'active') void sync(); });
    return () => { stopped = true; clearInterval(timer); lifecycle.remove(); };
  }, [ready, read, update, revision]);
  return null;
}
