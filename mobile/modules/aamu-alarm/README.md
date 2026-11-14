# Local Aamu alarm module

iOS 26+ AlarmKit bridge for the local Expo SDK 58 development build. Android has
a separate [native implementation](android/README.md), with a successful local
APK build/install and pending device acceptance. Expo Go or builds without the
custom module return `unavailable`; they do not simulate a successful alarm.
The alarm bridge does not capture audio, read contacts or goal text, make network
requests, send analytics, or use an App Group. Its private-storage helper verifies
local recording ownership and backup exclusion without reading audio contents.
The system controls the locked Stop/Snooze presentation. The countdown widget is
required for AlarmKit's native five-minute snooze.

## Integration

Add `./plugins/withAamuAlarm.cjs` to the app's Expo config, set the iOS deployment
target to 26.0, and prebuild locally using the project Node 24 runtime. The plugin
creates a widget extension (`com.aamu.recovery.alarm-widget` for the agreed app
bundle), embeds it, adds an app-target AppIntents package wrapper, and supplies
AlarmKit permission / Live Activity Info.plist keys. The local module autolinks.
Do not manually edit generated `ios/` files. No EAS service is needed.

Import named functions from `modules/aamu-alarm`:

- `getAuthorization()` / `requestAuthorization()`: `notDetermined`, `denied`,
  `authorized`, or `unavailable`.
- `scheduleDaily(hour, minute)`: enable the chosen local wall time and reconcile
  the next seven daily occurrences; throws if permission or scheduling fails.
- `scheduleSnooze(seconds = 300)`: cancel this morning's active occurrence and
  queue a native one-shot five minutes from now. It retains the original morning
  timestamp. Only 300 is accepted. Call after the in-app sound has been muted.
- `stopCurrentOccurrence()`: app takeover / completed hold; stops current native
  sound and cancels pending snoozes without fabricating a user Stop event.
- `cancelToday()`: early hold; cancel only this local morning and keep future
  mornings. The same-date suppression survives foreground reconciliation.
- `rescheduleNext()`: replenish / reconcile the plan on every foreground. Call
  this to surface permission or scheduling errors; the native launch hook also
  makes a best-effort attempt. Reconcile after timezone changes as well.
- `cancelAll()`: disable the daily plan and remove its native alarms.
- `getAlarms()`: `{enabled,hour,minute,horizonEnd,alarms}`. Mutation calls return
  the same snapshot. `alarms` is AlarmKit's actual current state for owned IDs.
- `getEvents(afterSequence = 0)`: append-only local journal. Persist the consumed
  sequence in the application; repeated reads must not double-count events.
- `prepareNativePrivateStorage()`: create and verify backup-excluded private
  storage; return `{audioDirectoryUri}`. App code uses `src/privateAudio.ts` as
  the shared platform boundary before state loading, explicit Save and playback.
- `protectNativePrivateAudioFile(uri)`: verify an owned, nonempty local `.m4a`,
  reapply and verify its backup exclusion, then return its canonical local URI.

Journal fields are fixed: sequence, event type (`ring`, `stop`, `snooze`,
`app_open`), source, event timestamp, opaque alarm ID, original scheduled timestamp,
local date and UTC offset in minutes. Native user Stop/Snooze intents run in the
app process and persist locally even without the JavaScript runtime. The widget
only renders AlarmKit state, so it never needs journal access or a shared group.
The journal is excluded from device backup and protected until first unlock.
No complete history is inferred from disappearance of a native alarm. App code
must apply the approved first-hour/no-observed-interaction classification rules.

## Private storage boundary

New personal clips are saved in `Library/Application Support/<bundleID>/AamuAudio`.
The native launch hook excludes Application Support and the audio directory from
OS backup; the state-loading gate awaits the same verified setup before reading
AsyncStorage. The Expo plugin also sets `RCTAsyncStorageExcludeFromBackup=true`.
This covers AsyncStorage's application state and the native alarm journal. Temporary
recording and sensing files remain in the app cache and are deleted by their flows.

Recorder reapplies the file exclusion **after** copying, before committing Save;
Apple notes file operations can reset this resource flag. DawnAudio validates the
same ownership and exclusion boundary before giving a personal URI to its player.
Remote URLs, unrelated files, escaping symlinks and empty files are rejected without
logging paths. Existing `Documents/aamu-audio` clips are excluded in place and
remain playable; they are not copied or silently deleted. The installed SDK 58
FileSystem copy implementation uses `FileManager.copyItem` and permits this
app-private destination through its OS permission fallback.

These exclusions do not remove any earlier backup. This is not evidence of an
actual OS backup/restore test. Device-bound Keychain items are a separate boundary:
`WHEN_UNLOCKED_THIS_DEVICE_ONLY` prevents migration to another device; it is not a
claim that encrypted device backups contain no Keychain data. Android's app config
disables backup, but Android device behavior remains unverified.

## Explicit limits and required device checks

**This implementation has a finite seven-morning queue, not perpetual daily
recurrence.** Foreground launches and observed native intents replenish it.
No interaction for more than seven queued mornings exhausts it. This is an
implementation limitation requiring a product decision or a verified recurring
solution before claiming the requested persistent daily alarm is complete.
Apple documents `stop(id:)` as rescheduling a recurring alarm, but does not clearly
promise that calling it on a *scheduled, not yet alerting* recurring alarm skips
only the next occurrence. A separate iOS 27.0 simulator fixture on 14 November
2026 tested this after a three-second settling delay: `stop(id:)` on `scheduled`
threw `AlarmKitCore.Alarm.AlarmError` code 0, then the recurring alarm alerted at
its original due time. Stop succeeded once alerting, and a separate fixed control
also alerted/stopped normally. Both fixture alarms were removed. Evidence lives
in `review/alarmkit-recurrence-probe/`; this does not establish physical-device
behavior and is not support for silently replacing the queue. `cancel`
deletes recurrence, so it is not used to pretend to skip just one repeating day.

