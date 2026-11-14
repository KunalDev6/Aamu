# Aamu — frontend rules

**Status: older draft, partially reconciled through U21 on 14 November 2026.** `AGENTS.md`, `aamu-discovery.md`, the user's latest answers and the current implementation plan govern. Exact U17–U21 answers are in `requirements/answers/`. The project brief is another partially reconciled draft, not a higher authority. Material marked LEGACY is retained for comparison, not an instruction to implement unresolved behavior. U17 expressly authorizes bounded Decisions integration; passing its access probe does not establish a working native app or end-to-end integration.

**Current build phase:** main Expo implementation starts now using confirmed flows. Do not delay the app for another broad discovery round; ask only about a concrete blocking branch. The current plan/rules remain authoritative, and this draft does not supply missing defaults.

## UPDATED — scope and engineering authority

- Expo/React Native and TypeScript are confirmed. Ordinary internal engineering and code organization are delegated within confirmed product/privacy/service boundaries; the layout below is a suggestion.
- Record a reason for every dependency in `NOTES.md`. Do not add an SDK that sends data off-device without the user's authorization. Google AI Studio/Gemini API and Aiven PostgreSQL/Valkey in the EU are confirmed; U16 chooses laptop Fastify plus Cloudflare Quick Tunnel for the demo, not yet started.
- Include the reply loop: medium/hard message-stage **Say something back** records a local note of at most 20 seconds. On easy Home, offer the **oldest unanswered** note to play and **Answer it**; save that answer as a new local message tagged with the original note's morning level.
- Include personal place recording in setup step 3 and Settings, up to 30 seconds. Use it only during the in-app dawn. The locked-screen native alarm uses bundled sound.
- Never seed personal audio. Presenters record their real messages/place audio beforehand. U15's separate provider-generated instrumental pieces are gated until the complete two-phone demo passes and Lyria availability is verified.
- Exclude thought sending, its UI, waiting-thought state, events and related tests. Retain `partnerQuietDays` within the agreed partner data.
- Use the shared local distress-phrase configuration/checker for both goal text and manual steps before any model request. A locally matched goal is not POSTed and creates no backend event. Only unmatched text goes to `POST /goals/shrink`, where the server rechecks before Decisions/Gemma. The shared phrase check has no separate API; U17 separately authorizes one edited-step approval hint operation for non-localOnly goals. U17 approves the phrase content. Native Finnish review has not been confirmed; do not claim it happened or invent it as a new gate. Only approved non-localOnly goals are stored through `PUT /goals`; support flags/text are not persisted, counted or logged on the backend or exposed to partner/clinic data. Private manual overrides follow the rules below.
- Anonymous matching is a visually ready configurable demo flow with explicit TODO implementation files; do not implement real matching. The clinic is a separate web demo directory, with no real patient-morning feed required.
- The U11 visual mix is final under U13; no further visual references are expected. Continue using the fresh theme tokens rather than reopening the palette/reference choice.

## UPDATED U13/U14 — lifecycle, privacy and real partner flow

- App/API/clinic level enums include `easy`, `medium`, `hard`, `no_response`, `stopped`, `off`. Off means deliberately disabling before firing. Offer no step, do not advance rotation or emit partner-up, and exclude it from baselines, usual-speaking history and partner quiet-day counts.
- Each intervening no-offer no_response or stopped day reduces carried step size one rung to Tiny; an off day preserves it. U19's late no_response hold makes that day offered without changing its category, so apply offered-day progression. Keep this distinct from unknown completion of an offered step.
- Rolling usual-speaking history uses `spoke + silent + skipped` in the denominator and only `spoke` in the numerator; fixed voice baselines use valid `spoke` recordings only. Off/unavailable/failed/late-flow days remain excluded. U14 resolves the general gate: valid silent and skipped add one only for a usual speaker with at least five eligible rolling mornings, otherwise zero. Remove the unconditional null-onset penalty. Spoke delayed/quiet rules require at least five valid measurements in the relevant fixed baseline; cap all voice conditions together at one point. Five spoke plus nine silent makes a further silent or Skip zero.
- Real pairing: POST `{mode: "code"}` to create a code, or include `code` to join. U22 keeps the code valid until used, with no countdown/time expiry; after redemption it cannot be used again. A pair survives restart/reinstall when the same user token is restored; do not claim automatic token recovery.
- Use public HTTPS/WSS across networks. Reconnect WebSocket with backoff; foreground paired polling of `GET /partner` runs every five seconds, plus foreground-entry refresh. First positive up observation updates once; repeated poll/WS positives do not replay the sun animation. Add **Partner gets up now** as a demo fallback.
- In the separate clinic demo, off is neutral and excluded from seven-/14-day counts/averages. U14 adds insufficient observation handling below, superseding any implication that an all-off window preserves the current status. No real clinic feed is added.

