import { hasAnyIntentPhrase } from '../../../shared/safety/checker.mjs';
import { goalConfig } from './contracts.ts';
import type { GoalJudge, GoalWriter, GoalVerdict, Steps, StepHints, DurationProbabilities } from './contracts.ts';
import { goalBasis, type GoalBasis } from './evidence.ts';

type JudgeSource = 'decisions' | 'gemma_fallback' | 'phrase_list';
type Support = { verdict: 'needs_support'; steps: null; source: 'model'; judgeSource: JudgeSource };
type Failure = { verdict: null; steps: null; source: 'fallback'; error: 'suggestions_unavailable' };
type Success = {
  verdict: GoalVerdict; steps: Steps; source: 'model'; judgeSource: JudgeSource;
  sizeHints: StepHints;
  /** Fixed, pre-checked explanation of the research behind this kind of step. Never model-written. */
  basis?: GoalBasis;
  // This property is omitted entirely outside the server-controlled demo mode.
  underTheHood?: { goalVerdict: GoalVerdict; durationProbabilities?: DurationProbabilities };
};
export type ShrinkResult = Support | Failure | Success;
export type HintResult =
  | { status: 'ready'; sizeHints: StepHints; underTheHood?: { durationProbabilities: DurationProbabilities } }
  | { status: 'needs_support' }
  | { status: 'unavailable' };

const failure = (): Failure => ({ verdict: null, steps: null, source: 'fallback', error: 'suggestions_unavailable' });
const support = (judgeSource: JudgeSource): Support => ({ verdict: 'needs_support', steps: null, source: 'model', judgeSource });

export function createGoalService({ judge, writer, demoMode = false, timeoutMs = goalConfig.serverTimeoutMs }: {
  judge: GoalJudge; writer: GoalWriter; demoMode?: boolean; timeoutMs?: number;
}) {
  async function withinDeadline<T>(work: (signal: AbortSignal) => Promise<T>, onFailure: () => T, parent?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    parent?.addEventListener('abort', onAbort, { once: true });
    if (parent?.aborted) controller.abort();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<T>(resolve => {
      timer = setTimeout(() => { controller.abort(); resolve(onFailure()); }, timeoutMs);
    });
    try {
      const result = await Promise.race([work(controller.signal), deadline]);
      return controller.signal.aborted ? onFailure() : result;
    } catch { return onFailure(); }
    finally { clearTimeout(timer); parent?.removeEventListener('abort', onAbort); }
  }

  return {
    async shrink(goalText: string, parent?: AbortSignal): Promise<ShrinkResult> {
      if (hasAnyIntentPhrase(goalText)) return support('phrase_list');
      return withinDeadline(async signal => {
        signal.throwIfAborted();
        const initial = await judge.judgeGoal(goalText, signal);
        signal.throwIfAborted();
        if (initial.kind === 'needs_support') return support('decisions');
        if (initial.kind === 'unavailable') {
          // One Gemma verdict+ladder attempt replaces the unavailable initial judge path.
          const fallback = await writer.judgeAndWrite(goalText, signal);
          signal.throwIfAborted();
          if (fallback.verdict === 'needs_support') return support('gemma_fallback');
          return { ...fallback, source: 'model', judgeSource: 'gemma_fallback', sizeHints: {}, basis: goalBasis('other'),
            ...(demoMode ? { underTheHood: { goalVerdict: fallback.verdict } } : {}) };
        }
        const domain = initial.domain ?? 'other';
        const steps = await writer.write(goalText, signal, domain);
        signal.throwIfAborted();
        const checked = await judge.judgeSteps(goalText, steps, signal);
        signal.throwIfAborted();
        if (checked.kind === 'blocked') return support('decisions');
        if (checked.kind === 'unavailable') return failure(); // U18: no unchecked ladder, no regeneration.
        return {
          verdict: initial.verdict, steps, source: 'model', judgeSource: 'decisions', sizeHints: checked.sizeHints, basis: goalBasis(domain),
          ...(demoMode ? { underTheHood: { goalVerdict: initial.verdict, durationProbabilities: checked.durationProbabilities } } : {}),
        };
      }, failure, parent);
    },
    async hints(goalText: string, steps: Steps, parent?: AbortSignal): Promise<HintResult> {
      // Defence in depth; the mobile helper checks all text before this route is called.
      if ([goalText, ...Object.values(steps)].some(hasAnyIntentPhrase)) return { status: 'needs_support' };
      return withinDeadline(async signal => {
        signal.throwIfAborted();
        const checked = await judge.judgeSteps(goalText, steps, signal);
        signal.throwIfAborted();
        if (checked.kind === 'blocked') return { status: 'needs_support' };
        if (checked.kind === 'unavailable') return { status: 'unavailable' };
        return { status: 'ready', sizeHints: checked.sizeHints,
          ...(demoMode ? { underTheHood: { durationProbabilities: checked.durationProbabilities } } : {}) };
      }, () => ({ status: 'unavailable' }), parent);
    },
  };
}
export type GoalService = ReturnType<typeof createGoalService>;
