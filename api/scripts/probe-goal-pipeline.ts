// Single synthetic end-to-end service probe; no listener, user account or persisted text.
import { writeFile } from 'node:fs/promises';
import { createGoalService } from '../src/goals/service.ts';
import { createGoalJudge, createDecisionCall } from '../src/goals/decisions.ts';
import { createGemmaWriter, GoalModelFailure } from '../src/goals/gemma.ts';
const { GEMINI_API_KEY: apiKey, LLM_MODEL: model, LLM_BASE_URL: baseUrl } = process.env;
if (!apiKey || !model || !baseUrl) throw new Error('Private model configuration incomplete');
const stages: { stage: string; completed: boolean; category?: string }[] = [];
const judge = createGoalJudge(createDecisionCall(apiKey));
const writer = createGemmaWriter({ apiKey, model, baseUrl });
const service = createGoalService({
  judge: {
    async judgeGoal(...args) { const value = await judge.judgeGoal(...args); stages.push({ stage: 'initial_judge', completed: value.kind !== 'unavailable' }); return value; },
    async judgeSteps(...args) { const value = await judge.judgeSteps(...args); stages.push({ stage: 'step_judge', completed: value.kind !== 'unavailable' }); return value; },
  },
  writer: {
    async write(...args) {
      try { const value = await writer.write(...args); stages.push({ stage: 'writer', completed: true }); return value; }
      catch (error) { stages.push({ stage: 'writer', completed: false, category: error instanceof GoalModelFailure ? error.category : 'transport_error' }); throw error; }
    },
    async judgeAndWrite(...args) { return writer.judgeAndWrite(...args); },
  },
});
const started = performance.now();
const result = await service.shrink('Read more');
const evidence = {
  checkedAt: new Date().toISOString(), syntheticOnly: true, model: process.env.LLM_MODEL,
  durationMs: Math.round(performance.now() - started),
  successfulLadder: result.source === 'model' && result.steps !== null,
  source: result.source, judgeSource: 'judgeSource' in result ? result.judgeSource : null,
  serverDeadlineMs: 25_000, automaticRetries: 0,
  stages,
};
await writeFile(new URL('../../review/provider-goal-pipeline.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
process.stdout.write(JSON.stringify(evidence) + '\n');
