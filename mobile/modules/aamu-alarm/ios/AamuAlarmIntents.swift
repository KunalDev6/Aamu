import AppIntents
import Foundation

public struct AamuAlarmIntentsPackage: AppIntentsPackage {
  public init() {}
}

public struct AamuStopAlarmIntent: LiveActivityIntent {
  public static var title: LocalizedStringResource = "Stop Aamu alarm"
  public static var openAppWhenRun: Bool = false
  public static var isDiscoverable: Bool = false
  @Parameter(title: "Alarm identifier") public var alarmID: String

  public init() {}
  public init(alarmID: String) { self.alarmID = alarmID }

  public func perform() async throws -> some IntentResult {
    // AlarmKit performs the actual Stop action. Only user interaction is journaled.
    try await AamuAlarmCoordinator.shared.recordIntent(type: "stop", alarmID: alarmID)
    return .result()
  }
}

public struct AamuSnoozeAlarmIntent: LiveActivityIntent {
  public static var title: LocalizedStringResource = "Snooze Aamu alarm"
  public static var openAppWhenRun: Bool = false
  public static var isDiscoverable: Bool = false
  @Parameter(title: "Alarm identifier") public var alarmID: String

  public init() {}
  public init(alarmID: String) { self.alarmID = alarmID }

  public func perform() async throws -> some IntentResult {
    // The .countdown secondary button performs the five-minute native snooze.
    try await AamuAlarmCoordinator.shared.recordIntent(type: "snooze", alarmID: alarmID)
    return .result()
  }
}
