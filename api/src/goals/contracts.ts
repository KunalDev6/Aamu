import { z } from 'zod';
import { goalConfig } from '../../../shared/goals/config.ts';
export { goalConfig } from '../../../shared/goals/config.ts';

export const sizes = ['tiny', 'small', 'full'] as const;
export type StepSize = typeof sizes[number];
const stepText = z.string().min(1).max(60).refine(text => text.trim().length > 0);
export const stepsSchema = z.object({ tiny: stepText, small: stepText, full: stepText }).strict();
export type Steps = z.infer<typeof stepsSchema>;
export const goalVerdictSchema = z.enum(['ok', 'too_big', 'too_vague']);
export type GoalVerdict = z.infer<typeof goalVerdictSchema>;
export const ladderSchema = z.object({ steps: stepsSchema }).strict();
export const fallbackSchema = z.discriminatedUnion('verdict', [
  z.object({ verdict: z.literal('needs_support'), steps: z.null() }).strict(),
  z.object({ verdict: goalVerdictSchema, steps: stepsSchema }).strict(),
]);
export type GemmaResult = z.infer<typeof fallbackSchema>;
export type StepHint = { exceedsSlot: boolean; needsConcreteAction: boolean };
export type StepHints = Partial<Record<StepSize, StepHint>>;
export type DurationProbabilities = Record<StepSize, [number, number, number, number]>;
export type GoalJudgment =
  | { kind: 'judged'; verdict: GoalVerdict }
  | { kind: 'needs_support' }
  | { kind: 'unavailable' };
export type StepJudgment =
  | { kind: 'judged'; sizeHints: StepHints; durationProbabilities: DurationProbabilities }
  | { kind: 'blocked' }
  | { kind: 'unavailable' };

export type JudgeConfig = Pick<typeof goalConfig,
  'distressThreshold' | 'choiceConfidenceThreshold' | 'concreteActionThreshold'>;

export interface GoalJudge {
  judgeGoal(goalText: string, signal: AbortSignal): Promise<GoalJudgment>;
  judgeSteps(goalText: string, steps: Steps, signal: AbortSignal): Promise<StepJudgment>;
}
export interface GoalWriter {
  write(goalText: string, signal: AbortSignal): Promise<Steps>;
  judgeAndWrite(goalText: string, signal: AbortSignal): Promise<GemmaResult>;
}
