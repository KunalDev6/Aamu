import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export const voiceAnalysisConfig = {
  confidenceThreshold: 0.5,
  // Apple's configurable request. Silero's fixed 32ms frame/hop is returned by
  // Android in each result; it is not a 500ms speech-classification window.
  requestedWindowMs: 500,
  overlapFactor: 0.5,
  durationMs: 5000,
  labels: ['speech', 'whispering'],
} as const;

export type VoiceAnalysisResult = {
  status: 'spoke' | 'silent' | 'failed' | 'unavailable';
  speechShare: number | null;
  speechOnsetMs: number | null;
  durationMs: number | null;
  analyzedDurationMs: number;
  windowMs: number | null;
  hopMs: number | null;
  classifier: 'apple.soundanalysis.version1' | 'silero.vad.v6.2.onnx';
  confidenceThreshold: number;
  estimated: true;
  reason: 'none' | 'unavailable' | 'incomplete_recording' | 'invalid_local_file'
    | 'too_short' | 'invalid_config' | 'classifier_unavailable' | 'analysis_failed';
};

interface AamuVoiceNative {
  analyzeRecording(uri: string, recordingComplete: boolean, confidenceThreshold: number): Promise<VoiceAnalysisResult>;
}

const native = Platform.OS === 'ios' || Platform.OS === 'android'
  ? requireOptionalNativeModule<AamuVoiceNative>('AamuVoice')
  : null;
export const isNativeVoiceAnalysisAvailable = native !== null;

/** Local, window-based estimates; never a transcript or a sound-level proxy. */
export async function analyzeRecording(
  localUri: string,
  options: { recordingComplete: boolean; confidenceThreshold?: number },
): Promise<VoiceAnalysisResult> {
  const threshold = options.confidenceThreshold ?? voiceAnalysisConfig.confidenceThreshold;
  if (!native) return {
    status: 'unavailable', speechShare: null, speechOnsetMs: null, durationMs: null,
    analyzedDurationMs: 0, windowMs: null, hopMs: null,
    classifier: Platform.OS === 'android' ? 'silero.vad.v6.2.onnx' : 'apple.soundanalysis.version1', confidenceThreshold: threshold,
    estimated: true, reason: 'unavailable',
  };
  return native.analyzeRecording(localUri, options.recordingComplete, threshold);
}