## UPDATED U14 — scheduling, dawn, private goals and required checks

### One daily alarm and off re-enable

- One daily wall-clock time and one on/off switch; off persists until switched on. Do not build weekday selection, multiple alarms or one-off skip. List weekday selection as not built in NOTES.md.
- Before today's scheduled time, re-enable reschedules system/in-app alarm at its original time and clears off to pending. Show “I'm already up” if within its existing window. No minimum lead time, including one minute before.
- After scheduled time, retain today's off status and all off rules, schedule tomorrow, and create no ring/hold or record changes beyond off. Show one transient line: “Your alarm is back on for tomorrow at {time}.”
- Follow the phone's current timezone and 12/24-hour locale for future scheduling/display. Reschedule the next alarm when the system reports a timezone/clock change.
- Fix each morning's localDate and UTC offset at first ring or early hold; all local-midnight rules use the recorded timezone/offset, including late cutoff, stepDone becoming null, carrySize update and sun reset. A midday timezone change does not move an existing morning to another date/boundary.
- Add optional utcOffsetMinutes to the API. One record per localDate; duplicate/skipped dates from travel are not handled and must be noted in NOTES.md.

### In-app dawn

- For foreground ringing/Ring now, take the last three observed mornings within the past 14 days, skipping off. Easy = light, medium = middle, hard/stopped/no_response = heavy. At least two heavy → 6 minutes/lower starting volume; at least two light → 2 minutes; otherwise 4 minutes. Fewer than three observations also → 4 minutes. Fast mode uses 10/15/20 seconds. A system-alarm handoff uses the separate 20-second landing dawn.
- Completed hold advances to voice immediately, compresses remaining sky motion into about three seconds without jump/freeze, and fills/raises the sun. Fade place sound out over about two seconds before message playback. Snooze holds the sky where it is and dims slightly; the next ring resumes there. Timings/thresholds belong in config.

### Private manual-override goals

- If the latest local/endpoint verdict is needs_support and the person keeps the goal through Write my own steps, store localOnly: true on the phone. Its title and all three steps stay local; omit the whole goal from PUT /goals without a marker. Do not ask/suggest a title change or offer consent to transmit it.
- Send its morning record using opaque local goalId, stepSize/stepDone and stepText: null. Make stepText nullable; server processing cannot depend on the goal existing. Do not send localOnly itself.
- Rotation, carrySize, local per-goal counts, Home and message stages treat private goals identically. Later clean rewording that passes both checks clears localOnly and includes it in the next PUT.
- U17: when a previously synced goal becomes localOnly, its next PUT omission removes remote title/steps and nulls stepText on all existing mornings with that goalId. Keep opaque IDs, sizes and outcomes. Never send a private marker or its text for cleanup. Never send localOnly steps for approval-time Decisions hints.

### Clinic observation states

- Add status insufficient with “Not enough recent mornings” when fewer than three observed mornings occur in the last seven days; any recorded non-off level counts, missing records do not. Never return steady or reuse a prior status as current in that case.
- Persist last classified status/date and expose it as a fact in the reason using the U14 exact templates in the project brief. Sort might_need_call, drifting, insufficient, steady; within insufficient, longest time since last observed first.
- With at least three observations but fewer than five in the preceding 14-day comparison window, skip average-comparison rules and use count rules only. If none fire, return steady plus “limited history”. Config contains thresholds 3 and 5.

