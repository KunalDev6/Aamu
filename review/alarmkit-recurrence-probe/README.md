# AlarmKit scheduled-Stop fixture

This separate simulator-only app uses bundle ID
`com.aamu.recovery.recurrenceprobe`. It never opens Aamu's storage or changes
Aamu's alarms. No network, microphone, contacts, Keychain or user text is used.
Permission and Run are explicit UI actions; never pre-grant permission with a
hidden tool or change the host/system clock to force a result.

The test schedules an all-weekdays relative alarm 61–120 seconds ahead and calls
`stop(id:)` while its reported state is still scheduled. A fixed-date control
alarm is scheduled 25 seconds later. The app observes AlarmKit's reported state
every 250 ms, stops any observed ringing immediately, and removes its two fixed
fixture IDs at the end. Synthetic metadata is saved to its own Documents file.
Successful API return alone is not a pass: the control must actually enter
`alerting`, the stopped test must not, and the recurrence must remain registered.

Even a passing result establishes only the upcoming-ring behavior on this
simulator/OS build. It does not establish next-day delivery, force-quit/locked
behavior, physical-device sound, travel handling or future iOS behavior.

The fixture compiled against the installed Xcode 27.1 simulator SDK, was locally
ad-hoc signed, and installed/launched on the iPhone 18 Pro Max iOS 27.0 simulator.
Its API minimum is iOS 26.1 for the current alert initializer. Build output is
under `/tmp/aamu-recurrence-probe`, outside the production app:

```sh
xcrun --sdk iphonesimulator swiftc -parse-as-library -target arm64-apple-ios26.1-simulator -sdk /Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator27.1.sdk -framework SwiftUI -framework AlarmKit review/alarmkit-recurrence-probe/Probe.swift -o /tmp/aamu-recurrence-probe/RecurrenceProbe.app/RecurrenceProbe
codesign --force --sign - /tmp/aamu-recurrence-probe/RecurrenceProbe.app
```

Copy the supplied Info.plist into the output bundle before signing/installing.
## Observed result — 14 November 2026

**Scheduled Stop did not skip the upcoming alarm on this simulator.**
The initial immediate attempt returned an error; its result is
`result-initial.json`. A controlled follow-up waited three seconds after scheduling
and read back the actual `scheduled` state before attempting Stop 88.5 seconds
before the expected ring. `stop(id:)` again threw
`AlarmKitCore.Alarm.AlarmError`, code 0, and left the recurrence scheduled. The
error's numeric meaning is not inferred.

The repeating fixture entered `alerting` at its expected 16:35 local time. Stop
then succeeded and returned the recurrence to `scheduled`. The fixed control
entered `alerting` at 16:35:25, and its Stop also succeeded. The final machine
record is `result.json`; `result.png` shows the observed result screen. This is
positive evidence for the scheduled-state limitation, rather than merely an
unobserved alarm on a nonfunctional simulator. It is still not physical-device
acceptance or a guarantee about another OS build.

The first authorization request had separately failed without a prompt because
the simulator's `mobiletimerd` lacked its system CFUserNotification entitlement;
see `authorization-blocker.json`. Permission was then enabled through the normal
Settings UI using CUA. No hidden grant or system entitlement patch was performed.

The fixture verified removal of both owned alarm IDs, then its app was uninstalled
and Aamu relaunched. Aamu's files and alarm schedule were not opened or changed.

## Implementation consequence

An all-weekdays relative schedule would provide indefinite device-timezone
recurrence, but it cannot currently replace the seven fixed occurrences while
preserving the approved early-hold cancellation using this Stop mechanism.
The public iOS 26/27.1 interface inspected exposes no start-after date, excluded
date or skip-next operation. Mixing a repeating fallback with one-shots does not
resolve the early-cancellation/duplicate-ring problem by itself.

No production alarm code was changed from this probe. The existing finite queue
and closed-app timezone limits remain explicit unfinished behavior. A physical
iPhone test can distinguish a simulator-specific restriction from device behavior;
it must not be assumed to pass. A different workaround requires evidence that it
preserves daily recurrence, early cancellation and no duplicate rings.

References:

- [Relative wall-clock scheduling](https://developer.apple.com/documentation/alarmkit/alarm/schedule-swift.enum/relative.md)
- [Repeating schedules](https://developer.apple.com/documentation/alarmkit/alarm/schedule-swift.enum/relative/recurrence.md)
- [Stop semantics](https://developer.apple.com/documentation/alarmkit/alarmmanager/stop(id:).md)
