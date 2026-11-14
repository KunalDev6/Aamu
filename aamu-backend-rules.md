# Aamu — backend rules

**Status: older draft, partially reconciled through U21 on 14 November 2026.** `AGENTS.md`, `aamu-discovery.md`, the user's latest answers and the current implementation plan govern. Exact U17–U21 answers are in `requirements/answers/`. The project brief is another partially reconciled draft. Sections marked LEGACY retain proposals for comparison; they do not silently settle open behavior, contracts or service providers. U17 expressly authorizes bounded Decisions implementation; access-probe evidence is not proof of product-route or device integration.

**Current build phase:** main Expo implementation starts now using confirmed flows. Do not delay the app for another broad discovery round; ask only about a concrete blocking branch. The current plan/rules remain authoritative, and this draft does not supply missing defaults.

## UPDATED — scope and engineering authority

- Fastify/TypeScript, Aiven PostgreSQL and Valkey in EU regions are confirmed. Gemma uses Google AI Studio/Gemini API. The approved demo hosting choice is laptop Fastify plus Cloudflare Quick Tunnel for public HTTPS/WSS. The tunnel has not started; no permanent cloud backend host is selected. The laptop/server/tunnel must stay running during the demo. Aiven EU data services remain agreed. Internal engineering/folder organization is delegated within confirmed boundaries.
- Record a reason for every dependency in `NOTES.md`. Do not introduce an SDK that sends data off-device without user authorization.
- Real Gemma goal generation and real partner wake-up signaling are required. Real anonymous matching and a live patient-morning feed to the separate clinic web demo are not required.
- Remove thought sending from the backend: no thought route, waiting-thought field, WebSocket event, table or associated test. Retain `partnerQuietDays`.
- Replies, self-notes and personal place recordings remain phone-only. U21 caps morning messages at 20 seconds; replies remain at most 20 seconds and personal place audio at most 30 seconds. Personal recordings use tap to start, then Play / Record again / Save / Cancel locally; none of these controls adds a backend endpoint. These personal-audio features require no upload route; presenters record them beforehand. The separately gated U15 composed-dawn audio output is the only new exception, never an upload path.
- Use a shared local distress-phrase configuration/checker for both goal text and manual steps. Locally matched goals are not POSTed and produce no backend event. The existing endpoint receives only locally unmatched goals and rechecks configured phrases before Decisions/Gemma. The shared phrase check needs no separate endpoint; U17 separately authorizes the approval-time hint operation for edited non-localOnly steps. The current phrase content is approved by the user. Native Finnish review has not been confirmed; do not claim it occurred or invent a further approval gate.
- Store only approved non-localOnly goals via `PUT /goals`. Neither phrase-list nor model `needs_support` results create persistence, counters, metrics, or text/verdict logs. Operational logs are limited to route/status/duration.
- Use `easy | medium | hard | no_response | stopped | off` consistently in app/API/clinic enum contracts. Off is deliberate pre-fire disablement: no offered step, goal-rotation advance or partner-up; exclude off from baselines/usual speaking and partner quiet-day counts.

## Confirmed stack / LEGACY library and deployment suggestions

- Node.js (current LTS) with TypeScript in strict mode, and Fastify.
- PostgreSQL and Valkey on Aiven in EU regions. Legacy library suggestions: `pg`, plain numbered SQL migrations and a Redis-compatible Valkey client. Local substitutes are engineering tools, not replacements for required real two-phone signaling.
- Request and response validation with `zod` on every route.
- Tests with Vitest.
- Apply the dependency/off-device-SDK rule above to every dependency, including the legacy suggestions here.

## Suggested folder layout

```
api/
├── migrations/
└── src/
    ├── server.ts
    ├── config.ts          Environment variables and all thresholds
    ├── db.ts
    ├── auth.ts
    ├── routes/            Only confirmed groups; legacy optional persistence/sharing routes require reconciliation
    ├── goals/shrink.ts    Core Gemma goal call; composed-dawn work remains gated
    └── live/bus.ts        Valkey or in-process
```