### Required U14 checks, not yet executed

- Silent with n=4 → 0; usual speaker → 1; usual skipper → 0; spoke triggering both delayed/quiet → 1.
- Re-enable before time, one minute before, and after time; the after case never rings or changes records beyond off.
- Timezone rescheduling, localDate fixed through midday travel and midnight rules using stored offset.
- All dawn rows, off exclusion, insufficient history, 15-day gap and hold at 10%.
- localOnly omitted from PUT, opaque/null-text morning record, mixed-goal rotation and clean-recheck removal of localOnly.
- Clinic brand new, all-off 7/21 days, two observations, thin comparison history and previous-status reason.

## UPDATED U16 — early hold, initial carry, messages and clinic rules

### Silent early hold

Home shows “I'm already up” from the later of scheduled alarm minus 180 minutes and local midnight on that alarm's calendar day, until it fires. Never show it on the previous calendar day or an off day. Store earlyHoldWindowMinutes: 180 in config. A completed early hold plays no dawn animation, place sound or composed piece. Go directly to voice, then message, then step; render a static current-time sky, fill/raise the sun, publish partner_up and cancel today's system/in-app alarms. Store minutesToUp: 0 and snoozeCount: 0. U17 defines minutesBeforeAlarm as floor((scheduledAlarmTime − holdCompletedAt) in minutes), a non-negative integer only on early holds and null otherwise. Early localDate is the alarm's calendar date; nothing else was specified by the earlier truncated sentence.

### Initial carrySize

Start small before the first offered step: first easy/medium → Small, hard → Tiny, never first-day Full. Done Small makes carrySize full for normal subsequent rules. Deleting all goals and adding new ones retains carrySize; only resetting app data restores small.

### Deterministic message selection

- Filter to not blocked and recorded for the morning level. If empty, fall back only easy → medium → hard or medium → hard; hard has no fallback. Never brighter; no eligible message means step without audio.
- Remove yesterday's played recording if another remains. Prefer timesPlayed === 0; otherwise maximize (timesFollowedByDoneStep + 1) / (timesPlayed + 2).
- Tie order is earliest lastPlayedAt (never-played first), then earliest createdAt, then lowest id. No randomness by default. If a Thompson sampling stretch is later built, it replaces only score step 5, uses seeded tests and preserves eligibility, fallback, yesterday/unplayed filters and tie order. Do not infer authorization to build that stretch now.

### U17/U18 local message attribution

- Show today's step as soon as the message starts. Increment timesPlayed once per message per local day when audible playback reaches three seconds, or the end when shorter. Same-day replays add nothing; Settings playback never counts. A pause after the threshold still counts.
- Only the morning's selected message can earn completion credit: increment timesFollowedByDoneStep when stepDone becomes true that local day, and decrement when Done is undone.
- A rested message earns no play or credit. If today's selected message already earned either, Rest removes today's play and credit only, preserving all older history. This learning stays on the phone.

### Clinic calculation below insufficient

Use seven most recent calendar days, including today only when its morning has a final level; compare the preceding 14 calendar days. Values are easy 0, medium 1, hard 2, stopped 2 even after late confirmation, no_response 3. Off/missing entries are excluded; average observed days only.

Evaluate might_need_call first: no_response ≥3, or hard+stopped+no_response ≥5, or average increase ≥1.0. Else drifting: hard+stopped ≥3, or average increase ≥0.5, or true stepDone on ≤2 recent days and ≥4 in the seven days before. Else steady. Skip both average checks when comparison has fewer than five observations. stopped is never no_response. Thresholds remain in config; U14 insufficient/limited-history rules still apply.

Reasons list every fired rule. U17 resolves the copy: stopped with upAt set is “alarm stopped; getting up confirmed later”; without upAt it is “alarm stopped but getting up not confirmed”. Count those cases separately in the reason; both retain value 2 and count in hard/stopped rules.

