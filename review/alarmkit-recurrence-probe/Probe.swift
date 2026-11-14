import AlarmKit
import Foundation
import SwiftUI

struct ProbeMetadata: AlarmMetadata { let label: String }

@MainActor
final class ProbeModel: ObservableObject {
  @Published var status = "Separate simulator fixture. Aamu data is not accessed."
  @Published var authorized = AlarmManager.shared.authorizationState == .authorized
  @Published var running = false
  private let manager = AlarmManager.shared
  private let ownedIDs = [UUID(uuidString: "A6100A05-1038-437A-B46E-0FD4244F0CF0")!,
                          UUID(uuidString: "A6100A05-1038-437A-B46E-0FD4244F0CF1")!]
  private var report: [String: Any] = [:]

  func authorize() async {
    do {
      authorized = try await manager.requestAuthorization() == .authorized
      status = authorized ? "Ready. The control alarm will briefly ring." : "Permission not granted."
    } catch { status = "Permission request failed." }
  }

  func refreshAuthorization() {
    authorized = manager.authorizationState == .authorized
    if !running, authorized { status = "Ready. The control alarm will briefly ring." }
  }

  func run() async {
    guard authorized, !running else { return }
    running = true
    defer { running = false }
    _ = await cleanUp()
    let testID = ownedIDs[0], controlID = ownedIDs[1]
    let now = Date()
    let due = Date(timeIntervalSince1970: (floor(now.timeIntervalSince1970 / 60) + 2) * 60)
    let controlDue = due.addingTimeInterval(25)
    let calendar = Calendar.autoupdatingCurrent
    let hour = calendar.component(.hour, from: due), minute = calendar.component(.minute, from: due)
    report = ["schema": 1, "simulatorOnly": true, "startedAt": iso(now), "dueAt": iso(due),
      "controlDueAt": iso(controlDue), "relativeHour": hour, "relativeMinute": minute,
      "utcOffsetMinutes": TimeZone.current.secondsFromGMT(for: now) / 60,
      "osVersion": ProcessInfo.processInfo.operatingSystemVersionString,
      "testAlertObserved": false, "controlAlertObserved": false, "stopReturnedSuccessfully": false]
    save()
    do {
      let repeating = Alarm.Schedule.relative(.init(time: .init(hour: hour, minute: minute),
        repeats: .weekly([.monday, .tuesday, .wednesday, .thursday, .friday, .saturday, .sunday])))
      let scheduled = try await manager.schedule(id: testID, configuration: configuration(schedule: repeating, control: false))
      report["stateAfterScheduling"] = state(scheduled.state)
      try await Task.sleep(for: .seconds(3))
      report["settlingDelaySeconds"] = 3
      report["stateBeforeStop"] = try manager.alarms.first { $0.id == testID }.map { state($0.state) } ?? "absent"
      let stoppedAt = Date()
      report["stopAttemptAt"] = iso(stoppedAt)
      do {
        try manager.stop(id: testID)
        report["stopReturnedSuccessfully"] = true
      } catch {
        let failure = error as NSError
        report["scheduledStopErrorDomain"] = failure.domain
        report["scheduledStopErrorCode"] = failure.code
      }
      report["secondsBeforeDueAtStop"] = due.timeIntervalSince(stoppedAt)
      let after = try manager.alarms.first { $0.id == testID }
      report["stateAfterStop"] = after.map { state($0.state) } ?? "absent"
      report["retainedAfterStop"] = after != nil
      _ = try await manager.schedule(id: controlID, configuration: configuration(schedule: .fixed(controlDue), control: true))
      save()
      status = "Observing until \(controlDue.addingTimeInterval(15).formatted(date: .omitted, time: .standard))."
      while Date() < controlDue.addingTimeInterval(15) {
        let alarms = try manager.alarms
        for alarm in alarms where alarm.state == .alerting {
          if alarm.id == testID {
            report["testAlertObserved"] = true
            report["testAlertAt"] = iso(Date())
            try manager.stop(id: testID)
            report["testStopWhenAlertingSucceeded"] = true
          }
          if alarm.id == controlID {
            report["controlAlertObserved"] = true
            report["controlAlertAt"] = iso(Date())
            try manager.stop(id: controlID)
            report["controlStopWhenAlertingSucceeded"] = true
          }
        }
        save()
        try await Task.sleep(for: .milliseconds(250))
      }
      let remaining = try manager.alarms.first { $0.id == testID }
      report["stateAfterDueWindow"] = remaining.map { state($0.state) } ?? "absent"
      report["retainedAfterDueWindow"] = remaining != nil
      let controlPassed = report["controlAlertObserved"] as? Bool == true
      let testRang = report["testAlertObserved"] as? Bool == true
      let outcome = !controlPassed ? "inconclusive_control_did_not_alert"
        : report["stopReturnedSuccessfully"] as? Bool != true ? (testRang ? "scheduled_stop_rejected_then_alarm_alerted" : "inconclusive_scheduled_stop_rejected")
        : testRang ? "stop_did_not_skip_upcoming_ring"
        : remaining == nil ? "stopped_alarm_was_removed"
        : "upcoming_ring_skipped_recurrence_retained"
      report["outcome"] = outcome
      report["finishedAt"] = iso(Date())
      status = outcome.replacingOccurrences(of: "_", with: " ")
    } catch {
      let failure = error as NSError
      report["errorDomain"] = failure.domain
      report["errorCode"] = failure.code
      report["outcome"] = "probe_error"
      status = "Probe failed. Sanitized error metadata saved."
    }
    report["fixtureAlarmsRemoved"] = await cleanUp()
    save()
  }

  func cleanUp() async -> Bool {
    for id in ownedIDs { try? manager.cancel(id: id) }
    guard let remaining = try? manager.alarms else { return false }
    return !remaining.contains { ownedIDs.contains($0.id) }
  }

  private func configuration(schedule: Alarm.Schedule, control: Bool) -> AlarmManager.AlarmConfiguration<ProbeMetadata> {
    let title: LocalizedStringResource = control ? "Probe control" : "Probe stopped recurrence"
    let presentation = AlarmPresentation(alert: AlarmPresentation.Alert(title: title))
    let attributes = AlarmAttributes(presentation: presentation,
      metadata: ProbeMetadata(label: control ? "control" : "stopped"), tintColor: .blue)
    return .alarm(schedule: schedule, attributes: attributes, sound: .default)
  }

  private func state(_ state: Alarm.State) -> String {
    switch state {
    case .scheduled: return "scheduled"
    case .alerting: return "alerting"
    case .countdown: return "countdown"
    case .paused: return "paused"
    @unknown default: return "unknown"
    }
  }
  private func iso(_ date: Date) -> String { ISO8601DateFormatter().string(from: date) }
  private func save() {
    let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("probe-result.json")
    if let data = try? JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys]) {
      try? data.write(to: url, options: .atomic)
    }
  }
}

@main
struct RecurrenceProbeApp: App {
  @StateObject private var model = ProbeModel()
  var body: some Scene {
    WindowGroup {
      VStack(spacing: 28) {
        Text("AlarmKit recurrence probe").font(.title2)
        Text(model.status).multilineTextAlignment(.center)
        Button("Allow probe alarms") { Task { await model.authorize() } }.disabled(model.running || model.authorized)
        Button("Open probe Settings") {
          if let settings = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(settings) }
        }.disabled(model.running)
        Button("Run scheduled Stop probe") { Task { await model.run() } }.disabled(!model.authorized || model.running)
      }.padding(32).onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
        model.refreshAuthorization()
      }
    }
  }
}
