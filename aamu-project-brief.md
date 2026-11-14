# Aamu — project build brief

**Status: older draft, partially reconciled through U21 on 14 November 2026.** Read `AGENTS.md`, `aamu-discovery.md` and `aamu-implementation-plan.md` first. They and the user's latest answers govern this file. Sections marked **UPDATED** record reconciled scope; other material is retained as **LEGACY reference**, not permission to implement its defaults. Unanswered product behavior remains open. Exact answer sources include `requirements/answers/u14.md` through `requirements/answers/u21.md`; U16's credential is deliberately omitted. U17 expressly authorizes bounded Decisions integration. Its access probe succeeded, but this is not evidence that route integration or the full app has passed testing.

**Current build phase:** main Expo implementation starts now using confirmed flows. Do not delay the app for another broad discovery round; ask only about a concrete blocking branch. The current plan/rules remain authoritative, and this draft does not supply missing defaults.

"Aamu" is Finnish for "morning". It is a working name; it appears in one config file so it can be changed.

## 0. How to use this brief

This older brief is a comparison and handover reference. Its two companion drafts are also subordinate to the current rules and decision register:

- `aamu-frontend-rules.md` — rules for all code in `mobile/`
- `aamu-backend-rules.md` — rules for all code in `api/`

Use the current implementation plan and the reconciled scope in section 13. U12 delegates ordinary internal engineering choices within confirmed product, privacy and service boundaries. Folder layouts below are suggestions. Record a reason for every dependency in `NOTES.md`; do not add an SDK that sends data off-device without the user's authorization. A legacy default is not an answer to an open product question.

## 1. What we are building

**An alarm clock that senses how you woke up and answers in your own voice from a good day.**

It is an entry for the Junction 2026 challenge "Beyond the Clinic" (Aalto University). The problem: depression often returns after hospital brain-stimulation treatment (TMS) ends, and there is no good support at home. The challenge asks for a loop: **sense** how someone is doing, **respond** with something that helps, **learn** what works for that person.

Judging is four equal parts: usefulness, ease of use, smart sensing, creativity ("how original and delightful"). The judges are neuroscience researchers. The demo on stage is the product.

## 2. Who it is for

1. **The person at home** after treatment has ended. On a bad day they will not open an app, type, or answer questions. The only thing we can count on is that they turn off an alarm.
2. **The care team**, who want to know who might need a call, without extra work.
3. **A morning partner**: a friend, or an anonymous person in the same situation.

## 3. Legacy design principles (do not override the current decision register)

1. **It is an alarm clock, not a tracker.** No dashboards, charts, scores, streaks, points or badges for the person. Ever.
2. **A bad day asks for nothing extra.** Everything hard (setting goals, recording messages) happens once, on a good day.
3. **The alarm is the sensor.** We measure how the alarm was turned off, not the person's phone use.
4. **Goals bend, they do not break.** A missed day makes tomorrow's step smaller. Nothing is ever lost or reset.
5. **The voice is always the person's own real recording.** No text-to-speech, no voice cloning.
6. **Voice recordings never leave the phone.**
7. **It does not diagnose.** No words like "depressed", "relapse", "symptom" or "risk" in the patient app. The clinic view says "might need a call", nothing stronger.
8. **Help is one tap away** from every screen.

## 4. The loop

| Step | What happens |
|---|---|
| Sense | The alarm records snoozes, how long until the person reacts, how long until they are up, and a short spoken "good morning". |
| Respond | A wake-up of light and sound sized to recent mornings, then one of the person's own recorded messages, with one small step towards one of their goals, sized to this morning. |
| Learn | Confirmed progression and carrySize follow the current decision register. Rest message excludes a recording until manual restoration. The reply-to-self loop, U16 deterministic selection and U17 playback/completion attribution in section 8.3 are included. |

## 5. UPDATED — stack and suggested repository layout

```
/
├── mobile/     Expo (React Native) + TypeScript. Patient app on iOS and Android; iOS first.
├── api/        Laptop Fastify/TypeScript via Cloudflare Quick Tunnel; Aiven PostgreSQL/Valkey in the EU.
├── clinic-web/ Separate web clinic demo; directory name is a suggestion.
├── shared/     Suggested home for the shared local distress-phrase configuration/checker.
├── NOTES.md    Decisions, deviations from this brief, things faked for the demo.
└── README.md   How to run both parts in under five minutes.
```

- **Model discovery first:** the event key is entered server-side as `GEMINI_API_KEY`. Call authenticated ListModels and report the actual returned Gemma and Lyria music models; assume no names or availability. Use a listed Gemma through that same key if possible, preferring the largest available instruction-tuned model as previously requested, selected through `LLM_MODEL`. Use compatibility only if it serves that model, otherwise a native Gemini adapter behind `LLM_*` endpoint/model configuration. Instructions go in the user message, with no system message or JSON mode; validate with zod. Authenticated ListModels succeeded: 64 models on one page, evidenced in `review/provider-models.json`. The selected goal model is `models/gemma-4-31b-it`, configured through the environment, not hard-coded. Listing is verified. A bounded synthetic-goal probe also returned HTTP 200 from the compatible endpoint, with a Zod-validated ladder in 12,983 ms, user-role instructions only and no JSON mode; five parser checks passed under api/scripts. Evidence: `review/provider-generation.json`. This verifies provider/parser capability, not a product goal route, full safety-check integration or the unimplemented end-to-end app. U18 sets a 25-second deadline for the whole Decisions/Gemma sequence, one attempt per stage with no retries, and a 30-second client timeout; this earlier measured Gemma call took about 13 seconds. One synthetic Decisions access test also succeeded in 395 ms with SDK 3.3.0 (review/provider-decisions.json). Lyria listing is verified, but no music generation/quota test or full two-phone demo pass has occurred.
- **Services and demo hosting:** Aiven PostgreSQL and Valkey in EU regions remain confirmed. The approved demo hosting choice is laptop Fastify exposed through Cloudflare Quick Tunnel for public HTTPS/WSS access from cross-network phones. The tunnel has not been started. Keep the laptop/server/tunnel running during the demo. No permanent cloud backend host is selected.
- **Separate clinic web app.** It has its own removable demo mode. Real patient-morning delivery to it is not required; do not silently create that feed.
- **Local alarm decisions and audio.** Real locked/closed-app ringing and real live partner signals are required. Backend persistence beyond the confirmed integrations remains subject to the data decisions.
- **Shared local phrase checker.** Check both goal text and manual steps locally first. A locally matched goal is not POSTed and produces no backend event. Only unmatched goals go to the existing endpoint, which rechecks shared configured phrases before Decisions/Gemma. U17 approves the current phrase content; native Finnish review has not been confirmed, and must not be claimed or invented as a new approval gate. The local phrase check needs no separate checking endpoint. U17 separately authorizes one approval-time hint check for edited non-localOnly steps; private goals are never sent for it. Only approved non-`localOnly` goals are stored through `PUT /goals`; support verdicts/text are not logged, counted or persisted. Private manual overrides are defined in section 9.

