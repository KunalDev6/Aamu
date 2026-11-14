import Foundation

struct AamuVoiceInterval {
  let start: Double
  let end: Double
}

struct AamuVoiceEstimate {
  let share: Double
  let onsetMs: Double?
}

// Times are seconds relative to recording start. Confidence scores select
// windows; they are never added or treated as a percentage of speaking time.
func aamuVoiceEstimate(_ intervals: [AamuVoiceInterval], duration: Double = 5) -> AamuVoiceEstimate {
  let clipped = intervals.compactMap { interval -> AamuVoiceInterval? in
    guard interval.start.isFinite, interval.end.isFinite else { return nil }
    let start = max(0, interval.start)
    let end = min(duration, interval.end)
    return end > start ? AamuVoiceInterval(start: start, end: end) : nil
  }.sorted { $0.start < $1.start }
  guard var current = clipped.first else { return AamuVoiceEstimate(share: 0, onsetMs: nil) }
  let onset = current.start * 1000
  var covered = 0.0
  for interval in clipped.dropFirst() {
    if interval.start <= current.end {
      current = AamuVoiceInterval(start: current.start, end: max(current.end, interval.end))
    } else {
      covered += current.end - current.start
      current = interval
    }
  }
  covered += current.end - current.start
  return AamuVoiceEstimate(share: min(1, max(0, covered / duration)), onsetMs: onset)
}