U20 approves “no response in the first hour; getting up confirmed later” for a late-confirmed no_response day. Preserve its value 3 and all no_response counts; do not treat confirmation as a lighter category.

### U16 required checks, not executed

- Every clinic trigger at and just below threshold; three stopped yields drifting, five stopped yields might_need_call; pending today excluded.
- First easy/medium Small and hard Tiny; completed first-day Small makes carry full.
- Never brighter fallback; hard with only easy recordings gives no audio; unplayed tie by createdAt; equal score tie by lastPlayedAt.

## UPDATED U17/U18 — goal suggestions and advisory hints

- Gemini Decision 1 judges while Gemma writes. The server performs its phrase precheck, one Decisions goal call, one Gemma ladder call and one Decisions duration/concreteness call. Each stage has one attempt without retries. U18's 25-second server deadline covers the whole sequence; the client timeout is 30 seconds.
- Show a calm waiting line, with **Write my own steps** available immediately. Failure/timeout offers **Try again** and **Write my own steps**. If final Decisions fails after a ladder is generated, show failure/manual steps; never display an unchecked ladder or request automatic regeneration.
- A confident too_big/too_vague result shows the ladder with the exact U19 advisory below. Choice confidence below 0.6 is treated as ok. Display each sizeHint as one quiet line under the affected step; hints never override the person's text or approval.
- On Approve of edited non-localOnly steps, save on the phone immediately and show hints afterward. Run the step check once; never send localOnly goal text or steps. No auto-regeneration. A safety-block HTTP 400 during duration/concreteness checking triggers Help and localOnly; subsequent sync follows the private-goal cleanup rules above.
- Decisions evaluates each duration against ordered levels “Under 2 minutes, at home”, “2 to 10 minutes”, “10 to 30 minutes”, “More than 30 minutes”. A most-probable level above Tiny 0 / Small 1 / Full 2, or concrete-action probability below 0.5, produces a hint. Duration uses the most probable level, not the score's weighted mean.
- Server distressThreshold starts at 0.3 and is configurable; this number and the underlying distress probability do not belong in the product UI. Never store, log, display or expose the distress probability. Only the demo-only **Under the hood** view may show step-duration probabilities and goal verdict. A Decisions outage before generation uses the current Gemma verdict fallback and marks source; final-check failure uses the failure behavior above.
- The current phrase content is user-approved; no separate native Finnish review has been confirmed. Mobile never calls providers or handles GEMINI_API_KEY. The server's authorized SDK is @google/genai 3.2+ using v1beta Decisions, not a mobile dependency.
- Required U17/U18 checks: 07:15 early control opens 04:15, 02:00 opens midnight, 00:30 early hold for 02:00 stores 90/alarm localDate; correct stopped copy/counts; synced-to-private cleanup; message threshold/replay/Settings/pause/credit/undo/Rest history; immediate manual choice, whole-sequence deadline, final-check failure, advisory behavior, immediate edited save/later hints, localOnly exclusion and post-check safety flow. These are specified checks, not execution claims.

## UPDATED U19 — final wake classification, snooze and setup

- Fix the classification window at 60 minutes from the first ring, or 60 seconds in fast time. Snooze re-rings never extend it. no_response means no interaction within the window: no system Stop, system snooze, in-app snooze, app open or hold. stopped means at least one such interaction but no completed hold; one snooze or app open suffices.
- Finalize at that mark when the app runs, otherwise on next launch using persisted ring time, stop/snooze events and app-open timestamps. Backfill every past alarm-enabled day with no record, then sync. U20 clarifies that any observed interaction still means stopped even when system Stop is unavailable. The no_response fallback applies only when no interaction was observed; note the native observability limitation in NOTES.md. This is a required behavior/observability boundary, not a claim that the native event bridge works.
- Neither final category changes to the other later. After 60 minutes and before recorded local midnight, a no_response day gets the same late hold → Tiny → message-behind-play-button flow as stopped. Set upAt, emit partner_up and count it as an offered day for carrySize, while preserving no_response. Keep late voice/rescoring excluded. Remaining late-flow details follow discovery rather than inferred new flags.
- Snooze stops sound, schedules the native ring after the agreed five minutes and has no count limit. Sky freeze/dim/resume remains unchanged.
- Setup requires connectivity to finish. Denied alarm permission blocks completion and offers **Open Settings**. Goals and Alarm remain mandatory setup content; optional recording/partner/contact steps do not become mandatory.
- Required checks: untouched alarm → no_response; system snooze then nothing → stopped; app opened/closed → stopped; three missing alarm-enabled days backfilled on next launch; late no_response hold; first-ring anchoring and fast60 seconds; snooze mute/native scheduling/unlimited count; offline or denied-permission setup cannot finish.