**Recorded bounded implementation evidence:** The goal service, injected-auth Fastify routes and framework-independent mobile goal helpers exist. The latest completed suite passed typechecking and 159 tests (104 phrase, five parser, 37 goal/client/route and thirteen suggestions-state cases). A synthetic live Decisions → Gemma → Decisions pipeline completed successfully in 15,574 ms with no retries under the 25-second deadline (review/provider-goal-pipeline.json). This does not establish Expo/native screens, locked ringing, deployed auth, database erasure or two-phone acceptance. U19–U21 alarm/setup/recording/reminder behavior remains specification work; the bounded goal extension has 159 passing local tests, while main Expo implementation is now starting.

## 6. Patient app screens

### 6.1 UPDATED — good-day setup (legacy time estimate not confirmed)

Shown once. Opening line: "You're setting this up for the mornings that are hard. Take your time."

1. **Goals.** The person starts with one goal field and can Add another, up to three. Check the text locally first. A local phrase match follows the support flow without submission; otherwise call `POST /goals/shrink`. Use the confirmed support/fallback behavior and result layout:
   - the exact U19 advisory if the goal is too big or too vague; the older suggested-rewording idea remains a legacy proposal, not a current requirement;
   - a ladder of three editable steps in **Tiny** (up to 2 minutes, doable at home), **Small** (up to 10 minutes), **Full** (up to 30 minutes) order.
   One Approve per goal requires all three non-empty step texts, each at most 60 characters. Preserve inline edits exactly: on Approve of edited non-localOnly steps, save on the phone immediately and make one Decisions hint check, showing hints afterward without regeneration or overriding approval. Never submit localOnly steps. Display a returned sizeHint as one quiet line under its step. Show a calm waiting line with **Write my own steps** available immediately. The server timeout is 25 seconds for the whole Decisions → Gemma → Decisions sequence; the client timeout is 30 seconds. Make one attempt per stage, without retries. Failure/timeout offers **Try again** and **Write my own steps**. A failed final check never returns an unchecked ladder. Fallback shows empty fields with example placeholders. Manual steps use the shared local phrase checker; support-return behavior is defined in the current decision register.
2. **Messages to yourself — U21.** Library labels are **For an easier morning**, **For an in-between morning** and **For a hard morning**. Each morning message is at most 20 seconds; the older 5–30-second duration and prompt copy are superseded. Begin by tap, then offer **Play**, **Record again**, **Save** and **Cancel**. The selected library identifies its morning level; the model does not analyze personal recordings.
3. **Place sound.** Personal place recording is in scope here and in Settings, up to 30 seconds, stored on the phone. It plays during the in-app dawn only; the locked-screen system alarm uses a bundled sound. Skipping this optional setup step uses bundled Sea. U21 recording controls are tap to start, then Play / Record again / Save / Cancel. Additional bundled choices remain subject to discovery.
4. **Alarm time.** One daily time and one persistent on/off switch. No weekday selection, multiple alarms or one-off skip in this build. Re-enable and timezone rules are defined below.
5. **Morning partner.** Real two-phone wake signals are required. Anonymous matching has a visually ready, configurable demo flow and explicit TODO implementation files; real anonymous matching is not required. The real pairing path remains governed by the decision register.
6. **Your people.** Optional safe-person contact setup. The name and number stay on the phone and never go to the server. Any care-team-sharing switch and its meaning remain open; the old promise of a live clinic feed is not active.

Only Goals and Alarm are mandatory. U19 additionally requires connectivity to finish setup. If alarm permission is denied, block setup completion and offer **Open Settings**. No available recordings means the step alone, without authored fallback text. U21’s labels, 20-second maximum and personal recording controls supersede the older message-library proposals. Replies remain capped at 20 seconds and place sound at 30 seconds.

### 6.2 Home

Almost empty by design.

- Next alarm time, large.
- The sunrise (section 8.5).
- After the alarm: today's step in large text with one button, "Done".
- **UPDATED:** On easy mornings, surface the oldest unanswered local note from a medium/hard morning. The person can play it and choose "Answer it" (section 6.5). The dated card sentence is a legacy copy example.
- Small links: "Record a message", "Settings", "Need help now?".

### 6.3 UPDATED — alarm (the centre of the product)

Full screen, usable half asleep with one thumb. Real ringing while locked or closed is required. Normal iOS flow is system alarm → person opens Aamu → dawn/hold/voice/message. Native Stop alone never confirms getting up; an observed Stop without a completed hold finalizes as stopped at the 60-minute mark under U19 below. The system exposes Stop plus Snooze and uses bundled sound. Aamu takes over that occurrence, stopping its native alarm and cancelling its outstanding native snooze. Detailed edge cases remain in the decision register.

**U14 scheduling and off-day re-enable:**

- Before today's scheduled time, switching on restores today's system/in-app alarm at its original time, clears off to pending, and shows “I'm already up” within its agreed window. There is no minimum lead time, including one minute before the alarm.
- After today's scheduled time, today remains off and tomorrow is scheduled. Do not ring, start a hold flow or change today's record beyond `level: "off"`. Show the transient line “Your alarm is back on for tomorrow at {time}.”
- Schedule wall-clock time in the phone's current timezone, following travel; display using its locale and 12/24-hour preference. Reschedule the next alarm on system timezone/clock change.
- Fix `localDate` and UTC offset at first ring or early hold. All midnight rules—late-flow cutoff, `stepDone` becoming null, carrySize update and sun reset—use that morning's recorded timezone/offset. Midday travel does not move an existing record's day boundary.
- Keep one record per localDate. Duplicated/skipped travel dates are unsupported. List that limit and weekday selection as “not built” in `NOTES.md`.

**U16/U17 early hold:** Home shows “I'm already up” from the later of scheduled alarm minus 180 minutes and local midnight on the alarm's calendar day, until the alarm fires; never on the previous day or an off day. Set earlyHoldWindowMinutes: 180 in config. Early completion plays no dawn animation, place sound or composed piece. Go directly to voice, then message, then the step. The sky uses a static tone for current time; the sun fills/rises on the hold, partner_up publishes, and today's native/in-app alarms are cancelled. Store minutesToUp: 0 and snoozeCount: 0. For an early hold, localDate is the alarm's calendar date and minutesBeforeAlarm is floor((scheduledAlarmTime − holdCompletedAt) in minutes), a non-negative integer; it is null otherwise. Nothing further is inferred from the earlier truncated sentence.

