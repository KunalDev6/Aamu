import AVFoundation
import CoreMedia
import Foundation
import SoundAnalysis

private final class AamuVoiceObserver: NSObject, SNResultsObserving, @unchecked Sendable {
  private let lock = NSLock()
  private let threshold: Double
  private var intervals: [AamuVoiceInterval] = []
  private var failed = false
  private var complete = false
  private var resultCount = 0

  init(threshold: Double) { self.threshold = threshold }

  func request(_ request: SNRequest, didProduce result: SNResult) {
    lock.lock()
    defer { lock.unlock() }
    guard let result = result as? SNClassificationResult else { failed = true; return }
    let start = result.timeRange.start.seconds
    let end = CMTimeRangeGetEnd(result.timeRange).seconds
    guard start.isFinite, end.isFinite, end > start else { failed = true; return }
    resultCount += 1
    let isSpeech = ["speech", "whispering"].contains { label in
      guard let candidate = result.classification(forIdentifier: label) else { return false }
      return candidate.confidence.isFinite && candidate.confidence >= threshold
    }
    if isSpeech { intervals.append(AamuVoiceInterval(start: start, end: end)) }
  }

  func request(_ request: SNRequest, didFailWithError error: Error) {
    lock.lock(); failed = true; lock.unlock()
    // Never print errors: an underlying decoder error could contain a file path.
  }

  func requestDidComplete(_ request: SNRequest) {
    lock.lock(); complete = true; lock.unlock()
  }

  func estimate() -> AamuVoiceEstimate? {
    lock.lock()
    defer { lock.unlock() }
    guard complete, !failed, resultCount > 0 else { return nil }
    return aamuVoiceEstimate(intervals)
  }
}

enum AamuVoiceAnalyzer {
  static func analyze(uri: String, recordingComplete: Bool, threshold: Double) async -> [String: Any] {
    guard threshold.isFinite, (0...1).contains(threshold) else {
      return result(status: "failed", reason: "invalid_config", threshold: 0.5)
    }
    guard recordingComplete else {
      return result(status: "failed", reason: "incomplete_recording", threshold: threshold)
    }
    let home = URL(fileURLWithPath: NSHomeDirectory()).resolvingSymlinksInPath().path
    guard let url = URL(string: uri), url.isFileURL,
          url.resolvingSymlinksInPath().path.hasPrefix(home + "/") else {
      return result(status: "failed", reason: "invalid_local_file", threshold: threshold)
    }
    // No microphone or Speech-framework request is made here. The caller has
    // already recorded the five-second sample using its microphone permission.
    return await withCheckedContinuation { continuation in
      DispatchQueue.global(qos: .userInitiated).async {
        var durationMs: Double?
        var windowMs: Double?
        do {
          let file = try AVAudioFile(forReading: url)
          let duration = Double(file.length) / file.fileFormat.sampleRate
          guard duration.isFinite, duration > 0 else {
            continuation.resume(returning: result(status: "failed", reason: "invalid_local_file", threshold: threshold))
            return
          }
          durationMs = duration * 1000
          guard duration >= 5 else {
            continuation.resume(returning: result(status: "failed", reason: "too_short", threshold: threshold, durationMs: durationMs))
            return
          }
          let request = try SNClassifySoundRequest(classifierIdentifier: .version1)
          guard Set(["speech", "whispering"]).isSubset(of: Set(request.knownClassifications)) else {
            continuation.resume(returning: result(status: "failed", reason: "classifier_unavailable", threshold: threshold, durationMs: durationMs))
            return
          }
          request.windowDuration = CMTime(seconds: 0.5, preferredTimescale: 16000)
          request.overlapFactor = 0.5
          windowMs = request.windowDuration.seconds * 1000
          let observer = AamuVoiceObserver(threshold: threshold)
          let analyzer = try SNAudioFileAnalyzer(url: url)
          try analyzer.add(request, withObserver: observer)
          // Synchronous only on this worker queue. Strong local references keep
          // observer/analyzer alive until complete; JavaScript awaits asynchronously.
          analyzer.analyze()
          guard let estimate = observer.estimate() else {
            continuation.resume(returning: result(status: "failed", reason: "analysis_failed", threshold: threshold, durationMs: durationMs, windowMs: windowMs))
            return
          }
          continuation.resume(returning: result(status: estimate.onsetMs == nil ? "silent" : "spoke",
            reason: "none", threshold: threshold, durationMs: durationMs, windowMs: windowMs, estimate: estimate))
        } catch {
          continuation.resume(returning: result(status: "failed", reason: "analysis_failed", threshold: threshold, durationMs: durationMs, windowMs: windowMs))
        }
      }
    }
  }

  private static func result(status: String, reason: String, threshold: Double,
                             durationMs: Double? = nil, windowMs: Double? = nil,
                             estimate: AamuVoiceEstimate? = nil) -> [String: Any] {
    ["status": status, "reason": reason,
     "speechShare": estimate?.share as Any? ?? NSNull(),
     "speechOnsetMs": estimate?.onsetMs as Any? ?? NSNull(),
     "durationMs": durationMs as Any? ?? NSNull(),
     "analyzedDurationMs": estimate == nil ? 0 : 5000,
     "windowMs": windowMs as Any? ?? NSNull(),
     "hopMs": windowMs.map { $0 * 0.5 } as Any? ?? NSNull(),
     "classifier": "apple.soundanalysis.version1", "confidenceThreshold": threshold,
     "estimated": true]
  }
}
