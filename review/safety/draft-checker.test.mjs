import test from 'node:test';
import assert from 'node:assert/strict';
import { distressPhraseDraft } from './distress-phrases.draft.mjs';
import { hasDraftIntentPhrase, normalizeDraftText } from './draft-checker.mjs';

const check = (text, language) => hasDraftIntentPhrase(text, language, { allowUnreviewedDraft: true });

test('U17 approves the shared list while native Finnish review remains unconfirmed', () => {
  assert.equal(distressPhraseDraft.approval, 'user-approved-u17');
  assert.equal(distressPhraseDraft.productionEnabled, true);
  assert.equal(hasDraftIntentPhrase('', 'en'), false);
});

test('both lists remain within the requested review size', () => {
  for (const code of ['en', 'fi']) {
    const count = distressPhraseDraft.languages[code].entries.length;
    assert.ok(count >= 15 && count <= 25);
  }
  assert.equal(distressPhraseDraft.languages.fi.approval, 'needs native review');
});

test('Swedish is explicitly unsupported until drafted', () => {
  assert.equal(distressPhraseDraft.languages.sv.entries.length, 0);
  assert.throws(() => check('', 'sv'), /no draft phrase list/);
});

for (const [language, config] of Object.entries(distressPhraseDraft.languages)) {
  for (const [id, phrase, suffixes = {}] of config.entries) {
    const canonical = phrase.split(/\s+/u).map((token) => token.endsWith('*')
      ? token.slice(0, -1) + suffixes[token.slice(0, -1)][0] : token).join(' ');
    // Test names contain only invented fixture IDs, never checked text or matches.
    test(`positive fixture ${id}`, () => assert.equal(check(canonical, language), true));
  }
}

const normalizationCases = [
  ['norm-en-case-space', 'en', '  I  INTEND\nTO\tHARM   MYSELF  '],
  ['norm-en-punctuation', 'en', 'I—intend, to harm myself.'],
  ['norm-en-curly-apostrophe', 'en', 'I’m going to hurt myself'],
  ['norm-fi-case-space', 'fi', '  AION\nSATUTTAA\tITSEÄNI  '],
  ['norm-fi-decomposed', 'fi', 'aion päättää elämäni'.normalize('NFD')],
  ['norm-fi-punctuation', 'fi', 'Aion—satuttaa, itseäni.'],
  ['stem-fi-infinitive-clitic', 'fi', 'aion satuttaakin itseäni'],
  ['stem-fi-participle', 'fi', 'suunnittelen satuttavani itseäni'],
  ['stem-fi-participle-clitic', 'fi', 'suunnittelen satuttavanikin itseäni'],
];
for (const [id, language, text] of normalizationCases) {
  test(id, () => assert.equal(check(text, language), true));
}

