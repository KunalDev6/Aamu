# Bundled place ambience

These are edited field recordings, bundled locally. They are not generated music,
personal voice recordings, or remotely streamed assets. The app needs no network
request to play them. Source and output hashes are in `manifest.json`.

## Sea — `sea.m4a`

- **Recording:** jasinski, *Alkai Beach*; excerpts prepared/submitted by qubodup.
- **Verified source:** [Beach Ocean Waves on OpenGameArt](https://opengameart.org/node/11174), retrieved 14 November 2026.
- **Original recording reference:** [Freesound 18363](https://freesound.org/people/jasinski/sounds/18363/), linked by the verified source page.
- **Licence:** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/), explicitly listed on the OpenGameArt asset page. Credit is retained as a courtesy.
- **Source files:** the four `wave_0N_cc0-18363__jasinski__alkaibeach.flac` files linked by that page, retained under `sources/`.
- **Edits:** join the four excerpts in numerical order with 250 ms linear crossfades; apply 100 ms fade-in/out at the outer edges; transcode to stereo AAC-LC, 44.1 kHz, nominal 128 kb/s. No generated audio or voice was added.
- **Bundled duration:** 11.511 seconds.

## Forest — `forest.m4a`

- **Recording:** Barracuda1983, *Birds forest* — birds recorded in the forest of Fontainebleau, France.
- **Verified source:** [Wikimedia Commons, Birds forest.ogg](https://commons.wikimedia.org/w/index.php?title=File:Birds_forest.ogg&oldid=824593483), retrieved 14 November 2026.
- **Rights:** the file page records the copyright holder's worldwide public-domain dedication and unrestricted-use fallback where dedication is not possible. This is the audio's PD-self dedication, not the separate licence for Commons page text or structured data.
- **Original:** `Birds_forest.ogg`, retained as `sources/forest-source.ogg`.
- **Edits:** apply 100 ms fade-in/out; transcode to stereo AAC-LC, 44.1 kHz, nominal 128 kb/s. No generated audio or voice was added.
- **Bundled duration:** 14.654 seconds.

## Verification and integration boundary

Both output files decode fully with FFmpeg. Measured peaks are -11.3 dBFS (Sea)
and -12.4 dBFS (Forest), with no clipping reported by the decode/level check.
These are file checks, not listening approval, device playback validation, seamless
loop certification, or locked-screen alarm validation. Short edge fades reduce
join clicks but the natural ambience repeats when looped. Dawn volume/envelope,
looping, and native alarm packaging belong to the owning audio/alarm flow.

Only require `sea.m4a` and `forest.m4a` from application code. Original files in
`sources/` are retained for provenance and reproducibility; they are not needed at
runtime. No dependency or hosted service was added to acquire or process them.
