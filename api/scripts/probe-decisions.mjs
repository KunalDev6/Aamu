// One harmless synthetic access probe. Never outputs provider bodies or probabilities.
import { GoogleGenAI } from '@google/genai';
import { writeFile } from 'node:fs/promises';

const key = process.env.GEMINI_API_KEY?.trim();
if (!key) throw new Error('GEMINI_API_KEY must be set privately.');
const ai = new GoogleGenAI({ apiKey: key, apiVersion: 'v1beta' });
const start = performance.now();
const evidence = {
  checkedAt: new Date().toISOString(), model: 'gemini-decision-1', sdkVersion: '3.3.0',
  requests: 1, syntheticOnly: true, accessible: false, durationMs: 0,
};
try {
  const result = await ai.decisions.create({
    model: 'gemini-decision-1',
    input: 'The blue mug arrived with a crack through its handle.',
    questions: { damaged: { type: 'noul', instructions: 'Did the mug arrive damaged?' } },
  }, { timeout: 25000, maxRetries: 0 });
  evidence.durationMs = Math.round(performance.now() - start);
  evidence.accessible = result.answers?.damaged?.type === 'noul'
    && Number.isFinite(result.answers.damaged.noul);
  evidence.responseValidated = evidence.accessible;
} catch (error) {
  evidence.durationMs = Math.round(performance.now() - start);
  evidence.status = Number.isInteger(error?.status) ? error.status : null;
  evidence.category = ['AbortError', 'TimeoutError'].includes(error?.name) ? error.name : 'provider_error';
  process.exitCode = 1;
}
await writeFile(new URL('../../review/provider-decisions.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
process.stdout.write(JSON.stringify(evidence) + '\n');