### Exact goal copy and continuing manual editing

- Waiting: “Finding a small place to start…”
- Failure: “We couldn’t suggest steps this time.”
- too_big: “This is a big goal. These steps are a place to start.”
- too_vague: “These steps make a starting point. Edit them to fit you.”
- Duration hint: “This may take more than {2/10/30} minutes.” Substitute the slot's 2, 10 or 30.
- Concreteness hint: “Try one action someone could see you do.”
- When both apply, combine them into one quiet line under the step.

Choosing **Write my own steps** while loading keeps that request running; it is not cancellation. U20 approves **Suggestions are ready** with **View**, then **Use these steps** and **Keep mine**. U21 confirms “Replace the steps you wrote?” with **Replace** / **Keep mine** when manual text exists. Use these steps replaces editable fields only and still requires **Approve**. Never replace or approve manual text automatically. If manual steps are approved while the original goal check is pending, save on the phone immediately but defer remote saving until that check finishes. A late needs_support opens Help, makes the goal localOnly and removes previously synced text through the agreed remote/historical-morning redaction flow. U21: original-request failure/timeout preserves the manual approval and releases that request’s sync deferral. Defer every replacement PUT /goals while any approved non-private goal awaits its original-goal or hint check; sending a snapshot that merely omits the pending goal would wrongly delete its prior remote copy. Once all are resolved, sync approved text normally unless localOnly. Retain the 25-second server/30-second client deadlines and one attempt per stage. Meaningful controller tests cover continued loading, draft replacement requiring approval, deferred snapshots, failure release and late support; verify simple copy formatting during review.

**Recorded implementation limit:** Framework-independent goal/client/approval helpers and bounded server routes exist; the latest completed suite passed typechecking and 159 tests (104 phrase, five parser, 37 goal/client/route and thirteen suggestions-state cases). The live synthetic pipeline succeeded in 15,574 ms (review/provider-goal-pipeline.json). The SDK58 Expo scaffold now exists in mobile/ and app implementation is underway; no native alarm/setup flow is device-verified by this evidence. These results do not execute the U19–U21 native acceptance cases; the bounded goal extension has 159 passing local tests, while main Expo implementation is now starting.

## UPDATED U21 — personal recordings, reminder and interruption

- Morning-message libraries are **For an easier morning**, **For an in-between morning** and **For a hard morning**, with a 20-second maximum per message. Replies remain capped at 20 seconds; personal place recordings at 30 seconds.
- Every personal recording—morning message, reply, answer and place—starts by tap, then offers **Play**, **Record again**, **Save** and **Cancel**. This does not change the automatic five-second sensing sample.
- If the app closes during that sample after the completed hold, set voiceState failed with zero points and continue to the message when reopened. Do not restart sensing.
- The step reminder is at 18:00 local time with **Yes** / **Not today**. No reminder for a step first offered late in the day. Strict late cutoff/equality and additional suppression rules remain open; removal after Tiny already cancels the reminder. The old reminder sentence/reply copy is not approved by these answers.
- These are native/UI specifications. The bounded goal extension does not implement audio, notifications or lifecycle behavior; its local verification is included in the 159-test result, without native/UI acceptance.

## LEGACY library suggestions (Expo/TypeScript confirmed)

