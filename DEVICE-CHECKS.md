# Aamu device acceptance

This is a test procedure, not a claim that the checks passed. Keep results in `aamu-acceptance-tests.md`. A simulator build and the synthetic API check do not satisfy the two-phone gate.

## Prepare both iPhones

- Install the signed local app on iOS 26 or later.
- Set the current public HTTPS API URL in the build. Keep the laptop API and tunnel awake/running; confirm `/health` immediately before testing. The current network has produced tunnel disconnects, so reconnect behavior must be exercised too.
- Finish Goals and Alarm setup. Model suggestions must use the event key on the server; manual steps remain available. Allow native alarms. Notification permission is separate and optional for evening reminders.
- The presenters record their own morning messages/place sounds/reply notes in the app. No seeded personal audio is used.
- Pair with the real code flow, then restart both apps. Use mobile data on at least one phone. Keep the real flow separate from Settings → Demo.

## Required real-flow checks

1. Schedule a near-future daily alarm, lock the phone, and verify it rings while Aamu is closed. Repeat after removing Aamu from the app switcher.
2. Tap native Stop. Confirm that this alone never marks the person up or lights the partner sun. Open Aamu separately; verify the landing dawn and place sound.
3. Hold for two seconds. Confirm immediate up indication on the other phone, then automatic voice stage, recorded message and the approved step. The sky completes smoothly and ambience fades before message playback.
4. Repeat with native Snooze and in-app Snooze. Verify a five-minute native re-ring while locked, cumulative snooze count and the unchanged original timing origin.
5. With the WebSocket disconnected, verify the partner state still arrives through foreground polling, then reconnect and confirm no duplicate sun animation.
6. Exercise Skip, microphone denial and interruption during recording. Technical failure adds no difficulty point; interrupted recording continues to the message after reopening.
7. Complete a step, undo Done, shrink it, and remove Tiny. Check the next offered size, message credit and evening reminder cancellation against the acceptance cases.
8. Before the scheduled time, use the early hold and verify today’s alarm does not ring. Turn the alarm off/on before and after its time and verify the agreed off-day behavior.
9. Check a late hold: no sound or voice sample; Tiny and the hard-morning recording wait on Home, while the stored stopped/no_response category remains unchanged.
10. Use an actual recorded message, reply, answer and place clip. Verify replay, Rest message and restore, and that audio stays local. No automated test substitutes for listening to these recordings.

## Demo and clinic

- Settings → Demo must be visibly labelled. Ring now/Next demo day, selected difficulty, fast dawn, simulated pairing/up/callback and Reset operate only on demo state.
- Reset must preserve real goals, recordings, pairing and morning history.
- The clinic web app uses independent fictional fixtures. No real callback or clinic delivery is promised.
- With demo mode disabled, the entry and simulations disappear; ordinary app behavior remains.

## Native limitations to resolve or disclose

- iOS currently queues seven future one-shot mornings and replenishes them on supported native/app activity. The simulator experiment could not stop a future repeating alarm, so it did not solve early cancellation; the seven-day horizon remains. See `review/alarmkit-recurrence-probe/`. Closed-app timezone handling still needs acceptance.
- Android native code needs its own permission, locked/closed, Stop/Snooze, reboot and timezone tests. Force Stop, power-off and OEM restrictions are distinct from ordinary app closing. Do not mark Android accepted from compilation alone.
- The iOS 27 simulator has shown an OS-daemon failure when presenting AlarmKit permission; enabling only the test app’s Alarms switch through normal Settings allowed the isolated probe. This is not evidence of a physical iPhone permission failure.

Only after the complete real core flow passes on two physical iPhones may composed dawn begin.