**Stage A — ringing.**
- The in-app dawn uses the approved theme and local place sound. Section 8.4 now specifies U14's confirmed durations, classification and hold/snooze transitions.
- Two controls only: **Snooze** (tap) and **I'm up** (press and hold for two seconds).
- Getting-up time runs from the original scheduled alarm to completed in-app hold; count native and in-app snoozes together. The hold lasts two seconds; snooze lasts five minutes. First-touch semantics remain open.
- U19 snooze stops sound and schedules a native ring after the agreed five minutes. Snoozes are unlimited. Keep the sky's agreed freeze/dim/resume behavior; re-rings never extend the classification window.
- The full sequence is available within 60 minutes of first ring. Later that day before recorded local midnight, stopped and no_response both offer silent hold, then Home with Tiny and a hard-morning recording behind a play button. Set upAt and publish partner_up; keep the existing category unchanged, do not rescore or sample voice, and count the step as an offered day for carrySize. A late no_response hold remains no_response.
- Emit partner-up immediately after either normal or late hold, before voice or message actions.

**U19 final no_response/stopped classification:** The fixed window ends 60 minutes after the first ring (60 seconds in fast time), never after a snooze re-ring. no_response means no interaction of any kind within it: no system Stop, system snooze, in-app snooze, Aamu opening or hold. stopped means at least one of those interactions occurred but no hold completed within the window; one snooze or app open is sufficient. Finalize at the 60-minute mark when running, otherwise on next launch from persisted first-ring, stop, snooze and app-open evidence. Backfill every past alarm-enabled day without a record, then sync. U20 clarifies that any observed interaction still means stopped even when system Stop is unavailable. Only when no interaction was observed does the unobservable-Stop fallback record no_response; disclose that observability limitation in NOTES.md. Neither final category converts to the other afterward, including after late confirmation. Remaining native observability/late-flow edge details follow discovery; this rule is not proof of a working native event bridge.

**Stage B — good morning.**
- The normal five-second sample starts automatically with a visible "Skip". Use the current usual-speaking/unavailability rules; late flow bypasses this stage.
- From the recording keep only the agreed measurements, then delete the audio. U21: if the app closes during this five-second sample after the completed hold, mark voiceState failed with zero points and continue to the message on reopening; do not restart the sample.

**Stage C — the message.**
- Use current sensing rules from discovery and the UPDATED step/message/dawn subsections below. The historical sensing formula in section 8.1 remains superseded. U16 resolves selection; U17 resolves playback/count attribution in section 8.3.
- Play the message. Show today's step in large text below as soon as the message starts.
- **Rest message** stops playback without a replacement and excludes the recording until manual restoration.
- **Say something back** is in scope on medium/hard mornings at the message stage. It records a local note of at most 20 seconds, associated with that morning's level. No note/audio is uploaded.
- **Too much today** reduces the step one size per tap; after Tiny, it removes today's step and reminder. Follow the current progression rules for tomorrow.
- U21 personal reply recording begins by tap, then offers Play / Record again / Save / Cancel. “OK” remains legacy copy unless separately confirmed. Step appearance follows U17’s message-start timing.

**Stage D — done.** Return to Home. Do not delay partner-up until this stage: it is sent on completed hold. Any other background synchronization must stay within confirmed data boundaries.

### 6.4 Step check

U21 confirms 18:00 local time and the two answers **Yes** / **Not today**. A step first offered late in the day receives no reminder. The precise late cutoff/equality and additional suppression conditions remain open; removing the step after Tiny already cancels it. The old notification sentence and response copy remain legacy proposals, not approved wording.

### 6.5 UPDATED — answering yourself

On easy Home, show the oldest unanswered local note from a medium/hard morning. Play the note, then "Answer it" records and saves a new message tagged with the original note's morning level. The reply and original audio remain on the phone. U21 applies tap to record, then Play / Record again / Save / Cancel to replies and answers too. Replies are at most 20 seconds; morning messages are at most 20 seconds. Remaining file-deletion and equal-timestamp tie behavior is not invented here. Presenters record their own messages before the demo; demo seeding never creates or imports their personal audio. The gated instrumental exception is defined in section 11.1.

### 6.6 UPDATED — partner scope

- The sunrise, plus one line: "Your morning partner is up" or nothing.
- Retain `partnerQuietDays`. Its display wording and counting edge cases follow the current decisions. Thought sending is out of scope; there is no related action, waiting-thought field, WebSocket event or test requirement.
- No names, no chat, no typing. "Stop being partners" in Settings.
- A partner never receives anything about the other person's goals, levels or steps.
- **U13 real pairing, U22 lifetime:** `POST /partner/match` with `mode: "code"` and no code creates a code; supplying a code joins that pair. Codes stay valid until used, with no time-based expiration, and are consumed on redemption. Persist the link across server/app restart and reinstall when the same user token is restored. This is not a promise of automatic token recovery.
- Use public HTTPS/WSS across different networks, not a LAN-only service. Reconnect WebSocket with backoff; while foreground and paired, poll `GET /partner` every five seconds and refresh on foreground entry. The first positive up observation updates the sun; duplicate observations do not replay its animation. Provide **Partner gets up now** as a demo fallback.

### 6.7 Help

"Need help now?" opens a screen with the emergency number and a crisis line, each a tap-to-call button. Numbers live in one config file. **Check the numbers before the demo.**

### 6.8 UPDATED — Settings scope

Personal place recording (up to 30 seconds) is available in Settings as well as setup step 3. Rested messages can be manually restored through the eventual agreed library UI. Alarm time, goals/steps, library play/delete, partner, care-team switch and the hidden demo gesture are retained legacy Settings proposals whose unsettled details remain in discovery.

## 7. UPDATED scope / LEGACY layout — separate clinic web demo

Use a separate web directory and its own removable demo mode, not a mobile Expo `/clinic` route. A real patient-morning feed is not required. The list layout and authentication below are legacy proposals, not settled requirements.

**U14 clinic classification:** off remains a neutral dot excluded from seven-/14-day counts and averages. Any recorded level other than off is observed; a day with no record is not observed.

- Add status `insufficient`, labelled **Not enough recent mornings**, when the last seven days contain fewer than three observations. Never return steady in that case or reuse a previous status as the current one. This supersedes the old unchanged-status implication for an all-off window.
- Persist the last classified status and date, and state the previous result as a fact in the reason. Exact templates: “Alarm off for N days. Last status: X, D days ago.”; “No mornings recorded in the last 7 days. Last status: X, D days ago.”; and, with no previous status, “Started D days ago. N mornings recorded.”
- Sort `might_need_call`, `drifting`, `insufficient`, `steady`; within insufficient, longest time since last observed morning first.
- With at least three observations in the last seven days but fewer than five in the preceding 14, skip earlier-average comparisons and apply count-based rules only. If none fire, return steady with “limited history” appended. Put thresholds 3 and 5 in config.
- Retain the off-day reason annotation where applicable without overriding insufficient classification. These are rules for the separate clinic demo, not authorization for a real patient feed.

