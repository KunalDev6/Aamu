import { useEffect, useRef } from 'react';
import { AppState as NativeAppState } from 'react-native';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useStore } from './store';
import { apiPost, apiPut } from './api';
import { getEvents, isNativeAlarmAvailable, rescheduleNext } from '../modules/aamu-alarm';
import { buildBaselines } from '../../shared/mornings/engine';
import { lifecycleConfig, needsMorningNavigation, reconcileLifecycle } from '../../shared/mornings/lifecycle';
import { acknowledgeMorningUpload, morningNeedsUpload, projectMorningUpload } from '../../shared/mornings/sync';
import { markGoalSyncPending } from '../../src/goals/sync';
async function withNetworkLimit<T>(work: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 5_000);
  try { return await work(controller.signal); } finally { clearTimeout(timeout); }
}

/** Mounted once beside the router. Native evidence and its cursor are saved in
 * the same local update. No fabricated Stop, pre-setup schedule or wake signal. */
export function MorningCoordinator({ fast = false }: { fast?: boolean }) {
  const store = useStore(); const pathname = usePathname();
  const params = useGlobalSearchParams<{ date?: string; kind?: string }>();
  const current = useRef({ store, pathname, params });
  useEffect(() => { current.current = { store, pathname, params }; }, [store, pathname, params]);
  useEffect(() => {
    if (!store.ready || !store.state.setupComplete) return;
    let stopped = false; let reconciling = false; let syncing = false; let retrySync = true;
    let openedAt: number | null = Date.now(); let previousCheckAt: number | null = null;
    let needsRefill = true; let wasActive = NativeAppState.currentState === 'active';
    let lastOffset = -new Date().getTimezoneOffset();

    async function syncPending() {
      if (syncing || !retrySync || stopped) return;
      syncing = true;
      try {
        const access = current.current.store;
        for (const row of access.read().mornings.filter(morning => morning.upSyncPending && morning.upAt !== null)) {
          await withNetworkLimit(signal => apiPost('/partner/up', { localDate: row.localDate, upAt: row.upAt, utcOffsetMinutes: row.utcOffsetMinutes }, signal));
          if (stopped) return;
          access.update(state => ({ ...state, mornings: state.mornings.map(morning => morning.localDate === row.localDate && morning.upAt === row.upAt
            ? { ...morning, upSyncPending: false } : morning) }));
        }
        for (const row of access.read().mornings.filter(morning => morningNeedsUpload(morning, access.read().goals, access.read().goalSync))) {
          const sent = projectMorningUpload(row, access.read().goals, access.read().goalSync);
          const result = await withNetworkLimit(signal => apiPut<{ goalSnapshotRevision?: number }>(`/mornings/${row.localDate}`, sent.payload, signal));
          if (stopped) return;
          if (sent.payload.stepText !== null && result.goalSnapshotRevision !== sent.payload.goalSnapshotRevision) {
            access.update(state => markGoalSyncPending(state));
            continue; // Refresh the acknowledged snapshot before retrying text.
          }
          access.update(state => ({ ...state, mornings: state.mornings.map(morning => morning.localDate === row.localDate
            ? acknowledgeMorningUpload(morning, state.goals, sent, state.goalSync) : morning) }));
        }
      } catch { retrySync = false; } // Keep flags; retry at the next foreground entry.
      finally { syncing = false; }
    }

    async function reconcile() {
      if (stopped || reconciling || NativeAppState.currentState !== 'active') return;
      reconciling = true;
      const opening = openedAt; openedAt = null;
      try {
        const access = current.current.store;
        let events: Awaited<ReturnType<typeof getEvents>> = [];
        try { events = await getEvents(access.read().nativeEventSequence ?? 0); }
        catch { /* No native evidence is better than an invented Stop or snooze. */ }
        if (stopped) return;
        const now = Date.now();
        const before = access.read();
        const reconciled = reconcileLifecycle(before, { now, events, openedAt: opening,
          previousCheckAt, recoverInterruptedVoice: opening !== null, fast });
        const navigation = reconciled.navigation;
        if (reconciled.state !== before) {
          const built = buildBaselines(reconciled.state.mornings);
          access.update(() => ({ ...reconciled.state, sensingBaselines: {
            main: before.sensingBaselines?.main.frozen ? before.sensingBaselines.main : built.main,
            voice: before.sensingBaselines?.voice.frozen ? before.sensingBaselines.voice : built.voice,
          } }));
        }
        previousCheckAt = now;
        const offset = -new Date(now).getTimezoneOffset();
        if (offset !== lastOffset) needsRefill = true;
        if (needsRefill && isNativeAlarmAvailable) {
          needsRefill = false;
          try {
            const plan = await rescheduleNext();
            if (stopped) return;
            access.update(state => {
              const latest = state.alarmScheduleHistory?.at(-1);
              const offsetChanged = latest && latest.utcOffsetMinutes !== offset;
              return { ...state, nativeScheduleHorizonEnd: plan.horizonEnd ? Date.parse(plan.horizonEnd) : null,
                ...(offsetChanged && state.alarm ? { alarmScheduleHistory: [...(state.alarmScheduleHistory ?? []),
                  { effectiveAt: now, ...state.alarm, utcOffsetMinutes: offset }] } : {}) };
            });
          } catch { /* Keep the previous horizon; retry on foreground, never claim success. */ }
        }
        lastOffset = offset;
        const destination = navigation;
        const path = current.current.pathname;
        if (destination && !path.startsWith('/help') && needsMorningNavigation(destination, path, current.current.params)) {
          router.replace({ pathname: `/${destination.screen}`,
            params: { date: destination.localDate, ...(destination.kind ? { kind: destination.kind } : {}) } });
        }
        void syncPending();
      } finally { reconciling = false; }
    }
    const lifecycle = NativeAppState.addEventListener('change', next => {
      const active = next === 'active';
      if (active && !wasActive) { openedAt = Date.now(); needsRefill = true; retrySync = true; void reconcile(); }
      wasActive = active;
    });
    const interval = setInterval(() => { void reconcile(); }, lifecycleConfig.pollMs);
    void reconcile();
    return () => { stopped = true; clearInterval(interval); lifecycle.remove(); };
  }, [store.ready, store.state.setupComplete, fast]);
  return null;
}

export default MorningCoordinator;
