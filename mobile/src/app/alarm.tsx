import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText, PillButton } from '../ui';
import { SceneScreen } from '../SceneScreen';
import { usePartner } from '../partner';
import { localDate, useStore } from '../store';
import { confirmHold, morningTiming, newMorning, replaceMorning, scheduledTime } from '../morning';
import { dawnDuration } from '../../../shared/mornings/engine';
import { morningIsLate } from '../../../shared/mornings/lifecycle';
import { cancelToday, scheduleSnooze, stopCurrentOccurrence } from '../../modules/aamu-alarm';
import { apiPost } from '../api';
import { skyProgressForClock } from '../../../src/theme';

export default function Alarm() {
  const { kind = 'landing', date } = useLocalSearchParams<{ kind?: string; date?: string }>();
  const store = useStore(); const [fallbackDay] = useState(() => localDate()); const day = date ?? fallbackDay;
  const partner = usePartner();
  const [hold, setHold] = useState(0);
  const [notice, setNotice] = useState(''); const [now, setNow] = useState(() => Date.now());
  const [staticSky] = useState(() => { const clock = new Date(); return skyProgressForClock(clock.getHours(), clock.getMinutes()); });
  const pressedAt = useRef<number | null>(null); const completed = useRef(false);
  const current = store.state.mornings.find(m => m.localDate === day);
  const silent = kind === 'early' || kind === 'late' || morningIsLate(current, now);
  const progress = Math.min(1, Math.max(0, (current?.dawnProgress ?? 0) +
    (current?.dawnStartedAt === undefined ? 0 : Math.max(0, now - current.dawnStartedAt) / Math.max(1, current.dawnDurationMs ?? morningTiming.landingDawnMs))));
  function complete() {
    if (completed.current) return;
    const morning = store.read().mornings.find(m => m.localDate === day); if (!morning) return;
    completed.current = true;
    const time = Date.now();
    const skyFrom = Math.min(1, Math.max(0, (morning.dawnProgress ?? 0) +
      (morning.dawnStartedAt === undefined ? 0 : Math.max(0, time - morning.dawnStartedAt) / Math.max(1, morning.dawnDurationMs ?? morningTiming.landingDawnMs))));
    store.update(old => {
      const next = confirmHold(old, morning, time);
      const held = next.mornings.find(item => item.localDate === day);
      if (held?.upAt !== time || held.phase !== 'voice') return next;
      return kind === 'early'
        ? replaceMorning(next, { ...held, skyTransitionFrom: staticSky, skyTransitionStartedAt: undefined })
        : !silent ? replaceMorning(next, { ...held, skyTransitionFrom: skyFrom, skyTransitionStartedAt: time }) : next;
    });
    const updated = store.read().mornings.find(m => m.localDate === day);
    if (!updated?.upAt) { completed.current = false; setHold(0); return; }
    void apiPost('/partner/up', { localDate: updated.localDate, upAt: updated.upAt, utcOffsetMinutes: updated.utcOffsetMinutes })
      .then(() => store.update(old => ({ ...old, mornings: old.mornings.map(m => m.localDate === updated.localDate ? { ...m, upSyncPending: false } : m) }))).catch(() => {});
    // Publish the hold first: global dawn audio starts its fade immediately and
    // voice appears without waiting for an IPC round trip to the system alarm.
    void (kind === 'early' ? cancelToday() : stopCurrentOccurrence()).catch(() => {
      // Hold evidence remains valid even if native cancellation fails.
    });
    router.replace(updated.phase === 'home' ? '/home' : `/voice?date=${day}`);
  }
  const onAlarmEntry = useEffectEvent((entryDay: string, entryKind: string) => {
    const state = store.read();
    const scheduled = scheduledTime(state); if (scheduled === null) return;
    const existing = state.mornings.find(m => m.localDate === entryDay);
    const morning = existing ?? newMorning(scheduled, entryKind === 'early');
    const audible = entryKind !== 'early' && entryKind !== 'late' && !morningIsLate(morning, Date.now());
    if (audible && morning.upAt === null) {
      const profile = dawnDuration(state.mornings, entryDay);
      const resuming = morning.phase === 'snoozed';
      const started = resuming || morning.dawnStartedAt === undefined;
      store.update(old => replaceMorning(old, { ...morning, phase: 'dawn',
        dawnProgress: Math.min(1, Math.max(0, morning.dawnProgress ?? 0)),
        dawnStartedAt: started ? Date.now() : morning.dawnStartedAt,
        dawnDurationMs: morning.dawnDurationMs ?? (entryKind === 'landing' ? morningTiming.landingDawnMs : profile.durationMs),
        dawnLowerStart: morning.dawnLowerStart ?? profile.lowerStartingVolume }));
    } else if (!existing) {
      store.update(old => replaceMorning(old, morning));
    }
    if (entryKind !== 'early') void stopCurrentOccurrence().catch(() => setNotice('The system alarm could not be silenced. Use its Stop control.'));
  });
  const onTick = useEffectEvent(() => {
    const time = Date.now(); setNow(time);
    if (pressedAt.current !== null && !completed.current) {
      const amount = Math.min(1, (time - pressedAt.current) / morningTiming.holdMs); setHold(amount);
      if (amount >= 1) complete();
    }
  });
  const onAppStateChange = useEffectEvent((state: string) => {
    if (state !== 'active') { pressedAt.current = null; setHold(0); }
  });
  useEffect(() => {
    completed.current = false; pressedAt.current = null;
    onAlarmEntry(day, kind);
    const timer = setInterval(() => onTick(), 32);
    const listener = AppState.addEventListener('change', state => onAppStateChange(state));
    return () => { clearInterval(timer); listener.remove(); };
  }, [day, kind]);
  async function snooze() {
    pressedAt.current = null; setHold(0);
    try {
      const plan = await scheduleSnooze(morningTiming.snoozeSeconds);
      store.update(old => ({ ...old, nativeScheduleHorizonEnd: plan.horizonEnd ? Date.parse(plan.horizonEnd) : old.nativeScheduleHorizonEnd,
        mornings: old.mornings.map(m => m.localDate === day ? { ...m, phase: 'snoozed',
        dawnProgress: progress, dawnStartedAt: undefined,
        snoozeUntil: Date.now() + morningTiming.snoozeSeconds * 1000, interactionAt: [...(m.interactionAt ?? []), Date.now()] } : m) }));
      router.replace('/home');
    } catch { setNotice('Snooze could not be set. Please try again.'); }
  }
  const currentDayEnabled = Boolean(store.state.alarm?.enabled && current?.level !== 'off' && day === localDate(new Date(now)));
  return <SceneScreen clearHorizon sunLabels progress={silent ? staticSky : progress} up={Boolean(currentDayEnabled && current?.upAt)}
    paired={partner.paired} partnerUp={currentDayEnabled && partner.localDate === day && partner.partnerUpToday}
    header={<AppText variant="label">aamu</AppText>} footer={<View style={{ gap: 12 }}>
    {notice ? <AppText tone="secondary">{notice}</AppText> : null}
    <PillButton label="Hold: I’m up" progress={hold} accessibilityHint="Hold for two seconds to confirm you are up."
      onPressIn={() => { pressedAt.current = Date.now(); }} onPressOut={() => { pressedAt.current = null; if (!completed.current) setHold(0); }} />
    {!silent && <PillButton label="Snooze" variant="secondary" outlined onPress={() => void snooze()} />}
    <PillButton label="Help" variant="quiet" outlined onPress={() => router.push('/help')} />
  </View>}>
    <View style={{ gap: 12, paddingTop: 24 }}>
      <AppText variant="clock" align="center">{new Date(now).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</AppText>
      <AppText tone="secondary" align="center">{kind === 'early' ? 'I’m already up' : 'A new morning'}</AppText>
    </View>
  </SceneScreen>;
}
