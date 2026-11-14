import AppIntents
internal import AamuAlarm

// The app target explicitly includes intents declared by the local module.
struct AamuAppIntentsPackage: AppIntentsPackage {
  static var includedPackages: [any AppIntentsPackage.Type] {
    [AamuAlarmIntentsPackage.self]
  }
}
