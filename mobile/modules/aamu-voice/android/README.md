# Android local speech estimates

The Expo bridge decodes only an existing verified file inside this app's cache,
files or no-backup directory. Android MediaExtractor/MediaCodec decode AAC/m4a
(the recorder's normal output); raw PCM WAV is also accepted. The complete decoded
clip must contain at least five seconds. Unsupported, incomplete, malformed,
remote, short or unclassifiable input never becomes a valid silent sample.

PCM is mixed equally to mono and resampled to 16 kHz with a windowed-sinc low-pass
filter; this is signal conversion, not a speech/loudness heuristic. The pinned
Silero model runs on CPU through ONNX Runtime with fresh recurrent state for each
recording. The first 80,000 samples form 157 disjoint 512-sample windows. The last
window is zero-padded for the model only; its contribution is clipped to the eight
milliseconds actually inside the five-second sample. Speech probability >=0.5
accepts a window. Covered time / 5000 gives speechShare; the first accepted window
start gives speechOnsetMs. Results include `silero.vad.v6.2.onnx` provenance,
32 ms window/hop and `estimated: true`.

These are estimates, not exact boundaries: 32 ms output resolution does not imply
32 ms detection accuracy, and the recurrent model uses earlier audio context.
This differs from Apple's 500 ms overlapping speech/whisper classifier. Silero
does not return a separate whisper label; quiet/whispered speech and phone audio
conditions need acceptance checks. Neither implementation identifies the speaker,
distinguishes nearby TV speech from the user, nor infers emotion or diagnosis.
The shared >=2500 ms and quiet-share scoring rules remain unchanged. No previous
Android `unavailable` sample enters the voice baseline.

There is no network API, model download, transcription, microphone request,
background capture, audio persistence or analytics in this module. The model and
license notices are bundled assets. ONNX telemetry is explicitly disabled before
session creation; logging is restricted to fatal runtime failures. The bridge
returns only numeric estimates and fixed status/reason labels, never the URI,
samples or probability sequence. Temporary recording deletion remains the calling
voice flow's responsibility. Model/decoder errors yield failed/unavailable with
null speech metrics; the existing score engine assigns zero technical-failure
points. Decode work runs on Expo's worker queue and has a 20-second bound.

## Pinned dependencies and provenance

- `com.microsoft.onnxruntime:onnxruntime-android:1.23.2`: MIT, CPU inference. This is
  a local native runtime, not a hosted service. No new Expo/JavaScript SDK is used.
- Silero VAD **v6.2**, upstream commit
  `be95df9152c0d7618fa1edfeb296fc3dae32376f`, MIT. Bundled model size 2,327,524 bytes;
  SHA-256 `1a153a22f4509e292a94e67d6f9b85e8deb25b4988682b7e174c65279d8788e3`.
  The analyzer verifies that hash before inference.
- `androidx.test:runner:1.6.2` is test-only instrumentation infrastructure;
  `junit:junit:4.13.2` is the already-used local test dependency.

The MIT notices and ONNX Runtime's upstream third-party notices accompany the
model in `src/main/assets/aamu-voice`. The input
contract follows upstream OnnxWrapper: 512 new samples + 64 context samples,
16 kHz scalar sample rate and recurrent state of shape [2,1,128]. No shared state
is retained between clips.

## Verification

`VoiceWindowsTest` covers complete silence, incomplete analysis, clipped final
padding, inclusive threshold without confidence summing, onset windows around
2500 ms and invalid classifier output. `PcmResamplerTest` covers complete sample
counts, 44.1/48/16 kHz, stereo/multichannel downmix, silence/DC/passband, alias
attenuation, first-five-second boundaries and invalid input.

`VoiceAnalyzerTest` runs the actual bundled model and Android decoder on generated
digital silence, a generated AAC/m4a silence clip, and a five-second crop of
upstream's public test speech. It also tests delayed speech, incomplete/short,
malformed and remote inputs. Fixtures stay in the separate instrumentation target
and test cache, are deleted after tests, and are never seeded into Aamu's messages
or sensing history. It does not open a microphone or read the app user's files.

On 14 November 2026, the full ARM64 Android debug APK built successfully. All
17 local Kotlin tests passed (11 PCM/resampling + 6 window/metric tests), followed
by all 5 instrumentation tests on the API 36 ARM64 emulator. The first test-run
attempt hit the emulator's removed legacy AndroidTestCase dependency; changing
the fixture class to JUnit 4 resolved that test-harness issue. No product behavior
was changed to make tests pass. Build and test logs are respectively
`/tmp/aamu-android-voice-build.log` and
`/tmp/aamu-android-voice-instrumentation.log`.

The app APK contains the expected model hash, its MIT/third-party notices and the
ARM64 ONNX libraries; it does **not** contain the upstream speech test fixture.
Mobile TypeScript and targeted module lint passed. Emulator fixtures do not
establish real-microphone accuracy, noise/whisper robustness or physical-phone
performance. No clinical calibration or latency guarantee is made.

Run from `mobile/android` using the project's Node 24 PATH, Android SDK and Android
Studio JBR, with `EXPO_NO_TELEMETRY=1`:

```sh
./gradlew :aamu-voice:testDebugUnitTest :aamu-voice:assembleDebugAndroidTest :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
./gradlew :aamu-voice:connectedDebugAndroidTest -PreactNativeArchitectures=arm64-v8a
```

## Primary sources

- [Silero official repository](https://github.com/snakers4/silero-vad/tree/be95df9152c0d7618fa1edfeb296fc3dae32376f)
- [Upstream ONNX input/state contract](https://github.com/snakers4/silero-vad/blob/be95df9152c0d7618fa1edfeb296fc3dae32376f/src/silero_vad/utils_vad.py)
- [Silero MIT license](https://github.com/snakers4/silero-vad/blob/be95df9152c0d7618fa1edfeb296fc3dae32376f/LICENSE)
- [ONNX Runtime Java/Android](https://onnxruntime.ai/docs/get-started/with-java.html)
- [ONNX Runtime MIT license](https://github.com/microsoft/onnxruntime/blob/v1.23.2/LICENSE)
- [Android MediaCodec](https://developer.android.com/reference/android/media/MediaCodec)
- [Android MediaExtractor](https://developer.android.com/reference/android/media/MediaExtractor)
