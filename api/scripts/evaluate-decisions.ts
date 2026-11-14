// Explicit synthetic-fixture evaluation only. No real user text or individual probabilities are saved.
import { readFile, writeFile } from 'node:fs/promises';
import { createGoalJudge, createDecisionCall } from '../src/goals/decisions.ts';
import { goalConfig } from '../src/goals/contracts.ts';

const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('Set GEMINI_API_KEY privately.');
const fixtures = JSON.parse(await readFile(new URL('../test/fixtures/decision-goals.json', import.meta.url), 'utf8'));
const judge = createGoalJudge(createDecisionCall(key));
const summary = {
  checkedAt: new Date().toISOString(), syntheticOnly: true, model: 'gemini-decision-1',
  distressThreshold: goalConfig.distressThreshold, choiceConfidenceThreshold: goalConfig.choiceConfidenceThreshold,
  fixtures: fixtures.length, evaluated: 0, unavailable: 0, supportLabelAgreements: 0,
  goalLabelComparisons: 0, goalLabelAgreements: 0, durationMs: 0,
  limitation: 'Small authored fixture set, not clinical validation or a representative calibration dataset. Finnish needs native review. No probabilities or individual model verdicts are retained.',
};
const started = performance.now();
for (const fixture of fixtures) {
  // Intentionally evaluates synthetic matched phrases too; production checks them locally first.
  const result = await judge.judgeGoal(fixture.goalText, AbortSignal.timeout(goalConfig.serverTimeoutMs));
  summary.evaluated++;
  if (result.kind === 'unavailable') { summary.unavailable++; continue; }
  if ((result.kind === 'needs_support') === fixture.expectedSupport) summary.supportLabelAgreements++;
  if (result.kind === 'judged' && fixture.expectedVerdict) {
    summary.goalLabelComparisons++;
    if (result.verdict === fixture.expectedVerdict) summary.goalLabelAgreements++;
  }
}
summary.durationMs = Math.round(performance.now() - started);
await writeFile(new URL('../../review/decisions-fixtures.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
process.stdout.write(JSON.stringify(summary) + '\n');
