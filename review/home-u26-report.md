# U26 — Home and Settings redesign

The layout now uses the existing palette and Plus Jakarta Sans with a full-screen landscape on Home, Alarm, Voice and Message. Home has one bottom state card; Help and Settings are persistent text actions in its header. Settings uses two grouped lists and calls the recording library Moments.

The user confirmed that adaptive dawn remains while ringing. Home and idle views use local time. Moment playback and the waiting past-self note are quiet links within Home’s one card; the note opens its existing answer screen, which now offers playback before Answer it.

## Requested review matrix

These are 390 × 844 browser captures of the actual HomeView/SettingsView components, using isolated review fixtures. Every screenshot uses a configured 07:00 alarm. The five Home presentations are deliberately forced at both requested clocks; this does not change the real scheduler. For example, the actual early window for a 07:00 alarm is 04:00–06:59, and the evening unanswered prompt cannot naturally appear at 07:30. The illustrated sky still follows the specified 07:30 or 21:00 local clock.

The paired after-hold fixture shows only the person’s half lit; the evening fixture shows both confirmed halves. Settings’ counts and pairing are illustrative fixture values, with no seeded recordings or real pairing mutation. Clinic off remains truthful in the real Settings route because this build has no real clinic connection.

| State | 07:30 | 21:00 |
| --- | --- | --- |
| Night / before the early window | ![Night / before the early window at 07:30](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u26/0730-night.jpg) | ![Night / before the early window at 21:00](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u26/2100-night.jpg) |
| Early window | ![Early window at 07:30](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u26/0730-early.jpg) | ![Early window at 21:00](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u26/2100-early.jpg) |
| After the hold | ![After the hold at 07:30](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u26/0730-up.jpg) | ![After the hold at 21:00](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u26/2100-up.jpg) |
| Unanswered evening step | ![Unanswered evening step at 07:30](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u26/0730-evening.jpg) | ![Unanswered evening step at 21:00](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u26/2100-evening.jpg) |
| Alarm off | ![Alarm off at 07:30](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u26/0730-off.jpg) | ![Alarm off at 21:00](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u26/2100-off.jpg) |
| Settings | ![Settings at 07:30](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u26/0730-settings.jpg) | ![Settings at 21:00](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u26/2100-settings.jpg) |

## Behavior retained and changed

- Night/resting: 56-point, weight-300 next-alarm clock with Alarm tomorrow and Sleep well. Before today’s alarm, the label truthfully uses Alarm today.
- Early window: I’m already up enters the existing two-second silent early hold. The window calculation is unchanged.
- Confirmed hold: You’re up, anonymous partner status when paired, and Today’s step with Done and quiet Too much today. Done/Undo retains its prior outcome semantics.
- Evening: from 18:00, only `stepDone === null` on an offered, unremoved step produces Did you get to it? Yes records true; Not today records false. Undo restores unanswered. Completed, explicitly declined, absent and removed steps never produce that prompt.
- Off: one Turn alarm on primary. After re-enabling past the scheduled time, today remains off and the card shows tomorrow’s next alarm.
- Tiny removal keeps its five-second temporary wording/Undo inside the same card; no additional card is created.
- Each actionable Home state has one warm primary; resting and completed states need none. Other actions are text or outlined. There is no bottom Help pill and no normal-Home preview entry.
- Settings Alarm opens its time/on-off editor. Goals, Moments and Place sound retain their existing routes. Resting-message restoration moved into Moments. Partner and Your people keep their existing routes. Demo remains separately flag-controlled.
- The full-screen illustration uses measured viewport geometry, so hills, pines, lake and sun remain visible without stretching a boxed card. The sun fills only from confirmed state, and an already-confirmed partner half stays lit during the person’s hold animation.
- No new external service, dependency, palette or font was added.

## Verification

- **330 API/shared tests passed, zero failures**. This includes eight new Home state regressions (27 Home tests total).
- Final mobile TypeScript check and full `src`/`modules` lint passed.
- Browser interactions passed: evening Not today → Undo → Yes; off → next alarm tomorrow. All twelve requested captures were inspected; the review tab reported no console errors.
- The header text uses the protected top of the sky; the lower text is on opaque cards. The compositing audit gives at least 9.56:1 for primary text in the Home top band and 6.07:1 for secondary text there. Default morning-flow secondary text remains at least 4.77:1; existing opaque-surface text remains at least 5.19:1. These are bounded token/compositing measurements, not device accessibility certification.
- Physical-phone alarms, real microphone/audio and the full two-phone demo remain pending. The new browser captures do not claim those native results. Composed dawn remains gated.

[Contrast audit](/Users/kunalkarki/Documents/junction-proj/review/home-u26-contrast.json) · [Confirmed request and follow-up answers](/Users/kunalkarki/Documents/junction-proj/requirements/answers/u26.md) · [Acceptance matrix](/Users/kunalkarki/Documents/junction-proj/aamu-acceptance-tests.md)
