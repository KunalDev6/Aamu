# U27 Home and Settings refinements

Implemented the approved layout refinements using the existing theme tokens and Plus Jakarta Sans. The captures below are the actual shared Expo Home/Settings views, rendered in a 390 × 844 browser viewport. They are visual review fixtures, not physical-phone alarm acceptance.

The requested five states are deliberately forced at both 07:30 and 21:00. In the real app, a 07:00 alarm's early control appears only 04:00–06:59, and the evening question appears only from 18:00 until midnight for a confirmed wake with an unanswered offered step. The earlier U26 captures also forced these states. Browser checks using the unforced presentation model confirm that 07:30 does not show the early control or evening question, and 21:00 does show the unanswered evening question.

## Changes and evidence

1. Time gates remain in the shared presentation model, with 34 Home tests including seven U27 regressions. `Sleep well` is plain text below the clock during evening/overnight rest before the early window; it is absent after the morning alarm during daytime.
2. The sky is a continuous full-height multistop gradient. The morning top is lighter; the lake derives its gradient from sky and terrain tokens. The measured top luminance at 07:30 is about 4.74 times that at 21:00. The contrast model's minimum text ratio is 4.678:1, including maximum ambient overlays; see `home-u27-contrast.json` for scope and limitations.
3. After 18:00, both confirmed means the single line “You both got up today.” Own confirmation alone means “You got up today.” and, if paired, “Your partner isn’t up yet.” Morning retains “You’re up.” Sun halves still require their respective confirmations.
4. Early shows “Alarm at 07:00” above its button. Early and alarm-off actions have no surrounding card. Settings rows have trailing decorative chevrons and word-labelled controls.
5. Ambient stars, cloud drift, water shimmer and lit-sun glow use slow token-derived opacity/transform animation. Native animation uses the native driver; browser animation uses CSS. Motion stops when unfocused, hidden/backgrounded or Reduce Motion is enabled. Home's idle clock now updates on minute boundaries rather than ten times per second.
6. Browser checks observed all four animation styles changing. A review restriction through the same Reduce Motion gate produced no animation styles and pixel-identical captures. Native OS preference wiring is implemented, but physical-device Reduce Motion and overnight battery use remain unmeasured.

## Screenshots

All review scenes carry the U28 “Demo” label. Paired suns here are isolated illustration fixtures; U28 startup never seeds a real partner. Settings reflects the new seed counts: one goal, zero Moments, Sea, Not paired, Clinic on.

| State | 07:30 | 21:00 |
| --- | --- | --- |
| Resting / next alarm | ![07:30 resting](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u27/0730-night.jpg) | ![21:00 resting](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u27/2100-night.jpg) |
| Early control (forced) | ![07:30 early](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u27/0730-early.jpg) | ![21:00 early](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u27/2100-early.jpg) |
| Confirmed wake / step | ![07:30 up](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u27/0730-up.jpg) | ![21:00 up](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u27/2100-up.jpg) |
| Evening question (forced at 07:30) | ![07:30 evening layout](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u27/0730-evening.jpg) | ![21:00 evening](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u27/2100-evening.jpg) |
| Alarm off | ![07:30 off](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u27/0730-off.jpg) | ![21:00 off](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u27/2100-off.jpg) |
| Settings | ![07:30 Settings](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u27/0730-settings.jpg) | ![21:00 Settings](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u27/2100-settings.jpg) |

## Motion recording

`recordings/home-u27/ambient-motion-demo-10s.mp4` is exactly 10.000 seconds. It encodes 123 actual browser captures using their measured capture times, with no interpolated/generated frames, overlays, audio or resizing. This is approximately 12 frames per second capture evidence, not a native performance benchmark. The manifest and verification JSON are beside it. The older unlabelled recording is retained only as historical evidence.

U27 code passed 342 API/shared tests, API/mobile typechecks and mobile lint before the subsequent U28 seed changes; the U28 report records the final combined verification.
