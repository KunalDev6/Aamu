import Foundation

struct AamuOccurrence: Codable {
  var id: String
  var kind: String
  var scheduledAt: Date
  var originalScheduledAt: Date
  var localDate: String
  var offsetMinutes: Int
}

struct AamuAlarmEvent: Codable {
  var sequence: Int
  var type: String
  var source: String
  var occurredAt: Date
  var alarmId: String
  var originalScheduledAt: Date
  var localDate: String
  var offsetMinutes: Int

  var bridgeValue: [String: Any] {
    ["sequence": sequence, "type": type, "source": source,
     "occurredAt": AamuAlarmStore.iso(occurredAt), "alarmId": alarmId,
     "originalScheduledAt": AamuAlarmStore.iso(originalScheduledAt),
     "localDate": localDate, "offsetMinutes": offsetMinutes]
  }
}

struct AamuAlarmState: Codable {
  var enabled = false
  var hour: Int?
  var minute: Int?
  var suppressedLocalDate: String?
  var occurrences: [AamuOccurrence] = []
  var events: [AamuAlarmEvent] = []
  var sequence = 0
}

// All callers run on the main actor, including headless LiveActivityIntents.
// No App Group: the widget only renders AlarmKit's attributes, never this file.
@MainActor
final class AamuAlarmStore {
  static let shared = AamuAlarmStore()
  private(set) var state = AamuAlarmState()
  private let url: URL

  private init() {
    let directory = FileManager.default.urls(for: .applicationSupportDirectory,
                                             in: .userDomainMask)[0]
      .appendingPathComponent("AamuAlarm", isDirectory: true)
    url = directory.appendingPathComponent("alarm-state.json")
    if let data = try? Data(contentsOf: url),
       let saved = try? JSONDecoder().decode(AamuAlarmState.self, from: data) {
      state = saved
    }
  }

  func update(_ body: (inout AamuAlarmState) -> Void) throws {
    var updated = state
    body(&updated)
    let directory = url.deletingLastPathComponent()
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    var resourceValues = URLResourceValues()
    resourceValues.isExcludedFromBackup = true
    var mutableDirectory = directory
    try mutableDirectory.setResourceValues(resourceValues)
    let data = try JSONEncoder().encode(updated)
    try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    state = updated
  }

  func append(type: String, source: String, occurrence: AamuOccurrence, at: Date = Date()) throws {
    try update { state in
      state.sequence += 1
      state.events.append(AamuAlarmEvent(sequence: state.sequence, type: type, source: source,
        occurredAt: at, alarmId: occurrence.id,
        originalScheduledAt: occurrence.originalScheduledAt,
        localDate: occurrence.localDate, offsetMinutes: occurrence.offsetMinutes))
    }
  }

  nonisolated static func iso(_ date: Date) -> String {
    ISO8601DateFormatter().string(from: date)
  }

  nonisolated static func day(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
  }
}
