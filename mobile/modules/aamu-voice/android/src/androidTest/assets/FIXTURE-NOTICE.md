# Public upstream test fixture

`upstream-speech-5s.wav` is the first five seconds (80,000 mono PCM16 samples at
16 kHz) of Silero's public `tests/data/test.wav`, from its MIT-licensed repository
at commit `be95df9152c0d7618fa1edfeb296fc3dae32376f`.

Source: https://raw.githubusercontent.com/snakers4/silero-vad/be95df9152c0d7618fa1edfeb296fc3dae32376f/tests/data/test.wav

Original SHA-256: `89f17d9c94c4b31eb320f424628bcbc920abaddbee6e2760fd868bfb1d9a2e47`.
Crop SHA-256: `9801862e19eb4401191d16bbffbce28660b2dad9762308c83e66aa97fcf50ce1`.

Copyright (c) 2020-present Silero Team. The repository's MIT license is bundled as
`src/main/assets/aamu-voice/SILERO-LICENSE.txt`. This crop is test-only; it is not
bundled in the production app or presented as any user's recording. The tests
also create digital silence and a silence-prefixed variation locally and delete
all their temporary files. No user recording is used.
