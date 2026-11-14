import { createDecisionCall, createGoalJudge } from './decisions.ts';
import { createGemmaWriter } from './gemma.ts';
import { createGoalService } from './service.ts';

export function createConfiguredGoalService(env: Record<string, string | undefined>) {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = env.LLM_MODEL?.trim();
  const baseUrl = env.LLM_BASE_URL?.trim();
  if (!apiKey || !model || !baseUrl) throw new Error('Private model configuration is incomplete.');
  return createGoalService({
    judge: createGoalJudge(createDecisionCall(apiKey)),
    writer: createGemmaWriter({ apiKey, model, baseUrl, transport: env.LLM_TRANSPORT === 'native' ? 'native' : 'compatible' }),
    demoMode: env.DEMO_MODE === 'true',
  });
}
