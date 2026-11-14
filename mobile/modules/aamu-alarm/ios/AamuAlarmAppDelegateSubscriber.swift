import ExpoModulesCore
import UIKit

public final class AamuAlarmAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func subscriberDidRegister() {
    // Apply exclusions before JS starts. The JS storage gate checks again and
    // surfaces failure; no file paths or native errors are logged here.
    _ = try? AamuPrivateStorage.app.prepare()
  }

  public func applicationDidBecomeActive(_ application: UIApplication) {
    Task { @MainActor in await AamuAlarmCoordinator.shared.becameActive() }
  }
}