One page. A code field, then a single list titled **"Who might need a call"**.

- One row per patient who has switched sharing on: a short ID, a status (**Might need a call**, **Drifting**, **Not enough recent mornings**, **Steady**), one sentence of reason ("4 hard mornings and 2 with no response in the last 7 days"), and the last 14 mornings as small dots.
- Sorted so the people who most need a call are first.
- No other pages, filters, graphs or settings.
- Footer: "Based on alarm behaviour only. Not a diagnosis."

The dots are the only visualisation in the product, and only the care team sees them.

## 8. Core logic — UPDATED subsections plus historical sensing reference

Current sensing/baselines/rotation/progression remain governed by `aamu-discovery.md` and `aamu-acceptance-tests.md`. Section 8.1 is explicitly historical and must not be implemented; subsections marked UPDATED below contain the later user-confirmed decisions.

**Confirmed U13/U14 overrides:**

- Add `off` to app/API/clinic level enums alongside `easy`, `medium`, `hard`, `no_response` and `stopped`. It means deliberately disabling an alarm before it fires. Offer no step, do not advance goal rotation or emit partner-up, and do not count it as a partner quiet day. Exclude it from sensing baselines and usual-speaking history.
- Carry step size across missed days: each no-offer `no_response` or stopped day reduces it by one rung to a Tiny floor; an off day preserves it. U19's late hold can make a no_response day an offered day without changing its category. Apply offered-day progression in that case; do not reinterpret unknown completion of an offered step as a missed/no-offer day.
- The rolling usual-speaking denominator includes `spoke`, `silent` and `skipped`; its numerator includes only `spoke`. Keep the fixed voice baseline restricted to valid `spoke` measurements. Off/unavailable/failed/late-flow days do not enter usual-speaking history.
- **U14 resolves voice scoring:** valid silent uses the same gate as skipped: +1 only when the rolling window has at least five eligible mornings and the person usually speaks, otherwise zero. Remove any unconditional point for null speech onset. For spoke, delayed-onset/quiet-speech comparisons remain unchanged against fixed baselines and run only once the relevant baseline has at least five valid recordings. Cap the entire voice term at one point. Five spoke plus nine silent therefore makes a further silent or Skip zero.

All thresholds live in one config file per side. They are starting values chosen by the team, **not clinically validated**.

### UPDATED U20 — baseline ordering and timing floor

Score today using baselines from previous qualifying mornings only, then append today to the qualifying history afterward. The fifth qualifying morning still uses defaults; the sixth is the first to use the five-morning median. Keep the already confirmed qualification, separate voice-baseline and freezing rules; do not let today's measurements influence today's score.

For timing comparisons only, use max(1 minute, stored timing baseline). Keep the stored median unchanged, including a true median of zero after early holds. Do not apply this floor to snooze or speech baselines. Required checks cover fifth/sixth ordering, current-measurement exclusion and a zero stored timing baseline producing a one-minute effective comparison baseline while remaining zero in storage. This is confirmed sensing behavior, not evidence of an implemented native/sensing pipeline.

### 8.1 LEGACY morning-level formula — superseded, do not implement

Inputs for one morning: `snoozeCount`, `minutesToUp` (ringing started → "I'm up"), `voiceSkipped`, `speechShare` (share of the 5-second recording that is louder than the room; 0–1).

Baseline: the median of the person's previous 14 mornings. Until there are 5 mornings, use `snoozeCount = 1`, `minutesToUp = 10`, `speechShare = 0.5`.

```
points = 0
snoozeCount >= baseline + 2          → +2   (else >= baseline + 1 → +1)
minutesToUp >= max(10, 2 × baseline) → +2   (else >= 1.5 × baseline → +1)
voiceSkipped, or speechShare <= 0.6 × baseline → +1

0–1 points → easy      2–3 → medium      4–5 → hard
no response within 60 minutes → no_response
```

### 8.2 UPDATED U16 — initial carry and today's step

carrySize starts at small before the first offered step. First morning easy/medium offers Small; hard offers Tiny; never Full on the first day. After the first offered step, use the existing confirmed final-size/outcome progression and current-morning cap. Done Small on day one makes carrySize full. Deleting every goal and later adding new ones preserves carrySize; reset it to small only when the app's data is reset. Goal rotation, removal, unknown completion and no-offer/off-day carry rules remain as already confirmed in discovery.

### 8.3 UPDATED U16–U18 — deterministic message selection and learning

1. Eligible messages are not blocked and were recorded for the morning's level.
2. If empty, fall back only toward gentler levels: easy → medium → hard; medium → hard; hard → none. Never choose a brighter level. If none is eligible, show the step without audio.
3. Remove yesterday's played message only when at least one other remains.
4. Prefer candidates with timesPlayed === 0.
5. Otherwise choose highest (timesFollowedByDoneStep + 1) / (timesPlayed + 2).

Resolve ties by earliest lastPlayedAt (never-played first), then earliest createdAt, then lowest id. The default path has no randomness. If the Thompson sampling stretch is later built, it replaces step 5 only and uses a seeded generator in tests; steps 1–4 and tie order remain unchanged. This conditional rule is not permission to start that stretch now.

U17/U18 attribution is local: timesPlayed increments once per message per local day when audible playback reaches three seconds, or the end when shorter. Replays that day add nothing; Settings playback never counts. A message paused after the threshold still counts. Show the step as soon as the message starts. Only that morning's selected message can earn completion credit: increment timesFollowedByDoneStep when stepDone becomes true that local day, and decrement if Done is undone. A rested message earns no play and no credit. If Rest follows today's selected message's play/credit, remove today's play and credit only; preserve older history. These rules do not authorize uploading message-learning data.

Required checks: brighter fallback never chosen; hard with only easy messages gives no audio; two unplayed resolve by createdAt; equal scores resolve by lastPlayedAt.

### 8.4 UPDATED U14 — the wake-up

Foreground in-app ringing, including Ring now, uses the last three observed mornings within the past 14 days, skipping off. Easy maps to light; medium to middle; hard/stopped/no_response to heavy. At least two heavy gives 6 minutes with lower starting volume; at least two light gives 2 minutes; otherwise 4 minutes. Fewer than three observations in the window also gives 4 minutes. Fast-time equivalents are 10/15/20 seconds. Opening Aamu after a system alarm uses a separate 20-second landing dawn.

A completed hold advances immediately to voice. Compress the remaining sky animation into about three seconds, without a jump/freeze; fill and raise the sun on the hold. Fade place sound out over about two seconds before any message plays. Snooze holds the current sky position and dims it slightly; the next ring resumes there. Durations and thresholds live in config.

