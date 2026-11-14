// Shared phone/server lexical checker. No I/O or telemetry.
import { distressPhrases } from './distress-phrases.mjs';

export function normalizeText(text) {
  if (typeof text !== 'string') throw new TypeError('Expected text');
  return text.normalize(distressPhrases.normalizationProposal)
    .toLowerCase().normalize(distressPhrases.normalizationProposal)
    .replace(/\p{P}+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileEntry(entry, mode) {
  const [, phrase, stemSuffixes = {}] = entry;
  const body = mode === 'whole-phrase'
    ? escapeRegex(normalizeText(phrase))
    : phrase.split(/\s+/u).map((token) => {
      if (!token.endsWith('*')) return escapeRegex(normalizeText(token));
      const stem = token.slice(0, -1);
      const suffixes = stemSuffixes[stem];
      if (!suffixes?.length) throw new Error('Draft stem has no bounded suffixes');
      return `${escapeRegex(normalizeText(stem))}(?:${suffixes.map((suffix) => escapeRegex(normalizeText(suffix))).join('|')})`;
    }).join(' ');
  // Unicode word boundaries, not ASCII-only \b. Do not match inside another word.
  return new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${body}(?![\\p{L}\\p{M}\\p{N}])`, 'u');
}

const compiled = new Map(Object.entries(distressPhrases.languages)
  .filter(([, language]) => language.entries.length)
  .map(([code, language]) => [code, language.entries.map((entry) => compileEntry(entry, language.matching))]));

/**
 * Returns a lexical candidate boolean, NOT risk, intent, or a clinical verdict.
 * Exact phrase matching cannot resolve quotation, reported speech or negation scope.
 * No input, matched phrase, entry identifier or result is logged/persisted/transmitted.
 */
export function hasIntentPhrase(text, language) {
  const patterns = compiled.get(language);
  if (!patterns) throw new RangeError('Language has no draft phrase list');
  const normalized = normalizeText(text);
  return patterns.some((pattern) => pattern.test(normalized));
}

// Check both supported languages; no language, matched entry or verdict is transmitted.
export function hasAnyIntentPhrase(text) {
  return [...compiled.keys()].some(language => hasIntentPhrase(text, language));
}
