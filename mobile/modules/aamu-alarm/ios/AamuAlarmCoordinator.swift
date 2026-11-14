import AlarmKit
import AppIntents
import Foundation
import SwiftUI

enum AamuAlarmError: LocalizedError {
  case invalidTime, permissionRequired, noCurrentOccurrence, invalidSnooze
  var errorDescription: String? {
    switch self {
    case .invalidTime: return "Choose a valid alarm time."
    case .permissionRequired: return "Alarm permission is required."
    case .noCurrentOccurrence: return "There is no current morning to snooze."
    case .invalidSnooze: return "Aamu snoozes last five minutes."
    }
  }
}

@MainActor
final class AamuAlarmCoordinator {
  static let shared = AamuAlarmCoordinator()
  private let manager = AlarmManager.shared
  private let store = AamuAlarmStore.shared
  private var observation: Task<Void, Never>?
  private var lastStates: [UUID: Alarm.State] = [:]
  private var operationRunning = false
  private var operationWaiters: [CheckedContinuation<Void, Never>] = []

  func authorization() -> String {
    switch manager.authorizationState {
    case .authorized: return "authorized"
    case .denied: return "denied"
    case .notDetermined: return "notDetermined"
    @unknown default: return "unavailable"
    }
  }

  func requestAuthorization() async throws -> String {
    _ = try await manager.requestAuthorization()
    startObserving()
    return authorization()
  }

  func startObserving() {
    guard observation == nil else { return }
    observation = Task { [weak self] in
      for await alarms in AlarmManager.shared.alarmUpdates {
        guard let self else { return }
        for alarm in alarms {
          if alarm.state == .alerting, self.lastStates[alarm.id] != .alerting,
             let occurrence = self.record(for: alarm.id.uuidString) {
            // A currently observed ring is evidence, not a guessed interaction.
            try? self.store.append(type: "ring", source: "native_observer", occurrence: occurrence)
          }
        }
        self.lastStates = Dictionary(uniqueKeysWithValues: alarms.map { ($0.id, $0.state) })
      }
    }
  }

  func becameActive() async {
    startObserving()
    if let occurrence = currentOccurrence(),
       Date().timeIntervalSince(occurrence.originalScheduledAt) < 3600 {
      try? store.append(type: "app_open", source: "app", occurrence: occurrence)
    }
    // JS also calls rescheduleNext and receives errors. This best-effort native
    // launch hook replenishes the queue even before the JS runtime is ready.
    _ = try? await rescheduleNext()
  }

  func recordIntent(type: String, alarmID: String) async throws {
    guard let occurrence = record(for: alarmID) else { return }
    try store.append(type: type, source: "system_intent", occurrence: occurrence)
    // Interaction can launch the app headlessly. Keep future mornings queued.
    // Failure must not prevent the system's Stop/Snooze action.
    _ = try? await rescheduleNext()
  }

  func scheduleDaily(hour: Int, minute: Int) async throws -> [String: Any] {
    await acquireOperation()
    defer { releaseOperation() }
    guard (0...23).contains(hour), (0...59).contains(minute) else { throw AamuAlarmError.invalidTime }
    guard authorization() == "authorized" else { throw AamuAlarmError.permissionRequired }
    let old = store.state
    try store.update { $0.enabled = true; $0.hour = hour; $0.minute = minute }
    do {
      try await replenish()
    } catch {
      try? store.update {
        $0.enabled = old.enabled; $0.hour = old.hour; $0.minute = old.minute
      }
      throw error
    }
    startObserving()
    return try snapshot()
  }

