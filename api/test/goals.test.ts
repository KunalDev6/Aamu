import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoalJudge, isSafetyBlock } from '../src/goals/decisions.ts';
import { createGoalService } from '../src/goals/service.ts';
import { createApp } from '../src/app.ts';
import { createGemmaWriter } from '../src/goals/gemma.ts';
import { goalConfig } from '../src/goals/contracts.ts';
import type { GoalJudge, GoalWriter, Steps, DurationProbabilities } from '../src/goals/contracts.ts';
import { goalQuestions, stepQuestions } from '../src/goals/questions.ts';

const steps: Steps = { tiny: 'Put a book beside your chair.', small: 'Read for five minutes.', full: 'Read for twenty minutes.' };
const probabilities: DurationProbabilities = { tiny: [1, 0, 0, 0], small: [0, 1, 0, 0], full: [0, 0, 1, 0] };
const signal = () => new AbortController().signal;
function rawGoal(p = 0.01, choice = 'ok', confidence = 0.99) {
  return { answers: { distress: { type: 'noul', noul: p }, goal_verdict: { type: 'choice', choice, confidence } } };
}
function rawSteps(tiny = [1, 0, 0, 0], concrete = 0.99) {
  return { answers: Object.fromEntries(['tiny', 'small', 'full'].flatMap((size, i) => [
    [`${size}_duration`, { type: 'score', probabilities: Object.fromEntries((i === 0 ? tiny : [0, +(i === 1), +(i === 2), 0]).map((p, n) => [String(n), p])) }],
    [`${size}_concrete`, { type: 'noul', noul: concrete }],
  ])) };
}
function dependencies() {
  const calls: string[] = [];
  const judge: GoalJudge = {
    async judgeGoal() { calls.push('judgeGoal'); return { kind: 'judged', verdict: 'ok' }; },
    async judgeSteps() { calls.push('judgeSteps'); return { kind: 'judged', sizeHints: {}, durationProbabilities: probabilities }; },
  };
  const writer: GoalWriter = {
    async write() { calls.push('write'); return steps; },
    async judgeAndWrite() { calls.push('judgeAndWrite'); return { verdict: 'ok', steps }; },
  };
  return { judge, writer, calls };
}

