import ExpoModulesCore

public final class AamuVoiceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AamuVoice")
    AsyncFunction("analyzeRecording") { (uri: String, recordingComplete: Bool, confidenceThreshold: Double) async -> [String: Any] in
      await AamuVoiceAnalyzer.analyze(uri: uri, recordingComplete: recordingComplete, threshold: confidenceThreshold)
    }
  }
}
