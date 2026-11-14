# Android native alarm

Local Expo SDK 58 module implementing the existing Aamu alarm bridge. It schedules `AlarmManager.setAlarmClock` one-shots outside the JavaScript lifetime. It has no network client, server dependency or personal audio access.

## Behavior

- Setup checks notifications (including high importance on the alarm channel), exact-alarm access and Android 14+ full-screen intent access. `requestAuthorization` sequences the runtime prompt and applicable Settings screens, resolves after returning, and reports denied if any requirement remains missing. These checks apply only to Android.
- The native alarm service posts persistent Stop and Snooze controls and a lock-screen activity. It loops the platform's built-in default alarm sound through alarm audio attributes, respects audio-focus interruption and never changes hardware volume. Sea/Forest and personal place audio stay inside the app.
- A delayed focus grant resumes the prepared sound only while that occurrence is still active and authorized. A permanently denied focus request or output failure leaves visual Stop/Snooze controls; it does not invent successful sound output or a user interaction.
- Stop records one system interaction and silences the active occurrence. Snooze schedules a native five-minute one-shot, retains its original morning/date/offset and records one event. Stale duplicate system actions have no effect. App takeover stops output without inventing a user Stop.
- `cancelToday` persists that calendar-day suppression before replenishing future alarms. `cancelAll` persists disabled before cancelling so an already-dispatched receiver cannot revive a disabled alarm.
- Seven future daily occurrences are reconciled on native fire, foreground, boot after first unlock, package replacement and clock/timezone changes. Native delivery replenishes the queue without opening JavaScript. Local wall time uses calendar-day arithmetic, next valid time during a spring gap and the first occurrence of a repeated time, matching the iOS scheduling policy.
- The journal records ring only once the service has posted its foreground alarm; programmatic takeover is not Stop. It contains only alarm UUIDs, timestamps, local dates, offsets, sequence numbers and interaction types. It lives in the app's `noBackupFilesDir`, written atomically. Corrupt state throws rather than silently inventing history.

## Limits and verification

Implementation is not physical-device acceptance. Power-off, force-stop, permission revocation, system/OEM restrictions, muted alarm output and output-device behavior require real-device checks. Boot restoration occurs after the first device unlock; this module does not expose private state to direct boot. No system service can promise delivery after the user force-stops the app. Actual lock/silent/Focus-equivalent behavior, repeated snooze, takeover, reboot and timezone changes remain acceptance work until observed.

The ARM64 debug app built successfully on 14 November 2026 using Gradle 9.4.1, the installed Android SDK (compile 37, target 36), Android Studio JDK 25.0.3 and temporary cached Node 24.22.3. Android prebuild was isolated with `--platform android`; it did not regenerate iOS. The final run completed 416 tasks in 10m 56s. Network interruptions required resumed official Gradle/Build Tools downloads with verified published hashes and longer timeouts; existing SDK license files were unchanged. The build log is `/tmp/aamu-android-build.log`.

The same full Gradle run compiled the real Expo bridge and passed all eight calendar JUnit tests with zero failures/errors. Mobile TypeScript and bridge lint also passed. The APK at `mobile/android/app/build/outputs/apk/debug/app-debug.apk` installed successfully on the booted API 36 ARM64 emulator. `MainActivity` cold-launched in 3.1 seconds, remained resumed, and logged the React Native `main` entry point. A pre-context React Native soft exception was followed by successful context initialization; no JavaScript exception/native crash was observed in the startup check. CUA could not target the standalone emulator, so this is process/startup evidence only: no rendered UI, permission, delivery or audio acceptance is claimed.

Packaged APK XML was inspected with `aapt2`: `allowBackup=false`; both SecureStore backup schemas include only shared preferences, excluding SecureStore, for legacy backup, cloud backup and device transfer. Consequently recordings under files and app databases are outside those included domains. The alarm journal separately uses `noBackupFilesDir`. Actual OS backup/transfer remains untested. Sanitized build, install, startup and packaged-rule evidence is in `review/android-build.json` at the repository root. This debug APK is ARM64-only and requires Metro (`adb -s emulator-5554 reverse tcp:8081 tcp:8081` for the current emulator).

Reproduce from `mobile/android` with the Android Studio JDK and cached Node 24 on `PATH`:

```sh
./gradlew :aamu-alarm:testDebugUnitTest :app:assembleDebug \
  -PreactNativeArchitectures=arm64-v8a \
  -Dorg.gradle.internal.http.socketTimeout=120000 \
  -Dorg.gradle.internal.http.connectionTimeout=30000 --console=plain
```

## Dependencies and sources

No npm or runtime service dependency was added. The module uses Android framework APIs and the already-installed Expo module runtime. JUnit 4.13.2 is a local Gradle test dependency for deterministic calendar tests (also already used by Expo audio). Native colors are generated from `src/theme.ts`; the existing Plus Jakarta Sans font and OFL license are copied by a Gradle asset task.

Official references read for this implementation:

- [Android exact-alarm scheduling and access](https://developer.android.com/develop/background-work/services/alarms)
- [Android foreground-service type requirements](https://developer.android.com/about/versions/14/changes/fgs-types-required#system-exempted)
- [Android full-screen alarm notifications](https://developer.android.com/develop/ui/compose/notifications/create-notification#urgent-message)
- [Expo module API](https://docs.expo.dev/modules/module-api/)
- [Expo Android lifecycle hooks](https://docs.expo.dev/modules/android-lifecycle-listeners/)
- [Android audio focus and delayed grants](https://developer.android.com/media/optimize/audio-focus)

The installed Expo 58 permission and foreground-hook implementations were also inspected before integration. These sources describe platform mechanisms, not evidence that Aamu has passed its device tests.