test('distress threshold is inclusive and probability never escapes the adapter', async () => {
  for (const [p, kind] of [[0.299, 'judged'], [0.3, 'needs_support'], [0.9, 'needs_support']] as const) {
    const result = await createGoalJudge(async () => rawGoal(p)).judgeGoal('fixture', signal());
    assert.equal(result.kind, kind);
    assert.doesNotMatch(JSON.stringify(result), /noul|probab|confidence|distress/);
  }
});
test('low choice confidence is ok; the confidence threshold is inclusive', async () => {
  for (const [confidence, verdict] of [[0.599, 'ok'], [0.6, 'too_big']] as const) {
    assert.deepEqual(await createGoalJudge(async () => rawGoal(0.01, 'too_big', confidence)).judgeGoal('fixture', signal()), { kind: 'judged', verdict });
  }
});
test('all four specified safety error codes return needs_support and prevent Gemma', async () => {
  for (const code of ['safety', 'prohibited_content', 'blocklist', 'content_blocked']) {
    const d = dependencies();
    d.judge = createGoalJudge(async () => { throw { status: 400, error: { code, message: 'PRIVATE SENTINEL' } }; });
    const result = await createGoalService(d).shrink('Read more');
    assert.equal(result.verdict, 'needs_support');
    assert.deepEqual(d.calls, []);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|probab/);
  }
});
test('SDK body/statusCode safety shape is recognized; unrelated 400/403 are not safety', () => {
  assert.equal(isSafetyBlock({ statusCode: 400, body: JSON.stringify({ error: { code: 'safety' } }) }), true);
  assert.equal(isSafetyBlock({ status: 403, error: { code: 'safety' } }), false);
  assert.equal(isSafetyBlock({ status: 400, error: { code: 'invalid_argument' } }), false);
});
test('mis-sized Tiny uses the most probable duration level, not its expected score', async () => {
  const result = await createGoalJudge(async () => rawSteps([0.1, 0.7, 0.2, 0])).judgeSteps('Read', steps, signal());
  assert.equal(result.kind, 'judged');
  if (result.kind === 'judged') assert.deepEqual(result.sizeHints, { tiny: { exceedsSlot: true, needsConcreteAction: false } });
});
test('concreteness below 0.5 hints; at 0.5 does not hint', async () => {
  for (const p of [0.49, 0.5]) {
    const result = await createGoalJudge(async () => rawSteps([1, 0, 0, 0], p)).judgeSteps('Read', steps, signal());
    assert.equal(result.kind, 'judged');
    if (result.kind === 'judged') assert.equal(Boolean(result.sizeHints.tiny?.needsConcreteAction), p < 0.5);
  }
});
test('each step question identifies its step in the sentence, without relying on its key', () => {
  assert.equal(goalQuestions.distress.type, 'noul');
  for (const [key, question] of Object.entries(stepQuestions())) {
    assert.match(question.instructions, new RegExp(key.split('_')[0]));
    assert.ok(question.instructions.endsWith('?'));
  }
});
test('local/server phrase match performs zero model calls', async () => {
  const d = dependencies();
  assert.equal((await createGoalService(d).shrink('I intend to harm myself')).verdict, 'needs_support');
  assert.deepEqual(d.calls, []);
});
test('happy path calls each stage once and preserves advisory verdict', async () => {
  const d = dependencies();
  d.judge.judgeGoal = async () => { d.calls.push('judgeGoal'); return { kind: 'judged', verdict: 'too_big' }; };
  const result = await createGoalService(d).shrink('Read every book');
  assert.equal(result.verdict, 'too_big');
  assert.deepEqual(result.steps, steps);
  assert.deepEqual(d.calls, ['judgeGoal', 'write', 'judgeSteps']);
});
test('initial Decisions unavailable invokes one Gemma verdict fallback and marks source', async () => {
  const d = dependencies();
  d.judge.judgeGoal = async () => { d.calls.push('judgeGoal'); return { kind: 'unavailable' }; };
  const result = await createGoalService(d).shrink('Read');
  assert.equal(result.source, 'model');
  assert.equal('judgeSource' in result && result.judgeSource, 'gemma_fallback');
  assert.deepEqual(d.calls, ['judgeGoal', 'judgeAndWrite']);
});
test('Gemma fallback can return needs_support and produces no ladder', async () => {
  const d = dependencies();
  d.judge.judgeGoal = async () => ({ kind: 'unavailable' });
  d.writer.judgeAndWrite = async () => ({ verdict: 'needs_support', steps: null });
  const result = await createGoalService(d).shrink('fixture');
  assert.equal(result.verdict, 'needs_support');
  assert.equal(result.steps, null);
});
test('final judge failure returns failure/manual, never unchecked ladder or a second Gemma attempt', async () => {
  const d = dependencies();
  d.judge.judgeSteps = async () => { d.calls.push('judgeSteps'); return { kind: 'unavailable' }; };
  const result = await createGoalService(d).shrink('Read');
  assert.equal(result.source, 'fallback'); assert.equal(result.steps, null);
  assert.deepEqual(d.calls, ['judgeGoal', 'write', 'judgeSteps']);
});
test('final judge safety block triggers needs_support', async () => {
  const d = dependencies(); d.judge.judgeSteps = async () => ({ kind: 'blocked' });
  assert.equal((await createGoalService(d).shrink('Read')).verdict, 'needs_support');
  assert.deepEqual(await createGoalService(d).hints('Read', steps), { status: 'needs_support' });
});
test('one deadline covers all stages; expiry never launches the next stage', async () => {
  const d = dependencies();
  d.judge.judgeGoal = async () => { await new Promise(resolve => setTimeout(resolve, 25)); return { kind: 'judged', verdict: 'ok' }; };
  const result = await createGoalService({ ...d, timeoutMs: 5 }).shrink('Read');
  assert.equal(result.source, 'fallback');
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(d.calls, []);
  assert.equal(goalConfig.serverTimeoutMs, 25_000); assert.equal(goalConfig.clientTimeoutMs, 30_000);
});
test('demo diagnostics allow only goal verdict and duration distributions', async () => {
  const normal = await createGoalService(dependencies()).shrink('Read');
  assert.equal('underTheHood' in normal, false);
  const demo = await createGoalService({ ...dependencies(), demoMode: true }).shrink('Read');
  assert.ok('underTheHood' in demo);
  if ('underTheHood' in demo) assert.deepEqual(Object.keys(demo.underTheHood!).sort(), ['durationProbabilities', 'goalVerdict']);
  assert.doesNotMatch(JSON.stringify(demo), /distress|concrete.*prob|noul/);
});
test('authenticated routes reject uploads/extra identity fields and return no-store sanitized results', async () => {
  const d = dependencies(); const app = createApp(createGoalService(d), request => request.headers.authorization === 'Bearer fixture');
  try {
    assert.equal((await app.inject({ method: 'POST', url: '/goals/shrink', payload: { goalText: 'Read' } })).statusCode, 401);
    for (const extra of [{ userId: 'id' }, { audio: 'bytes' }, { localOnly: true }, { underTheHood: true }]) {
      assert.equal((await app.inject({ method: 'POST', url: '/goals/shrink', headers: { authorization: 'Bearer fixture' }, payload: { goalText: 'Read', ...extra } })).statusCode, 400);
    }
    const response = await app.inject({ method: 'POST', url: '/goals/shrink', headers: { authorization: 'Bearer fixture' }, payload: { goalText: 'Read' } });
    assert.equal(response.statusCode, 200); assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.json().verdict, 'ok');
  } finally { await app.close(); }
});
test('Gemma sends user-role instructions only, no JSON mode and no automatic retry', async () => {
  let count = 0;
  const fakeFetch = (async (_url: unknown, init: RequestInit) => {
    count++; const request = JSON.parse(init.body as string);
    assert.deepEqual(request.messages.map((m: { role: string }) => m.role), ['user']);
    assert.equal(request.response_format, undefined);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ steps }) } }] }));
  }) as typeof fetch;
  const writer = createGemmaWriter({ apiKey: 'fixture', model: 'listed-model', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/' }, fakeFetch);
  assert.deepEqual(await writer.write('Read', signal()), steps); assert.equal(count, 1);
});
