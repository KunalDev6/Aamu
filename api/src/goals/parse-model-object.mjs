// Bounded model-output extraction. Validate candidates and reject conflicting results.
/**
 * @param {string} text
 * @param {import('zod').ZodType} schema
 * @param {{ ignoreObjects?: unknown[] }} options
 */
export function parseModelObject(text, schema, options = {}) {
  const ignoreObjects = options.ignoreObjects ?? [];
  if (typeof text !== 'string') throw new TypeError('Expected model text');
  const clean = text.trim().replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, '$1').trim();
  const ignored = new Set(ignoreObjects.map(value => JSON.stringify(schema.parse(value))));
  const validate = value => {
    const parsed = schema.safeParse(value);
    return parsed.success && !ignored.has(JSON.stringify(parsed.data)) ? parsed.data : null;
  };
  let whole;
  try { whole = { value: JSON.parse(clean) }; } catch { /* Try bounded objects below. */ }
  if (whole) {
    const data = validate(whole.value);
    if (!data) throw new Error('Model output failed schema validation');
    return data;
  }
  const candidates = new Map();
  let start = -1, depth = 0, quoted = false, escaped = false;
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (start < 0) {
      if (char === '{') { start = i; depth = 1; quoted = false; escaped = false; }
      continue;
    }
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) {
      try {
        const data = validate(JSON.parse(clean.slice(start, i + 1)));
        if (data) candidates.set(JSON.stringify(data), data);
      } catch { /* This bounded candidate is not valid JSON. */ }
      start = -1;
    }
  }
  if (candidates.size !== 1 || start >= 0) throw new Error('No single unambiguous validated result');
  return candidates.values().next().value;
}
