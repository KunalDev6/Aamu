// U17 comparison only: fresh inventory, then six sequential synthetic requests.
// Never mutates LLM_MODEL or private configuration. No real user text or audio.
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import * as z from 'zod';
import { parseModelObject } from './parse-model-object.mjs';

const execFileAsync = promisify(execFile);
const key = process.env.GEMINI_API_KEY?.trim();
const configuredModel = process.env.LLM_MODEL?.trim();
const base = process.env.LLM_BASE_URL?.trim();
const outputJson = new URL('../../review/gemma-comparison.json', import.meta.url);
const outputMarkdown = new URL('../../review/gemma-comparison.md', import.meta.url);
const scaffold = { steps: { tiny: '...', small: '...', full: '...' } };
const step = z.string().min(1).max(60).refine(value => value.trim().length > 0);
const responseSchema = z.object({ steps: z.object({ tiny: step, small: step, full: step }).strict() }).strict();
const goals = [
  { id: 'swimming', text: 'Get back to swimming' },
  { id: 'reading', text: 'Read more books' },
  { id: 'desk', text: 'Keep my desk tidy' },
];

function promptFor(goal) {
  return [
    'This is a synthetic model comparison, not a real user request.',
    `Create three concrete, simple steps towards this sample goal: ${goal}.`,
    'Tiny: at most 2 minutes and doable at home. Small: at most 10 minutes. Full: at most 30 minutes.',
    'Each step is one observable action, starts with a verb, and is at most 60 characters.',
    'Specify a short duration or a bounded quantity so the size can be assessed.',
    'Use plain language. Do not give medical advice. Do not include feelings, exclamation marks, or "try to".',
    `Return only a JSON object with this exact shape: ${JSON.stringify(scaffold)}.`,
    'Do not repeat the shape example. No markdown, explanation, or other fields.',
  ].join('\n');
}

function renderMarkdown(report) {
  const lines = [
    '# Gemma comparison — synthetic examples',
    '',
    `Checked: ${report.startedAt}. Status: ${report.status}.`,
    '',
    'Fresh authenticated ListModels precedes the six sequential calls. Each sample gets one attempt, a 25-second limit and no retry. Both models receive the same prompt template and generation settings.',
    '',
    `Configured model remains ${report.configuredModel}; candidate is ${report.candidateModel}. Configuration was not changed.`,
    '',
    'These are invented neutral goals. Only the parsed synthetic ladders are retained; credentials, provider error bodies and raw response text are not stored.',
    '',
    '| Goal | Model | Attempt elapsed | HTTP | Schema valid | Under 5 seconds |',
    '| --- | --- | ---: | ---: | --- | --- |',
    ...report.samples.map(sample => `| ${sample.goal} | ${sample.model} | ${(sample.durationMs / 1000).toFixed(3)} s | ${sample.httpStatus ?? '—'} | ${sample.schemaValid ? 'Yes' : 'No'} | ${sample.durationMs < 5000 ? 'Yes' : 'No'} |`),
    '',
    'A timeout is censored at the 25-second limit; its elapsed value is when the attempt was aborted, not completed generation latency. Schema validity checks only object shape and non-empty step lengths. Concrete action, feasibility and time limits need the semantic review below; these samples are not a latency guarantee.',
  ];
  for (const sample of report.samples) {
    lines.push('', `## ${sample.goal} — ${sample.model}`, '', `Latency: ${(sample.durationMs / 1000).toFixed(3)} seconds. Outcome: ${sample.outcome}.`, '');
    if (sample.steps) {
      lines.push(`- Tiny: ${sample.steps.tiny}`, `- Small: ${sample.steps.small}`, `- Full: ${sample.steps.full}`);
    } else {
      lines.push('No unambiguous schema-valid ladder was returned within this attempt; no retry was made.');
    }
    lines.push('', `Semantic review: ${sample.semanticReview.status}.`);
    if (sample.semanticReview.issues.length) lines.push(...sample.semanticReview.issues.map(issue => `- ${issue}`));
  }
  lines.push('', '## Decision', '', report.decision.reason, '', 'No LLM_MODEL change was made. Three observations per model cannot establish a production latency guarantee.', '');
  return lines.join('\n');
}

async function save(report) {
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outputMarkdown, renderMarkdown(report), 'utf8');
}

