# Local evening reminders

`expo-notifications` 58.1.9 supplies native local scheduling and response handling.
It was installed with the SDK58 `expo install` command. The shared planner lives in
`shared/reminders/evening.ts`; the app coordinator reads local morning state and
uses the same completion function as Home, preserving message-credit learning.

Confirmed U21/U23 behavior:

- Schedule one local notification at 18:00 for a step first offered before 18:00.
- Never send a catch-up reminder when first offered at/after 18:00 or when the app
  next opens after that time with no pending reminder.
- Cancel after Done or removal. Undo before 18:00 restores the pending reminder.
- Request notification permission after the explicit Set alarm action succeeds.
  Denial does not block setup or change the separate required AlarmKit permission.
- Both notification actions and a body-tap Alert offer **Yes / Not today**.
  Dismissal/ignoring never becomes explicit noncompletion.
- Recheck the recorded day and offer before applying an answer. Prior-day,
  replaced-offer, removed and already-answered responses do not mutate the record.
- Deleting the goal does not remove a still-valid stored offer or its reminder.

The first-offer timestamp is recorded once as local-only `stepOfferedAt`. Old
records without that timestamp are not inferred from wake or launch time. The
planner uses the morning's recorded date and UTC offset, matching its midnight
boundary. Changing timezone after the offer does not shift the already-queued
timestamp; travel-date conflicts remain outside the agreed build. Scheduling is
one-shot, never a repeating notification for mornings without an offered step.

## Privacy and native behavior

Notification title/body are generic; payload contains only a version, reminder
kind, local date and first-offer timestamp. No goal text, names, audio or support
verdicts enter a notification. No network API, token registration, remote push
service, background task or notification analytics is used. Actions foreground
the app to apply the answer safely; there is no background server dependency.

The adapter imports the pinned SDK's individual local API modules. Do not replace
these with `import * as Notifications from 'expo-notifications'`: the package
barrel loads its push-token auto-registration side effect. The config plugin sets
`enableRemoteNotifications=false`, removes APNs entitlement/background remote
mode, and disables Android Firebase Messaging auto-init and Analytics collection.
No Firebase project or Google-services configuration is added.

Presentation is quiet (no notification sound, vibration or badge). System settings
still control permission, Focus and delivery. Android uses the platform's default
best-effort scheduling; no extra exact-alarm permission is requested for reminders.
An old notice can remain in Notification Center while the app is closed; it is
ignored if tapped after the recorded midnight and dismissed on next reconciliation.

The coordinator serializes native schedule/cancel work and reads current state
after awaits. It only manages Aamu evening identifiers. Web and an older native
binary return unavailable rather than claiming delivery. Preview never mounts it.

## Verification

The 12 pure planner checks pass: 18:00 boundary, duplicate scheduling, removal,
Done/Undo, native delivery race, midnight/stale answers, missing timestamps,
payload fields, deleted-goal offers and unrelated-notification isolation.

```sh
node --test api/test/evening-reminders.test.ts
```

Targeted mobile ESLint and mobile TypeScript passed. The combined native build
passed on 14 November 2026 and was installed/launched on the iPhone 18 Pro Max
iOS27 simulator. The observed native UI reached Setup Goals; private storage,
state parsing and safe-person Keychain loading succeeded. The prior unsigned
simulator build failed at Keychain access, so use local ad-hoc signing rather
than `CODE_SIGNING_ALLOWED=NO`:

```sh
xcodebuild -workspace ios/Aamu.xcworkspace -scheme Aamu -configuration Debug -sdk iphonesimulator -destination 'id=0FFB83D1-C037-40AF-816B-87343B478997' -derivedDataPath /tmp/aamu-derived-data CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=YES build
```

Build log: `/tmp/aamu-ios-build-reminders.log` (`BUILD SUCCEEDED`). The app's
simulated entitlements contain its application identifier and no APNs entitlement;
there is no remote-notification background mode. Pods installed 118 dependencies /
117 pods. Actual notification delivery, action handling, Focus/permission behavior
and physical-phone acceptance remain pending. Adding this native dependency
requires prebuild, pod install and a new local binary; Metro reload is insufficient.

Primary references:

- [Expo SDK58 local notification APIs and local-only plugin option](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/)
- [Firebase's Android auto-initialization controls](https://firebase.google.com/docs/cloud-messaging/android/get-started#prevent-auto-initialization)
