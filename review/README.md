# Aamu visual review

This is a standalone visual renderer for the explicitly authorized Alarm, Message and Home review. It is not the Expo app and does not schedule alarms, play/record audio, persist data, contact a clinic or signal a partner.

The fresh **Nightwater** palette lives exclusively in `../src/theme.ts`. It combines deep ink/slate surfaces with a single oat-gold action accent. Landscape layers interpolate between named night, twilight and dawn tokens. Existing downloaded references are unchanged.

## Run

From the repository root:

```sh
node review/build.mjs
python3 -m http.server 8765 --bind 127.0.0.1
```

Open these routes:

- `http://127.0.0.1:8765/review/?screen=alarm&dawn=0.15`
- `http://127.0.0.1:8765/review/?screen=message&dawn=1`
- `http://127.0.0.1:8765/review/?screen=home&dawn=0.55`

`dawn=0` is night; `dawn=1` is dawn. The outside-phone slider changes the sky without changing confirmed wake state. Add `&capture=1` for an unscaled 390 × 844 screen with no surrounding review controls. The desktop presentation scales the frame only to fit common viewport heights; all design font sizes are at least 16px at the native 390 × 844 size.

## Visual proposals and boundaries

- Plus Jakarta Sans, a light clock, regular/medium other text, word-labelled pills, dark rounded layered surfaces, sparse spacing and lower-half actions follow U11.
- The landscape is redrawn from the HTML reference's layered hills, pines, lake and sun. All new colors come from the same theme tokens.
- Text remains on opaque dark canvas or protected surfaces, never directly on a changing landscape. `generated/contrast.json` records computed WCAG sRGB contrast for all text/background pairs. This gives the same lower bound throughout the continuous dawn range.
- The displayed Alarm is before confirmed getting up, so its sun is not lit. Message/Home illustrate confirmed, unpaired wake state with a whole lit sun. Sky progress is independent.
- Home's sample step comes from the Stitch Home reference. Message's sample step and “From your well self” come from the HTML. This is not an approval of unresolved content placement or transition semantics.
- Replay is labelled “Listen again” for this review; exact final labels remain subject to the shared decision register.
- The two-second hold fill is illustrated without triggering a state transition. All other actions report their preview-only status outside the phone. There are no fake success or delivery claims inside the product.
- Dawn timings, paired sun geometry, post-completion appearance and unanswered product behavior are not implemented.

## Generated assets

Run `node review/build.mjs` after editing `src/theme.ts`. It emits `generated/theme.css`, `generated/theme.js` and `generated/contrast.json`. The renderer has no package dependencies or build framework. Its only font asset is Plus Jakarta Sans, under the SIL Open Font License supplied in `assets/OFL.txt`.

## Captured review screens

Browser-rendered screenshots from 14 November 2026 are in `screenshots/alarm.jpg`, `screenshots/message.jpg` and `screenshots/home.jpg`, each 390 × 844. These are captures of this renderer, not screenshots from an iPhone or an Expo build. The rendered review corrected landscape letterboxing and blended scene boundaries into the dark canvas. Palette selection and these captures were completed within the authorized 30-minute palette window.
