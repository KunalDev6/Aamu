import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { HomeView } from '../HomeView';
import { homePresentation, removalNoticeVisible, type HomePresentationState } from '../../../src/home/presentation';
import { shrinkOfferedStep, undoRemovedStep, type RemovalState } from '../../../src/home/removal';
import type { MorningLevel } from '../../../shared/mornings/engine';

const tiny = 'Read one page by the window.';
type ReviewMorning = RemovalState['mornings'][number] & { upAt: number | null; level: MorningLevel };
type ReviewState = Omit<RemovalState, 'mornings'> & { mornings: ReviewMorning[] };
const noop = () => {};
const states: HomePresentationState[] = ['night', 'early', 'up', 'evening', 'off'];

/** Explicit visual-state override; the clock and alarm remain 07:30/21:00 and 07:00.
 * No real store, alarms, API, pairing, recordings or schedule rules are changed. */
export function HomeReview({ time, scenario, natural = false, reduceMotion = false }: { time: string; scenario: string; natural?: boolean; reduceMotion?: boolean }) {
  const [base] = useState(() => {
    const [hour, minute] = time.split(':').map(Number);
    return new Date(2026, 10, 14, Number.isFinite(hour) ? hour : 7, Number.isFinite(minute) ? minute : 30).getTime();
  });
  const [startedAt] = useState(Date.now); const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const timer = setInterval(() => setElapsed(Date.now() - startedAt), 50); return () => clearInterval(timer); }, [startedAt]);
  const now = base + elapsed;
  const initialState = states.includes(scenario as HomePresentationState) ? scenario as HomePresentationState : 'up';
  const [reviewState, setReviewState] = useState<HomePresentationState>(initialState);
  const [enabled, setEnabled] = useState(initialState !== 'off');
  const [fixture, setFixture] = useState<ReviewState>(() => {
    const offered = initialState === 'up' || initialState === 'evening';
    const day: ReviewMorning = { localDate: '2026-11-14', utcOffsetMinutes: -new Date(base).getTimezoneOffset(),
      level: initialState === 'off' ? 'off' : 'easy', upAt: offered ? new Date(2026, 10, 14, 7, 2).getTime() : null,
      goalId: 'review-goal', stepOffered: offered, stepRemoved: false, stepSize: offered ? 'tiny' : null,
      stepText: offered ? tiny : null, stepDone: null };
    return { mornings: [day], messages: [], goals: [{ id: 'review-goal', steps: { tiny, small: 'Read for five minutes', full: 'Read for fifteen minutes' } }] };
  });
  const today = fixture.mornings[0]; const paired = initialState === 'up' || initialState === 'evening';
  const alarm = { hour: 7, minute: 0, enabled };
  const naturalModel = homePresentation({ now: base, alarm, today, paired, partnerUp: initialState === 'evening' });
  const model = { ...naturalModel,
    state: natural ? naturalModel.state : reviewState, formattedAlarmTime: '07:00', alarmDayLabel: natural ? naturalModel.alarmDayLabel : 'tomorrow' as const,
    nextAlarmText: enabled ? 'Next alarm: tomorrow 07:00' : null };
  const done = (value: boolean | null) => {
    setFixture(old => ({ ...old, mornings: old.mornings.map(item => ({ ...item, stepDone: value })) }));
    setReviewState(value === null && initialState === 'evening' ? 'evening' : 'up');
  };
  return <HomeView now={base} presentation={model} paired={paired} alarmEnabled={enabled} simulateReducedMotion={reduceMotion}
    step={today.stepOffered && !today.stepRemoved && today.stepSize && today.stepText
      ? { size: today.stepSize, text: today.stepText, done: today.stepDone } : undefined}
    removalVisible={removalNoticeVisible(today, enabled, now)}
    onSettings={() => router.replace(`/preview?scene=settings&time=${time}`)} onHelp={noop}
    onEnableAlarm={() => setEnabled(true)} onEarlyHold={noop}
    onDone={() => done(true)} onNotToday={() => done(false)} onUndoDone={() => done(null)}
    onShrink={() => setFixture(old => shrinkOfferedStep(old, today.localDate, now))}
    onUndoRemoval={() => setFixture(old => undoRemovedStep(old, today.localDate, now))} onPlayMessage={noop} />;
}