- Expo (React Native) with TypeScript in strict mode, and expo-router for navigation.
- Use the Expo SDK version that `create-expo-app` installs. Before using an Expo module, check that it is current for that version. In particular, record and play audio with the audio module the installed SDK documents (`expo-audio` at the time of writing), not the deprecated `expo-av`.
- State: `zustand`, persisted with AsyncStorage. Audio files: the app's document directory through `expo-file-system`.
- Other Expo modules you will need: notifications, haptics, keep-awake, brightness, secure-store (for the token), linear-gradient. Animation: `react-native-reanimated`.
- Tests: Jest (the Expo preset) for everything in `src/core/`.
- The old no-chart-library/UI-kit/analytics/crash-reporter list is retained as a legacy proposal. The active dependency rule above requires a documented reason for every dependency and user authorization before any new off-device-data SDK.

## Suggested folder layout

```
mobile/
├── app/                 Routes only. Screens stay thin and call into src/.
│   ├── (setup)/         Good-day setup steps
│   ├── index.tsx        Home
│   ├── alarm.tsx        Alarm stages A–D
│   ├── partner.tsx
│   ├── help.tsx
│   └── settings.tsx
└── src/
    ├── core/            Pure functions: morning level, step choice, message choice, wake-up length. No React, no I/O.
    ├── config.ts        App name, thresholds, timings, help numbers, API URL
    ├── copy.ts          Every string the person reads
    ├── theme.ts         Colours, type sizes, spacing
    ├── store/           zustand stores
    ├── api/client.ts    The only file that calls the backend
    ├── audio/           Record, play, measure
    └── components/
```

The clinic lives in its own web directory outside `mobile/`; its name and framework are engineering choices within the agreed scope. A shared configuration module can provide the same distress-phrase list/checker to mobile and backend.

## LEGACY product-rule proposals, with confirmed corrections

1. Legacy proposal: no charts, numbers, scores, streaks, points, badges, progress bars or history lists about the person in the patient app. Any clinic visualization belongs to the separate web app. Exact remaining product restrictions follow discovery.
2. **Local wake decisions:** level, step and message operate from local data. Real partner-up dispatches at completed hold. The old unconditional morning-record upload is not active authorization; backend persistence and retries must match the current data decisions.
3. **Voice recordings never leave the phone.** No upload code, no base64 audio in requests, no audio in logs. `api/client.ts` must not have a function that accepts a file.
4. **Delete the "good morning" recording** as soon as its two numbers are saved.
5. **Only real recordings are played.** No text-to-speech and no generated or altered voice.
6. **No typing after setup.** After the good-day setup, every interaction is a tap, a hold or a spoken recording.
7. **"Need help now?" is reachable from every screen**, including the alarm.
8. **Words:** every user-facing string comes from `src/copy.ts`. No exclamation marks. Banned words: fail, failed, missed, streak, should, only, lazy, relapse, depressed, symptom, risk, score. A step not done is "Not today."
9. **Confirmed color authority:** use the fresh named palette in the root `src/theme.ts`; do not restore source-reference colors. Never red or green meaning about the person.

## UPDATED — core logic authority

- Implement the confirmed rules in `aamu-discovery.md` and required checks in `aamu-acceptance-tests.md`, not the brief's explicitly legacy formulas. Pure functions are a suitable engineering choice for deterministic rules.
- U20 baseline ordering: score today from previous qualifying mornings only, then append today to history. Fifth qualifying morning still uses defaults; sixth first uses the five-morning median. Preserve the already confirmed qualification and freezing rules, including the separate voice baseline.
- U20 timing comparisons use max(1 minute, stored timing baseline). Keep the stored median unchanged even when zero; the floor applies only while comparing timing, not to snoozes or speech. Required checks cover fifth/sixth ordering, excluding today's data from today's score and comparison-floor behavior without mutating a zero stored baseline. Native/sensing implementation is not established by these requirements.
- Preserve U13's off category, carried no-offer-day reductions and revised usual-speaking denominator. Do not reuse the older spoke/skipped-only denominator or count off as no response.
- All thresholds and timings come from `src/config.ts`. No magic numbers in functions or screens.
- Run the required acceptance/core checks; choose meaningful additional tests for unresolved risks once behavior is agreed. Legacy edge-case suggestions include first days without a baseline, no response, no eligible messages and yesterday's step outcome. There are no thought-sending tests.
- Timings respect "fast time" from the demo controls through one helper, so no screen has its own demo branch.

