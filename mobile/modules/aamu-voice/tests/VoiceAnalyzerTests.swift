import AVFoundation
import Foundation

@main
struct VoiceAnalyzerTests {
  static func silentFile(_ url: URL, seconds: Double) throws {
    let format = AVAudioFormat(standardFormatWithSampleRate: 16000, channels: 1)!
    let frames = AVAudioFrameCount(seconds * 16000)
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames)!
    buffer.frameLength = frames
    for index in 0..<Int(frames) { buffer.floatChannelData![0][index] = 0 }
    let file = try AVAudioFile(forWriting: url, settings: format.settings)
    try file.write(from: buffer)
  }

  static func main() async throws {
    let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("aamu-voice-test-" + UUID().uuidString, isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let full = directory.appendingPathComponent("synthetic-silence.caf")
    let short = directory.appendingPathComponent("synthetic-short.caf")
    try silentFile(full, seconds: 5)
    try silentFile(short, seconds: 3)
    var count = 0
    func check(_ result: [String: Any], status: String, reason: String) {
      precondition(result["status"] as? String == status)
      precondition(result["reason"] as? String == reason)
      if status == "failed" { precondition(result["speechShare"] is NSNull) }
      count += 1
    }
    check(await AamuVoiceAnalyzer.analyze(uri: full.absoluteString, recordingComplete: false, threshold: 0.5), status: "failed", reason: "incomplete_recording")
    check(await AamuVoiceAnalyzer.analyze(uri: "https://example.invalid/audio.caf", recordingComplete: true, threshold: 0.5), status: "failed", reason: "invalid_local_file")
    check(await AamuVoiceAnalyzer.analyze(uri: full.absoluteString, recordingComplete: true, threshold: 2), status: "failed", reason: "invalid_config")
    check(await AamuVoiceAnalyzer.analyze(uri: short.absoluteString, recordingComplete: true, threshold: 0.5), status: "failed", reason: "too_short")
    let started = Date()
    let silence = await AamuVoiceAnalyzer.analyze(uri: full.absoluteString, recordingComplete: true, threshold: 0.5)
    check(silence, status: "silent", reason: "none")
    precondition(silence["speechShare"] as? Double == 0)
    precondition(silence["speechOnsetMs"] is NSNull)
    precondition(silence["analyzedDurationMs"] as? Int == 5000)
    print("Voice analyzer tests passed: \(count); macOS synthetic-silence analysis ms: \(Int(Date().timeIntervalSince(started) * 1000))")
  }
}
