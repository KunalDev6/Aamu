# Presentation review — 15 November 2026

The strongest story is one goal across two contrasting mornings, followed by a visible support handoff. The previous build repeatedly explained the same mechanism and mixed the guided session with the ordinary Home state.

## Changes made

- Fixed clinic startup: `presenting` was read before initialization. Added an executable built-entry startup/refresh regression.
- Fixed browser demo API preflights by allowing the already-used `X-Aamu-Demo` header for the existing localhost origins. No origins were added.
- Made browser demo identity survive a same-tab refresh in sessionStorage. A missing/new identity clears stale clinic confirmations and remote acknowledgements. Native SecureStore is unchanged. Callback rejoins before sending and accepts only the current identity/settings response. No new services or dependencies.
- Added Close friend / Family / Anonymous choices. Friend/family are local presentation choices over the existing real pairing-code route, with no contacts, names or relationship sent. Anonymous is an explicitly labelled, reversible scratch-session preview; it does not match strangers or modify the real pair.
- Moved Approve immediately after the ladder, before research/model detail. Shortened the following bridge and linked partner choices with a direct return.
- Made the actual step the first and strongest item in the demo result card, with sensing facts and the existing arithmetic disclosure below it.
- Removed the detour through wall-clock/real-state Home between guided mornings. “Skip to a harder morning” now makes an explicit film cut, captioned “Another morning · two snoozes later”. The isolated fixture contains two completed fast snoozes and ten ringing seconds (12 represented minutes before the next hold); the ordinary scorer selects Hard/Tiny, with no difficulty override or invented voice sample. It still respects the fast 60-second first-ring cutoff: complete the hold promptly, within 34 seconds of that cut. The full/manual demo remains available for showing actual snooze taps.
- Compacted only `?present=1` clinic spacing/stats/Refresh so the call request and detail are visible at 1280×720. Ordinary clinic layout and status rules are unchanged.

## Browser evidence

Used the running local app and existing configured public API, with the synthetic goal “Read more books”. Real goal generation returned an editable ladder; Approve → bridge → first guided hold produced Full. Done → harder-morning cut → hold produced Tiny with two snoozes and approximately thirteen represented minutes. Tiny Done showed that the next step can grow to Small; Ask for support opened Help.

The anonymous preview changed from one lit half to both, and returned to the choice screen. It is a simulation, not a real partner-delivery test.

Help's real callback action returned “Asked for a call”. The protected clinic feed placed that connected presenter first and displayed the request timestamp. Refresh retained the same request. Same-tab app reload retained its confirmation. Four fictional status profiles and connected test presenters remain visible. No real clinician call was made.

Screenshots: `screenshots/presentation-review/partner-choices.jpg`, `harder-morning.jpg`, `callback-sent.jpg`, `clinic-callback.jpg`. Captures are browser views; the final clinic capture uses the default 1280×720 viewport. They are not native-device evidence.

## Suggested two-minute edit

| Time | Picture | Point |
| --- | --- | --- |
| 0:00–0:10 | Calm landscape, brief problem statement | Everyday support when daily treatment visits end. |
| 0:10–0:30 | One goal → three editable steps → Approve | The person chooses a goal; the models suggest/check the ladder. |
| 0:30–0:45 | Partner choices, then code connection or labelled anonymous preview | A small sign of getting up, without sharing goals or audio. |
| 0:45–1:05 | Easier morning, uninterrupted two-second hold, Small step | Start gently, show the shared sunrise and one clear action. |
| 1:05–1:30 | Explicit cut: two snoozes later → hold → Tiny → Done | Local rules adapt effort; completion allows the next step to grow. |
| 1:30–1:50 | Ask for a call, cut to clinic request at top | Show an actual request reaching the demo service. |
| 1:50–2:00 | Sunrise and one closing sentence | Sense, respond, learn; prototype with compressed/simulated scenes. |

Keep research and detailed scoring behind their links; do not read every paragraph in the video. Film one presenter-chosen moment only if it is already available. Do not seed personal audio/photos to fill that gap.

## Remaining distinctions and suggested next work

- The guided partner is simulated. Selecting Close friend/Family does not make the guided tour publish real wake signals. Film a separate real native hold/two-phone sun update if claiming live partner delivery. Actual hold → public backend → WebSocket/polling is the existing real path; it is not a conventional push notification.
- Guided morning history is isolated and is not uploaded as the clinic's real morning history. The demonstrated live handoff is the callback request. The clinic's pattern rows come from its fixtures and connected demo-store history.
- U39 removes the old carried-Full demo exception. The guided first example now starts Small, or Tiny on a hard morning, matching real first-day progression. Earlier Full screenshots/walkthroughs above are historical evidence from U37.
- Start demo still resets its earlier tour goals/drafts. The inherited capacity fallback can delete the third goal when all three slots are occupied; avoid running it against valuable presenter goals. A safer future change is a dedicated temporary tour goal rather than deleting an ordinary goal. This was identified during review and not changed in this pass.
- A single presentation controller spanning goal/partner/morning/clinic would be the larger follow-up. Current fixes remove the immediate mid-tour Home discontinuity without merging simulated history into real state.
- Physical locked/closed alarms, microphone/audio, and live two-phone acceptance remain pending. No new clinical validity or battery claim is made.

## Verification

- API/shared aggregate: **384 passed, zero failures**.
- Clinic: **36 passed, zero failures**.
- API and mobile typechecks passed; full mobile `src`/`modules` lint passed.
- Browser walkthrough and callback/dashboard evidence above passed.

Preview URLs while local processes run: app `http://localhost:8082/home`; clinic `http://localhost:4174/?present=1`. These changes were made locally; this review did not push a GitHub update.