The queue uses fixed dates. Local wall time is reconciled on foreground; a timezone
change while the app stays closed retains the already scheduled absolute dates.
Date/offset records are not relabelled after travel. Apple exposes a
`maximumLimitReached` error but the examined SDK/docs do not specify a numeric
maximum. Seven is our queue size, not a claimed platform limit. Scheduling errors
are surfaced; partial new queues are rolled back before replacing the prior one.

Native Stop/Snooze intent execution, background launch, first-unlock restrictions,
widget matching, locked/silent/Focus ring, repeated snooze, app takeover, early
cancel, permission revocation, clock/timezone changes and force-quit behavior must
be tested on a real iPhone. Simulator compilation alone is not delivery proof.
AlarmKit only exposes current alarms and changes while observed; a system Stop
without an observed intent remains unobservable, as specified by the product.

## Primary references

- [Apple AlarmKit sample](https://developer.apple.com/documentation/alarmkit/scheduling-an-alarm-with-alarmkit)
- [Apple AlarmKit session](https://developer.apple.com/videos/play/wwdc2025/230/)
- [LiveActivityIntent](https://developer.apple.com/documentation/appintents/liveactivityintent)
- [AppIntentsPackage](https://developer.apple.com/documentation/appintents/appintentspackage)
- [Stop](https://developer.apple.com/documentation/alarmkit/alarmmanager/stop(id:))
- [Expo local modules](https://docs.expo.dev/modules/get-started/)
- [Expo config plugins](https://docs.expo.dev/config-plugins/plugins/)

The installed Xcode 27.1 AlarmKit Swift interface was checked for iOS 26 availability.
The bridge avoids iOS 27-only configuration parameters.

## Local build evidence — 14 November 2026

The full app (including AamuAlarm, AamuVoice and the countdown widget) built
successfully with Xcode 27.1 / Node 24.22.3 and was installed in the booted iPhone
18 Pro Max simulator running iOS 27.0. The extracted app-intent metadata contains
both native Stop and Snooze intents with `openAppWhenRun: false`. Mobile TypeScript
checking also passed. These are build/install checks, not physical-device alarm
acceptance, and do not remove the seven-morning horizon described above.

Commands run from `mobile/`, with Node 24's directory prepended to PATH and
`EXPO_NO_TELEMETRY=1`:

```sh
node node_modules/expo/bin/cli prebuild --platform ios --no-install
```

Then `COCOAPODS_DISABLE_STATS=true /usr/local/bin/pod install` from `mobile/ios`.
The combined build's pod integration completed with 116 dependencies / 115 pods.
An SDK 58 import-access mismatch in the app intent wrapper was fixed in its source
(`internal import AamuAlarm`) and regenerated through Expo config mods; no generated
project was hand-edited.

```sh
xcodebuild -workspace ios/Aamu.xcworkspace -scheme Aamu -configuration Debug -sdk iphonesimulator -destination 'id=0FFB83D1-C037-40AF-816B-87343B478997' -derivedDataPath /tmp/aamu-derived-data CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=YES build
xcrun simctl install 0FFB83D1-C037-40AF-816B-87343B478997 /tmp/aamu-derived-data/Build/Products/Debug-iphonesimulator/Aamu.app
```

Latest combined build log: `/tmp/aamu-ios-build-private-storage.log`
(`BUILD SUCCEEDED`, exit 0). This build includes the private-storage helper and
was installed and launched on the simulator. Metadata checks on the running app's
container confirmed backup exclusion on Application Support, the bundle parent
and AamuAudio; the built Info.plist has the AsyncStorage exclusion flag enabled.
Targeted ESLint and mobile TypeScript checks passed after integration.

The standalone private-storage checks passed for exclusion flags, a copied file
whose exclusion was deliberately reset, new/legacy ownership, and rejection of
remote/query/outside/symlink/empty inputs. They use temporary synthetic bytes and
delete their fixtures; no personal recording was accessed. Run from the repo root:

```sh
xcrun swiftc mobile/modules/aamu-alarm/ios/AamuPrivateStorage.swift mobile/modules/aamu-alarm/tests/PrivateStorageTests.swift -o /tmp/aamu-private-storage-tests
/tmp/aamu-private-storage-tests
```

The subsequent signed build including local reminders also passed
(`/tmp/aamu-ios-build-reminders.log`, 118 pod dependencies / 117 pods) and reached
the native Setup Goals screen. Local ad-hoc signing supplies the simulator's
application-identifier entitlement required by Keychain. An unsigned app had
passed compilation and private-storage setup but failed the safe-person Keychain
read; do not use `CODE_SIGNING_ALLOWED=NO` for runtime acceptance. No saved data
was reset and no privacy check was bypassed. Temporary stage diagnostics were
removed after identifying this issue.

The actual recorder Save/Play/Cancel flow, audio playback, physical-device backup
behavior and locked alarm behavior still require device acceptance.
The explicit DerivedData path avoids the machine's unwritable global location.