  // Seven fixed occurrences make "cancel only today" explicit. AlarmKit owns
  // delivery while the app is closed. This is a finite demo queue, NOT a claim
  // of perpetual recurrence. See README for the unverified recurring alternative.
  private func replenish() async throws {
    guard store.state.enabled,
          let hour = store.state.hour, let minute = store.state.minute else { return }
    guard authorization() == "authorized" else { throw AamuAlarmError.permissionRequired }
    let now = Date()
    let calendar = Calendar.autoupdatingCurrent
    let today = calendar.startOfDay(for: now)
    let existing = try manager.alarms
    let existingIDs = Set(existing.map { $0.id.uuidString })
    var wanted: [Date] = []
    var offset = 0
    while wanted.count < 7 && offset < 10 {
      defer { offset += 1 }
      guard let day = calendar.date(byAdding: .day, value: offset, to: today),
            let date = calendar.date(bySettingHour: hour, minute: minute, second: 0, of: day,
              matchingPolicy: .nextTime, repeatedTimePolicy: .first, direction: .forward),
            date > now, AamuAlarmStore.day(date) != store.state.suppressedLocalDate else { continue }
      wanted.append(date)
    }
    var created: [AamuOccurrence] = []
    var wantedIDs = Set<String>()
    do {
      for date in wanted {
        if let old = store.state.occurrences.first(where: {
          $0.kind == "daily" && abs($0.scheduledAt.timeIntervalSince(date)) < 1 && existingIDs.contains($0.id)
        }) {
          wantedIDs.insert(old.id)
          continue
        }
        let occurrence = AamuOccurrence(id: UUID().uuidString, kind: "daily", scheduledAt: date,
          originalScheduledAt: date, localDate: AamuAlarmStore.day(date),
          offsetMinutes: TimeZone.current.secondsFromGMT(for: date) / 60)
        try await schedule(occurrence)
        created.append(occurrence)
        wantedIDs.insert(occurrence.id)
      }
      try store.update { $0.occurrences.append(contentsOf: created) }
    } catch {
      // Preserve the prior queue if AlarmKit rejects a partial replacement.
      for occurrence in created {
        if let id = UUID(uuidString: occurrence.id) { try? manager.cancel(id: id) }
      }
      throw error
    }
    for occurrence in store.state.occurrences where occurrence.kind == "daily"
      && occurrence.scheduledAt > now && existingIDs.contains(occurrence.id)
      && !wantedIDs.contains(occurrence.id) {
      if let id = UUID(uuidString: occurrence.id) { try manager.cancel(id: id) }
    }
  }

  func scheduleSnooze(seconds: Int) async throws -> [String: Any] {
    await acquireOperation()
    defer { releaseOperation() }
    guard seconds == 300 else { throw AamuAlarmError.invalidSnooze }
    guard authorization() == "authorized" else { throw AamuAlarmError.permissionRequired }
    guard let morning = currentOccurrence() else { throw AamuAlarmError.noCurrentOccurrence }
    // In-app takeover has already stopped the native occurrence; countdown(id:)
    // only works on an alerting alarm. Schedule a new native one-shot instead.
    try stopCurrentOccurrenceInternal()
    let occurrence = AamuOccurrence(id: UUID().uuidString, kind: "snooze",
      scheduledAt: Date().addingTimeInterval(TimeInterval(seconds)),
      originalScheduledAt: morning.originalScheduledAt,
      localDate: morning.localDate, offsetMinutes: morning.offsetMinutes)
    try await schedule(occurrence)
    do {
      try store.update { $0.occurrences.append(occurrence) }
      try store.append(type: "snooze", source: "app", occurrence: occurrence)
    } catch {
      if let id = UUID(uuidString: occurrence.id) { try? manager.cancel(id: id) }
      throw error
    }
    return try snapshot()
  }

  func stopCurrentOccurrence() async throws -> [String: Any] {
    await acquireOperation()
    defer { releaseOperation() }
    try stopCurrentOccurrenceInternal()
    return try snapshot()
  }

  private func stopCurrentOccurrenceInternal() throws {
    let now = Date()
    let today = AamuAlarmStore.day(now)
    for alarm in try manager.alarms {
      guard let occurrence = record(for: alarm.id.uuidString),
            occurrence.localDate == today, occurrence.originalScheduledAt <= now else { continue }
      switch alarm.state {
      case .alerting, .countdown, .paused: try manager.stop(id: alarm.id)
      case .scheduled:
        // The daemon may still report scheduled at the exact fire-time boundary.
        // Cancel this due morning as well as pending snoozes to avoid a second
        // native ring immediately after the in-app flow takes over.
        try manager.cancel(id: alarm.id)
      @unknown default: break
      }
    }
    // Programmatic takeover/hold is NOT a native user Stop event.
  }

  func cancelToday() async throws -> [String: Any] {
    await acquireOperation()
    defer { releaseOperation() }
    let today = AamuAlarmStore.day(Date())
    try store.update { $0.suppressedLocalDate = today }
    for alarm in try manager.alarms {
      if record(for: alarm.id.uuidString)?.localDate == today { try manager.cancel(id: alarm.id) }
    }
    try await replenish()
    return try snapshot()
  }

