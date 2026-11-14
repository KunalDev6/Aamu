import { useSyncExternalStore } from 'react';

/** The guided demo: one goal, an easier morning, a hard morning, then asking the clinic for a call.
 * Kept in memory only, so closing the app simply ends it. */
export type TourStage = 'goal' | 'easy' | 'hard' | 'clinic';
export type Tour = { stage: TourStage; goalId: string | null };
let tour: Tour | null = null;
const listeners = new Set<() => void>();
const emit = () => { for (const listener of listeners) listener(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => tour;

export function startTour() { tour = { stage: 'goal', goalId: null }; emit(); }
export function advanceTour(stage: TourStage, goalId?: string | null) {
  if (!tour) return;
  tour = { stage, goalId: goalId === undefined ? tour.goalId : goalId }; emit();
}
export function endTour() { if (tour) { tour = null; emit(); } }
export const currentTour = () => tour;
export function useTour() { return useSyncExternalStore(subscribe, snapshot, snapshot); }
