import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { goalConfig, sizes, goalVerdictSchema } from './contracts.ts';
import type { GoalJudge, JudgeConfig, DurationProbabilities, StepHints, GoalJudgment, StepJudgment, Steps } from './contracts.ts';
import { goalDomainQuestion, goalQuestions, stepQuestions } from './questions.ts';
import { goalDomains } from './evidence.ts';

const probability = z.number().finite().min(0).max(1);
const noulSchema = z.object({ type: z.literal('noul'), noul: probability });
const choiceSchema = z.object({ type: z.literal('choice'), choice: goalVerdictSchema, confidence: probability });
const domainSchema = z.object({ type: z.literal('choice'), choice: z.enum(goalDomains) });
const durationSchema = z.object({ type: z.literal('score'), probabilities: z.object({
  '0': probability, '1': probability, '2': probability, '3': probability,
}) });
const safetyCodes = new Set(['safety', 'prohibited_content', 'blocklist', 'content_blocked']);

// Read only typed status/code fields; never log/serialize SDK errors or bodies.
export function isSafetyBlock(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as Record<string, unknown>;
  if ((value.status ?? value.statusCode) !== 400) return false;
  let body: unknown = value.error;
  if (!body && typeof value.body === 'string') {
    try { body = JSON.parse(value.body); } catch { return false; }
  }
  if (body && typeof body === 'object' && 'error' in body) body = body.error;
  const code = body && typeof body === 'object' && 'code' in body ? body.code : value.code;
  return typeof code === 'string' && safetyCodes.has(code.toLowerCase());
}

type Request = Parameters<GoogleGenAI['decisions']['create']>[0];
export type DecisionCall = (request: Request, signal: AbortSignal) => Promise<unknown>;

export function createDecisionCall(apiKey: string): DecisionCall {
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
  return (request, signal) => ai.decisions.create(request, {
    maxRetries: 0, fetchOptions: { signal },
  });
}

export function createGoalJudge(call: DecisionCall, config: JudgeConfig = goalConfig): GoalJudge {
  probability.parse(config.distressThreshold);
  probability.parse(config.choiceConfidenceThreshold);
  probability.parse(config.concreteActionThreshold);
  return {
    async judgeGoal(goalText, signal): Promise<GoalJudgment> {
      try {
        // One request: the kind-of-activity question rides along and adds no extra call.
        const result = await call({ model: 'gemini-decision-1', input: goalText,
          questions: { ...goalQuestions, goal_domain: goalDomainQuestion } }, signal);
        const answers = z.object({ answers: z.record(z.string(), z.unknown()) }).parse(result).answers;
        // Distress probability exists only in this transient call scope. It is never a return field.
        const distress = noulSchema.parse(answers.distress);
        if (distress.noul >= config.distressThreshold) return { kind: 'needs_support' };
        const choice = choiceSchema.parse(answers.goal_verdict);
        // Best effort: a missing or unexpected answer simply leaves the general rules in place.
        const domain = domainSchema.safeParse(answers.goal_domain);
        return { kind: 'judged', verdict: choice.confidence < config.choiceConfidenceThreshold ? 'ok' : choice.choice,
          ...(domain.success ? { domain: domain.data.choice } : {}) };
      } catch (error) {
        return isSafetyBlock(error) ? { kind: 'needs_support' } : { kind: 'unavailable' };
      }
    },
    async judgeSteps(goalText: string, steps: Steps, signal): Promise<StepJudgment> {
      try {
        const result = await call({
          model: 'gemini-decision-1', input: JSON.stringify({ goalText, steps }), questions: stepQuestions(),
        }, signal);
        const answers = z.object({ answers: z.record(z.string(), z.unknown()) }).parse(result).answers;
        const sizeHints: StepHints = {};
        const durationProbabilities = {} as DurationProbabilities;
        for (const [index, size] of sizes.entries()) {
          const duration = durationSchema.parse(answers[`${size}_duration`]).probabilities;
          const values = [duration['0'], duration['1'], duration['2'], duration['3']] as [number, number, number, number];
          if (Math.abs(values.reduce((a, b) => a + b, 0) - 1) > 0.03) throw new Error('Invalid duration distribution');
          // Deterministic first maximum; tie handling is technical, not another model call.
          const topLevel = values.indexOf(Math.max(...values));
          const concrete = noulSchema.parse(answers[`${size}_concrete`]);
          const hint = { exceedsSlot: topLevel > index, needsConcreteAction: concrete.noul < config.concreteActionThreshold };
          if (hint.exceedsSlot || hint.needsConcreteAction) sizeHints[size] = hint;
          durationProbabilities[size] = values;
        }
        return { kind: 'judged', sizeHints, durationProbabilities };
      } catch (error) {
        return isSafetyBlock(error) ? { kind: 'blocked' } : { kind: 'unavailable' };
      }
    },
  };
}