  func cancelAll() async throws -> [String: Any] {
    await acquireOperation()
    defer { releaseOperation() }
    // Mark disabled first so a background intent cannot replenish the queue.
    try store.update { $0.enabled = false }
    for alarm in try manager.alarms where record(for: alarm.id.uuidString) != nil {
      try manager.cancel(id: alarm.id)
    }
    return try snapshot()
  }

  func rescheduleNext() async throws -> [String: Any] {
    await acquireOperation()
    defer { releaseOperation() }
    try await replenish()
    return try snapshot()
  }

  // Scheduling awaits AlarmKit and re-enters the main actor. Serialize plan
  // mutations so an in-flight foreground refresh cannot undo disabling/holding.
  private func acquireOperation() async {
    if operationRunning {
      await withCheckedContinuation { operationWaiters.append($0) }
    } else {
      operationRunning = true
    }
  }

  private func releaseOperation() {
    if operationWaiters.isEmpty { operationRunning = false }
    else { operationWaiters.removeFirst().resume() }
  }

  func events(after sequence: Int) -> [[String: Any]] {
    store.state.events.filter { $0.sequence > sequence }.map { $0.bridgeValue }
  }

  func snapshot() throws -> [String: Any] {
    let values: [[String: Any]] = try manager.alarms.compactMap { alarm in
      guard let occurrence = record(for: alarm.id.uuidString) else { return nil }
      let state: String
      switch alarm.state {
      case .scheduled: state = "scheduled"
      case .countdown: state = "countdown"
      case .paused: state = "paused"
      case .alerting: state = "alerting"
      @unknown default: state = "unknown"
      }
      return ["id": occurrence.id, "kind": occurrence.kind, "state": state,
        "scheduledAt": AamuAlarmStore.iso(occurrence.scheduledAt),
        "originalScheduledAt": AamuAlarmStore.iso(occurrence.originalScheduledAt),
        "localDate": occurrence.localDate, "offsetMinutes": occurrence.offsetMinutes]
    }.sorted { ($0["scheduledAt"] as? String ?? "") < ($1["scheduledAt"] as? String ?? "") }
    let lastDaily = values.last { $0["kind"] as? String == "daily" }
    return ["enabled": store.state.enabled,
      "hour": store.state.hour as Any? ?? NSNull(),
      "minute": store.state.minute as Any? ?? NSNull(),
      "horizonEnd": lastDaily?["scheduledAt"] ?? NSNull(), "alarms": values]
  }

  private func currentOccurrence() -> AamuOccurrence? {
    let now = Date()
    let today = AamuAlarmStore.day(now)
    return store.state.occurrences.filter {
      $0.localDate == today && $0.originalScheduledAt <= now
    }.max { $0.originalScheduledAt < $1.originalScheduledAt }
  }

  private func record(for id: String) -> AamuOccurrence? {
    store.state.occurrences.first { $0.id == id }
  }

  private func schedule(_ occurrence: AamuOccurrence) async throws {
    guard let id = UUID(uuidString: occurrence.id) else { return }
    let snooze = AlarmButton(text: "Snooze", textColor: .primary, systemImageName: "zzz")
    let alert: AlarmPresentation.Alert
    if #available(iOS 26.1, *) {
      alert = AlarmPresentation.Alert(title: "Aamu", secondaryButton: snooze,
                                      secondaryButtonBehavior: .countdown)
    } else {
      alert = AlarmPresentation.Alert(title: "Aamu",
        stopButton: AlarmButton(text: "Stop", textColor: .primary, systemImageName: "stop.fill"),
        secondaryButton: snooze, secondaryButtonBehavior: .countdown)
    }
    let attributes = AlarmAttributes(presentation: AlarmPresentation(alert: alert,
      countdown: AlarmPresentation.Countdown(title: "Aamu")),
      metadata: AamuAlarmMetadata(originalScheduledAt: occurrence.originalScheduledAt), tintColor: .accentColor)
    let configuration = AlarmManager.AlarmConfiguration(
      countdownDuration: Alarm.CountdownDuration(preAlert: nil, postAlert: 300),
      schedule: .fixed(occurrence.scheduledAt), attributes: attributes,
      stopIntent: AamuStopAlarmIntent(alarmID: occurrence.id),
      secondaryIntent: AamuSnoozeAlarmIntent(alarmID: occurrence.id), sound: .default)
    _ = try await manager.schedule(id: id, configuration: configuration)
  }
}
