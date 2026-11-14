# Approved phrase list and shared checker

The user approved the reviewed list in U17. Its single canonical source is `../../shared/safety/distress-phrases.mjs`: 24 English and 20 Finnish entries. The original draft link re-exports that file. Finnish entries still say **needs native review** because that review has not been confirmed; this does not introduce another approval gate. Swedish remains unsupported.

This is a safety net, not a risk detector. It cannot establish intent, predict harm or establish that someone is safe. Passing the local check allows the approved Google model checks; production use would require a self-hosted model.

`../../shared/safety/checker.mjs` is the shared phone/server checker. It checks NFC-normalized, lowercased text with punctuation and whitespace collapsed. English uses whole phrases with Unicode word boundaries. Finnish uses only the suffixes explicitly listed for each stem. No checker I/O, logging, network, counters or storage exists.

## Implemented boundary

- The pure mobile client blocks matching goal text before transmission; the approval helper blocks matching manually written steps before saving.
- The server repeats the same phrase check before Decisions or Gemma.
- A locally private goal never reaches the hint route or the filtered remote goal snapshot. Safety blocks in the later hint check trigger Help and localOnly while retaining approved text locally.
- Decisions distress probabilities stay inside the adapter. Routes return no raw provider bodies, probabilities or error messages; demo diagnostics permit only goal verdict and duration distributions.
- Full Expo screen/storage wiring, authenticated deployment and transactional PUT/morning redaction are still pending. Pure helpers and in-process route tests do not verify those integrations.

## Known lexical limitations

There is no semantic negation/context policy in the phrase checker. It can match quotations, history, conditionals or figurative phrases such as “I intend to die laughing”. Punctuation normalization loses sentence boundaries. Unlisted wording, reordered Finnish, spelling errors and inserted invisible characters can be missed. The tests explicitly characterize these limitations; they are not clinical validation. The later Decisions check cannot undo a local false positive because matched local text is never submitted.

## Verification

`node --test review/safety/draft-checker.test.mjs` runs 104 local phrase cases. `npm test` also runs provider parsing, goal pipeline, route and mobile-controller tests. Original review imports now forward to the approved canonical modules; there is no second list to diverge.

## Source boundaries

- [Unicode normalization FAQ](https://www.unicode.org/faq/normalization.html) explains canonical equivalence and recommends NFC for general text. It supports the proposed normalization choice, not any mental-health inference.
- [Kotus: verb person](https://kielitoimistonohjepankki.fi/ohje/verbin-persoonamuoto/) explains Finnish person agreement and that first/second-person subjects can be omitted. It informs keeping first-person verb wording explicit; it does not verify these draft entries or suffixes.
- [NICE NG225, recommendations 1.6.1–1.6.5](https://www.nice.org.uk/guidance/NG225/chapter/recommendations) advises against using assessment tools to predict future suicide/self-harm or to determine access to treatment. This supports limiting claims; it does not endorse a phrase list or this application.

Sources checked 14 November 2026. Clinical/language sources are context for limitations, not validation of this draft.