async function runSample(url, model, goal, sequence) {
  const started = performance.now();
  const sample = {
    sequence, goalId: goal.id, goal: goal.text, model,
    attempt: 1, timeoutMs: 25000, httpStatus: null, durationMs: null,
    schemaValid: false, outcome: 'pending', steps: null,
    semanticReview: { status: 'pending manual review', issues: [] },
  };
  let phase = 'request';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: promptFor(goal.text) }], temperature: 0.2, max_tokens: 2048 }),
      signal: AbortSignal.timeout(25000), redirect: 'error',
    });
    sample.httpStatus = response.status;
    if (!response.ok) {
      await response.body?.cancel();
      sample.durationMs = Math.round(performance.now() - started);
      sample.outcome = 'http_error';
      return sample;
    }
    phase = 'response_decode';
    const body = await response.json();
    sample.durationMs = Math.round(performance.now() - started);
    sample.finishReason = typeof body.choices?.[0]?.finish_reason === 'string' ? body.choices[0].finish_reason : null;
    const content = body.choices?.[0]?.message?.content;
    const raw = Array.isArray(content) ? content.map(part => typeof part.text === 'string' ? part.text : '').join('') : content;
    phase = 'parse_validate';
    const parsed = parseModelObject(raw, responseSchema, { ignoreObjects: [scaffold] });
    sample.steps = parsed.steps;
    sample.schemaValid = true;
    sample.outcome = 'schema_valid';
  } catch (error) {
    sample.durationMs ??= Math.round(performance.now() - started);
    sample.outcome = error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout'
      : phase === 'parse_validate' ? 'ambiguous_or_invalid_ladder' : 'request_or_decode_error';
    // Do not retain arbitrary error messages, response bodies, headers or keys.
  }
  return sample;
}

try {
  if (!key || !configuredModel || !base) throw new Error('missing_configuration');
  const url = new URL('chat/completions', base);
  if (url.protocol !== 'https:' || url.hostname !== 'generativelanguage.googleapis.com') throw new Error('unapproved_destination');
  const { stdout } = await execFileAsync(process.execPath, [new URL('./list-models.mjs', import.meta.url).pathname], {
    env: process.env, encoding: 'utf8', timeout: 35000, maxBuffer: 1024 * 1024,
  });
  const inventory = JSON.parse(stdout);
  const listed = inventory.gemma.filter(entry => entry.supportedGenerationMethods?.includes('generateContent'));
  if (!listed.some(entry => entry.name === `models/${configuredModel}`)) throw new Error('configured_model_not_in_fresh_inventory');
  const candidates = listed.filter(entry => entry.name !== `models/${configuredModel}`);
  if (candidates.length !== 1) throw new Error('candidate_selection_requires_review');
  const candidateModel = candidates[0].name.replace(/^models\//, '');
  const report = {
    startedAt: new Date().toISOString(), status: 'running', syntheticOnly: true,
    configuredModel, candidateModel, inventory,
    methodology: {
      transport: 'Google Gemini API OpenAI-compatible chat completions',
      temperature: 0.2, maxOutputTokens: 2048, timeoutMs: 25000,
      attemptsPerSample: 1, retries: 0, sequential: true,
      ordering: 'Alternating models per goal; starter alternates for each next goal.',
      latency: 'Successful requests: wall-clock start through complete JSON body, excluding inventory/local validation. Timeout durations are abort elapsed times censored at 25 seconds, not completed generation latency.',
      promptTemplate: promptFor('{SYNTHETIC_GOAL}'),
      systemRole: false, jsonMode: false,
    },
    samples: [],
    decision: { configurationChanged: false, switchProposed: false, reason: 'Comparison running; manual semantic review pending. No switch is proposed before all six results are reviewed.' },
  };
  await save(report);
  process.stdout.write(JSON.stringify({ phase: 'inventory_complete', totalModels: inventory.totalModels, gemma: inventory.gemma.map(entry => entry.name), configuredModel, candidateModel }) + '\n');
  for (const [index, goal] of goals.entries()) {
    const order = index % 2 === 0 ? [configuredModel, candidateModel] : [candidateModel, configuredModel];
    for (const model of order) {
      const sample = await runSample(url, model, goal, report.samples.length + 1);
      report.samples.push(sample);
      await save(report);
      process.stdout.write(JSON.stringify({ phase: 'sample_complete', goalId: goal.id, model, durationMs: sample.durationMs, httpStatus: sample.httpStatus, outcome: sample.outcome }) + '\n');
    }
  }
  report.status = 'complete_pending_semantic_review';
  report.finishedAt = new Date().toISOString();
  report.decision.reason = 'Six attempts completed. Manual semantic review is still required. No model configuration was changed.';
  await save(report);
} catch {
  // Deliberately exclude subprocess/provider error bodies, which may contain secrets.
  process.stderr.write('Comparison stopped before completion; no model configuration was changed.\n');
  process.exitCode = 1;
}
