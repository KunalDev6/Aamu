# Local speech estimates

`analyzeRecording(localUri, {recordingComplete, confidenceThreshold?})` uses Apple's
built-in SoundAnalysis `.version1` on iOS and bundled Silero VAD v6.2 on Android.
Both analyze an existing recording in this app's container. Neither records,
transcribes, uploads, logs or retains audio, nor requests Speech-recognition
permission. Microphone permission belongs to the recording flow. Builds without
the custom native module return `unavailable`. Android implementation and test
details are in [android/README.md](android/README.md).

The result exposes `status`, `speechShare`, `speechOnsetMs`, actual file duration,
analyzed duration, actual window/hop duration, classifier provenance, threshold,
`estimated: true`, and a fixed failure reason. No personal file path or raw
classifier output is returned. Unavailable/failed metrics are null, never silent.

The caller must pass `recordingComplete: true` only after the recorder reports the
full five seconds and successfully stops. A truncated file (less than five seconds),
incomplete capture, invalid file, decoder/classifier error, incomplete analysis or
no analysis results returns `failed`. `silent` requires successful complete file
analysis with no accepted interval in the first five seconds. A complete recording
containing accepted speech/whisper windows returns `spoke`.

## iOS engineering settings (unchanged)

- Request a 500 ms analysis window and use the actual window reported by Apple.
- Overlap windows by 50% (250 ms hops when the window is 500 ms).
- Accept either `speech` or `whispering` at confidence >=0.5, configurable per call.
- Clip accepted intervals to the first 5000 ms, merge overlap, then divide covered
  duration by five seconds. Never sum confidences or double-count overlaps.
- Onset is the start of the first accepted, clipped interval, expressed in ms.

These are window-based estimates, not exact speech boundaries. A millisecond field
does not imply millisecond accuracy. The window can include silence around speech;
onset can precede actual speech by part of a window. Changing window/threshold
settings changes these estimates and must not silently mix incompatible baselines.
The classifier cannot identify the speaker, distinguish nearby TV speech from the
user, or infer emotion, effort or diagnosis. The initial threshold is an engineering
setting, not clinical calibration. Metered loudness is never labelled speech.

Android uses the same result/scoring contract with distinct classifier provenance,
32 ms windows/hops and a configurable 0.5 speech probability threshold. Its VAD
does not expose a separate whisper class. These platform estimates are not
interchangeable accuracy measurements. Previous Android technical-unavailable
samples do not enter a voice baseline; phone-only history is not migrated across
platforms. See the Android README for the model's limitations.

Analysis runs on a worker queue after recording, without blocking the UI. No phone
latency or accuracy guarantee has been measured. Real-iPhone acceptance must cover
quiet speech, whispering, silence, breathing, ambient noise, other voices, delayed
onset around 2500 ms, interrupted recording and successful five-second recordings.

## Verification

The portable interval test executable covers overlap, duplicate labels, clipping,
disjoint intervals, full coverage and the 2500 ms boundary. The analyzer tests create
only synthetic digital silence locally, test invalid/incomplete/short inputs, run
the real built-in classifier on macOS, then delete their generated files. Those
tests do not establish accuracy on real voices or performance on iPhone.

On 14 November 2026, all 8 interval tests and 5 analyzer tests passed. One real
built-in classifier run on five seconds of synthetic digital silence took 113 ms
on this Mac; this is one observation, not a phone latency guarantee. The combined
iOS app with this module passed the full local simulator build and TypeScript
check. Real-voice and real-device acceptance remains pending.

```sh
xcrun swiftc ios/AamuVoiceIntervals.swift tests/VoiceIntervalsTests.swift -o /tmp/aamu-voice-interval-tests
/tmp/aamu-voice-interval-tests
xcrun swiftc ios/AamuVoiceIntervals.swift ios/AamuVoiceAnalyzer.swift tests/VoiceAnalyzerTests.swift -o /tmp/aamu-voice-analyzer-tests
/tmp/aamu-voice-analyzer-tests
```

## Primary references

- [Apple SoundAnalysis overview and window/threshold guidance](https://developer.apple.com/videos/play/wwdc2021/10036/)
- [Classifying an audio file](https://developer.apple.com/documentation/soundanalysis/classifying-sounds-in-an-audio-file)
- [Result time ranges](https://developer.apple.com/documentation/soundanalysis/snclassificationresult/timerange)
- [Classification request](https://developer.apple.com/documentation/soundanalysis/snclassifysoundrequest)

Apple documents local processing, independent confidence scores and the resolution
tradeoff. The installed SDK was inspected; a read-only macOS capability probe
confirmed `speech`/`whispering`, a 3s default window and supported windows beginning
at 0.5s. That probe did not access microphone input or any recording.
