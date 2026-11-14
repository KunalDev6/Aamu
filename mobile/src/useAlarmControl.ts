import { useEffect, useState } from 'react';
import { cancelAll, scheduleDaily } from '../modules/aamu-alarm';
import { newMorning, replaceMorning, scheduledTime } from './morning';
import { useStore, type AppState } from './store';

/** The same on/off operation is used by Home and Settings. */
export function useAlarmControl() {
  const { read, update } = useStore();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timeout);
  }, [notice]);
  async function setEnabled(enabled: boolean) {
    const alarm = read().alarm;
    if (!alarm || alarm.enabled === enabled || busy) return;
    setBusy(true); setNotice('');
    try {
      const time = scheduledTime(read())!; const now = Date.now();
      const plan = enabled ? await scheduleDaily(alarm.hour, alarm.minute) : await cancelAll();
      update(old => {
        let next: AppState = { ...old, alarm: { ...alarm, enabled },
          alarmScheduleHistory: [...(old.alarmScheduleHistory ?? []), { effectiveAt: now, hour: alarm.hour, minute: alarm.minute, enabled, utcOffsetMinutes: -new Date(now).getTimezoneOffset() }],
          nativeScheduleHorizonEnd: plan.horizonEnd ? Date.parse(plan.horizonEnd) : null };
        const blank = newMorning(time); const current = old.mornings.find(m => m.localDate === blank.localDate);
        if (!enabled && now < time && !current?.upAt) next = replaceMorning(next, { ...blank, level: 'off', phase: 'home' });
        if (enabled && now < time && current?.level === 'off') next = { ...next, mornings: next.mornings.filter(m => m.localDate !== current.localDate) };
        return next;
      });
      if (enabled && now > time) setNotice(`Your alarm is back on for tomorrow at ${new Date(time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.`);
    } catch { setNotice('Your alarm couldn’t be changed. Please try again.'); }
    finally { setBusy(false); }
  }
  return { notice, busy, setEnabled };
}
