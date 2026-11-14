import { hasAnyIntentPhrase } from '../../shared/safety/checker.mjs';
import { goalConfig } from '../../shared/goals/config.ts';
import type { ShrinkResult, HintResult } from '../../api/src/goals/service.ts';
import type { LocalGoal } from './approval.ts';

type Transport = {
  shrink(body: { goalText: string }, signal: AbortSignal): Promise<ShrinkResult>;
  hints(body: { goalText: string; steps: LocalGoal['steps'] }, signal: AbortSignal): Promise<HintResult>;
};
export async function withGoalDeadline<T>(work: (signal: AbortSignal) => Promise<T>, failed: () => T, parent?: AbortSignal, timeoutMs = goalConfig.clientTimeoutMs): Promise<T> {
    const controller = new AbortController();
    let finish: (value: T) => void = () => {};
    const stopped = new Promise<T>(resolve => { finish = resolve; });
    const cancel = () => { controller.abort(); finish(failed()); };
    const timer = setTimeout(cancel, timeoutMs);
    parent?.addEventListener('abort', cancel, { once: true });
    if (parent?.aborted) cancel();
    try {
      if (controller.signal.aborted) return failed();
      return await Promise.race([work(controller.signal), stopped]);
    } catch { return failed(); }
    finally { clearTimeout(timer); parent?.removeEventListener('abort', cancel); }
}
export function createGoalClient(transport: Transport, timeoutMs = goalConfig.clientTimeoutMs) {
  return {
    async shrink(goalText: string, signal?: AbortSignal): Promise<ShrinkResult> {
      if (hasAnyIntentPhrase(goalText)) return { verdict: 'needs_support', steps: null, source: 'model', judgeSource: 'phrase_list' };
      return withGoalDeadline(inner => transport.shrink({ goalText }, inner), () => ({ verdict: null, steps: null, source: 'fallback', error: 'suggestions_unavailable' }), signal, timeoutMs);
    },
    async hints(goal: LocalGoal, signal?: AbortSignal): Promise<HintResult> {
      if (goal.localOnly || goal.latestVerdict === 'needs_support') return { status: 'unavailable' };
      if ([goal.goalText, ...Object.values(goal.steps)].some(hasAnyIntentPhrase)) return { status: 'needs_support' };
      return withGoalDeadline(inner => transport.hints({ goalText: goal.goalText, steps: goal.steps }, inner), () => ({ status: 'unavailable' }), signal, timeoutMs);
    },
  };
}