The clinic web demo belongs in a separate directory, not the patient Expo app. A shared module may hold distress-phrase config/checking. Names and internal organization are suggestions, not additional product requirements.

## UPDATED — contract authority

- Section 10 of the brief is a scope-corrected proposed API table. Reconcile exact types against the current decisions before parallel implementation; do not copy its legacy morning payload unchanged.
- If a change to the contract is unavoidable, change the brief in the same commit and note it in `NOTES.md`.
- Errors are always `{error: {code, message}}` with a correct HTTP status. Never return a stack trace.

## LEGACY environment-variable suggestions

`DATABASE_URL`, database TLS certificate configuration, `VALKEY_URL`, `GEMINI_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `DEMO_MODE`, `PORT`. The event key is entered server-side as GEMINI_API_KEY; map it into the chosen adapter rather than requiring a second key. Never expose it to mobile or logs. Keep Gemma endpoint/model/credentials and any adapter selection behind configuration. The public tunnel URL remains a placeholder until the approved Cloudflare Quick Tunnel is started; do not invent a deployment URL. A separate clinic gate and its `CLINIC_CODE` are legacy proposals, not required live-clinic integration.

- Read them in `config.ts` only, and fail at start-up with a clear message if a required one is missing.
- Provide `.env.example` with no real values. Never commit `.env`. Never print a secret.
- Use Aiven's verified TLS configuration and EU database/Valkey regions. Aiven data services do not settle the separate backend application host.

## UPDATED boundaries / LEGACY identity and storage details

1. **There is no route that accepts audio or any file.** Do not add one. Reject request bodies over 20 kB.
2. **Safe-person names and phone numbers never reach the backend.** Their phone-only storage is an explicit exception to the older app-wide no-names rule. Random-ID/token identity and token hashing below are legacy implementation proposals pending current identity decisions.
3. **Store only approved non-localOnly goal/step text through `PUT /goals`.** The check/shrink endpoint never persists input, support verdicts/flags or checked text. No mood notes or transcripts.
4. **Logs contain only route, status and duration.** No goal/step text, verdicts, support flags, tokens or user ID. Support classification creates no counters or metrics, whether produced by the list or the model.
5. **No real clinic-morning feed is required.** The old sharing-filtered clinic route is a legacy design; do not expose real user data merely because it appeared here. Support verdicts/flags and checked support text never enter clinic/partner routes.
6. **A partner never receives the other person's goals, levels, steps or sharing setting.** Keep the agreed wake signal and `partnerQuietDays`; remove waiting-thought data.
7. All data is made up or belongs to the team. Say so in the README.

## UPDATED U14 — private-goal and morning contracts

- Scheduling scope is one daily time plus one persistent on/off switch. No weekday selection, multiple alarms or one-off skip belongs to this build.

- A goal kept through Write my own steps after its latest local/endpoint needs_support verdict is localOnly on the phone. PUT /goals omits the entire goal: no title, steps, flag, marker or placeholder. Do not require a title change or offer consent to send it. A later rewording that passes both checks clears localOnly locally and permits the next PUT.
- U17 resolves previously synced goals: on the next PUT after one becomes localOnly, remove its remote title and step texts and set stepText to null on every existing morning with that goalId. Preserve opaque IDs, sizes and outcomes. Do not require a private-goal marker or resubmission of the private text to perform the cleanup. No localOnly goal/step text goes to approval-time Decisions hints.
- Its morning record sends opaque local goalId, stepSize and stepDone normally, but stepText is null. Accept a goalId with no server goal row; processing and foreign keys cannot require that row or text. Never derive/store a private-goal marker from this absence.
- Add optional utcOffsetMinutes and nullable stepText to API validation/storage. Keep level and nullable stepDone separate from wake confirmation. Fix localDate/offset at first ring or early hold; all midnight rules use the recorded offset even after midday travel.
- One record per localDate. Duplicate/skipped travel dates are unsupported in this build. Re-enable after scheduled time retains only today's off record and schedules tomorrow without new ring/hold/other record changes. Before scheduled time, restore the original alarm and clear off to pending, with no minimum lead time.
- Store each clinic demo user's last classified status/date for the factual reason under the insufficient rules below. This does not add a live patient feed.

## LEGACY authentication proposals

- `POST /users` creates a user and returns the token once.
- Every other route except `GET /health` and `GET /clinic/patients` needs `Authorization: Bearer <token>`.
- `GET /clinic/patients` needs the header `x-clinic-code` to equal `CLINIC_CODE`, compared in constant time.
- The WebSocket at `/live` takes the token as a query parameter and closes at once if it is wrong.
- `/demo/*` routes exist only when `DEMO_MODE=true`; otherwise they are not registered.

## UPDATED U17/U18 — Gemma writes, Decisions judges

Bounded implementation is expressly authorized. Use the [official Decisions documentation](https://aistudio.google.com/docs/decisions-api.md), @google/genai SDK 3.2+, apiVersion v1beta, ai.decisions.create and model gemini-decision-1 with the same server-only GEMINI_API_KEY. No new credential or mobile provider call is needed. Record the dependency reason in NOTES.md.

For POST /goals/shrink:

1. Recheck the shared phrase list before any provider call. A match returns needs_support without Decisions/Gemma; local matches never reach this endpoint or create an event.
2. Make one Decisions call on the goal text. Ask a noul distress question with explicit true criteria: wants to die, intends to end their life or harm themselves; false means those criteria are absent. Also ask a choice question with described ok / too_big / too_vague options. Use full-sentence questions, positive phrasing and one decision per question. Choice confidence below 0.6 becomes ok.
3. If distress probability is at least configurable distressThreshold (initially 0.3), or HTTP 400 has code safety, prohibited_content, blocklist or content_blocked, return needs_support without calling Gemma.
4. Otherwise call Gemma for the ladder only. A confident too_big/too_vague result still shows the ladder with the exact U19 advisory below. Do not require Gemma to invent a rewording or extra note merely because the legacy schema had those fields.
5. Make one Decisions call on goal plus all three steps. Each step has a score question with ordered duration levels “Under 2 minutes, at home”, “2 to 10 minutes”, “10 to 30 minutes”, “More than 30 minutes”, and a noul question “Is this one concrete action that another person could see being done?”
6. Return a per-step sizeHint when the most probable duration level exceeds its slot (Tiny >0, Small >1, Full >2) or concrete-action probability is below 0.5. Use the most probable level, not the probability-weighted score. Never auto-regenerate; edits and user approval win.

If Decisions is unavailable before generation, use the current Gemma verdict fallback and mark source. If final Decisions fails after Gemma produced a ladder, return failure/manual-step fallback: never return an unchecked ladder and never call Gemma again. A safety-block HTTP 400 during duration/concreteness checking triggers Help and localOnly, including the agreed remote cleanup when applicable.

The **25-second server deadline covers the whole Decisions → Gemma → Decisions sequence**. One attempt per stage, no retry; client timeout is 30 seconds. During the wait, manual steps are immediately available. Failure/timeout offers Try again and Write my own steps. The former six-second/one-retry budget is superseded; the old rate-limit proposal is still legacy, not a confirmed product rule.

U19's **Write my own steps** choice during loading keeps the current request running; it does not cancel or start another attempt, and the existing deadline remains. U20 approves the separate Suggestions are ready → View → Use these steps / Keep mine flow, with U21’s “Replace the steps you wrote?” / Replace / Keep mine confirmation before replacing existing manual text. Use these steps changes draft fields only and still requires Approve; it never saves or approves automatically. Manual approval saves on the phone immediately, but remote saving waits for the original goal check to finish. A late needs_support opens Help, makes the goal localOnly and removes any previously synced title/steps and historical matching morning stepText through the agreed redaction flow. U21 resolves original-check failure/timeout: keep manual approval and release that request’s deferral so it syncs normally once no approved non-private goal awaits its original-goal or hint check. Defer every replacement PUT /goals while any approved non-private goal awaits its original-goal or hint check; omission of only the pending goal would wrongly delete its previous remote text. needs_support remains the separate Help/localOnly/redaction branch. No private-goal marker or support verdict is persisted remotely.

U19 approves exact UI copy; keep it deterministic rather than asking a model to write it: waiting “Finding a small place to start…”; failure “We couldn’t suggest steps this time.”; too_big “This is a big goal. These steps are a place to start.”; too_vague “These steps make a starting point. Edit them to fit you.”; duration “This may take more than {2/10/30} minutes.” using the step slot's limit; concreteness “Try one action someone could see you do.” Combine both applicable hints into one line. These strings do not authorize persisting checked text or exposing distress probability.

On Approve of edited non-localOnly steps, save on the phone immediately and run step 5 once for hints shown afterward. Never submit localOnly goals or steps. The operation's exact route/wire shape is an implementation choice; it is distinct from the shared local phrase checker, which does not need a remote checking endpoint. The result is advisory, never a regeneration request or veto of approved text.

Never store, log, display or expose distress probability. Support results create no text/verdict rows, counters, metrics or text/flag logs; operational logging remains route/status/duration only. Only the demo-only Under the hood view may show step-duration probabilities and goal verdict. It may never reveal distress probability. Keep personal audio, user IDs, morning records and levels out of these model requests. Add labelled example-goal fixtures for threshold evaluation and tests for safety errors, a mis-sized Tiny step and fallback.

Gemma uses listed instruction-tuned models selected by LLM_MODEL, with endpoint behind LLM_BASE_URL and the event key server-side. Use compatibility only when it serves the model, otherwise the native adapter. Gemma instructions remain in the user message, with no system message or JSON mode; validate structured ladders with zod. Tiny/Small/Full are at most 60 characters, concrete actions within their 2/10/30-minute limits; Tiny is doable at home. Legacy extra copy/prompt proposals remain subordinate to the decision register. For the outage fallback, preserve the current Gemma verdict path rather than silently selecting another model family.

Authenticated ListModels returned 64 models on one page (review/provider-models.json). The selected goal model is models/gemma-4-31b-it via environment, not hard-coded. Its bounded compatible probe produced a Zod-validated synthetic ladder in 12,983 ms, with five parser checks passing (review/provider-generation.json). U17 requires checking a smaller listed Gemma: if acceptable ladders take under five seconds, propose switching LLM_MODEL and show three sample ladders from each model; do not switch silently.

One synthetic Decisions access call succeeded using SDK 3.3.0 in 395 ms, with validated response (review/provider-decisions.json). This establishes key access and one measured latency, not full safety or route/device integration. Lyria models were listed but generation/quota are untested and the full two-phone script has not passed; composed dawn remains gated. Keep current module/integration-test status separate from these bounded provider observations.

**Recorded bounded implementation evidence:** Goal service/provider adapters and Fastify routes with injected authentication exist, alongside pure mobile goal helpers. Typechecking and the latest completed 159-test suite passed (104 phrase, five parser, 37 goal/client/route and thirteen suggestions-state cases). One synthetic live Decisions → Gemma → Decisions pipeline succeeded in 15,574 ms without retry under the 25-second deadline (review/provider-goal-pipeline.json). No listening/deployed server, database erasure, native app or two-phone acceptance is established by that evidence. U19–U21 backfill/native/recording/reminder rules remain pending implementation; the bounded goal extension has 159 passing local tests, while main Expo implementation is now starting.

## UPDATED U21 — local recording and reminder boundaries

Morning-message labels are For an easier morning / For an in-between morning / For a hard morning, with 20-second messages; replies remain capped at 20 seconds and place sound at 30 seconds. All personal recordings use tap / Play / Record again / Save / Cancel on the phone. No personal audio upload or new backend recording route is authorized.

Close during the automatic five-second sensing sample after a completed hold produces voiceState failed with zero points; reopening continues to the message. The 18:00-local reminder uses Yes / Not today and excludes late-offered steps; exact late cutoff and additional suppression rules remain open. These native/client specifications do not imply server-side audio, reminder delivery, or implemented native behavior.

## LEGACY morning-persistence contract / confirmed event correction

U19 confirms that reconstructed/backfilled mornings are synced; remaining persistence/schema details beyond confirmed integrations stay open. These route shapes remain suggestions. Required distinctions include stopped/off, separate wake confirmation, nullable step outcome/text and optional utcOffsetMinutes. U14's opaque local goal IDs must not require a server goal. The old payload cannot be copied unchanged.

- `PUT /mornings/:localDate` creates or replaces the record for that user and date. Sending it twice must leave one row.
- The confirmed level enum is `easy | medium | hard | no_response | stopped | off`. Do not erase stopped/off or confuse a category with wake confirmation. Off means deliberate disablement before firing, not a no-response or quiet day; exact remaining schemas follow discovery.
- localDate is fixed at first ring or early hold, not recalculated from current timezone at upload. Store the optional UTC offset alongside it. Legacy date bounds/order validators must not erase this or reject the approved early-hold case without reconciliation.
- Confirmed trigger: dispatch `partner_up` immediately on a completed normal or late hold, before voice or message actions. Do not require Stage D or a full morning-record upload first. Native Stop alone never emits it; transport/retry/day boundaries remain open.

### UPDATED U19 — immutable final categories and reconstruction

- The fixed window is 60 minutes from first ring, or 60 seconds in fast time; snooze re-rings do not extend it. no_response means no system Stop, system snooze, in-app snooze, app open or hold occurred within it. stopped means at least one such interaction occurred but no hold completed within the window. Any single snooze/app open is enough for stopped.
- Classify at the deadline if the app runs; otherwise reconstruct on next launch from persisted ring time, stop/snooze events and app-open timestamps. Backfill every past alarm-enabled day with no record, then sync. This is based on local event evidence, not backend model inference. U20 clarifies that any observed interaction still means stopped even when native Stop cannot be observed. Use the no_response fallback only when no interaction was observed, and disclose the observability limitation in NOTES.md.
- Final no_response and stopped never convert into each other. A late no_response hold before recorded local midnight sets upAt and publishes partner_up, offers Tiny with a message behind a play button, and counts as an offered day for carrySize while keeping no_response. The API/storage must permit upAt on either category. U20 clinic wording is “no response in the first hour; getting up confirmed later”; retain value 3 and all no_response counts. Do not infer a different category or reduced clinic contribution from the late hold.
- Only no-offer no_response/stopped days apply the carried missed-day reduction; a late offered step follows offered-day progression. Off remains unchanged.
- Snooze mutes sound and schedules a native ring after five minutes, with unlimited snoozes. Setup completion requires connectivity; denied alarm permission blocks completion with Open Settings. These are client/native requirements, not backend claims of permission or ringing verification.

## UPDATED U16 — early-wake event contract and local core boundaries

- earlyHoldWindowMinutes is 180. U17 starts the Home window at the later of scheduled alarm minus 180 minutes and local midnight on the alarm's calendar day, ending when it fires; never on the previous day or an off day. Completed early hold cancels that day's system/in-app alarms, confirms up and publishes partner_up; store minutesToUp: 0 and snoozeCount: 0. minutesBeforeAlarm is floor((scheduledAlarmTime − holdCompletedAt) in minutes), a non-negative integer only for early holds and null otherwise. Early localDate is the alarm's calendar date; no further trailing instruction was specified.
- The client proceeds directly through voice/message/step with no dawn, personal place sound or composed piece. Server work must not start any of those audio paths.
- Initial carrySize is small; first easy/medium gives Small, hard gives Tiny. It persists through deleting/recreating goals and resets only with app data. Message selection is the confirmed deterministic gentler-fallback/unplayed/success-ratio/tie-order algorithm in the updated brief. These are local core rules; do not duplicate scoring/selection on the backend.
- U17/U18 message learning also stays local: one play per message/local day after three audible seconds or shorter completion, no same-day replay/Settings counts, paused-after-threshold counts; only the morning's selected message receives Done credit and undo decrements it. Rest removes today's play/credit only, preserving older history. Show the step at message start; no server message-learning route is authorized.
- U20 sensing remains local: score from prior qualifying mornings before adding today. The fifth qualifying morning uses defaults and the sixth first uses the five-morning median. Timing comparisons use max(1 minute, stored timing baseline), without changing the persisted median (including zero). Preserve existing qualification/freeze rules and the separate voice baseline. Do not move this scoring to a server/model or claim native sensing has been implemented.

## UPDATED partner scope / LEGACY pairing details

- Confirmed code flow: `POST /partner/match` with `{mode: "code"}` creates a code; supplying `{mode: "code", code}` joins. Pairing survives restart and reinstall when the same user token is restored. Persist the relationship rather than relying on process memory alone. U22 resolves lifetime and single use: valid until redeemed, then consumed with no reuse. The older 24-hour expiry is superseded. Explicit PAIR_CODE_TTL_SECONDS=0 uses Valkey SET NX without EX; unset remains unconfigured, and positive seconds remain supported for explicit test configuration. Code format is separate from this lifetime decision.
- Anonymous matching is a configurable visual demo with TODO implementation files. Do not implement the old first-two-waiting-users matcher or silently expose it as real.
- Retain `partnerQuietDays`, excluding off days. The old cap of 14, timezone and remaining counting semantics stay subject to discovery.
- Thought sending is excluded; no corresponding API, event, store or test is part of this scope.
- Nothing that resembles an alert about a person's wellbeing is ever sent to a partner.
- Serve public HTTPS/WSS across networks; do not require a shared LAN. WebSocket reconnects with backoff. Foreground paired clients also poll `GET /partner` every five seconds and refresh on foreground entry. The first positive up observation updates once; duplicate poll/WS observations do not replay the animation. Include **Partner gets up now** as a labelled demo fallback, not a replacement for real connectivity.

## UPDATED U14 clinic observation rules / LEGACY base thresholds

- Levels include off as a neutral dot. Exclude off from seven-/14-day counts and averages. Any recorded non-off level is observed; missing records are not observations.
- Status enum is might_need_call | drifting | insufficient | steady. With fewer than three observations in the last seven days, return insufficient labelled “Not enough recent mornings”; never steady and never a prior status carried forward as current.
- Persist last classified status/date. Include it as a factual reason using: “Alarm off for N days. Last status: X, D days ago.”; “No mornings recorded in the last 7 days. Last status: X, D days ago.”; or, without prior status, “Started D days ago. N mornings recorded.” The old off annotation cannot override insufficient classification.
- Sort might_need_call, drifting, insufficient, steady. Within insufficient, longest time since last observed morning first. Do not reuse the old universal seven-day-average tie-break here.
- With at least three observations in seven days but fewer than five in the preceding 14, skip earlier-average comparisons and apply count-based rules only; if none fire, return steady with “limited history”. Thresholds 3/5 are config values.
- U16 confirms the calculation below this gate. Recent is seven most recent calendar days, including today only if its morning has a final level; comparison is the 14 calendar days before that. Values: easy 0, medium 1, hard 2, stopped 2 with/without a late hold, no_response 3. Exclude off/missing entries and average observed days only.
- Evaluate might_need_call first if any: recent no_response ≥3; recent hard+stopped+no_response ≥5; recent average minus comparison average ≥1.0. Else drifting if any: hard+stopped ≥3; average difference ≥0.5; true stepDone on ≤2 recent days and ≥4 of the seven days before. Else steady. Skip both average checks when comparison observations <5. stopped never counts as no_response. Keep thresholds in config.
- Reasons list every rule that fired. U17 wording is “alarm stopped; getting up confirmed later” when stopped has upAt, and “alarm stopped but getting up not confirmed” without upAt. Count these separately in the reason; both remain value 2 and both count in hard/stopped rules.
- U20's late-confirmed no_response reason is exactly “no response in the first hour; getting up confirmed later”. Keep value 3 and all no_response counts unchanged.
- These rules remain in the separate clinic demo, not a newly authorized real patient feed. Add tests for each trigger at/just below threshold, three stopped → drifting not might_need_call, five stopped → might_need_call and pending today excluded.
- Required checks: brand-new user, all-off week, all-off 21 days, two observations, three with thin comparison history and previous status/date surfaced in the reason. These are requirements, not completed test results.

## LEGACY database proposals

Possible tables after data-scope reconciliation: `users`, `goals`, `mornings` (unique on user and local date), `partner_pairs`, `partner_codes`. No thought table. Persistent code-pair relationships and approved non-localOnly goal storage are confirmed; the remaining schema is a suggestion. Any level column/check must include off/stopped. Support optional utcOffsetMinutes and nullable stepText; morning goalId cannot require a server goal row. Do not add a localOnly column/marker or placeholder goal to the server. Persist clinic last-classified status/date for its agreed demo reasons. Each table having `created_at`, UTC `timestamptz` timestamps and a `date` local day remain engineering/schema suggestions.

- Use parameterised queries only. No string-built SQL.
- Migrations only add; never edit a migration that has been run.

## UPDATED no-audio boundary / LEGACY demo-route proposals

The following seeded numeric/history scenarios are legacy proposals for the separate demo scope. No seed route creates, imports or uploads the person's audio; presenters record it beforehand. Only after the full two-phone script passes and a Lyria music model is available may U15 provider-generated dawn pieces be pre-generated for demo phones. Anonymous matching remains TODO/configurable simulation, and callback simulation must follow the visible-label/hidden-outside-demo rule.

- `POST /demo/seed` creates eight made-up users with sharing on and six weeks of mornings: three steady, two drifting slowly, one sudden drop, one recovering, one with gaps. Mark them `is_demo = true`.
- `POST /demo/reset` deletes only rows where `is_demo = true`.
- Seeded data uses a fixed random seed so the clinic list looks the same every time.

## LEGACY operational suggestions

**Current hosting boundary:** Aiven PostgreSQL/Valkey stay in the EU. Laptop Fastify plus Cloudflare Quick Tunnel is the approved demo hosting choice, not yet started. No permanent cloud backend host is selected. Keep the server/tunnel running for the demo. Real pairing must work across networks, not only venue Wi-Fi; phone clients cannot use the laptop's localhost address as a cross-network endpoint.

- `GET /health` reports whether the database and Valkey answer.
- Configure only origins required by the chosen clients. The clinic is a separate web demo, not an Expo web route; do not invent deployment URLs.
- The server must be reachable from phones on mobile data, so it cannot depend on the venue's Wi-Fi. `README.md` explains how to run it locally and how it is deployed.

## GATED U15 stretch — composed dawn, not an implemented route

- Authenticated model discovery succeeded (64 models, one page); review/provider-models.json records the actual returned Gemma/Lyria names without credentials. Listing is not a generation/quota test. No Lyria generation has run; if the service later proves unavailable on this key, do not build the item and report the result.
- The full core demo script has not passed on two phones, so its gate remains closed despite Lyria being listed. Do not register or implement POST /dawn/compose until both the core-demo and model-availability gates are satisfied.
- Future request is JSON only: {place: "sea" | "forest", tier: "light" | "middle" | "heavy", seconds}. Build the prompt solely from fixed templates: instrumental, no vocals/sudden changes, beginning near silence and rising, slower/sparser for heavy. Send no user ID, goals, morning levels or personal text to the model.
- Call the available Lyria model through Gemini API and stream the generated audio back without server storage. This is an explicit audio-output-only exception. The route accepts no audio/files; all upload bans and phone-only personal recordings remain unchanged.
- Mobile requests tomorrow's piece after the morning flow in background, caches it locally and plays it under place sound during normal in-app dawn. An early hold explicitly uses no dawn, place sound or composed piece. Never call this route in the alarm path. No cache means exactly the existing dawn; Not this sound discards the piece and falls back to place sound.
- Pre-generate pieces for the demo phones before presentation only after the two gates. This does not seed or synthesize the user's personal voice/place recordings.

## Required U14–U18 integration checks (specified; actual execution needs separate evidence)

- localOnly omitted from PUT without markers; private morning accepted with null stepText/opaque unknown goalId; clean recheck later permits ordinary approved PUT.
- Optional utcOffsetMinutes and null stepText accepted; fixed localDate/offset survives upload after travel; one record per localDate.
- After-time off re-enable creates no additional record mutation or up signal; off remains excluded from quiet days.
- Clinic observation/status/reason cases above, persisted historical status/date, each U16 trigger at/below threshold, three/five stopped cases and pending-today exclusion. U17 stopped reasons distinguish upAt branches with separate counts and unchanged numeric treatment.
- Local sensing and dawn tests are required in the mobile/shared layer: silent n=4/usual-speaker/usual-skipper, spoke dual-condition cap, all dawn rows, off/gap history and hold at 10%. Add U16 initial-carry and deterministic-message checks from the brief. Do not move sensing recomputation into the backend.
- Early hold: 07:15 opens 04:15, 02:00 opens midnight rather than previous-day 23:00, and 00:30 hold for 02:00 sends minutesBeforeAlarm 90 and alarm localDate. Non-early minutesBeforeAlarm is null.
- Previously synced-to-private goal cleanup removes remote title/steps and nulls all matching historical morning stepText while preserving IDs/sizes/outcomes, with no localOnly marker.
- Decisions: labelled fixtures; threshold and low-choice-confidence boundaries; safety HTTP 400 never reaches Gemma; oversized Tiny and concreteness hints; no automatic regeneration; source-marked pre-generation fallback; final-check failure never returns unchecked ladder/retries; post-check safety triggers Help/localOnly; edited approval saves immediately with later hints and never sends private steps; whole sequence stops at 25 seconds with one attempt per stage; no distress probability leaks to responses/logs/metrics/demo.
- Message attribution tests belong in mobile/shared: audible threshold/short completion, same-day replay and Settings exclusion, pause, selected-message-only Done/undo, and Rest removes today's play/credit while preserving older history.
- U19: untouched alarm → no_response; a system snooze with no later hold → stopped; app open/close → stopped; reconstruct/backfill three missing alarm-enabled days on next launch and sync; late no_response hold preserves category/upAt/partner event/offered-day behavior. Test fixed first-ring/fast60-second windows and document native Stop observability limits.
- U19 client/native checks remain pending: snooze mute/native five-minute ring/unlimited count; setup connectivity and alarm-permission blocking; exact goal copy/combined hints; manual choice retains the current request and offers its result separately. U20 adds separate-result controls with one replacement confirmation, immediate local approval with deferred remote saving, and late-support Help/localOnly/redaction checks.
- U20: observed interaction still gives stopped when system Stop is unavailable; late-confirmed no_response retains value 3/counts with the exact approved reason. Local/shared sensing checks must score before appending today (fifth defaults/sixth five-morning median) and use a one-minute comparison floor without modifying the stored timing median. These sensing/native checks are not part of a claimed implemented alarm flow.

## Working practice (subordinate to current rules)

- Run the type checker and tests before saying a task is done, and report the result.
- Write down anything faked, skipped or changed from the brief in `NOTES.md`.
- Follow the current implementation plan and reconciled scope. Reply-to-self and personal place recording are included local features; thought sending is excluded, and real anonymous matching remains TODO.
