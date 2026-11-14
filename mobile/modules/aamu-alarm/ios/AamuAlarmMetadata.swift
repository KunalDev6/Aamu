import AlarmKit
import Foundation

// This source is also compiled in the widget. It contains no user text.
public struct AamuAlarmMetadata: AlarmMetadata {
  public let originalScheduledAt: Date
  public init(originalScheduledAt: Date) {
    self.originalScheduledAt = originalScheduledAt
  }
}
