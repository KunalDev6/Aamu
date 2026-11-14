import Foundation

@main
struct VoiceIntervalsTests {
  static func main() {
    var count = 0
    func check(_ name: String, _ intervals: [AamuVoiceInterval], share: Double, onset: Double?) {
      let value = aamuVoiceEstimate(intervals)
      precondition(abs(value.share - share) < 0.000001, name)
      precondition(value.onsetMs == onset, name)
      count += 1
    }
    check("valid analyzed silence", [], share: 0, onset: nil)
    check("overlap never double counts", [.init(start: 1, end: 1.5), .init(start: 1.25, end: 1.75)], share: 0.15, onset: 1000)
    check("clip to five-second recording", [.init(start: -0.25, end: 0.5), .init(start: 4.75, end: 5.5)], share: 0.15, onset: 0)
    check("out-of-range windows excluded", [.init(start: -2, end: -1), .init(start: 6, end: 7)], share: 0, onset: nil)
    check("disjoint speech", [.init(start: 3, end: 3.5), .init(start: 1, end: 1.5)], share: 0.2, onset: 1000)
    check("nested duplicate labels", [.init(start: 1, end: 2), .init(start: 1, end: 2), .init(start: 1.25, end: 1.5)], share: 0.2, onset: 1000)
    check("full sample cannot exceed one", [.init(start: -1, end: 6), .init(start: 0, end: 5)], share: 1, onset: 0)
    check("late onset boundary", [.init(start: 2.5, end: 3)], share: 0.1, onset: 2500)
    print("Voice interval tests passed: \(count)")
  }
}
