import test from 'node:test';
import assert from 'node:assert/strict';
import * as z from 'zod';
import { parseModelObject } from './parse-model-object.mjs';
const step = z.string().min(1).max(60);
const schema = z.object({ steps: z.object({ tiny: step, small: step, full: step }).strict() }).strict();
const placeholder = { steps: { tiny: '...', small: '...', full: '...' } };
const result = { steps: { tiny: 'Put a towel by the door', small: 'Pack a swim bag', full: 'Walk to the pool' } };
const parse = text => parseModelObject(text, schema, { ignoreObjects: [placeholder] });
test('accepts direct and fenced JSON', () => {
  assert.deepEqual(parse(JSON.stringify(result)), result);
  assert.deepEqual(parse('```json\n' + JSON.stringify(result) + '\n```'), result);
});
test('ignores exact schema echo and deduplicates repeated identical results', () => {
  const text = 'Schema: ' + JSON.stringify(placeholder) + '\nDraft: ' + JSON.stringify(result) + '\nFinal: ' + JSON.stringify(result);
  assert.deepEqual(parse(text), result);
});
test('rejects two distinct schema-valid alternatives', () => {
  const other = { steps: { ...result.steps, tiny: 'Put a cap by the door' } };
  assert.throws(() => parse(JSON.stringify(result) + '\n' + JSON.stringify(other)));
});
test('does not repair invalid fields or accept only the schema example', () => {
  assert.throws(() => parse(JSON.stringify(placeholder)));
  assert.throws(() => parse(JSON.stringify({ steps: { ...result.steps, tiny: '' } })));
  assert.throws(() => parse(JSON.stringify({ steps: { ...result.steps, full: 'x'.repeat(61) } })));
});
test('handles quoted braces and rejects a truncated trailing candidate', () => {
  const braces = { steps: { ...result.steps, tiny: 'Write "{swim}" on a note' } };
  assert.deepEqual(parse('Result: ' + JSON.stringify(braces)), braces);
  assert.throws(() => parse('Result: ' + JSON.stringify(result) + '\n{"steps":'));
});
