import ExpoModulesCore

public final class AamuAlarmModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AamuAlarm")
    AsyncFunction("preparePrivateStorage") { () throws -> [String: String] in
      try AamuPrivateStorage.app.prepare()
    }
    AsyncFunction("protectPrivateAudioFile") { (uri: String) throws -> String in
      try AamuPrivateStorage.app.protectAudioFile(uri)
    }
    AsyncFunction("getAuthorization") { () async -> String in
      await AamuAlarmCoordinator.shared.authorization()
    }
    AsyncFunction("requestAuthorization") { () async throws -> String in
      try await AamuAlarmCoordinator.shared.requestAuthorization()
    }
    AsyncFunction("scheduleDaily") { (hour: Int, minute: Int) async throws -> [String: Any] in
      try await AamuAlarmCoordinator.shared.scheduleDaily(hour: hour, minute: minute)
    }
    AsyncFunction("scheduleSnooze") { (seconds: Int) async throws -> [String: Any] in
      try await AamuAlarmCoordinator.shared.scheduleSnooze(seconds: seconds)
    }
    AsyncFunction("stopCurrentOccurrence") { () async throws -> [String: Any] in
      try await AamuAlarmCoordinator.shared.stopCurrentOccurrence()
    }
    AsyncFunction("cancelToday") { () async throws -> [String: Any] in
      try await AamuAlarmCoordinator.shared.cancelToday()
    }
    AsyncFunction("rescheduleNext") { () async throws -> [String: Any] in
      try await AamuAlarmCoordinator.shared.rescheduleNext()
    }
    AsyncFunction("cancelAll") { () async throws -> [String: Any] in
      try await AamuAlarmCoordinator.shared.cancelAll()
    }
    AsyncFunction("getEvents") { (afterSequence: Int) async -> [[String: Any]] in
      await AamuAlarmCoordinator.shared.events(after: afterSequence)
    }
    AsyncFunction("getAlarms") { () async throws -> [String: Any] in
      try await AamuAlarmCoordinator.shared.snapshot()
    }
  }
}
