import type { StepSize, StepHint, GoalVerdict } from '../../api/src/goals/contracts.ts';

// Exact copy approved in U19; values are not model-written.
export const goalCopy = {
  waiting: 'Finding a small place to start…',
  failure: 'We couldn’t suggest steps this time.',
  too_big: 'This is a big goal. These steps are a place to start.',
  too_vague: 'These steps make a starting point. Edit them to fit you.',
  concrete: 'Try one action someone could see you do.',
  suggestionsReady: 'Suggestions are ready',
  view: 'View',
  useTheseSteps: 'Use these steps',
  keepMine: 'Keep mine',
  replaceQuestion: 'Replace the steps you wrote?',
  replace: 'Replace',
} as const;
const minutes = { tiny: 2, small: 10, full: 30 } as const;
export function goalAdvisory(verdict: GoalVerdict): string | null {
  return verdict === 'ok' ? null : goalCopy[verdict];
}
export function stepHintLine(size: StepSize, hint?: StepHint): string | null {
  if (!hint) return null;
  return [
    hint.exceedsSlot ? `This may take more than ${minutes[size]} minutes.` : null,
    hint.needsConcreteAction ? goalCopy.concrete : null,
  ].filter(Boolean).join(' ') || null;
}