### 8.5 UPDATED — the sunrise

With no partner, use a whole sun. It indicates confirmed getting up; the sky independently follows dawn progress/time passing. Do not light a confirmed-wake sun from native Stop alone. Paired geometry and pair/unpair transitions remain open; the old permanently unlit unpaired half is superseded.

### 8.6 UPDATED U16 — clinic calculation below the insufficient gate

First apply U14's insufficient-history gate. Recent window is the seven most recent calendar days, including today only if its morning has a final level. Comparison is the 14 calendar days before that. Values: easy 0, medium 1, hard 2, stopped 2 with or without a late hold, no_response 3. Exclude off and absent records; averages use observed days only.

Evaluate in order:

- might_need_call if any: recent no_response count ≥3; recent hard + stopped + no_response count ≥5; recent average minus comparison average ≥1.0.
- Otherwise drifting if any: recent hard + stopped count ≥3; average difference ≥0.5; stepDone === true on ≤2 of the recent seven days and ≥4 of the seven days before.
- Otherwise steady. Skip both average comparisons if comparison has fewer than five observed days, retaining U14's limited-history reason behavior. stopped never counts toward the no_response ≥3 trigger. Keep all thresholds in config.

Reasons list every rule that fired. U17 resolves stopped wording: with upAt set, “alarm stopped; getting up confirmed later”; without upAt, “alarm stopped but getting up not confirmed”. Count these two cases separately in the reason. Both retain value 2 and both count in hard/stopped rules.

U20 approves the late-confirmed no_response wording “no response in the first hour; getting up confirmed later”. Retain its value 3 and all no_response counts; late confirmation does not change its clinic contribution or category.

Required checks: every trigger at and just below threshold; three stopped → drifting, not might_need_call; five stopped → might_need_call; pending today excluded.

## 9. UPDATED boundaries / LEGACY storage proposals

Personal audio and safe-person name/number stay on the phone, never the server. Real Gemma goal generation and partner signals are required. Store only approved non-localOnly goals through `PUT /goals`; do not persist a model-check input or support verdict. The remaining backend storage and care-team switch behavior below are legacy proposals, not authorization for a real clinic feed. Real code pairing must persist for the same restored user token.

**U14 private manual overrides:** a goal whose latest local/endpoint verdict is needs_support and which the person keeps through **Write my own steps** has `localOnly: true` locally. Its title and three step texts stay on the phone. Exclude the whole goal from PUT, with no title, steps or marker that it exists. Do not require/suggest changing the title or offer consent to transmit it. Morning records use a locally generated opaque goalId, normal stepSize/stepDone and `stepText: null`; no server feature or foreign-key requirement may depend on the goal existing. Rotation, carrySize, local per-goal counts, Home and message behavior treat private goals identically. After a later rewording passes both checks, clear localOnly and include the goal in the next PUT.

**U17 previously synced goal:** if a server-stored goal becomes localOnly, the next PUT /goals removes its title and step texts from the server. The backend also sets stepText to null on all existing morning records with that goalId, retaining the opaque ID, step sizes and outcomes. Do not transmit a private-goal marker or localOnly text to request this cleanup. Private goals never go to Decisions for approval-time hints.

| Data | Phone | Backend |
|---|---|---|
| Voice messages, place sound, notes to self | yes | never |
| "Good morning" recording | deleted after two numbers are taken | never |
| Which messages were played, blocked, followed by a done step | yes | no |
| Approved non-localOnly goals and step ladders | yes | yes, only through approved `PUT /goals` |
| localOnly title/steps/flag | yes | never; no marker or placeholder row |
| Locally matched distress text; support verdicts/flags/counters | local support flow only | never persisted/logged/counted; locally matched goals are not POSTed |
| Morning records (times, snoozes, level, step size, done) | yes | yes |
| Partner link and "up today" signal | — | yes |
| Care-team sharing switch | yes | yes |

The phone-only safe-person name/number is an explicit exception to the older no-names rule. No such contact data reaches the backend. Anonymous identity/token details remain a legacy proposal pending the current data decisions.

## 10. UPDATED feature scope / PROPOSED API contract

This table removes deferred thought sending and real anonymous matching. Exact remaining payload fields are engineering proposals until reconciled with the current data/state decisions; preserve separate wake confirmation and nullable step outcome. The confirmed app/API/clinic level union is `easy | medium | hard | no_response | stopped | off`. Reply notes and place recordings are local features with no upload routes. Both goals and manual steps receive the shared local phrase precheck; it has no separate check-steps API. U17 separately authorizes an approval-time Decisions hint operation for edited non-localOnly steps; its route name and wire shape are delegated engineering details.

JSON requests over HTTPS; ordinary responses are JSON. U15's gated compose route below may return provider-generated audio only after its gates pass. Every route except `POST /users`, `GET /health` and the clinic route needs `Authorization: Bearer <token>`.

| Route | Body → Response |
|---|---|
| `POST /users` | `{}` → `{userId, token}` |
| `POST /goals/shrink` | Only locally unmatched `{goalText}` → goal verdict, ladder `{tiny, small, full}` or null, per-step sizeHint when applicable, and source identifying Decisions versus Gemma-verdict fallback. Shared server phrase check → Decisions goal assessment → Gemma ladder only → Decisions step hints, as specified below. Never return distress probability. The old note/reworded/source enum is a legacy shape, not a requirement to generate extra prose. No text/verdict persistence, counters, metrics or logs; operational logs contain only route/status/duration. |
| Approval-time step hints (route name to be chosen in implementation) | Edited, locally checked, non-localOnly goal plus three steps → one Decisions step assessment for hints only. Save on the phone immediately and show hints afterward. Never send a localOnly goal or regenerate steps; user edits/approval win. Safety-block HTTP 400 triggers Help and localOnly. This does not add a remote phrase-check operation. |
| `PUT /goals` | Approved non-localOnly goals only: `{goals: [{id, text, steps: {tiny, small, full}}]}` → `{ok}`. Omit private goals entirely with no marker. When a previously synced goal becomes localOnly, this next PUT removes its remote title/steps and nulls stepText on every existing morning with its goalId, retaining IDs/sizes/outcomes. Include a formerly private goal again only after a clean rewording passes both checks. |
| `GET /goals` | → `{goals: [...]}` |
| `PUT /mornings/:localDate` | Level union includes easy/medium/hard/no_response/stopped/off. Add optional `utcOffsetMinutes`, nullable `stepText`, and minutesBeforeAlarm: non-negative floored minutes only for early holds, null otherwise. Keep `stepDone` true/false/null and wake confirmation separate. An early hold uses the alarm's calendar date. A private-goal record sends opaque local `goalId`, stepSize, stepDone and `stepText: null`; accept an ID absent from server goals. Other payload fields follow current contract decisions. |
| `PATCH /mornings/:localDate/step` | `{done: boolean}` → `{ok}` |
| `POST /partner/match` | Confirmed real code flow: `{mode: "code"}` creates a code; `{mode: "code", code}` joins. U22: code remains valid until used, then consumed with no reuse. Persist pairing for the same user token across restart/reinstall. Exact response/code format remain separate from this lifetime decision; anonymous matching is a demo provider/TODO. |
| `GET /partner` | → `{paired, partnerUpToday, partnerQuietDays}`. Foreground paired polling every 5 seconds plus foreground-entry refresh; off days do not count as quiet days. |
| `DELETE /partner` | → `{ok}` |
| `PUT /sharing` | `{clinic: boolean}` → `{ok}` |
| Clinic list provider | Separate demo. Levels include neutral-dot off; statuses are might_need_call/drifting/insufficient/steady. Preserve last classified status/date for reasons and apply U14 observation gates/sorting. Legacy `GET /clinic/patients`/code gate remain proposals. |
| `GET /live?token=` | Authenticated public WSS transport; reconnect with backoff. Server sends `{type: "partner_up"}`; no thought event. First positive observation updates once; polling/WS duplicates do not replay animation. Exact auth transport remains an engineering detail within the token boundary. |
| `GET /health` | → `{ok, db, valkey}` |
| **GATED, not implemented:** `POST /dawn/compose` | After the full two-phone demo passes and Lyria is available: JSON `{place: "sea" \| "forest", tier: "light" \| "middle" \| "heavy", seconds}` → stream provider-generated audio without server storage. Fixed prompts only; no personal text/ID/goals/levels, no audio input. |
| `POST /demo/seed`, `POST /demo/reset` | only when `DEMO_MODE=true` |