## UPDATED — alarm boundary; remaining legacy suggestions are identified

- Real locked/closed-app ringing is required. Use the approved system alarm → app → dawn/hold/voice/message handoff and the separately confirmed late path. Native Stop alone never confirms up; an observed Stop without a completed hold finalizes as stopped at U19's 60-minute mark. If native Stop is unobservable, U20 still uses any observed snooze/app opening/other interaction to classify stopped; no_response applies only with no observed interaction.
- Count native and in-app snoozes together. Measure getting-up time from the original scheduled alarm to the completed hold, and send partner-up at that hold, before voice/message work. Follow the current occurrence-takeover and native-snooze cancellation rules.
- During active ringing, in-app place audio continues until the completed two-second hold; personal audio never replaces the bundled locked-screen sound. U19 snooze stops sound and schedules a native ring after five minutes, with unlimited snoozes. Remaining interruption behavior follows the open questions.

### Legacy native UX suggestions

The following older implementation details do not settle open permission, haptic, accessibility or recovery behavior and are not claims of platform feasibility:

- Keep the screen awake and raise screen brightness during the dawn; restore both when the alarm ends, including when the app is closed mid-alarm.
- Set the audio session so sound plays with the phone's silent switch on.
- Two controls only in stage A, each at least 64 pt tall, in the lower half of the screen. "I'm up" needs a two-second hold with visible fill and a haptic tick on completion. Snooze is a tap.
- Record timestamps at the moment of the event, not when the next screen loads.
- U21 resolves one interruption: close during the automatic five-second sample after hold → failed/zero, then continue to message on reopening. Other crash recovery remains open; do not apply the old stop-sound/show-step/Home proposal automatically or mark an unconfirmed wake up.
- The dawn/landscape uses the approved tokens and visual style, not the old brief palette. Keep text on contrasting surfaces throughout the animation. Use U14's exact foreground/landing/fast timing and hold/snooze behavior above; remaining interruption details stay in discovery.

## UPDATED — local recording scope

- U19 denies setup completion without alarm permission and offers Open Settings; other permission timing and recording/notification edge behavior still follows discovery. No available recording means the step alone, never an authored text-card substitute. Denied/failed morning voice adds zero under the confirmed scoring rules.
- U21 supersedes the old Listen subcontrol proposal: tap to begin, then Play / Record again / Save / Cancel for every personal recording. A level indicator and remaining unspecified lifecycle details are still proposals.
- Save each message with: id, level it is for, created date, file path, `timesPlayed`, `timesFollowedByDoneStep`, `blocked`.
- The metadata shape above is a legacy starting point. Add the agreed local note/reply relationship without uploading audio. Rest message excludes until manual restoration; do not implement automatic expiry or irreversible blocking.
- U21 sets morning messages to at most 20 seconds; replies remain at most 20 seconds and personal place sound at most 30 seconds. Apply the approved controls to answers too; do not invent other recording lifecycle rules.

## UPDATED boundaries / LEGACY transport suggestions

- A single API client and shared contract types are suggested. Section 10 now includes U14's optional utcOffsetMinutes, nullable stepText and private-goal serialization constraints. Reconcile remaining payload details before implementation; never serialize localOnly goals or markers into PUT /goals.
- `EXPO_PUBLIC_API_URL` uses a public HTTPS endpoint. The approved demo option is laptop Fastify plus Cloudflare Quick Tunnel; it has not been started. No cloud backend host is selected. Aiven EU services remain agreed. Do not put phone clients on localhost for cross-network operation. No API keys or secrets belong in the app. Gemma runs through the backend's configured Google compatible/native adapter; mobile never calls the model directly.
- Store the token with secure-store. Never log it.
- Goal suggestions use U18's 25-second whole-sequence server deadline and 30-second client timeout, one attempt per stage and no automatic retry; the former eight-second proposal is superseded. Goal fallback shows empty editable steps with placeholders. Goal/manual phrase checks both run locally first. A local goal match sends no request or event; the shared phrase check adds no remote API. The separate one-time edited-step hint check is explicitly authorized for non-localOnly goals only.
- The WebSocket reconnects with backoff. Also poll partner state every five seconds while foreground and paired, and refresh on foreground entry, deduplicating positive observations as described above.

