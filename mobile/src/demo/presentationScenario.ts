import { currentDemoMorning, demoTiming, ringDemo, type DemoSession } from '../../../shared/demo/session.ts';

/** A labelled film cut, not a measured or uploaded morning. Replay two completed
 * fast snoozes plus ten ringing seconds, then let the ordinary hold/scorer run.
 * This makes the harder-morning example reproducible without overriding a level. */
export function ringHarderPresentationMorning(session: DemoSession, now: number, today: string, offset: number): DemoSession {
  const elapsed = 2 * demoTiming.fastSnoozeMs + 10_000;
  const next = ringDemo({ ...session, fast: true, selectedLevel: 'sensed' }, now, today, offset);
  const current = currentDemoMorning(next)!;
  return { ...next, partnerUp: true, history: next.history.map(row => row === current ? {
    ...row, scheduledAt: now - elapsed, firstRingAt: now - elapsed,
    snoozeCount: 2, snoozedMs: 2 * demoTiming.fastSnoozeMs,
  } : row) };
}