`verdict: "needs_support"` enters the confirmed support-return flow: first detection opens Help without a ladder; Back to my goal preserves the editable text and offers Check again / Write my own steps. Repeated flags stay inline. Manual steps use the shared local checker and matching text is not saved. Follow discovery for exact copy and privacy; this verdict does not authorize storing a support flag.

`localDate` is the phone's local date at first ring or early hold, fixed thereafter. Store its UTC offset in minutes; `utcOffsetMinutes` is optional in the API. Use that morning's recorded timezone/offset for midnight rules even after travel. Event timestamps remain ISO 8601 UTC. One record per localDate; duplicated/skipped travel dates are unsupported in this build.

### 10.1 UPDATED U17/U18 — Gemma writes, Decisions judges

The user expressly authorizes bounded implementation of Gemini Decision 1 with `@google/genai` SDK 3.2+, `apiVersion: "v1beta"`, `ai.decisions.create`, model `gemini-decision-1`, and the same server-only GEMINI_API_KEY. Read the [official Decisions documentation](https://aistudio.google.com/docs/decisions-api.md) before implementation. The required first access test succeeded: one synthetic call using SDK 3.3.0 returned a validated response in 395 ms (review/provider-decisions.json). This is access/latency evidence, not a claim that product-route or device integration passes.

For POST /goals/shrink:

1. Repeat the shared phrase check before any provider call.
2. Make one Decisions call on goal text with a noul distress question and a choice question with described `ok`, `too_big`, `too_vague` choices. Explicit true criteria are wanting to die or intending to end one's life or harm oneself; false means those criteria are absent. Each question is a full sentence with positive phrasing and one decision. Treat choice confidence below 0.6 as ok.
3. If distress probability is at least configurable distressThreshold (initially 0.3), or the API returns HTTP 400 with code safety, prohibited_content, blocklist or content_blocked, return needs_support without calling Gemma.
4. Otherwise call Gemma for the ladder only. A confident too_big/too_vague result shows the ladder with the exact U19 advisory below.
5. Make one Decisions call on the goal plus three steps. For each step, ask a duration score question with ordered levels “Under 2 minutes, at home”, “2 to 10 minutes”, “10 to 30 minutes”, “More than 30 minutes”, plus the noul question “Is this one concrete action that another person could see being done?”
6. Return a per-step sizeHint if the most probable duration level exceeds the slot (Tiny >0, Small >1, Full >2), or concrete-action probability is below 0.5. Use the most probable level, not the score's probability-weighted mean. Do not auto-regenerate. Show the hint as one quiet line under that step; the person's edit and approval win.

On Approve of edited steps for a non-localOnly goal, save on the phone immediately and run step 5 once for hints shown afterward. LocalOnly goals/steps are never sent. If Decisions is unavailable before generation, fall back to the current Gemma verdict path and mark source. If the final Decisions call fails after Gemma returns a ladder, show failure/manual steps; never return an unchecked ladder or call Gemma again. A safety-block HTTP 400 during duration/concreteness checking triggers Help and localOnly, including the private-goal cleanup rules when applicable. U18 sets the server's 25-second deadline for the **whole Decisions → Gemma → Decisions sequence**, with one attempt per stage and no retry. Client timeout remains 30 seconds.

Never store, log, display or expose distress probability. Existing support-text/verdict/metric prohibitions remain. Only the demo-only **Under the hood** view may show step-duration probabilities and goal verdict; it never shows distress probability. Add labelled example-goal fixtures to evaluate thresholds and tests for safety-error handling, a mis-sized Tiny step and fallback. These are implementation/test requirements, not completed-test claims.

Check ListModels for a smaller Gemma. If one returns acceptable ladders in under five seconds, propose switching LLM_MODEL and present three sample ladders from each model. Keep the selected 31B model until that comparison and user decision; its earlier 12,983 ms probe is one observation, not the new timeout budget.

### 10.2 UPDATED U19 — exact goal copy and manual choice while loading

- Waiting: “Finding a small place to start…”
- Failure: “We couldn’t suggest steps this time.”
- too_big: “This is a big goal. These steps are a place to start.”
- too_vague: “These steps make a starting point. Edit them to fit you.”
- Duration hint: “This may take more than {2/10/30} minutes.” Use the slot's 2, 10 or 30 minutes.
- Concreteness hint: “Try one action someone could see you do.”
- If both hints apply, combine them into one quiet line under the step.

Choosing **Write my own steps** while suggestions load keeps the existing request running. U20 approves a separate **Suggestions are ready** notice with **View**, followed by **Use these steps** and **Keep mine**. U21 confirms “Replace the steps you wrote?” with **Replace** / **Keep mine** when manual text exists. Use these steps replaces editable fields only and still requires **Approve**. Nothing replaces or approves manual text automatically, and starting manual entry does not cancel the request. If the person approves manual steps while the original goal check is pending, save locally immediately and defer remote saving until that check finishes. A later needs_support opens Help, makes the goal localOnly and removes any previously synced text through the agreed redaction flow, including historical morning stepText. U21 resolves original-request failure/timeout: keep the manual approval and sync it normally once no approved non-private goal awaits its original-goal or hint check. During pending checks, defer all replacement PUT /goals snapshots, including other-goal saves; omitting only the pending goal would incorrectly delete an existing remote copy. needs_support remains the separate Help/localOnly/redaction case. Existing timeout/one-attempt rules still apply.

## 11. UPDATED scope / LEGACY demo-control proposals

Demo mode must be easy to remove. Anonymous matching is a configurable visual demo with TODO implementation files. Callback requests may be labelled simulations in demo mode; outside demo the control works or is hidden. The separate clinic app has its own demo mode. No personal audio is seeded: presenters record messages/place sounds beforehand. U15 permits pre-generated instrumental dawn pieces only after its two gates. The exact controls/timings below are retained legacy proposals.

**U13 required fallback:** include **Partner gets up now** for demo recovery, while real public-network code pairing/signaling remains required.

The stage demo cannot wait for real mornings. Demo controls (Settings, long press on the version number):

- **Ring now.**
- **Fast time:** dawn is confirmed at 10/15/20 seconds for normal 2/4/6-minute foreground dawn. System-alarm landing remains a separate 20 seconds. U19 makes the 60-minute interaction-classification window 60 seconds. Other legacy fast timers—five-second snooze and 20-second step check—remain proposals unless separately confirmed.
- **Load history:** fills this phone with six weeks of mornings so baselines and learning have data. Three choices: steady, drifting, recovering.
- **Reset.**

`POST /demo/seed` creates eight made-up patients with six weeks of mornings in different patterns, for the clinic list.

Anything simulated is marked as simulated in `NOTES.md`. Use the team's own voices and made-up data only. No real patient data.

A real alarm that rings while locked or closed is required. Foreground-only behavior or a notification that merely opens the app does not satisfy that requirement. Validate the approved system-to-app flow on the physical iOS devices.

## 11.1 GATED U15 stretch — composed dawn

This adds an optional stretch item; it does not replace or delay the core demo. Do not implement/register its route until **the full core demo script passes on two phones** and **a Lyria music model is available on the event key**. Authenticated ListModels has now returned Lyria models (see `review/provider-models.json`), but no Lyria generation/quota test has run and the full two-phone demo has not passed. The core-demo gate is still closed: do not implement this route. If generation availability later proves absent, do not build it and report the result.

After both gates:

- POST /dawn/compose accepts JSON {place: sea|forest, tier: light|middle|heavy, seconds}. The server creates prompts from fixed templates: instrumental, no vocals, no sudden changes, begins near silence and rises; heavy is slower/sparser.
- Send no user ID, goals, morning levels or personal text to the music model. Call Lyria through Gemini API and stream the result back without storing it on the server.
- This is an explicit output-only audio exception. Accept no audio/file uploads, and keep all user recordings phone-only.
- After a morning flow, the phone requests tomorrow's piece in background and caches it. Play it under place sound during the in-app dawn; never make this call in the alarm path. Missing cache leaves the existing dawn exactly unchanged.
- Not this sound discards the piece and falls back to place sound. Pre-generate pieces for the demo phones before presentation only after both gates. This does not generate/seed the person's voice or personal place recordings.

## 12. UPDATED visual authority / LEGACY remaining copy proposals

- **Mood:** calm, warm, quiet. Like a bedside object, not software.
- **Palette:** use the fresh named colors in `src/theme.ts`, not source-reference colors. The authorized visual review lives in `review/`; it is not native-app verification.
- **Confirmed style:** Plus Jakarta Sans; light clock, regular/medium other text, minimum 16. Full-width word-labelled pills; dark layered large-radius surfaces, soft glow without drop shadows; sparse spacing and lower-half controls. The landscape uses the same theme tokens. Text contrast remains at least 4.5:1 throughout dawn.
- **U13:** this reference mix is final; no further visual references are expected.
- **Type:** one typeface, large. Step text at least 28 pt. Nothing smaller than 16 pt.
- **Controls:** at least 64 pt tall on the alarm screen, in the lower half, reachable with one thumb.
- **Motion:** slow fades only. Nothing bounces or flashes.
- **Colour meaning:** never red or green for anything about the person.
- **Words:** short, kind, plain. No exclamation marks. Never "fail", "missed", "streak", "should", "only", "just try". A step not done is "Not today."

## 13. UPDATED — scope-aligned build order

This is a dependency outline, subordinate to the current implementation plan. Resolve remaining product dependencies before their implementation; do not treat this order as permission to guess.

1. Prove locked/closed-app ringing and the approved native-to-app handoff on iOS early; establish Expo/TypeScript foundations and local storage.
2. Establish Fastify, Aiven PostgreSQL/Valkey in the EU and real Gemma through configured Google adapters. Laptop Fastify plus Cloudflare Quick Tunnel is the approved demo choice; the tunnel is not started and no cloud backend host is selected. Folder organization is delegated.
3. Build setup with actual editable ladders and approved shared local phrase checking. U17 expressly authorizes the bounded Decisions access probe and goal/step integration in section 10.1: Gemma writes, Decisions judges, private steps remain local, hints are advisory, and fallback/source and timeout rules are explicit. Compare a listed smaller Gemma only as requested; do not silently switch. Include U21’s labelled 20-second morning-message libraries and tap / Play / Record again / Save / Cancel recording flow, personal place recording (up to 30 seconds), alarm and optional people/partner steps.
4. Build the single daily-time/on-off schedule, off re-enable and recorded-timezone midnight rules; normal/late/early paths, U14 dawn/voice rules and required sensing/progression checks. Weekday selection, multi-alarm and one-off skip are outside this build.
5. **Include the reply loop:** medium/hard Stage C "Say something back" saves a local note up to 20 seconds; easy Home offers the oldest unanswered note and "Answer it" saves a message for the originating level.
6. **Include personal place recording in Settings** as well as setup step 3. It plays only in the in-app dawn; locked ringing stays bundled. Presenter audio is recorded beforehand, never seeded.
7. Connect persistent real code pairing and hold-triggered wake events across public networks, with WS backoff, foreground five-second polling/refresh and duplicate-animation suppression. Retain quiet-day data but exclude off days and thought sending; include the demo up-now fallback.
8. Build Home/Help and U21’s 18:00-local completion reminder with Yes / Not today, excluding late-offered steps. Clarify the strict late cutoff and remaining suppression/copy before those branches.
9. Add removable configurable demo scenarios, visually ready anonymous-match TODO flow, labelled callback simulation and a separate seeded clinic web app. No real clinic-morning feed or real anonymous matcher is required.
10. Verify physical-device/demo behavior and U14's localOnly/API constraints. Add U16 checks: each clinic trigger at/below threshold, three/five stopped, pending today excluded; initial easy/medium Small and hard Tiny, done Small producing full carry; and the four deterministic message cases in section 8.3. These checks are specified, not executed. The earlier U14 set remains required:

- Voice: silent n=4 → 0; usual speaker → 1; usual skipper → 0; spoke triggering delayed and quiet → 1, not 2.
- Re-enable: before time restores today/pending, including one minute before; after time keeps off and schedules tomorrow with no ring/hold/additional record changes.
- Clinic: brand new, all-off week, all-off 21 days, two observations, three with thin comparison history, previous status/date in reason.
- Time: reschedule after timezone change, fixed localDate through midday change, midnight rules use recorded offset.
- Dawn: every classification row, off skipped, insufficient history, a 15-day gap and hold at 10% with immediate transition/compressed sky/audio fade.
- Privacy: localOnly excluded from PUT, morning stepText null with opaque unresolved goalId, mixed-goal rotation, and clearing localOnly after clean recheck.
- U17 early hold: 07:15 opens at 04:15; 02:00 opens at midnight, never the preceding 23:00; a 00:30 hold for 02:00 stores minutesBeforeAlarm 90 and the alarm's localDate. Non-early records use null.
- U17 clinic/private goals: both stopped upAt branches have exact wording and separate counts with unchanged numeric treatment; a previously synced goal becoming localOnly loses remote title/steps and all matching historical morning stepText at the next PUT while IDs/sizes/outcomes remain.
- U17/U18 message learning: audible three-second/short-end threshold, once per message/local day, same-day replay and Settings exclusion, pause after threshold, selected-message-only credit and undo decrement; Rest removes today's play/credit while preserving older history; step appears at message start.
- U17/U18 goal flow: immediately available manual steps, 25-second whole-sequence deadline/client30 with one attempt per stage and no retries, safety-error path without Gemma, low-confidence choice as ok, confident too_big/too_vague with advisory, mis-sized Tiny/concrete-action hints, no regeneration, edited approval saved immediately with later hints/localOnly excluded, source-marked pre-generation fallback, final-check failure without unchecked ladder, post-check safety to Help/localOnly and no distress-probability exposure. Add labelled threshold fixtures; preserve actual test evidence separately.
- U19 classification: untouched alarm → no_response; one system snooze then nothing → stopped; app opened/closed → stopped; backfill three missing alarm-enabled days on next launch; late no_response hold preserves category, sets upAt, emits partner_up and offers Tiny. Verify first-ring anchoring, fast60 seconds and the documented unobservable-Stop limitation.
- U19 setup/snooze/goal flow: connectivity required to finish; denied alarm permission blocks completion with Open Settings; snooze mutes and schedules the native five-minute ring without a count limit; exact goal copy and combined hints; manual choice keeps the existing request running and offers its result separately without overwriting edits. U20 confirms Suggestions are ready → View → Use these steps / Keep mine, one confirmation before replacing existing manual text, local approval with remote saving deferred until the original check finishes, and late needs_support → Help/localOnly/redaction.
- U20: any observed interaction yields stopped even when native Stop is unobservable; late-confirmed no_response uses the exact approved clinic wording while retaining value 3/all counts. Score before appending today: fifth qualifying morning uses defaults, sixth uses the five-morning median; timing comparison floor is one minute without changing the stored median. Verify separate results never overwrite automatically and no remote manual save occurs while the original check remains pending.

Record the weekday/travel limits in the root-owned `NOTES.md`.

**Gated stretch after the core passes:** U15 composed dawn, only after the full two-phone script passes and authenticated discovery establishes Lyria availability. No route implementation before the gate.

**Deferred/excluded in this scope:** thought sending and its UI/API/events/tests. **Legacy stretch ideas, not authorized scope:** camera pulse, first-hour step tracking and Finnish translation unless separately confirmed.

- U21 derived checks: original-check failure/timeout retains manual approval and releases its sync deferral; all replacement snapshots wait for any approved non-private goal’s remaining original-goal or hint check. Use these steps changes the draft only and requires Approve, with exact replacement confirmation. Verify personal recording controls/limits and closed-mid-sample failed/zero → message; reminder cutoff/suppression cases remain pending clarification. No new audio/native implementation or test pass is claimed.

## 14. UPDATED exclusions / LEGACY remaining exclusions

Confirmed scope excludes thought sending, real anonymous-match implementation and seeded personal audio. Only U15's gated provider-generated instrumental output is allowed as a separate exception; uploads remain prohibited. Real clinic-morning delivery is not required. Real locked/closed-app ringing is required, so the former background-alarm exclusion is superseded.

This build also excludes weekday selection, multiple alarms, one-off skip and handling duplicated/skipped travel dates. It uses one daily time with a persistent on/off switch.

Other legacy exclusions retained for reconciliation: accounts/passwords, chat, a language model talking to the person, uploading audio, text-to-speech, mood questionnaires, patient charts, push notification servers and app-store distribution. Follow the current decision register for their approved boundaries.

## 15. LEGACY acceptance script — candidate only

Use the current agreed acceptance checks rather than treating this old script as final. Both physical demo phones are iOS. Required real ringing, local reply/place features, immediate hold-triggered partner-up and removable simulations need verification. The clinic is a separate web demo, not the mobile `/clinic` route.

This sequence works twice in a row on two real phones and one laptop, with no restarts:

1. Phone A rings. The presenter snoozes twice, then holds "I'm up". The dawn was slow; the message is the gentle one in the presenter's own voice; the step shown is the tiny one.
2. Phone B rings and is dismissed at once. A different message plays; the step is the full one.
3. As phone B is dismissed, the right half of the sunrise on phone A lights up.
4. On the laptop, `/clinic` shows the list with the right people at the top and a plain reason for each.
5. Nowhere on either phone is there a chart, score or streak.

## 16. LEGACY sponsor framing / confirmed technology boundary

- **Gemma** — authenticated ListModels returned `models/gemma-4-31b-it`; that 31B model is selected in environment configuration. Listing and one synthetic-ladder capability are verified by `review/provider-generation.json`: compatible HTTP 200, Zod validation, 12,983 ms and five passing parser checks. This is standalone provider evidence, not proof of the product endpoint or full app. U18 sets a 25-second whole-sequence server deadline, one attempt per stage without retries, and a 30-second client timeout. U17 authorizes Decisions judging; its access probe succeeded in 395 ms (review/provider-decisions.json). Local phrase matches never leave the phone; unmatched goal text goes to the configured hosted service after the local check.
- **Aiven PostgreSQL and Valkey in the EU** — confirmed by U13. The backend hosting provider and remaining persistence details remain separate decisions.
- **Codex** — used to build it.