## UPDATED scope / LEGACY clinic layout suggestions

- The clinic is a separate web directory with its own removable demo mode; it is not an Expo patient route. No real morning-record feed is required. The old 1280px target and layout below remain suggestions pending the current decisions.
- One code field, one list, sorted as the backend returns it. Do not re-sort or re-score on the client.
- Statuses are text labels with a neutral accent, not traffic-light colours. Footer text exactly: "Based on alarm behaviour only. Not a diagnosis."

## Confirmed visual baseline / LEGACY remaining accessibility details

- Minimum text size 16 pt; step text at least 28 pt; support the phone's larger text setting without clipping.
- Every control has an accessibility label. Contrast of at least 4.5:1 for text at every point of the dawn gradient.
- One-handed use: nothing important in the top third of the alarm screen.
- Respect "reduce motion": replace the animated dawn with a slow cross-fade.

## UPDATED scope / LEGACY demo-control placement

- Personal audio is never seeded; the presenter records beforehand. U15 permits pre-generated instrumental pieces only after its core-demo/model-availability gates. Anonymous matching remains a configurable visual TODO; thought sending remains absent. A callback simulation must be labelled, and its button must work or be hidden outside demo.
- The hidden gesture/control names below are retained proposals until settled; do not claim them as confirmed navigation.

- Hidden behind a long press on the version number in Settings. Never visible in screenshots of normal screens.
- "Ring now", "Fast time", "Load history" (steady, drifting, recovering), "Reset". Loaded history is flagged as simulated in the store.

## GATED U15 stretch — composed dawn

- Authenticated ListModels succeeded with 64 models on one page; sanitized evidence is review/provider-models.json. The selected goal model is models/gemma-4-31b-it in server environment configuration, not code. A bounded server probe of a synthetic goal succeeded through the compatible endpoint: HTTP 200, Zod-validated ladder, 12,983 ms, user role only/no JSON mode; five parser checks passed under api/scripts. See review/provider-generation.json. This is not a product goal route or end-to-end app implementation. The earlier roughly 13-second Gemma measurement is distinct from U18's 25-second whole-sequence server deadline, one attempt per stage without retries, and 30-second client timeout. One synthetic Decisions access call succeeded with SDK 3.3.0 in 395 ms (review/provider-decisions.json), without establishing route/device integration. Lyria models were listed, but generation/quota remain untested and the full two-phone demo gate has not passed. Credentials never enter mobile.
- Implement this feature only after the full core demo script passes on two phones and Lyria is available. If unavailable, do not build it. No compose-route implementation is authorized before both gates.
- After the morning flow, prefetch tomorrow's instrumental piece in background using only place sea|forest, tier light|middle|heavy and seconds. Never call POST /dawn/compose in the alarm path, and never send personal text, goals, levels, user IDs or audio to that model.
- Cache the returned provider-generated piece locally and play it under place sound during normal in-app dawn. Early hold explicitly plays no composed piece, dawn animation or place sound. No cache means the existing dawn behaves exactly as before. Not this sound discards the cached piece and falls back to place sound.
- Pre-generate pieces for demo phones before presentation only after the gates. This is a deliberate generated-instrumental/output-only exception, not permission to upload or synthesize personal recordings. The server streams output without storing it.

## Working practice (subordinate to current rules)

- Keep screens under about 200 lines; move logic into `src/`.
- Run the type checker and the tests before saying a task is done, and report the result.
- Write down anything faked, skipped or changed from the brief in `NOTES.md`.
- Follow the current implementation plan, with reply-to-self and personal place recording included in scope. The old must/should ordering does not defer them.
