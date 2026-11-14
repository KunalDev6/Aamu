# Home corrections — U25

All ten requested Home corrections are implemented. Screenshots below use the actual `HomeView` renderer with isolated demo fixtures and fixed local clocks of 07:00 and 19:30. They are browser renders of the shared React Native UI, not physical-iPhone clock tests. The fixture alarm is 06:45, so switching it on at either review time correctly schedules tomorrow. No real morning, recording, pairing or alarm is changed by this review.

| Request | Result | 07:00 evidence | 19:30 evidence |
| --- | --- | --- | --- |
| 1. Local greeting | Morning before 12:00, afternoon from 12:00, evening from 18:00. Boundaries and copy are centralized in `src/home/presentation.ts`. | [Morning](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-off.jpg) | [Evening](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-off.jpg) |
| 2. Current-time sky | Home derives its scene from the device's current local hours/minutes. The sky is dark from 18:00; 19:33 also maps to night. | [Morning sky](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-off.jpg) | [Night sky](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-off.jpg) |
| 3. Confirmed sun only | No backing fill on the unlit outline. Personal fill requires today's confirmed hold; a paired half requires its corresponding confirmation. Alarm-off state suppresses the fill. | [Unlit](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-off.jpg), [confirmed](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-confirmed.jpg) | [Unlit](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-off.jpg), [confirmed](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-confirmed.jpg) |
| 4. Removal wording and Undo | Only removing Tiny shows “That’s enough for today.” in body text with five-second Undo. Then the entire notice disappears. Off/no-offer states never show it. Done keeps the original step text with its own Undo. | [Removed](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-removed.jpg), [dismissed](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-dismissed.jpg), [Done](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-done.jpg) | [Removed](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-removed.jpg), [dismissed](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-dismissed.jpg), [Done](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-done.jpg) |
| 5. Preview scenes | Removed from Home; available only inside Demo controls when `EXPO_PUBLIC_DEMO_MODE` is enabled. Direct preview entry is guarded too. | [Clean Home](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-off.jpg) | [Clean Home](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-off.jpg) |
| 6. Header action labels | Header has a word-labelled Settings button and no icon-only action. The arrow in the earlier native capture was the simulator pointer, not an app control. | [Header](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-off.jpg) | [Header](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-off.jpg) |
| 7. Single warm action | When the alarm is off, Turn alarm on is the single warm-accent primary. Any retained step action is secondary while the alarm is disabled. | [Primary](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-off.jpg) | [Primary](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-off.jpg) |
| 8. Help and secondary contrast | Help has a visible outline and 9.26:1 normal text contrast; Settings uses the same quiet-button contrast. Pressed quiet buttons remain 7.46:1. Secondary-button text is 11.75:1 normally, 8.18:1 pressed. | [Help/Settings](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-off.jpg) | [Help/Settings](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-off.jpg) |
| 9. Landscape corners | The clipped landscape uses the same 28-point card radius as the other cards. | [Rounded card](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-off.jpg) | [Rounded card](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-off.jpg) |
| 10. Next alarm | Off state says “Alarm is off today.” After re-enabling past today's scheduled time, that remains true and “Next alarm: tomorrow {time}” appears. Active Home also shows the next alarm. | [Turned on](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-next-alarm.jpg) | [Turned on](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-next-alarm.jpg) |

## Screenshot pairs

### Alarm off

| 07:00 | 19:30 |
| --- | --- |
| ![Home at 07:00, alarm off](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-off.jpg) | ![Home at 19:30, alarm off](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-off.jpg) |

### After turning the alarm on

| 07:00 | 19:30 |
| --- | --- |
| ![Next alarm tomorrow at 07:00](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-next-alarm.jpg) | ![Next alarm tomorrow at 19:30](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-next-alarm.jpg) |

### Confirmed hold and offered step

| 07:00 | 19:30 |
| --- | --- |
| ![Confirmed sun at 07:00](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-confirmed.jpg) | ![Confirmed sun at 19:30](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-confirmed.jpg) |

### Done retains the original text

| 07:00 | 19:30 |
| --- | --- |
| ![Done with Undo at 07:00](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-done.jpg) | ![Done with Undo at 19:30](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-done.jpg) |

### Tiny removed, during the five-second Undo window

| 07:00 | 19:30 |
| --- | --- |
| ![Temporary removal notice at 07:00](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-removed.jpg) | ![Temporary removal notice at 19:30](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-removed.jpg) |

### After the removal notice expires

| 07:00 | 19:30 |
| --- | --- |
| ![Notice dismissed at 07:00](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/0700-dismissed.jpg) | ![Notice dismissed at 19:30](/Users/kunalkarki/Documents/junction-proj/review/screenshots/home-u25/1930-dismissed.jpg) |

## Verification

- Aggregate API/shared suite: **322 passed, zero failures**, including 19 new Home tests and four additional Demo regressions.
- Final mobile TypeScript check and full `src`/`modules` lint: passed.
- [Contrast audit](/Users/kunalkarki/Documents/junction-proj/review/home-contrast-u25.json): **29 passing checks** — 17 text pairs, eight button states and four outlines. Text/controls sit on opaque surfaces, so the changing sky does not lower their contrast. Lowest checked text ratio is 5.19:1; lowest checked button ratio is 7.46:1.
- Browser interactions verified at both review clocks: off → enabled-for-tomorrow, Done → Undo, Tiny removal → Undo, and automatic notice dismissal. Exact expiry is covered at 4,999 and 5,000 milliseconds in the logic tests.
- The review tab reported no browser console errors. Temporary viewport override and tab were removed after capture.
- Native physical-phone validation, locked/closed alarm delivery and the full two-phone demo remain pending. These screenshots do not establish those results.

The shared renderer is `mobile/src/HomeView.tsx`; actual state/actions come from `mobile/src/app/home.tsx`. The isolated review harness is under `mobile/src/demo/HomeReview.tsx` and is reachable only through the guarded preview route. The decision log and acceptance matrix record U25/C223–C231/HM-01–HM-10.
