// Bounded capability probe, not the product goal endpoint or its final contract.
// Sends one synthetic goal only. No recordings, user identity, history or real goal text.
import { readFile } from 'node:fs/promises';
import * as z from 'zod';
import { parseModelObject } from './parse-model-object.mjs';


const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.LLM_MODEL?.trim();
const base = process.env.LLM_BASE_URL?.trim();
if (!key || !model || !base) {
  process.stderr.write('GEMINI_API_KEY, LLM_MODEL and LLM_BASE_URL are required. No request made.\n');
  process.exitCode = 2;
} else {
  const native = process.argv.includes('--native');
  const transport = native ? 'native generateContent' : 'OpenAI-compatible chat completions';
  const started = performance.now();
  let phase = 'inventory';
  let httpStatus = null;
  let finishReason = null;
  try {
    const inventory = JSON.parse(await readFile(new URL('../../review/provider-models.json', import.meta.url), 'utf8'));
    if (!inventory.gemma.some(entry => entry.name === `models/${model}`)) {
      throw new Error('Configured model is not in the authenticated Gemma inventory.');
    }
    const step = z.string().min(1).max(60).refine(value => value.trim().length > 0);
    const responseSchema = z.object({ steps: z.object({ tiny: step, small: step, full: step }).strict() }).strict();
    const prompt = [
      'This is a synthetic integration check for a goal ladder, not a real user request.',
      'Create three concrete, simple steps towards this sample goal: Get back to swimming.',
      'Tiny: at most 2 minutes and doable at home. Small: at most 10 minutes. Full: at most 30 minutes.',
      'Each step starts with a verb and is at most 60 characters. Do not give medical advice.',
      'Return only a JSON object with this exact shape: {"steps":{"tiny":"...","small":"...","full":"..."}}.',
      'No markdown or other fields.',
    ].join('\n');
    const url = new URL(native ? `models/${encodeURIComponent(model)}:generateContent` : 'chat/completions', base);
    if (url.protocol !== 'https:' || url.hostname !== 'generativelanguage.googleapis.com') {
      throw new Error('Probe destination must be the approved Google Gemini API.');
    }
    const body = native
      ? { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2048 } }
      : { model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 2048 };
    phase = 'request';
    const response = await fetch(url, {
      method: 'POST',
      headers: native
        ? { 'x-goog-api-key': key, 'Content-Type': 'application/json' }
        : { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
      redirect: 'error',
    });
    httpStatus = response.status;
    if (!response.ok) {
      process.stdout.write(JSON.stringify({ model, transport, status: response.status, durationMs: Math.round(performance.now() - started), validated: false }) + '\n');
      process.exitCode = 1;
    } else {
      phase = 'response-decode';
      const result = await response.json();
      finishReason = native ? result.candidates?.[0]?.finishReason : result.choices?.[0]?.finish_reason;
      const content = native
        ? result.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text ?? '').join('')
        : result.choices?.[0]?.message?.content;
      const raw = Array.isArray(content) ? content.map(part => typeof part.text === 'string' ? part.text : '').join('') : content;
      phase = 'json-parse';
      const parsed = responseSchema.safeParse(parseModelObject(raw, responseSchema, { ignoreObjects: [{ steps: { tiny: '...', small: '...', full: '...' } }] }));
      // Never print the prompt, response text, provider error body or credentials.
      process.stdout.write(JSON.stringify({
        model, transport, status: response.status,
        durationMs: Math.round(performance.now() - started),
        validated: parsed.success,
        syntheticGoalOnly: true,
        noSystemRole: true,
        noJsonMode: true,
      }) + '\n');
      if (!parsed.success) process.exitCode = 1;
    }
  } catch (error) {
    const category = ['SyntaxError', 'TimeoutError', 'TypeError', 'AbortError'].includes(error?.name) ? error.name : 'Error';
    process.stderr.write(JSON.stringify({ model, transport, phase, category, status: httpStatus, finishReason, durationMs: Math.round(performance.now() - started), validated: false }) + '\n');
    process.exitCode = 1;
  }
}