const nonmatches = [
  ['ordinary-en-tired', 'en', 'Take a short walk when I am tired.'],
  ['ordinary-en-hopeless', 'en', 'I am hopeless at chess; practise one opening.'],
  ['ordinary-en-pain', 'en', 'Write down my questions about knee pain.'],
  ['ordinary-en-burden', 'en', 'Reduce the burden of chores by washing one cup.'],
  ['ordinary-en-die', 'en', 'Water the plant so it does not die.'],
  ['ordinary-en-kill', 'en', 'Kill the weeds in the garden.'],
  ['ordinary-en-kill-time', 'en', 'Read one page to kill time before the bus.'],
  ['ordinary-en-fabric-dyeing', 'en', 'Learn fabric dyeing and prepare one sample.'],
  ['ordinary-en-single-words', 'en', 'tired hopeless pain burden die kill'],
  ['ordinary-fi-tired', 'fi', 'Olen väsynyt, joten kävelen lyhyen matkan.'],
  ['ordinary-fi-hopeless', 'fi', 'Olen toivoton shakissa, joten harjoittelen.'],
  ['ordinary-fi-pain', 'fi', 'Kirjoitan kysymyksen polven kivusta.'],
  ['ordinary-fi-burden', 'fi', 'Vähennän arjen taakkaa pesemällä yhden kupin.'],
  ['ordinary-fi-die', 'fi', 'Kastelen kasvin, jotta se ei kuole.'],
  ['ordinary-fi-kill', 'fi', 'Aion tappaa rikkaruohot puutarhasta.'],
  ['ordinary-fi-single-words', 'fi', 'väsynyt toivoton kipu taakka kuolla tappaa'],
  ['negative-en-intent', 'en', 'I do not intend to harm myself.'],
  ['negative-en-plan', 'en', 'I do not plan to end my life.'],
  ['negative-en-going', 'en', 'I am not going to hurt myself.'],
  ['negative-en-will', 'en', 'I will not harm myself.'],
  ['negative-en-contraction', 'en', "I won't harm myself."],
  ['negative-fi-intent', 'fi', 'En aio satuttaa itseäni.'],
  ['negative-fi-plan', 'fi', 'En suunnittele vahingoittavani itseäni.'],
  ['negative-fi-decision', 'fi', 'En ole päättänyt kuolla.'],
  ['negative-fi-intention-noun', 'fi', 'Minulla ei ole aikomusta vahingoittaa itseäni.'],
  ['counterexample-fi-without-harming', 'fi', 'Aion olla vahingoittamatta itseäni.'],
  ['counterexample-fi-negative-stem', 'fi', 'Suunnittelen olevani satuttamatta itseäni.'],
  ['counterexample-fi-unlisted-negative-ending', 'fi', 'aion satuttamatta itseäni'],
  ['counterexample-fi-other-person', 'fi', 'Hän aikoo satuttaa itseään.'],
  ['counterexample-en-other-person', 'en', 'They intend to harm themselves.'],
  ['boundary-en-prefix', 'en', 'hi intend to harm myself'],
  ['boundary-en-suffix', 'en', 'I intend to harm myselfish'],
  ['boundary-fi-prefix', 'fi', 'xaion satuttaa itseäni'],
  ['boundary-fi-suffix', 'fi', 'aion satuttaa itseänix'],
  ['empty-en', 'en', ''],
  ['empty-fi', 'fi', ''],
];
for (const [id, language, text] of nonmatches) {
  test(id, () => assert.equal(check(text, language), false));
}

// These passing characterizations expose limitations; they do NOT approve them
// as production decisions or establish that the speaker has any current intent.
const knownFalsePositives = [
  ['limitation-en-reported-history', 'en', 'I once said "I intend to harm myself", but that is not true now.'],
  ['limitation-en-negation-scope', 'en', 'It is not true that I intend to harm myself.'],
  ['limitation-fi-quotation', 'fi', 'Käännä lause "aion satuttaa itseäni" englanniksi.'],
  ['limitation-fi-negation-scope', 'fi', 'Ei ole totta, että aion satuttaa itseäni.'],
  ['limitation-en-punctuation-joins-sentences', 'en', 'I intend. To harm myself? No.'],
  ['limitation-en-figurative-death', 'en', 'I intend to die laughing'],
  ['limitation-fi-figurative-death', 'fi', 'aion kuolla nauruun'], // needs native review — intended meaning: "I intend to die laughing."
];
for (const [id, language, text] of knownFalsePositives) {
  test(id, () => assert.equal(check(text, language), true));
}

const knownFalseNegatives = [
  ['limitation-en-unlisted-wording', 'en', 'I have made a plan to harm myself.'],
  ['limitation-fi-unlisted-word-order', 'fi', 'Itseäni aion satuttaa.'],
  ['limitation-en-zero-width-character', 'en', 'I intend to ha\u200brm myself.'],
];
for (const [id, language, text] of knownFalseNegatives) {
  test(id, () => assert.equal(check(text, language), false));
}

test('normalization is canonically equivalent and idempotent', () => {
  const a = normalizeDraftText('  PÄÄTTÄÄ—ELÄMÄNI  ');
  assert.equal(a, normalizeDraftText('  PÄÄTTÄÄ—ELÄMÄNI  '.normalize('NFD')));
  assert.equal(a, normalizeDraftText(a));
});

test('result is boolean and does not return text or identifiers', () => {
  assert.equal(typeof check('I intend to harm myself.', 'en'), 'boolean');
});
