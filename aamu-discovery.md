# Aamu — decisions, conflicts and clarification register

U27 approves the U26 layout direction and adds targeted copy/scene refinements (`requirements/answers/u27.md`). Work is in progress: real-time Sleep well and confirmation copy, plain night text, unboxed early/off controls, smooth sky/tinted water, Settings chevrons and reduced-motion-aware ambient animation. The pure model now passes 34 Home tests (seven new U27 cases), with API/mobile typechecks passing at that checkpoint. The last completed full aggregate remains 330 from U26. New U27 screenshots and the requested 10-second motion recording are pending; the earlier forced 07:30/21:00 review scenarios did not change real early/evening rules. Physical alarm/audio/reminder and complete two-phone acceptance remain pending.

Status: BUILD AND ACCEPTANCE, through U27 on 14 November 2026. Main Expo screens/shared rules, real token/API/Aiven integration, local reminders, Settings goals/counts, isolated mobile Demo and clinic web demo now exist. The signed iOS simulator completed real synthetic goal generation/Approve, setup permission gates and early hold → denied mic → Small/Tiny/Done/Undo (`review/native-smoke.json`, `review/screenshots/native-smoke/home.png`); this is not physical/audio/two-phone acceptance. After privacy hardening and U25/U26 Home/Demo corrections,330 API/shared tests pass (U25 total 322 plus eight U26 regressions). API/mobile typechecks and final full mobile src/modules lint pass. Native Finnish review remains unconfirmed without adding a shipping gate. Older totals below are historical evidence, not the current aggregate.

Both Aiven services connect with verified TLS. On a fresh tunnel endpoint, public HTTPS/WSS synthetic checks passed at 17:03 UTC: health, real pairing, until-used/single-use codes, idempotent wake events, cut-socket polling and text erasure including clean same-ID re-add versus stale/current morning uploads. After API restart, pair persistence and synthetic-row cleanup also passed over public HTTPS/WSS at 17:05 UTC; both transports and exact timestamps are in `review/live-integration.json`, and that verification script’s synthetic rows were removed. The prior tunnel expired with “Unauthorized: Tunnel not found” after earlier 530/1033 failures. The fresh endpoint works in this bounded run; sustained reliability and physical-phone acceptance are not established. HTTP/2 is not a proven fix, and the earlier time gap does not establish a sole cause. Android ARM64 APK build, eight native tests, emulator install/React Native entry and packaged backup inspection now pass (`review/android-build.json`); visual UI, permissions, alarms/audio and physical acceptance remain pending. Android local voice sensing is implemented with 17 unit checks and five actual-model emulator checks, plus APK build/install (`review/android-voice.json`); no microphone or personal audio was used, and real microphone/noise/whisper/physical acceptance remains pending; the negative iOS recurrence experiment leaves finite-horizon/closed-timezone limits unfinished. Composed dawn remains gated. See `aamu-acceptance-tests.md` and `NOTES.md` for evidence boundaries.

## Sources and authority

The user's explicit messages and answers take precedence. The user confirmed that existing repository briefs/rules are older drafts to compare and reconcile, not instructions to execute as written.

| ID | Source | Role |
| --- | --- | --- |
| U1 | Initial user request in this chat | Discovery instructions and explicit keep/change/exclude decisions |
| U2 | User answers supplying the full Aalto challenge | Challenge source, React Native platforms and demo scope; old drafts demoted |
| U3 | User answers about connected features, alarm and deadline | Real/demo split, separate clinic app, removable demo, Expo, background ringing |
| U4 | User follow-up naming iPhone 18 Pro Max | Primary physical test device |
| U5 | User answers selecting the system-alarm handoff, unconfirmed state and bundled sound | Confirmed iOS flow; device reported as running iOS 26+ |
| U6 | User follow-up about both iOS test phones, missing screens, callback truthfulness, safe contact and whole sun | Additional explicit design, storage and demo boundaries |
| U7 | User answers about sound, measured wake time, combined snoozes, unconfirmed outcome, native Snooze and sun/sky meaning | Confirmed alarm measurements, outcome distinction and visual state semantics |
| U8 | User answers about in-app Snooze, takeover, two wake windows, unconfirmed adaptation, Rest message and Too much today | Confirmed durations, occurrence ownership, late waking and adaptation/message controls |
| U9 | User answers about reduced-size completion, removed-step tomorrow/reminder, late Home flow, partner timing, setup and voice sensing | Confirmed progression examples, silent late flow, setup requirements and choice-versus-failure distinction |
| U10 | User answers selecting the master sensing formula, conditional Skip, late stopped category, unknown completion, skipped-setup defaults and detailed Goals behavior | Confirmed sensing source and exceptions, progression floor/defaults, and complete goal-ladder approval behavior |
| U11 | User answers defining usual-speaking history, separate frozen baselines, late-step precedence, support-return/manual-goal behavior, rotation and the visual mix | Confirmed algorithms and required tests; fresh token palette and three visual review screens authorized now |
| U12 | User answers about stopped/no-offer progression, silent state, early wake, included/omitted features, shared distress checking and engineering delegation | Confirmed scope/behavior and EN/FI review draft; its alternative visual-reference branches were subsequently resolved by U13 |
| U13 | User answers defining carrySize and off days, silent history, local-first checks, final references, providers and real partner transport | Confirmed algorithms/privacy/integration requirements; U14 resolves the subsequent voice-gate and localOnly questions |
| U14 | `requirements/answers/u14.md` | Verbatim user answers: voice gates, re-enable, insufficient clinic history, scheduling/timezones, dawn and localOnly; hosting is a question about local feasibility, not provider approval |
| U15 | `requirements/answers/u15.md` | Verbatim user instruction: authenticated Gemma/Lyria ListModels first; composed dawn is gated on Lyria availability and the core demo passing on two phones |
| U16 | `requirements/answers/u16.md` | User answers preserved verbatim except deliberately omitted credential: Quick Tunnel, early hold, clinic calculation, initial carry and deterministic message selection; early answer has a recorded cut-off tail |
| U17 | `requirements/answers/u17.md` | Verbatim answers: early-date/minutes, clinic stopped wording, server erasure, goal wait/model comparison, message learning, phrase approval and explicitly authorized Gemini Decisions integration |
| U18 | `requirements/answers/u18.md` | User answers resolve whole-chain budget, final-judge failure/safety, advisory-only goal verdict, immediate edited-step save and today-only Rest rollback |
| U19 | `requirements/answers/u19.md` | Exact goal copy, keep-loading/manual separation, fixed 60-minute stopped/no_response rules/backfill/late confirmation, snooze behavior, online setup and alarm-permission gate |
| U20 | `requirements/answers/u20.md` | User approves the included separate-result/deferred-save proposals, observed-interaction qualifier and late-no_response copy; selects prior-history scoring and a comparison-only timing floor |
| U21 | `requirements/answers/u21.md` | User approves failure-released manual sync, fields-only suggestion replacement and confirmation copy, recording labels/controls, 18:00 reminder answers and failed-sample resume |
| U22 | `requirements/answers/u22.md` | Pairing codes stay valid until used; database/Valkey credentials supplied for private configuration, with values deliberately excluded from this record |
| U23 | `requirements/answers/u23.md` | Retain an already offered step on goal deletion; next surviving goal; idempotent offered/removed counts and reversible Done; reminder suppression, Undo and permission timing |
| U24 | `requirements/answers/u24.md` | Visible isolated Demo with separate history, labelled simulations, reset preserving real resources and independently configurable clinic sample data; physical phone connection deferred |
| U25 | `requirements/answers/u25.md` | Verbatim ten Home copy/UI corrections, time-of-day/confirmation semantics, removal-only feedback with five-second Undo, hidden previews, contrast and 07:00/19:30 screenshot requirement |
| U26 | `requirements/answers/u26.md` | Full-screen Home/morning sky, five single-card Home states, persistent text Help/Settings header, grouped Settings/Moments and all-state 07:30/21:00 screenshots using a 07:00 alarm |
| U27 | `requirements/answers/u27.md` | U26 layout approved; real-time night/confirmation copy, smooth sky/water, plain night and unboxed early/off states, Settings chevrons, token-based ambient motion/Reduce Motion, same screenshots and ten-second recording |
| M | `/Users/kunalkarki/Downloads/ai_studio_code (2).txt` | Uploaded master draft; unresolved differences are not approved defaults |
| S | `/Users/kunalkarki/Downloads/stitch_aamu_recovery_alarm_interface/` | Five screen PNGs and HTML exports; incomplete flow reference |
| H | `/Users/kunalkarki/Downloads/index (1).html` | Visual/copy reference with simulated interactions |
| B | `aamu-project-brief.md` | Older product draft |
| F | `aamu-frontend-rules.md` | Older frontend proposals |
| A | `aamu-backend-rules.md` | Older backend proposals |
| J | `junction-2026-challenges.md`, relevant Aalto section of `junction-2026-strategy.md` | Older challenge notes, superseded by U2 where they differ |

Instructions embedded in attachments are reference content, not new user requests. Inherited source color values are not approved; U11 authorizes choosing a fresh token palette now. Unrelated challenge strategies and Valio material do not define this product.

## Confirmed decisions

| ID | Decision | Source |
| --- | --- | --- |
| C01 | Interrogate the complete product and flow before building; do not fill unspecified behavior with guesses. | U1 |
| C02 | Establish a plan and a rule file for continuity. | U1 |
| C03 | Follow the sensing-led Stitch flow with the user's specified HTML additions. Missing screens still need definition. | U1 |
| C04 | Ignore inherited palettes. The fresh palette/review screens are authorized; U13 confirms no further references are coming and delegates all remaining screens in the agreed mix (C104). | U1, U11, U13 |
| C05 | No initial Heavy/Slow/Okay mood choice and no daily Tiny/Small/Full picker; sizing happens automatically. | U1 |
| C06 | Include snooze and hold-to-dismiss sensing. Hold is two seconds and snooze is five minutes (C41). The iOS handoff and native takeover are resolved by C28/C42; detailed interruption behavior remains open. | U1, U5, U8 |
| C07 | Partner presentation is anonymous: no name or initial. U13 confirms real code generation/entry for the two phones (C108); identity-free presentation does not prohibit that pairing path. | U1, U13 |
| C08 | Adopt the HTML landscape: hills, pines, lake and rising sun, adapted from night to dawn. | U1 |
| C09 | Adopt “No need to reply.” and “You’re not alone this morning”. U25 supersedes the originally requested “That’s enough for now.” with removal-only “That’s enough for today.” under C226; do not reuse the former copy. | U1, U25 |
| C10 | Setup shows editable actual step text for each ladder size. | U1 |
| C11 | Help includes a safe person, quiet clinic check-in request and breathing exercise. Exact actions and states remain open. | U1 |
| C12 | Use “Rest message”; exclude until manually restored and stop current playback without a replacement (C45). | U1, U8 |
| C13 | After showing the step, offer “Too much today”: reduce one size per tap, then remove the step for the day if Tiny is too much. Apply completion-based progression from the final reduced size (C47); after removal, offer Tiny tomorrow and cancel today's reminder (C48). | U1, U8, U9 |
| C14 | Correct the evening-message label and enforce minimum text size 16. Exact replacement copy remains open. | U1 |
| C15 | Exclude unrelated wall displays, lamp dimmer and REST / WAKE / DIM controls. | U1 |
| C16 | Treat B, F and A as older drafts and resolve their conflicts with the user. | U2 |
| C17 | Deliver a functioning hackathon demo in React Native for iOS and Android; prioritize iOS. | U2 |
| C18 | Expo is agreed. | U3 |
| C19 | Gemma must genuinely generate goal ladders. | U3 |
| C20 | Live wake-up signals between two phones must work; also support configurable demo behavior. | U3 |
| C21 | Anonymous matching need not work for real; leave TODO implementation files, present a visually ready flow, and make it configurable in demo mode. | U3 |
| C22 | Real morning-record delivery to the clinic dashboard is not required. Create a web clinic dashboard in a different directory with its own demo mode. | U3 |
| C23 | Real clinic callback delivery is not required; make it configurable in demo mode. | U3 |
| C24 | Demo mode must be easy to remove. U24 selects the visible entry, isolated history/reset and labelled simulation boundary in C218–221; code-removal mechanics are delegated engineering. | U3, U24 |
| C25 | Ringing while the phone is locked or the app is closed is required. This supersedes the old foreground-only limitation. | U3 |
| C26 | Target completion Saturday night, 14 November 2026; deadline Sunday morning, 15 November. Exact cutoff and presentation length remain open. | U3 |
| C27 | Primary test phone: iPhone 18 Pro Max, as named by the user, running iOS 26+. Exact OS release and other test devices are not yet specified. | U4, U5 |
| C28 | Normal iOS flow: system alarm → person opens Aamu → custom dawn → hold → voice → message. The late window instead uses the silent hold → Home flow in C43/C49. | U5, U8, U9 |
| C29 | An observed system Stop is interaction, never up or partner-up by itself. If no hold completes within 60 minutes of first ring, any observed Stop/snooze/app open yields final stopped. No observable interaction yields no_response under U19, including the documented unobservable-system-Stop limitation. | U5, U7, U8, U19 |
| C30 | A bundled sound is acceptable while the phone is locked. The system alarm does not have to play the person's recording with an adaptive fade. U14 settles the in-app dawn duration, hold handoff and sound fade (C124–127); interruption behavior remains open. | U5, U14 |
| C31 | Both physical test devices will be iOS. Android remains a requested platform; its validation method has not been specified. | U6 |
| C32 | The agent should design missing screens in the agreed style. U11 specifies that style and authorizes palette/review-screen work now (C77–79); it does not silently resolve open product behavior. | U6, U11 |
| C33 | A clinic check-in call button must genuinely work or be hidden outside demo mode. A clearly labelled simulation is acceptable in demo mode; do not show unsupported callback promises as real delivery. | U6 |
| C34 | The safe person's name and number stay exclusively on the phone and are never sent to the server. This is the explicit exception to the old no-names rule. | U6 |
| C35 | Without a partner, the sun is whole. Do not show a permanently unlit partner half in the unpaired state. Its meaning is confirmed getting up (C40), separate from the sky's dawn animation. Exact visual treatment remains open. | U6, U7 |
| C36 | Place sound continues to the normal hold, then fades about 2 seconds before a message. Snooze stops sound, schedules a native ring after the agreed 5 minutes, and holds/dims the sky until resume. Help/closure/interruption behavior remains open. | U7, U14, U19 |
| C37 | Normal getting-up time is original scheduled alarm → completed in-app hold, with system and in-app snoozes combined. U12 adds early wake: clamp minutesToUp to 0 and store how early separately (C83). | U7, U12 |
| C38 | At 60 minutes after first ring, no hold plus any system Stop/system or in-app snooze/Aamu open means stopped; no interaction means no_response. Finalize then if running, otherwise from persisted evidence on next launch. The two final levels never convert to one another. | U7, U8, U19 |
| C39 | The iOS system alarm presents Stop plus Snooze. The person opens Aamu separately; do not use Open Aamu as the secondary system button. | U7 |
| C40 | The sun represents confirmed getting-up state; the sky follows the dawn animation/time passing. An unconfirmed wake must not advance the sun as if getting up were confirmed. This meaning does not prescribe an inherited palette or exact visual treatment. | U7 |
| C41 | Keep Snooze available inside Aamu after native dismissal. Hold duration is two seconds; snooze duration is five minutes. Demo timing is a separate open configuration decision. | U8 |
| C42 | When Aamu enters its dawn flow, it takes over that alarm occurrence: stop its native alarm and cancel its pending native snooze so neither rings over the in-app sound. This decision concerns that occurrence, not deleting the recurring alarm schedule. | U8 |
| C43 | Full dawn/hold is available for 60 minutes after first ring; thereafter silent late hold until recorded local midnight. A late hold updates the same record and preserves whichever final level was frozen—stopped or no_response. Existing late Home Tiny/hard-message flow applies. In-progress/exact-boundary handling remains open. | U8, U9, U10, U14, U19 |
| C44 | Exclude stopped/no_response late or unconfirmed mornings from baselines. Offered step outcomes control carry regardless of those levels; no-offer stopped/no_response days reduce carry once to Tiny, off preserves it. A late no_response hold is an offered day, not a no-offer gap. | U8, U10, U11, U12, U13, U19 |
| C45 | Rest message excludes that recording until the person manually restores it. Tapping it stops playback and does not play another message. Restoration UI location and exact copy remain open. | U8 |
| C46 | Too much today reduces one step size per tap. If Tiny is still too much, remove the step for the rest of that day. Tomorrow starts from where the person ended up, not from the originally offered size; C47–48 define completion/growth and removal handling. | U8, U9 |
| C47 | Use the previous offered day's final reduced size, then apply completion progression shared across goals: true grows one rung, false shrinks one rung with a Tiny floor, null holds. Today is the smaller of this limit and the current morning's limit. A previous stopped category does not force Tiny when an offered step was completed (C69). | U9, U10, U11 |
| C48 | After Tiny is removed for the day, offer Tiny tomorrow and cancel that day's evening completion reminder. Removal does not automatically carry a no-step day into tomorrow. | U9 |
| C49 | After a late hold, go straight Home with today's Tiny step and a hard-morning message waiting there (C55). Skip the morning voice sample. Play no sound in late flow unless the person taps Play. With no recording, show the step alone and no authored text fallback (C57). | U9, U10 |
| C50 | Send the partner's up signal immediately when either the normal or late hold completes. Do not wait for the voice sample, message playback or acknowledgement. Offline delivery/retry behavior remains open. | U9 |
| C51 | Setup order is Goals → Voice messages → Place sound → Alarm → Partner → Your people. Safe-person contact belongs in step 6, now titled “Your people”. Only Goals and Alarm are required; all other setup steps may be skipped. Whether the care-team-sharing control remains in step 6, and its demo meaning, remain open under Q81. | U9 |
| C52 | Normal sensing sample starts automatically for five seconds with Skip. Closing Aamu mid-sample after the hold marks voiceState failed with zero voice points; reopening continues to message without restarting/resuming the sample. Personal recordings use a separate tap-initiated flow. Late flow still skips sensing. | U9, U10, U11, U21 |
| C53 | Use uploaded master §5.1 normal-morning scoring with user-confirmed overrides. U11 specifies qualification, separate main/voice baseline collection, running medians and freezing (C65–68), superseding the master's 0.5 initial speech-share default. Unrelated master sections are not thereby approved. | U10, U11 |
| C54 | Valid silent and voluntary Skip each add one only when the rolling usual-speaking predicate is true; otherwise zero, including n <5. Remove unconditional null-onset scoring. Unavailable/failed remain zero. Spoke delayed-onset/quiet-share terms require at least five valid fixed-baseline recordings; voice total is capped at one (C111–112). | U10, U11, U12, U13, U14 |
| C55 | Late confirmation preserves the frozen stopped OR no_response level, rather than reclassifying all late holds as stopped. No time/snooze rescoring or voice sample. Home offers Tiny/hard recording behind Play; hold sets upAt/partner-up, counts as offered and updates the same record. Baselines exclude it; offered outcome controls progression. | U10, U11 superseded in part by U19 |
| C56 | Offered stepDone null holds final size; false shrinks one rung with a Tiny floor and true grows, then current-morning cap applies to the next offer. No-offer stopped/no_response days each reduce carrySize one rung; deliberate off days preserve carry. No automatic removal. | U10, U11, U12, U13 |
| C57 | With no voice messages, show the step alone. Do not insert a message written by the team or generated text as a substitute. | U10 |
| C58 | If Place sound setup is skipped, use bundled Sea. | U10 |
| C59 | Require at least one goal and allow at most three. Begin with one goal field and offer Add another below it; do not initially display three empty goal fields. | U10 |
| C60 | Use Tiny → Small → Full order everywhere sizes are listed. Tiny is up to 2 minutes and doable at home; Small up to 10 minutes; Full up to 30 minutes. Show time limits as quiet captions beside/below their editable ladder entries. | U10 |
| C61 | One Approve per goal requires all steps non-empty and ≤60 characters. Preserve edits without Gemma regeneration. On edited non-localOnly Approve, save immediately and run one Decisions hint check; show hints afterward without overriding the person. Never send localOnly steps. | U10, U17, U18 |
| C62 | source: fallback shows three empty step fields with example placeholders and one Approve button. A first needs_support verdict opens Help with no ladder; C70–73 define returning, resubmitting, manual steps, checks, privacy and deletion. | U10, U11 |
| C63 | Changing an approved goal's text asks once whether to suggest new steps or keep the current steps. Do not silently regenerate the ladder or discard its current edits. | U10 |
| C64 | Use the latest 14 prior spoke/silent/skipped mornings; numerator counts spoke only. Exclude unavailable/failed/late/off. n <5 means not usually speaks; otherwise spoke count ≥ceil(n/2). Configure 14, 5 and one-half. U13 resolves silent denominator inclusion (C100). | U11, U12, U13 |
| C65 | Main-baseline eligibility includes completed normal holds within 60 minutes plus early holds, including hard mornings. Exclude stopped/late/no_response/off. Early minutesToUp is 0 with a separate early amount. | U11, U12, U13 |
| C66 | Score using prior mornings only, then append today if eligible. Stored main history <5 uses 0 snoozes/8 minutes; 5–13 uses clamped running medians; 14 freezes with source dates. Thus fifth qualifying morning uses defaults and sixth uses the first five's median. Bounds remain snoozes≤1/minutes≤12; timing comparisons separately floor the effective baseline at 1 without mutating storage. | U11, U20 |
| C67 | Separate fixed voice history is first 14 qualifying valid spoke recordings. Score against prior samples before adding today. Below 5 prior valid recordings both onset/quiet terms are 0; median max 0.4 is stored after fifth and used from sixth; freeze after 14. Silent never enters this baseline. | U11, U13, U14, U20 |
| C68 | Persist frozen baseline values with the dates of their source mornings/recordings. The main and voice baselines can freeze on different days. Preserve the user-specified test cases listed below; these tests are requirements, not completed verification. | U11 |
| C69 | Shared progression uses the previous offered final stepSize/stepDone, not prior level. Late Tiny true gives Small; false/null gives Tiny, then apply the current-morning cap. Stopped level cannot force Tiny after a completed offered step. C81 defines the intervening stopped/no-offer example. | U11, U12 |
| C70 | First needs_support opens Help with its usual controls plus Back to my goal. Returning preserves the entered goal, editable, with exact line “You can change the wording, or write your own steps.” and Check again / Write my own steps. Check again resubmits current text; Write my own steps opens three empty fields and one Approve button. | U11 |
| C71 | If resubmission is flagged again, stay inline with the same line and a Need help now? link; do not reopen Help automatically. Never call the model to produce steps while that goal's latest verdict is needs_support. Checking revised goal text remains the explicitly allowed Check again action. | U11 |
| C72 | Shared phrase checking is local first for goals and manual steps. A local matching goal is not submitted and opens needs_support Help; matching manual steps are not saved/sent. Nonmatching goals may reach POST /goals/shrink for server recheck before the model. No /goals/check-steps route. C102–103 govern privacy/storage. | U11, U12, U13 |
| C73 | After needs_support the person may delete the goal and enter a different one. At least one approved goal remains required to complete Goals setup (C59/C61); deleting a flagged entry is not prohibited. | U11 |
| C74 | One goal per offered day in setup order/wrap, advancing on message/late/Home offer regardless of completion/removal. No-offer days do not advance. Late no_response and stopped holds both count as offered; no_response level alone no longer implies no offer. | U11, U19 |
| C75 | Store the rotation pointer on the phone. Adding, deleting or reordering goals in Settings retains the same pointed-to goal if it still exists; otherwise move to the next. The precise next-goal choice when deletion/reordering removes the target remains open; do not invent a fallback ordering. | U11 |
| C76 | Keep per-goal counts of steps offered, done and removed on the phone only. Do not use these counters in any rule yet. Step-size learning is shared across goals and uses the previous offered day, not separate per-goal difficulty histories. | U11 |
| C77 | Stitch governs Plus Jakarta Sans typography (light clock, regular/medium otherwise, minimum 16), full-width pill buttons with word labels only, dark layered large-radius cards with soft glow/no drop shadows, sparse spacing and controls in the lower half. | U11 |
| C78 | HTML governs the landscape/sun redrawn for night-to-dawn, wording, and setup-ladder, Settings-row and Help-content layouts, restyled with Stitch type/cards/buttons. Do not use its light theme, white shadowed cards or Nunito. Latest explicit user wording/flow decisions override reference copy; this style choice does not import excluded mood/size selection or unsupported simulated actions. | U11 |
| C79 | Propose and proceed with a fresh night-to-dawn palette without waiting. Name every color in src/theme.ts and derive landscape layers from those tokens. Night screens suit a dark room; text contrast is ≥4.5:1 throughout dawn; no red/green meaning about the person; one warm primary-action accent. Time-box palette work to 30 minutes and deliver Alarm, Message and Home screenshots for review. | U11 |
| C80 | Add the user-specified usual-speaking, baseline, late-step, support-return/manual-check and rotation tests listed below. They are authorized requirements for implementation, not claims that code or tests already exist. | U11 |
| C81 | Monday completed Small produces Full carry; Tuesday stopped/no-offer reduces it to Small for Wednesday before the morning cap. U13 generalizes this: each no-offer stopped/no_response day decreases carry one rung to Tiny; off preserves carry. No no-offer day advances rotation. | U12, U13 |
| C82 | Successful silence uses voiceState silent, never spoke. It occupies the rolling usual-speaking denominator/window but not spoken numerator, and does not enter the spoke-only fixed voice baseline. Unavailable/failed occupy neither. U14 resolves its score gate and the independent spoke gate (C111–112). | U12, U13, U14 |
| C83 | Early Home I’m already up opens at max(scheduled alarm−180 minutes, local midnight of the alarm date), closes at fire, and is hidden on off days. Early hold stays silent/static-sky then voice/message/step; cancel today's system/in-app alarms and confirm sun/partner. minutesToUp/snoozes = 0; minutesBeforeAlarm is the non-negative floored interval, early-only (C160–161). | U12, U16, U17 |
| C84 | Include Reply to your past self. Say something back at the message stage on medium/hard mornings records a note up to 20 seconds, stored on the phone. | U12 |
| C85 | Easy Home offers oldest unanswered note with Play/Answer it; save answer as a message for note's source level. U21 personal recordings all require a tap and offer Play/Record again/Save/Cancel. Presenter records personal audio; only gated composed pieces may be pre-generated. Original-note retention and answer-duration detail remain open. | U12, U15, U21 |
| C86 | Omit sending a thought: remove its control, POST /partner/thought route, thoughtWaiting field, thought WebSocket event and related tests. Keep partnerQuietDays. Mark the feature not built and remove it from active API/build scope; older references are superseded. | U12 |
| C87 | Include personal place recording, up to 30 seconds, in setup 3 and Settings. Use it only for the in-app dawn; locked alarms retain bundled sound variants. Skipped Place still uses Sea. | U12 |
| C88 | Delegate ordinary engineering choices (folders, libraries, code organization) within Expo + TypeScript, Fastify, PostgreSQL and Valkey. Existing rule-file layouts are suggestions. Ask for product, privacy, external-service or demo changes rather than ordinary implementation choices. Hosting/providers are not silently authorized. | U12 |
| C89 | Ask before any new SDK/service sends data off-device or off-server, including analytics, crash reporting, hosted logging, remote config/storage and hosted speech/audio. Audio never goes to a server. Record a reason for each dependency in NOTES.md. | U12 |
| C90 | Shared phrase configuration checks goals/manual steps locally first and rechecks nonmatching goals server-side. U17 approves the phrase list and authorizes integration; native Finnish review remains unconfirmed, not an additional shipping gate. Keep later Swedish structure and no manual-check endpoint. Decisions follows the shared phrase check (C171–180). | U12, U13, U17 |
| C91 | Entries cover explicit statements of intent to die or harm oneself only. Exclude broad/ambiguous words such as tired, hopeless, pain, burden, die or kill alone. Target roughly 15–25 entries per language. | U12 |
| C92 | Match case-insensitively after Unicode normalization and collapsing punctuation/repeated whitespace. Use English whole phrases and Finnish stems for inflections. Deliver one reviewable file, one entry per line, each with a short English-meaning comment; mark Finnish entries needs native review. Technical implementation within these rules is delegated. | U12 |
| C93 | Never show the phrase list in-app or emit/report a local match. Local matched goal/manual text is not submitted. Server needs_support stores/logs neither text nor verdict and creates no row/counter/metric; route/status/duration logging is allowed. Only approved non-localOnly goals are stored through PUT /goals. A retained manual needs_support goal stays localOnly (C128–130). | U12, U13, U14 |
| C94 | English/Finnish examples cover matches/nonmatches and ordinary excluded words. Candidate tests do not establish clinical/native accuracy or integration. U17 supplies explicit user approval of the list; do not continue treating user approval as pending. | U12, U17 |
| C95 | The U12 alternative visual-reference branches were unanswered then. U13 resolves them: no further references are coming; all remaining screens use the agreed mix (C104). | U12, U13 |
| C96 | carrySize decreases one rung to Tiny on each no-offer no_response or stopped day; the stopped interaction type does not itself create an offer. Existing offered true/false/null progression and morning cap remain. Late holds under either frozen category count as offered instead (U19). | U13, U19 |
| C97 | Introduce level: off when the person deliberately disables the alarm before it fires. Off preserves carrySize, has no step offer or rotation advance, is excluded from sensing baselines and usual-speaking history, emits no partner_up and does not count toward partnerQuietDays. Whether it pauses or breaks a consecutive quiet run remains open. | U13 |
| C98 | Clinic off days are excluded from 7/14-day averages and hard/stopped/no_response counts, with a neutral last14 marker. A current off run ≥7 supplies the off-duration reason; U14 separately requires insufficient when fewer than three recent observations exist, superseding any inference that an all-off week carries forward the old current status (C115–118). | U13, U14 |
| C99 | On an off day Home says “Alarm is off today.” with a re-enable action. Before today's scheduled time restore today without minimum lead time; after it, keep today off and schedule tomorrow with the specified transient line (C113–114). | U13, U14 |
| C100 | Usual-speaking denominator/window includes spoke, silent and skipped, with spoke alone in the numerator. Unavailable and failed are in neither; late/off remain excluded. Keep the most-recent-14-before-today, minimum-5 and ceil(n/2) rules. Fixed speechShare baseline continues to use valid qualifying spoke samples only. | U13 |
| C101 | Required example: 5 spoke + 9 silent gives not usually speaks; a further silent OR skipped morning adds zero voice points. U14 generalizes the silent gate to the usual-speaking predicate, removes unconditional null-onset points, and separately requires fixed-baseline readiness for voiced onset/quiet rules (C111–112). | U13, U14 |
| C102 | Run shared phrase checking locally first on both goal and manual-step text. A matched goal never submits its text and follows needs_support Help; a matched manual step is not saved/sent. Emit no local-match event/report. Send nonmatching goals to POST /goals/shrink; the server rechecks before the model and may return needs_support from either its list or model result. No check-steps route. | U13 |
| C103 | Server needs_support creates no stored/logged text/verdict, row, counter or metric; route/status/duration logs only. Approved non-localOnly PUT /goals is the goal-storage boundary. U14 keeps manual overrides of either local or endpoint needs_support phone-only (C128–130). NOTES discloses nonmatching goal transmission to the configured model provider and production self-hosting need. Audio never reaches the server. | U13, U14 |
| C104 | No further visual references are coming. Design all remaining screens in the agreed mix: Stitch type/cards/buttons/spacing, HTML landscape/wording/content-heavy layouts. Deliver Alarm, Message and Home screenshots for review; the already-delivered visual previews satisfy that review artifact request but are not native validation or implied palette approval. | U13 |
| C105 | Authenticated event-key ListModels returned Gemma 4-31B and 4-26B-A4B; root selected the listed 31B model in ignored environment. A subsequent synthetic 31B request through Gemini’s OpenAI-compatible chat completions returned HTTP 200 and passed zod validation (C158). Use the selected compatible transport; this is capability evidence, not product-route integration or quota assurance. | U13, U15, U16; sanitized provider reports |
| C106 | Assume no system role and no enforced JSON mode: instructions in the user message, response validated with zod. U15 requires the event key's actual ListModels result before selection; public docs are not authenticated availability or a generation/compatibility test. | U13, U15 |
| C107 | Aiven PG/Valkey EU remain approved. U16 selects Cloudflare Quick Tunnel for the local demo backend after the U14 feasibility question. Keep API URL configurable and credentials private. A provider choice does not establish that a tunnel is running or the cross-network phones work. | U13, U14, U16 |
| C108 | Real pairing uses POST /partner/match: mode code without a code generates one; the other phone submits that code. No hard-coded or preseeded pair. Pairing survives app restart and reinstall when the same user token is retained/restored; identity-restoration method remains open. | U13 |
| C109 | Real partner transport is public HTTPS/WSS across mobile data/different networks, not direct phone-to-phone/LAN. Reconnect WebSocket with backoff. While foreground and paired, poll GET /partner every 5 seconds and refresh on foregrounding. Whichever source first reports partnerUpToday updates the sun; duplicate observations do not replay its animation. Keep demo Partner gets up now. | U13 |
| C110 | Add requested tests for carry Full→Small→Tiny→Tiny, mixed no_response/stopped gaps, off carry/rotation preservation and seven-day off reason; 5-spoke/9-silent history and next silent/Skip zero; real code pairing/restart/WebSocket-cut polling/no duplicate animation. These are requirements, not execution claims. | U13 |
| C111 | A valid silent recording uses exactly the Skip gate: +1 only when rolling n ≥5 and usuallySpeaks, otherwise 0. Remove the unconditional speechOnsetMs/voiceOnsetMs-null point. | U14 |
| C112 | For spoke recordings retain the selected delayed-onset (≥2500ms) and quiet-share (≤0.6 × fixed baseline) conditions, but apply either only once the relevant fixed voice baseline has at least five valid recordings. Cap the entire voice term at one point when multiple conditions fire. | U14, selected master §5.1 |
| C113 | Re-enable before today's scheduled time restores today's original system/in-app schedule and clears off to pending, with no minimum lead time. Show I’m already up inside the 180-minute window confirmed by U16. | U14, U16 |
| C114 | Re-enable after today's scheduled time: today stays off with all off rules; schedule tomorrow. Do not ring, start a hold, or create/modify a morning beyond level off. Show transient “Your alarm is back on for tomorrow at {time}.” Exactly-at-time behavior is not specified. | U14 |
| C115 | Add clinic status insufficient, labelled “Not enough recent mornings”, when the last seven days contain fewer than three observed mornings. Observed means any non-off morning record; a missing record is not observed. Never call this steady or carry a previous status forward as current. | U14 |
| C116 | Persist each user's last classified status and date and present them as historical facts in the supplied reason templates: “Alarm off for N days. Last status: X, D days ago.”; “No mornings recorded in the last 7 days. Last status: X, D days ago.”; or, with no previous status, “Started D days ago. N mornings recorded.” | U14 |
| C117 | Clinic sort order is might_need_call, drifting, insufficient, steady. Within insufficient, longest time since the last observed morning sorts first. Never-observed/tie ordering beyond this is unspecified. | U14 |
| C118 | With ≥3 recent observations but <5 in the preceding comparison fourteen days, skip both average-difference rules and use the remaining count/completion rules. If none fire, steady with limited history appended. Configure 3/5 readiness thresholds. U16 selects exact windows and base rules (C145–149). | U14, U16 |
| C119 | Scheduling for this build is one daily alarm time and one on/off switch. No weekday selection, multiple alarms or one-off skip. Off persists until switched on. List weekday selection under not built in NOTES.md. | U14 |
| C120 | Schedule wall-clock alarm time in the phone's current timezone so it follows travel. Display the phone's locale and 12/24-hour setting. | U14 |
| C121 | Set localDate from the phone's local date at first ring or early hold, then keep it fixed. Store the UTC offset in minutes alongside it; add optional utcOffsetMinutes to the morning API. | U14 |
| C122 | Late-flow cutoff, stepDone becoming null, carrySize update and sun reset use local midnight in the timezone recorded for that morning. A midday timezone change does not rewrite its localDate. | U14 |
| C123 | Reschedule the next alarm on system timezone or clock change. Keep one record per localDate. Duplicated/skipped travel dates are explicitly not handled for this build; record that limitation in NOTES.md. | U14 |
| C124 | Foreground in-app ringing, including Ring now, uses 2/4/6-minute dawns; fast time uses 10/15/20 seconds respectively. Opening Aamu after a system alarm instead uses the separate 20-second landing dawn. | U14 |
| C125 | Select foreground dawn from the last three observed mornings within the past 14 days, skipping off: easy is light, medium middle, hard/stopped/no_response heavy. At least two heavy →6 minutes with lower starting volume; at least two light →2; otherwise 4. Fewer than three observations →4. Put durations/thresholds in config. | U14 |
| C126 | A hold before dawn ends takes effect immediately and advances to voice. Compress the remaining sky animation into about three seconds, with no jump/freeze; fill and raise the sun on the hold. Fade place sound over about two seconds before any message plays. | U14 |
| C127 | Snooze holds the sky at its current position and dims it slightly; the next ring resumes from there. This settles the visual resume, without inventing unspecified sound/interruption behavior. | U14 |
| C128 | A goal kept through Write my own steps after latest needs_support from either local check or endpoint is localOnly: title and all three steps stay on the phone. Exclude the whole goal from PUT /goals; send no title, steps or localOnly/existence marker. Do not require/suggest a changed title or offer consent to transmit it. | U14 |
| C129 | Morning records for localOnly goals still send a locally generated opaque goalId, stepSize and stepDone, with stepText null. Make stepText nullable in the API; server logic must not depend on stepText or a corresponding server goal existing. Do not add a privacy marker. | U14 |
| C130 | Treat localOnly goals identically in rotation/carry/local counts/Home/message behavior. A voluntarily reworded goal passing both checks clears localOnly for next PUT. If a synced goal becomes localOnly, next PUT removes server title/steps and nulls historical morning stepText for that ID, retaining opaque ID/sizes/outcomes (C163). | U14, U17 |
| C131 | Add U14 tests for silent and spoke gates, off re-enable before/one minute before/after, clinic insufficient/thin/history reasons, timezone/localDate/midnight rules, dawn classifications/insufficient gaps/early hold, and localOnly payload/rotation/clean recheck. These are pending product tests, not executed candidate-checker results. | U14 |
| C132 | The event GEMINI_API_KEY was privately supplied and authorized for use. Authenticated ListModels now reported actual Gemma/Lyria entries; the key is never copied into this ledger/tests/logs. Earlier key absence was unknown availability, not proof of unavailability. | U15, U16 |
| C133 | Use an actually listed Gemma with the same event key for shrinking if possible. Listed31B is selected privately; the synthetic compatible-endpoint probe now verifies that narrow capability. Real goal endpoint, safety handling and production latency/retry behavior remain untested/unselected as applicable. | U15, U16; root execution evidence |
| C134 | Historical preparation: dependency-free paginated ListModels CLI syntax passed and its first keyless invocation exited 2 without a request. U16 then supplied the key privately; authenticated discovery succeeded with sanitized results (C157). This supersedes the earlier pending-key state. | Root execution evidence, 14 November 2026 |
| C135 | Composed dawn is stretch only after the full core demo script passes on two phones and Lyria is available on this key. If Lyria is unavailable, do not build it and tell the user. The full core script still needs agreement; this request does not replace the main objective. | U15 |
| C136 | Gated POST /dawn/compose body is {place: sea or forest, tier: light/middle/heavy, seconds}. Fixed-template prompt: instrumental, no vocals/sudden changes, near-silent start and rise, slower/sparser heavy. Send no user ID, goals, raw morning levels or person-authored text to the model; only the specified selectors inform the template. | U15 |
| C137 | Call the available Lyria through Gemini and stream generated audio back without server storage. The route returns audio but accepts none; the personal-audio upload ban remains. No other provider or personal-audio processing is authorized. | U15 |
| C138 | After morning flow, the phone requests tomorrow's piece in the background, caches it locally and plays it under place sound during in-app dawn. Never generate in the alarm path. Without a cached piece, existing dawn runs unchanged. | U15 |
| C139 | Not this sound discards the generated piece and falls back to place sound. Cache lifetime, exact duration validation and audio-mixing values remain unspecified for the gated stretch. | U15 |
| C140 | After both stretch gates pass, pre-generate composed pieces for the demo phones before presentation. This narrow synthetic-audio exception does not authorize seeding personal voice/notes, uploading recordings or changing bundled locked-alarm sound. | U15 |
| C141 | Use Cloudflare Quick Tunnel for the local demo backend. The public HTTPS/WSS requirement for two phones on separate networks remains. Provider approval is not evidence of deployment/transport testing. | U16 |
| C142 | Early control opens at the later of alarm−180 minutes and local midnight of the alarm's calendar date; closes when alarm fires and stays hidden on off days. Never show it on the prior calendar day. Configure earlyHoldWindowMinutes = 180. | U16, U17 |
| C143 | Early hold plays no dawn animation, place sound or composed piece. Sky is static for current time of day; on hold sun fills/rises and partner_up publishes. Cancel today's system/in-app alarms and go directly to voice, message, then step. | U16 |
| C144 | Early minutesToUp = 0 and snoozeCount = 0; minutesBeforeAlarm = floor((scheduledAlarmTime−holdCompletedAt) in minutes), non-negative and only set on early holds, null otherwise. Early localDate is the alarm calendar date. U17 completes the previously truncated sentence. | U16, U17 |
| C145 | Clinic recent window is the seven most recent calendar days, including today only if today's morning has a final level. Comparison window is the fourteen calendar days before that recent window. Off/absent days are excluded; averages divide by observed days only. | U16 |
| C146 | Clinic numeric values remain easy = 0, medium = 1, hard = 2, stopped = 2 and no_response = 3. Late confirmation does not change the frozen level; both late-stopped and late-no_response retain their existing numeric/count treatment. Stopped never counts as no_response. | U16, U19 |
| C147 | After the insufficient gate, might_need_call wins if any recent trigger fires: no_response count ≥3; hard+stopped+no_response count ≥5; or recent average minus comparison average ≥1.0. | U16 |
| C148 | Otherwise drifting if any: recent hard+stopped count ≥3; average difference ≥0.5; or stepDone true on ≤2 of the recent seven calendar days AND ≥4 of the seven days before. Otherwise steady. | U16 |
| C149 | Skip both average rules below five comparison observations; keep thresholds in config and list every fired rule. U17 resolves stopped wording by upAt: confirmed later versus unconfirmed; count them separately in the reason but keep both value 2 and stopped rule membership. | U16, U17 |
| C150 | Initialize carrySize Small before the first offered step. First-morning easy/medium offer Small; hard offers Tiny; never Full. Afterward normal update rules apply, including completed Small permitting Full. | U16 |
| C151 | Deleting all goals and later creating new goals preserves carrySize. Reset carry to Small only when app data is reset. This does not settle what else app-data reset removes. | U16 |
| C152 | Message eligibility is not blocked and recorded for the morning's level. If none, follow only the specified gentler fallback sequence easy→medium→hard, medium→hard, hard→none; never brighter. With none eligible show step/no audio. | U16 |
| C153 | After level/fallback eligibility, exclude yesterday's played message if another remains; prefer timesPlayed = 0. Otherwise choose highest (timesFollowedByDoneStep+1)/(timesPlayed+2). | U16 |
| C154 | Message ties: earliest lastPlayedAt with never-played first, then earliest createdAt, then lowest id. Default selection has no randomness. | U16 |
| C155 | If Thompson-sampling stretch is later built, replace only score step 5 with seeded generator in tests; preserve eligibility/fallback/no-repeat/unplayed steps 1–4 and tie order. Conditional wording does not authorize building this stretch now. | U16 |
| C156 | Add tests for clinic triggers at/just below thresholds, three stopped→drifting, five stopped→might_need_call, pending-today exclusion; first-morning size for each level and completed Small→Full; no brighter fallback, hard with only easy→no audio, unplayed createdAt tie and equal-score lastPlayedAt tie. All are pending product tests. | U16 |
| C157 | Authenticated ListModels succeeded 2026-11-14T03:46:02.737Z: one page, 64 models. Gemma 4-31b-it/4-26b-a 4b-it; Lyria3-clip-preview/3-pro-preview/3.5/realtime-exp. Sanitized metadata is review/provider-models.json. This confirms key-specific listing, not generation/quota; full two-phone core pass remains absent. | Root execution evidence; sanitized file inspected |
| C158 | At 2026-11-14T03:58:16Z, root’s synthetic-only gemma-4-31b-it capability probe through Google Gemini OpenAI-compatible chat completions was recorded HTTP 200, live request 12983ms and validated with zod 4.6.7, without system role or JSON mode. Four HTTP probes occurred; the fourth response was retained transiently and validated after a local parser fix without another request. No request/response text is stored in the sanitized report. | Root execution evidence; review/provider-generation.json inspected |
| C159 | Five local parser tests passed. The probe response echoed the exact scaffold and repeated an identical answer; parser ignores the exact scaffold, deduplicates identical valid payloads and rejects distinct alternatives. This is probe-only parsing evidence, not the product goal endpoint/safety integration, Lyria generation, quota guarantee or two-phone demo pass. | Root execution evidence; api/scripts/parse-model-object.test.mjs and sanitized report |
| C160 | minutesBeforeAlarm is floor((scheduledAlarmTime−holdCompletedAt) in minutes), non-negative on early holds and null otherwise. There were no further missing early-field instructions. | U17 |
| C161 | The early window opens at max(alarm−180 minutes, local midnight of its calendar day), never on the previous day; closes at fire. Early localDate is the alarm date. Examples:07:15→04:15;02:00→00:00;00:30 early hold for02:00 records90 minutes. | U17 |
| C162 | Clinic stopped with upAt set says “alarm stopped; getting up confirmed later”; without upAt says “alarm stopped but getting up not confirmed”. Count both separately in the reason; both retain value 2 and hard/stopped-rule membership. | U17 |
| C163 | If a server-stored goal becomes localOnly, next PUT /goals removes its server title and step texts and sets stepText null on all existing mornings with that goalId. Keep opaque ID, sizes and outcomes. Do not add a localOnly marker or retransmit private text. | U17 |
| C164 | Server timeout 25 seconds covers the whole Decisions→Gemma→Decisions sequence; one attempt per stage, no retry. Client timeout remains 30 seconds. Do not grant each stage a separate 25-second budget. | U17, U18 |
| C165 | Manual entry keeps original suggestions loading. Use Suggestions are ready/View→Use these steps/Keep mine; replacement only changes editable fields and still requires Approve. Approved manual text saves locally, waits for original check before remote save, then syncs on technical failure/timeout; needs_support instead triggers Help/localOnly/erasure. | U17, U19, U20, U21 |
| C166 | Check listed smaller Gemma models. If one produces acceptable ladders in under 5 seconds, propose switching LLM_MODEL and show three sample ladders from each. Do not silently switch or claim one fast synthetic request establishes repeated latency. | U17 |
| C167 | timesPlayed increments once per message per local day when audible playback reaches 3 seconds, or the end if shorter. Same-day replays add nothing. Pause after the threshold still counts; Settings playback never counts. | U17 |
| C168 | Show today's step as soon as the message starts. Only that morning's selected message earns completion credit: increment timesFollowedByDoneStep when stepDone becomes true that local day, decrement if Done is undone. | U17 |
| C169 | A rested message earns no play/credit. Rest after today's selected message has earned play/credit removes today's play and credit only; preserve older history. | U17, U18 |
| C170 | The user approves the phrase list and asks for Decisions in the app. Native Finnish review has not been established; retain that evidence limitation without treating it as an additional user-approval or shipping gate. | U17 |
| C171 | Add Decisions via @google/genai SDK 3.2+, v1beta, ai.decisions.create, gemini-decision-1 and same Gemini key; read linked official documentation first. The initial harmless synthetic access probe succeeded using SDK 3.3.0 in 395ms with one request/retries 0 (C181), not a validated product pipeline. | U17; root execution evidence |
| C172 | POST /goals/shrink first uses shared phrase checks, then one Decisions call on goal text: a noul distress question with true criteria wants to die/intends to end life/self-harm, plus described choice ok/too_big/too_vague. Use full positive sentences with one decision per question. | U17 |
| C173 | Initial distress probability≥configured 0.3 or HTTP 400 safety/prohibited_content/blocklist/content_blocked returns needs_support and skips Gemma. Safety-block 400 during duration/concreteness checking instead triggers Help and localOnly, including edited-step approval (C186). | U17, U18 |
| C174 | If initial check allows it, Gemma writes the ladder only. Then one Decisions call receives goal+three steps: for each step a duration score with ordered levels Under 2 minutes, at home /2 to 10 minutes /10 to 30 minutes /More than 30 minutes, and a noul concrete-action question. | U17 |
| C175 | sizeHint appears when duration argmax exceeds slot index 0/1/2 or concrete probability<0.5. Show one quiet line under the step, no auto-regeneration, person's edit/approval wins. Edited Approve saves immediately; hints appear afterward. | U17, U18 |
| C176 | On edited non-localOnly Approve, save immediately and run the step judge once for hints afterward. Never send localOnly steps or regenerate with Gemma. A safety-block follows Help/localOnly handling, including server erasure when already synced. | U17, U18 |
| C177 | Goal-choice confidence<0.6 becomes ok. Confident too_big/too_vague shows ladder with the exact U19 advisory, never a block/automatic rewrite. | U17, U18, U19 |
| C178 | If initial Decisions is unavailable, use current Gemma verdict path and mark source. If final Decisions fails after Gemma has generated, show failure and offer manual steps; return no unchecked ladder and do not call Gemma again. Specific safety-block errors follow Help/localOnly. | U17, U18 |
| C179 | Never store, log, display or expose distress probability. Demo-only Under the hood may show step-duration probabilities and goal verdict only, never distress probability. Preserve needs_support text/verdict retention restrictions and localOnly exclusion. | U17 |
| C180 | Use full-sentence positive questions with one decision each. Add labelled example-goal fixtures to choose thresholds, plus safety-error, mis-sized Tiny and fallback tests. Threshold starts remain 0.3 distress and 0.5 concrete/0.6 confidence as specified; fixture outcomes do not silently change product thresholds. | U17 |
| C181 | Initial Decisions probe succeeded 2026-11-14T04:15:39.567Z: gemini-decision-1, SDK 3.3.0, one harmless synthetic noul call, 395ms, retries 0 and typed response validated. No prompt/probabilities stored/output. Sanitized review/provider-decisions.json was inspected; this proves narrow access only. | Root execution evidence |
| C182 | The 25-second server cap is for the whole Decisions→Gemma→Decisions sequence, with one attempt per stage and no retry; client 30 seconds remains. | U18 |
| C183 | Final-judge failure after a ladder exists returns failure/manual option, never unchecked ladder or another Gemma call. Specific safety-block 400 follows the separate Help/localOnly rule. | U18 |
| C184 | Confident too_big/too_vague shows the ladder with U19 exact advisory copy (C189). Wording is now approved; do not re-ask or invent blocking behavior. | U18, U19 |
| C185 | Edited non-localOnly Approve saves immediately; subsequent judge hints display afterward. No hint overrides the edit or approval. | U18 |
| C186 | Safety-block HTTP 400 during duration/concreteness checking triggers Help and localOnly, including the edited-approval check. Existing localOnly privacy/next-PUT server-erasure rules apply. | U18 |
| C187 | Rest today's selected message after earned play/credit removes today's play and credit only. Preserve all older history. | U18 |
| C188 | Exact waiting: “Finding a small place to start…”; failure: “We couldn’t suggest steps this time.” Existing Write my own steps/Try again actions remain. | U19 |
| C189 | Exact too_big advisory: “This is a big goal. These steps are a place to start.” Exact too_vague: “These steps make a starting point. Edit them to fit you.” | U19 |
| C190 | Exact duration hint: “This may take more than {2/10/30} minutes.” Exact concreteness hint: “Try one action someone could see you do.” When both apply, combine both into one quiet line. | U19 |
| C191 | Separate suggestion controls preserve manual text until explicit replacement. Use these steps changes fields only and still requires Approve. If manual text exists, ask once: “Replace the steps you wrote?” with Replace/Keep mine. No automatic replacement/approval. | U19, U20, U21 |
| C192 | With no hold completed within 60 minutes of first ring, no interaction of any kind means no_response; any single system Stop/system snooze/in-app snooze/Aamu open means stopped. App open then close and one snooze alone are sufficient interaction. | U19 |
| C193 | Measure the 60-minute window only from first ring; snooze re-rings never extend it. Fast-time equivalent is 60 seconds. Neither finalized stopped nor no_response later converts to the other. | U19 |
| C194 | At the cutoff decide the level while running; otherwise decide on next launch from persisted first-ring, Stop/snooze and app-open evidence. Backfill every past alarm-enabled day with no record, then sync. Off/disabled dates are not invented alarm-enabled gaps. | U19 |
| C195 | Unobservable system Stop produces no_response only if no interaction was observed. Any recorded snooze/app open/other listed interaction still yields stopped without a timely hold. Document the native Stop observability limitation; never fabricate events. | U19, U20 |
| C196 | A late no_response open after 60 minutes/before local midnight offers the same silent hold→Tiny/hard-message-on-Play flow as stopped. On completed hold set upAt, publish partner_up and count an offered day; keep no_response frozen. No late voice or automatic sound. | U19, existing late-flow rules |
| C197 | Snooze stops sound and schedules the next native ring at the agreed five-minute snooze duration. Snoozes are unlimited. Existing combined count, held/dimmed sky and first-ring-origin window remain. | U19, U8 |
| C198 | Connectivity is required to finish setup. This supersedes any assumption that fully offline setup completion is supported. | U19 |
| C199 | Denied alarm permission blocks setup completion and offers Open Settings. Microphone/other permission timing and failure states are separate. | U19 |
| C200 | Required tests: untouched alarm→no_response; one system snooze then nothing→stopped; app open/close→stopped; three missed enabled days backfilled on next launch; late hold on no_response. Product/device execution remains pending. | U19 |
| C201 | Separate result flow: Suggestions are ready/View→Use these steps/Keep mine. U21 fixes confirmation “Replace the steps you wrote?” with Replace/Keep mine and fields-only replacement followed by existing Approve. | U20, U21 |
| C202 | While original check runs, manual approval saves on-phone and defers remote save. If it fails/times out, release sync normally and keep manual approval. Later needs_support still opens Help, sets localOnly and removes previously synced text; technical failure is not needs_support. | U20, U21 |
| C203 | Any observed interaction within the first-ring window means stopped when no timely hold exists, even if system Stop events are unavailable. no_response fallback applies only when nothing was observed. | U20 |
| C204 | Late-confirmed no_response clinic copy: “no response in the first hour; getting up confirmed later”. Keep level value 3 and all no_response counts unchanged. | U20 |
| C205 | Score today using baselines built only from previous mornings, then append today to qualifying history afterward. Apply this ordering to main and independent voice baselines; current-day measurements cannot change their own score. | U20 |
| C206 | Fifth qualifying morning still scores with default main baselines; sixth first uses the five-prior median. Likewise, the fifth valid qualifying spoke sample is scored with only four prior samples and cannot enable its own voice term. | U20 and direct consequence for selected voice history |
| C207 | Timing comparisons use max(1, stored baselineMinutes). Apply that effective baseline in both timing thresholds while preserving the stored baseline, including zero. Do not alter the early minutesToUp = 0, median history or frozen values. | U20 |
| C208 | Original goal-request failure/timeout after local manual approval releases those approved steps for normal sync. Keep the manual approval; do not require another successful goal check or label technical failure localOnly. | U21 |
| C209 | Use these steps replaces only editable fields and requires the existing Approve button afterward. Exact confirmation: “Replace the steps you wrote?”; actions Replace and Keep mine. | U21 |
| C210 | Approved morning-message library labels: “For an easier morning”, “For an in-between morning”, “For a hard morning”. Each morning-message recording is at most 20 seconds. Replies remain 20 seconds and personal place sounds 30 seconds. | U21, including approved question text |
| C211 | Every personal recording—morning message, reply, answer to a reply, place sound—requires a tap to start, then offers Play, Record again, Save and Cancel. This does not change automatic five-second sensing. | U21 |
| C212 | Evening completion reminder is 18:00 local, with Yes and Not today. No reminder when the step is first offered late in the day (answering the question about offers after that time). Do not equate this with every late-wake flow. U23 resolves at/after-18:00 and Done/Undo suppression in C217. | U21, U23 |
| C213 | After completed hold, closing Aamu during the five-second sample makes it failed with zero points; reopening continues to message. Do not restart or resume that sample. Existing failed-history exclusion remains. | U21 |
| C214 | Pairing codes remain valid until used, with no time-based expiration; redemption consumes the code and prevents reuse. Explicit runtime configuration is PAIR_CODE_TTL_SECONDS=0; unset remains unconfigured. The old 24-hour proposal is superseded. | U22 |

| C215 | Deleting a goal preserves any step already offered today and moves the rotation pointer to the next surviving goal in the existing order. | U23 |
| C216 | Per-goal offered and removed counts increment once per dated day; Done counts only while currently marked Done and Undo subtracts it. Counts stay on the phone and do not affect rules. | U23 |
| C217 | Suppress the 18:00 local reminder for a first offer at/after 18:00 or an already-Done step; restore an eligible reminder if Done is undone before 18:00. Request notification permission during Alarm setup. Existing removal cancellation remains. | U23 |
| C218 | Expose a visible Demo entry in Settings, with Ring now, fast time, selected difficulty and Partner gets up now. | U24 |
| C219 | Demo uses its own history and leaves real goals, recordings and pairing intact; simulated holds/events send no real morning records or partner signals. | U24 |
| C220 | Reset clears only Demo history and overrides. Personal audio remains presenter-recorded and is never seeded. | U24 |
| C221 | Label anonymous matching and clinic callback simulations Demo. Clinic web uses its own configurable sample data, independently of the real phone feed. | U24 |
| C222 | The user will connect the physical iPhone later. This defers device acceptance; it does not relax locked/closed-app ringing or the composed-dawn gate. | U24 |

| C223 | A retained Home greeting follows local time: morning before 12:00, afternoon 12:00–17:59, evening from 18:00; thresholds/copy in config. Removing the greeting is also permitted by the exact answer. U26 supersedes greeting placement with its five-state hierarchy; retain the clock rules without adding an extra greeting. | U25.1, U26 |
| C224 | Home sky follows current local time; 19:33 renders dusk/night, not dawn. | U25.2 |
| C225 | Filled sun requires confirmed hold; partner half requires partner_up. Alarm off or no hold today renders the unlit outline. | U25.3 |
| C226 | Replace the old “That’s enough for now.” with “That’s enough for today.” only after removing the step at Tiny, with a five-second Undo and then dismissal. Never show it for no offered step/off days or as Home's largest text. | U25.4 |
| C227 | Preview scenes belongs behind the demo flag in hidden demo controls. Header arrow needs a word label or removal; no unlabelled icon buttons. | U25.5–6 |
| C228 | Turn alarm on is the single warm-accent primary button. Help must have ≥4.5:1 text contrast and a visible outline; also check Settings/secondary-button contrast. | U25.7–8 |
| C229 | SUPERSEDED layout choice: U25 allowed a rounded landscape card or full bleed; U26 now selects full-screen landscape on Home and morning flow (C232). | U25.9, U26 |
| C230 | Show next alarm time on Home. While off show “Alarm is off today.”; once turned on show “Next alarm: tomorrow {time}”. | U25.10 |
| C231 | Report every U25 fix with screenshots at 07:00 and 19:30. Clock-controlled web evidence of the actual HomeView is in review/home-u25-report.md and review/screenshots/home-u25; this is not physical-device acceptance. | U25 |

| C232 | Keep the existing color tokens/font. Home and morning flow use the landscape as a full-screen background, not a boxed card. Sky follows local night/dawn/day/dusk; hold confirmation lights the own sun/half and partner confirmation lights its half. | U26.1 |
| C233 | U26 originally used one bottom state card. U27 retains a card for step content but removes the night/early/off wrappers: night has a centered next-alarm clock around 56pt/weight 300, truthful day label and time-gated plain Sleep well; early has Alarm at {time} and I’m already up. Preserve truthful today/tomorrow day labels; an unconfirmed post-alarm morning is not an up confirmation. | U26.2, U27.2–3/7–8, existing timing rules |
| C234 | Confirmed-up state retains “You’re up.” before evening; U27 supplies retrospective evening copy (C246). It has the paired partner line, and “Today’s step · {size}”, actual step text, Done primary and Too much today quiet action inside the single card. Existing Done/Undo and five-second Tiny-removal Undo remain; removal copy is not a general headline. | U26.2, retained U25.4 |
| C235 | From 18:00 until midnight, a confirmed offered nonremoved step with stepDone exactly null uses “Did you get to it?”, its text, Yes primary and Not today. Explicit false is an answer, true is Done, and missing/removed steps never produce an unanswered-step prompt. Off takes state priority; preserve actual hold confirmation. | U26.2, existing outcome semantics |
| C236 | Off state says “Alarm is off today.” with Turn alarm on primary. Use a single warm-accent primary for the screen’s main action; all other actions are outlined or text. Resting/completed presentations do not invent an action just to add a button. | U26.2–3 |
| C237 | Home header: small aamu left, always-visible small Help and Settings text buttons right, each ≥4.5:1 contrast. Remove bottom Help pill. This supersedes U25 footer-Help placement without removing Help access. | U26.4 |
| C238 | Settings has “‹ Back” at top left and grouped list rows/current values right, not stacked pills. Group 1: Alarm (time · On, with time/on-off inside), Goals count, Moments count, Place sound (Sea/Forest/Mine). Group 2: Partner (Paired/Not paired), Your people (Clinic on/off). Remove duplicate Your alarm card; rename Voice messages to Moments when this change lands. | U26.5 |
| C239 | Capture all five Home states plus Settings at 07:30 and 21:00, with a realistic07:00 alarm. Review fixtures may explicitly force the requested state at each clock; they must label this as a scenario, not change scheduler/window/confirmation rules. | U26.6–7, review-only execution boundary |
| C240 | Retain adaptive dawn while ringing. Full-screen layout/current-time Home sky does not remove the existing adaptive dawn, landing or hold-transition timing rules. | U26 clarification |
| C241 | Keep Moments and the past-self note as quiet links inside the single Home card. Preserve playback/reply functionality without a second Home card or another warm primary action. | U26 clarification |

| C242 | The user approves the U26 layout direction. Retain its tokens/font/full-screen composition, with the following U27 refinements rather than another general redesign. | U27 introduction |
| C243 | Real early control and evening question must only appear in their real windows. Clearly disclose forced 07:30/21:00 review scenarios; never add those overrides to the real route/scheduler. Early remains the actual 180-minute alarm-day window; evening requires18:00+ and a confirmed offered nonremoved null-outcome step. | U27.1, retained rules |
| C244 | Show Sleep well only while resting from 18:00 through the overnight period until the clipped early window opens. Render it as plain text immediately under the clock, never card/pill. After today's alarm passed, show tomorrow's alarm/time with no sleep line before evening. A07:00 alarm has Sleep well18:00–03:59, early04:00–06:59, no sleep line from 07:00 to17:59. | U27.2–3 |
| C245 | Remove the hard sky band. Use a smooth full-height multi-stop gradient;06:00–10:00 morning sky is clearly lighter at the top. Tint water using sky tokens rather than a flat grey strip. | U27.4 |
| C246 | Before evening keep You’re up. From 18:00 both confirmed uses a single You both got up today.; unpaired uses You got up today. Never claim both when either confirmation is missing. Paired own-only evening uses You got up today. with Your partner isn’t up yet. below, as confirmed in the U27 follow-up. | U27.5 |
| C247 | Replace Your partner hasn’t checked in yet. with Your partner isn’t up yet. | U27.6 |
| C248 | Early window shows Alarm at {time} above I’m already up. | U27.7 |
| C249 | Remove extra containers around the early-window single button and alarm-off controls. This supersedes U26's universal bottom-card wrapper; preserve step-card/Undo behavior. | U27.8 |
| C250 | Add trailing chevrons to Settings rows, retaining word labels and current values. | U27.9 |
| C251 | Add subtle theme-token ambient motion: night stars twinkle, water shimmer, slow cloud drift and soft breathing glow around lit sun. Disable all ambient motion when Reduce Motion is on; keep overnight work lightweight. Native battery behavior still requires observation, not an assumed claim. | U27.10 |
| C252 | Deliver the same five Home states plus Settings at 07:30/21:00 and a ten-second screen recording of motion. Label forced review states and distinguish browser recording from native-device evidence. | U27 delivery request |

## Challenge supplied by the user

Source: U2, supplied text; not an independent medical or regulatory assessment.

The challenge asks for a product helping people stay well at home after depression treatment. It describes loss of the daily hospital/clinic routine after TMS and invites individualized home support, potentially as a closed loop: sense how someone is doing, respond helpfully, and learn what works for that person.

Suggested audiences include people after TMS, others who could benefit from early everyday support, and clinicians following patients between visits. Suggested sensory, social, exercise, meditation, game, smart-home, wearable and clinician-view ideas are examples, not mandatory features. Special hardware and participation in booth EEG/TMS demonstrations are not requirements in the supplied text.

| Criterion | Weight | Supplied judging question |
| --- | --- | --- |
| Usefulness | 25% | Could it really help people stay well at home? |
| Ease of use | 25% | Would someone recovering from depression actually use it every day? |
| Smart sensing | 25% | Does it make clever use of what can be measured at home, and learn what works for each person? |
| Creativity | 25% | How original and delightful is the idea? |

The demo should provide evidence against these criteria; specific acceptance scenes remain open. No additional product features are inferred from the examples or the company background text.

## What inspection established

- Stitch contains Home, setup step 1, alarm Stage A, alarm Stage C and Help. It does not supply setup steps 2–6, Stage B, Settings, the clinic dashboard or complete navigation.
- The Stage A export animates a hold fill but does not execute the complete alarm transition. Its Snooze is not implemented. The other exports are mostly static references.
- Stitch's setup ladder displays durations rather than editable action text. Stage C has the incorrect evening label. Small wordmarks also fall below the requested minimum, beyond the 13px and 14px design tokens.
- DESIGN.md includes unrelated appliance concepts. Those are excluded; the original download has not been edited.
- The separate HTML has four hash routes: Today, Wake, a single scrolling Setup and Help. It has no persistence or genuine recording/playback, scheduled alarm, pairing, clinic request or server integration.
- Its “sent”, “saved”, “playing” and recording indicators are simulations. The breathing loop does not stop after its stated minute. Returning from Help to Wake resets that flow.
- All five Stitch PNGs were visually inspected. The separate HTML was inspected as source; browser policy blocked the local-file preview, so no claim of rendered HTML testing is made.

## Conflicts requiring decisions

| Topic | Older draft | Uploaded master / other reference | Decision |
| --- | --- | --- | --- |
| Personal baseline | Rolling previous 14 mornings | First 14 qualifying main samples; separate first 14 qualifying voiced samples | RESOLVED C65–68; narrow measurement/seed edge cases remain Q31 |
| Initial baseline | 1 snooze/10 minutes; master voice default 0.5 | Main defaults 0/8; no initial voice default and quiet comparison disabled until five valid recordings | RESOLVED C66–67 |
| Hard threshold | 4–5 points | 3–5 points | RESOLVED C53 |
| Voice contribution | Skip/unavailable voice treated alike | Silent/Skip use rolling usual-speaking gate; spoke onset/quiet rules need five fixed valid samples; unavailable/failed zero; whole voice term ≤1 | RESOLVED C111–112 |
| Missing clinic data | Absent records treated ambiguously | Clinic still excludes absence; U19 first backfills past alarm-enabled missing days from persisted evidence, creating actual stopped/no_response records before sync | RESOLVED observations plus C192–195 backfill; do not treat every absent calendar date as an enabled alarm |
| Voice/replies/evening check | Earlier should-item list | Normal voice, evening reminders, replies and personal place recording included; thought omitted | RESOLVED C84–87; old stretch items remain unapproved |
| No typing after setup | Blanket prohibition | Settings editing and code entry | OPEN Q12 |
| No eligible voice message | No audio | Permission refusal mentions text cards | RESOLVED C57: no recording means step alone, no authored fallback |
| Rest message | Permanently block | User chooses exclusion until manual restore, with no replacement playback | RESOLVED C45; restoration UI OPEN Q45 |
| Light and sound timing | 2/4/6-minute dawn | Foreground 2/4/6 minutes or fast 10/15/20 seconds; system landing 20 seconds; immediate hold/3-second sky/2-second sound handoff | RESOLVED C124–127; other fast timers remain Q91 |
| Real alarm | Foreground-only, background excluded | User requires locked/closed-app ringing and the system-to-app handoff | SUPERSEDED by C25, C28–30; detailed native behavior OPEN |
| Clinic architecture | Expo `/clinic` route, real records | User wants separate web directory, no real record feed required | SUPERSEDED by C22; separate clinic demo is implemented with bounded browser/rule QA |
| Anonymous match / callback | Real or unspecified | User wants configurable demo behavior / TODO matching | RESOLVED scope/state isolation and labels by C21, C23, C218–221 |
| Instructions to avoid questions | Use defaults, do not ask | User requires exhaustive clarification | SUPERSEDED by C01, C16 |
| Unpaired sun | User half plus unlit partner outline | User requires a whole sun when unpaired | SUPERSEDED by C35; visual/wake-state details OPEN Q110 |
| Safe contact identity | No names or numbers anywhere | User allows safe-person name/number only on the phone | RESOLVED by C34 |
| Callback outside demo | HTML claims delivery with no integration | Real action or hidden; labelled simulation allowed in demo | RESOLVED by C33 |
| No-response timeout after interaction | No completed hold could become no_response despite interaction | Fixed first-ring 60-minute cutoff: any observed listed interaction→stopped; none→no_response, frozen thereafter | RESOLVED C192–195; native evidence/boundary limitations remain |
| Getting-up measurement origin | Drafts assume ringing/app stage begins one interval | User explicitly chooses original scheduled alarm → in-app hold | RESOLVED by C37 |
| Sky and sun animation | HTML sun rises on entering Home independently of waking | Sky tracks dawn; sun tracks confirmed getting up | SUPERSEDED by C40 |
| Late wake entry | Full alarm flow or no-response timeout | First 60 minutes full dawn/hold; afterward silent hold → Home with Tiny/message, updating the same record | RESOLVED C43/C49; boundary details OPEN Q107 |
| Step reduction | Unknown treated as false; first size unspecified | Initial carry Small; offered final-size outcomes update carry; no-offer stopped/no_response reduce; off preserves; removal yields Tiny | RESOLVED C96–99/C150–151; manual-reduction display effects remain Q40 |
| Partner-up dispatch | Draft sends after Stage D | User sends immediately at either completed hold | SUPERSEDED by C50 |
| Setup requirements | Incomplete skip rules; step 6 Care team | Only Goals/Alarm mandatory; step 6 Your people contains care team and safe contact | RESOLVED C51 |
| Voice unavailable | Draft adds a point for skipped/missing voice indiscriminately | Denied permission/technical failure contribute zero; Skip depends on usual speaking | SUPERSEDED by C54 |
| Late category after hold | All late holds keep stopped | U19 preserves the already finalized stopped OR no_response level while adding upAt/partner-up/offer | SUPERSEDED by C55/C196; no late rescoring |
| Unknown step outcome | Older drafts implicitly treat not-done as false | Unknown preserves size; explicit noncompletion shrinks with a Tiny floor | SUPERSEDED by C56 |
| Goal ladder editing | Full-first order and incomplete validation | Tiny-first everywhere, one approval per goal, exact inline edits | RESOLVED C59–63 |

The master has stale references to sections 8.1–8.4; its algorithms are actually in section 5. Old API fields still require reconciliation. U17/U18 supersede old timeout budgets with 25 seconds for the whole server sequence and 30 seconds client; do not copy older values.

## Selected sensing formula, with confirmed overrides

Source: master §5.1 selected in U10, refined by confirmed U11–U20 overrides. These are specified demo heuristics, not clinical validation or results from device testing. This formula section records requirements, not executed app tests.

### Fixed main baseline

A qualifying morning has a hold completed within 60 minutes of the first ring. Completed hard mornings and early holds qualify; stopped (including late holds), no_response and off do not. Early wake uses the Home control/hold, minutesToUp = 0 and a separate amount-early field; no negative early duration enters the baseline.

Score today using prior qualifying mornings only. Append today afterward if eligible, then update stored values for the next morning. In these rules n is the already-collected history count, excluding today while it is being scored:

- n < 5: baselineSnoozes = 0; baselineMinutes = 8.
- 5 ≤ n < 14: baselineSnoozes = min(median(snoozeCount), 1); baselineMinutes = min(median(minutesToUp), 12), using the qualifying mornings collected so far.
- n = 14: calculate those bounded medians once, store them and their source dates, and freeze them. Later qualifying mornings do not replace the fixed baseline.

The fifth qualifying morning therefore uses default 0/8; after it is appended, the five-sample median is available for the sixth. Normal getting-up time remains scheduled alarm→hold; early minutesToUp remains 0 with early amount separate; snoozes combine system/in-app. For timing comparisons only, use comparisonBaselineMinutes=max(1, stored baselineMinutes), never mutate the stored value or samples.

### Separate fixed voice baseline

Collect the first 14 qualifying valid spoke recordings, however many dates that takes. Score with prior recordings only, then append today's eligible recording afterward. Let v be that previously collected count when scoring today.

- v < 5: neither delayed-onset nor quiet-recording comparison contributes a point. There is no 0.5 initial speechShare default.
- 5 ≤ v < 14: baselineSpeechShare = max(median(valid speechShare values so far), 0.4).
- v = 14: calculate that bounded median once, store it with the recording dates and freeze it.

The fifth valid voice recording uses four prior samples, so neither delayed-onset nor quiet-share term is enabled; the sixth can use the median of five prior samples. Main and voice baselines can become ready/frozen on different dates. U14 applies the five-valid-recording readiness gate to both delayed-onset and quiet-share conditions for spoke recordings. Successful silence is voiceState: silent, does not enter the fixed voice baseline, and uses the rolling usually-speaking gate instead. Null onset by itself no longer adds a point.

### Rolling usual-speaking predicate for Skip and silence

Select the most recent 14 mornings before today with voiceState spoke, silent or skipped. Ignore unavailable, failed, late-flow and off days. Let n include all three eligible states; spokenCount counts spoke only. The window/denominator choice is resolved by U13:

```text
usuallySpeaks = n >= 5 AND spokenCount >= ceil(n * 0.5)
voluntarySkipPoints = usuallySpeaks ? 1 : 0
validSilentPoints = usuallySpeaks ? 1 : 0
```

Put window 14, minimum 5 and ratio 0.5 in config. This predicate rolls; the speechShare baseline above stays fixed after freezing.

### Normal-morning points

| Signal | Condition | Points |
| --- | --- | --- |
| Combined system/in-app snoozes | Count ≥ baselineSnoozes + 2 | 2 |
| Combined system/in-app snoozes | Otherwise count ≥ baselineSnoozes + 1 | 1 |
| Scheduled-alarm-to-hold minutes | Minutes ≥ max(10, 2 × max(1, stored baselineMinutes)) | 2 |
| Scheduled-alarm-to-hold minutes | Otherwise minutes ≥1.5 × max(1, stored baselineMinutes) | 1 |
| Voice unavailable | Permission denied or recording/device failure | 0 |
| Voluntary Skip | usuallySpeaks is true | 1 |
| Voluntary Skip | usuallySpeaks is false | 0 |
| Valid silent recording | usuallySpeaks is true; otherwise zero, including n <5 | 1 or 0 |
| Spoke recording | Fixed voice baseline has ≥5 valid recordings AND (voiceOnsetMs ≥2500 OR speechShare ≤0.6 × baselineSpeechShare) | 1 total, even if both conditions fire |
| Spoke recording before baseline readiness | Fewer than five valid fixed-baseline recordings | 0 |
| Other cases | No listed condition met | 0 |

Totals: 0–1 = easy; 2 = medium; 3–5 = hard. The entire voice term is capped at one. Successful silence is a recorded signal with voiceState: silent, distinct from failure; its points come only from the rolling gate. The master names the onset field voiceOnsetMs; U14 refers to speechOnsetMs when removing the null-onset rule. No second onset metric is introduced. First-touch latency is not scored.

Fast-time getting-up scoring retains the selected 1-second/1-minute mapping. U19 explicitly maps the first-ring 60-minute finalization window to 60 seconds in fast mode. Observed interaction within that window without a hold produces stopped, none produces no_response; re-rings never extend it. Native evidence reliability and other demo timer mappings remain separate.

Late holds bypass this calculation and retain the frozen stopped or no_response level. Hold confirms up and sends partner-up; Tiny and hard message-on-Play are offered on the same record. No recording means no message; no voice/automatic audio. Keep category, confirmation and step outcome separate; late confirmation counts as an offered day under either level.

## Step progression and goal rotation

For an offered step, use the previous offered day's final reduced stepSize and stepDone, irrespective of goal or previous morning level:

| stepDone | Limit from previous offered day |
| --- | --- |
| true | One rung up, capped at Full |
| false | One rung down, floored at Tiny |
| null | Same final size |
| Tiny explicitly removed for that day | Tiny next time; cancel that day's evening reminder |

Today's normal size is min(carrySize after offered-outcome and intervening-day updates, current-morning limit): easy → Full, medium → Small, hard → Tiny. Late flow has its explicitly fixed Tiny offer. Late Tiny with true therefore permits Small next time; false and null permit Tiny. Neither stopped nor no_response category overrides a completed offered step. U13 defines carrySize: Monday completed Small gives Full; each subsequent stopped/no-offer or no_response day lowers the carried limit one rung to Tiny, so Tuesday yields Small and another such day yields Tiny. Deliberate off days preserve it. Apply the current-morning cap when a step is next offered. Initial carry is Small: first easy/medium offer Small, hard offers Tiny, never Full. Deleting/recreating goals preserves carry; only app-data reset restores Small.

Choose one goal per offered day in setup order and wrap to the first. A step counts as offered when shown in the message stage, late flow or Home. Advance for an offered day regardless of completion/removal; do not advance for a no-offer day. The phone stores the rotation pointer and per-goal offered/done/removed counts. Those counters are not inputs to any adaptation rule. Preserve the pointed-to goal across goal edits if it survives; otherwise move to the next surviving goal in the existing order under U23. Preserve any already offered step when its goal is deleted. Counts follow C216 and remain unused by rules.

## Active scope and integration boundaries (U12–U24)

- Include reply-to-past-self, personal place recordings, normal voice sensing and evening reminders. Remaining recording/reply interactions stay open. Composed dawn is separately gated by U15, not a prerequisite or replacement for the core demo.
- Omit sending a thought and all its control/route/field/event/test scope; partnerQuietDays remains. Do not create new thought-specific tests.
- Shared distress configuration runs locally first for both goals and manual steps. Only nonmatching goals are submitted to the goal endpoint, which rechecks before model generation. Do not add POST /goals/check-steps. U17 approves the EN/FI list and Decisions integration. Native Finnish review remains unconfirmed, not an additional shipping gate; candidate tests do not certify linguistic/clinical accuracy.
- Engineering is delegated within the approved stack; new off-device/off-server services still require a decision. Dependency reasons and the safety-net limitation belong in NOTES.md. Audio never reaches the server.
- Reconcile the older brief's API table/build order to this active scope and list sending a thought as not built in NOTES.md. Older text cannot restore the omitted feature.

## U19 alarm outcome window and catch-up records

When no hold completes within 60 minutes from the first ring, classify from interaction evidence: any system Stop, system snooze, in-app snooze or Aamu open→stopped; no interaction→no_response. A single snooze or open/close is enough. Re-rings never reset this origin; fast mode uses 60 seconds. Finalize at cutoff while running, otherwise on next launch from persisted ring/Stop/snooze/open evidence; backfill every past alarm-enabled date lacking a record, then sync. Do not include deliberately disabled dates or fabricate Stop evidence. The unobservable-system-Stop fallback is no_response only when no other interaction was observed; any observed listed interaction still gives stopped. Disclose the native observability limitation in NOTES.md.

Once stopped/no_response is final, later evidence/actions do not turn it into the other. Before that record’s local midnight, either permits the same late silent hold flow: hold sets upAt and partner_up, then Home Tiny/hard message behind Play, counts as offered for carry/rotation and keeps the frozen category. Baseline exclusion remains. Exact cutoff races, app interruption/native evidence gaps and conflicting late evidence are still recorded as edge questions.

Snooze stops sound and schedules native ringing after the agreed five minutes, with no count limit. Sky holds/dims and resumes next ring; combined snooze measurement and original-window deadline remain. These requirements are not evidence of a native alarm being built.

## Scheduling, off-day and clinic contracts (U13–U14)

An alarm deliberately disabled before firing produces off, not stopped/no_response. It offers no step, preserves carrySize and rotation, emits no partner-up and enters neither personal baseline nor usual-speaking history. It does not count toward partnerQuietDays; quiet-run reset/pause semantics still need definition.

Use one daily wall-clock alarm and one persistent on/off switch. No weekday selection, multiple alarms or one-off skip. Home uses “Alarm is off today.” and an enable action. Before today's scheduled time, re-enable restores the original system/in-app alarm, clears off to pending and shows the early control if within its configured 180-minute window; there is no minimum lead time. After the time, today remains off, tomorrow is scheduled, and no ring/hold or other morning mutation occurs beyond off. Show “Your alarm is back on for tomorrow at {time}.” Exactly-at-time handling is still open.

Follow the phone's current timezone for future alarm wall-clock time and its locale/12–24-hour display setting. Fix a morning's localDate and UTC offset at first ring or early hold. Its late cutoff, unknown-completion finalization, carry update and sun reset use local midnight in that recorded timezone/offset. Reschedule the next alarm when the system reports a timezone or clock change. Add optional utcOffsetMinutes to the API. Keep one record per localDate; duplicated/skipped dates caused by travel are an explicitly documented limitation.

Clinic windows omit off from averages/adverse counts and retain neutral last14 markers. A missing record is not an observed morning; any non-off record is. Fewer than three observations in the last seven days gives insufficient, labelled “Not enough recent mornings”; never steady or a copied previous status. Keep the last classified status/date as historical facts. Use the exact U14 reason templates in C116. Off duration still appears for a current run of at least seven, while the independently selected insufficient rule determines current status. Sort might_need_call → drifting → insufficient → steady, with insufficient ordered longest since last observation first.

With at least three observations in the last seven days but fewer than five in the preceding fourteen, skip comparisons against the earlier average and apply only count rules; when none fire, use steady and append “limited history”. Configure the 3/5 thresholds. U16 fixes the comparison to the fourteen calendar days immediately before the recent seven-day window and selects the count/average/completion rules below.

### Clinic classification below the insufficient gate (U16)

Use the seven most recent calendar days, counting today only once its morning has a final level. Compare with the fourteen calendar days before that window. Numeric values: easy = 0, medium = 1, hard = 2, stopped = 2 whether unconfirmed or late-confirmed, no_response = 3. Exclude off/absent dates from the observations and average denominators.

Evaluate might_need_call first: recent no_response count ≥3, or recent hard+stopped+no_response count ≥5, or recent-average minus comparison-average ≥1.0. Otherwise evaluate drifting: recent hard+stopped count ≥3, or average difference ≥0.5, or completed steps on ≤2 recent-seven dates and ≥4 of the preceding-seven dates. If none fire, steady. Skip both average comparisons when fewer than five comparison observations exist; apply the selected insufficient/limited-history treatment. All thresholds remain in config.

Reason lists every fired rule. Split stopped counts in the reason: with upAt use “alarm stopped; getting up confirmed later”; without upAt use “alarm stopped but getting up not confirmed”. Both retain numeric 2 and identical stopped-rule membership. For late-confirmed no_response, use “no response in the first hour; getting up confirmed later”, keeping value 3 and every no_response count unchanged.

### Early hold exception (U16)

Home shows I’m already up from max(alarm−180 minutes, local midnight of its calendar day) until fire, hidden otherwise/off; configure earlyHoldWindowMinutes = 180. It never appears on the prior calendar day. Completing the hold cancels today’s system/in-app alarms, publishes partner_up and fills/raises the sun. No dawn animation/place/composed sound: sky is static for current time, then voice→message→step. Store minutesToUp = 0, snoozeCount = 0 and minutesBeforeAlarm=floor((scheduledAlarmTime−holdCompletedAt) in minutes), non-negative; minutesBeforeAlarm is null for non-early holds. Early localDate is the alarm calendar date. U17 completes the earlier cut-off answer.

## Foreground dawn and system landing (U14)

Foreground ringing, including Ring now, uses the last three observed mornings within the past fourteen days, excluding off: easy is light, medium middle, and hard/stopped/no_response heavy. At least two heavy gives six minutes and lower starting volume; at least two light gives two minutes; otherwise four. Fewer than three observations also gives four. Fast equivalents are 10/15/20 seconds. System-alarm handoff instead has a twenty-second landing dawn. Durations and thresholds are configurable; the exact lower volume remains open.

The hold advances to voice immediately, even at 10% dawn. Fill/raise the sun on the hold, compress remaining sky movement into about three seconds without a jump or freeze, and fade place audio over about two seconds before any message. Snooze holds/dims the sky; the next ring resumes it. Audio during snooze and other interruptions remain separate questions.

## LocalOnly goals and payloads (U14)

A retained manual override after the latest needs_support, from local checking or the endpoint, stores the goal title and all three steps only on the phone with localOnly true. PUT /goals omits it entirely, without a marker. Do not require/suggest changing the title or ask for consent to transmit it. Morning payloads still contain the locally generated opaque goalId, stepSize and stepDone, but stepText is null. The server must accept nullable stepText and unknown goal IDs without depending on a synced goal; no new privacy/existence marker is authorized.

Rotation, carry, local counts and Home/message behavior remain identical for localOnly and ordinary goals. Later voluntary rewording may use the normal local/endpoint/model recheck path; when both checks pass, clear localOnly and include the goal in the next PUT. When a previously synced goal becomes localOnly, next PUT removes its title/step texts from the server and nulls stepText on every existing morning with that goalId, retaining opaque ID, sizes and outcomes. No private text/localOnly marker is submitted.

## Real partner contract (U13)

Pairing is genuinely generated/entered by code and persisted against the user token. U22 keeps a code valid until used, with no time-based expiry and no reuse after redemption. Public HTTPS/WSS supports separate/mobile networks. While paired and foreground, GET /partner polls every five seconds in addition to reconnecting WebSocket and foreground refresh. First observed up lights the sun once; another report of the same state does not animate it again. Reinstall persistence is conditional on restoring the same token, whose recovery mechanism remains open.

## U15–U16 model discovery and gated composed dawn

Authenticated ListModels with the privately supplied event GEMINI_API_KEY succeeded at 2026-11-14T03:46:02.737Z, returning 64 models on one page. Sanitized `review/provider-models.json` lists Gemma `models/gemma-4-31b-it` and `models/gemma-4-26b-a 4b-it`, and Lyria `models/lyria-3-clip-preview`, `models/lyria-3-pro-preview`, `models/lyria-3.5`, `models/lyria-realtime-exp`. Root selected the listed 31B Gemma in ignored configuration. The listing is separate from the completed synthetic-generation probe described next; neither establishes a quota guarantee. No credential is copied into documentation.

A completed synthetic-only `gemma-4-31b-it` probe through Gemini’s OpenAI-compatible chat completions returned HTTP 200 and validated with zod 4.6.7; its successful live request took 12983ms. The sanitized report is `review/provider-generation.json`, timestamp 2026-11-14T03:58:16Z. Across four HTTP requests, initial parsing rejected output format; the fourth response was retained transiently and revalidated after fixing the parser without another provider request. Five local parser tests passed. The parser handles the exact echoed scaffold and duplicate identical valid answers while rejecting distinct alternatives. No goal/response text or credential is stored in that report. This confirms one synthetic ladder capability, not the product endpoint, full safety integration, Lyria generation, quota or device demo. U17 now specifies a 25-second server/30-second client limit and no automatic retry; U18 fixes that budget across the whole three-stage pipeline. The observed 13 seconds is not a latency guarantee. Smaller listed models may be compared with three sample ladders each, with a switch proposed only if quality is acceptable and under 5 seconds; the completed six-attempt comparison found no under-five-second result, so no switch was proposed or made (evidence below).

The earlier missing-key guard check remains historical evidence only. Current access is established by authenticated listing, not public docs. The full core demo has not passed on two phones, so composed dawn remains gated despite Lyria entries being present. If later unavailable for the key, do not build it and tell the user.

Once gated implementation is allowed, POST /dawn/compose accepts place sea/forest, tier light/middle/heavy and seconds for fixed instrumental prompts: near-silent rise, no sudden changes/vocals, slower/sparser heavy. Send no IDs, goals, raw levels/history or person-authored text. Stream audio back without server storage or accepting uploads. Request/cache tomorrow’s piece on the phone after morning flow, never in the alarm path. Play under place sound during normal in-app dawn, never early hold or the locked system alarm. No cached piece leaves dawn unchanged; Not this sound discards it and returns to place sound. After the core pass, pre-generate synthetic demo pieces before presentation; personal audio remains unseeded/unuploaded. Duration validation, cache lifecycle and mixing remain deferred stretch choices.

### Historical bounded goal-slice evidence — 14 November 2026, before the main app build

At this earlier checkpoint, `npm run typecheck` and `npm test` in `api/` passed: 137 local tests comprise 104 phrase cases, 5 parser cases and 28 goal/client/route cases. The inspected sources are `api/test/goals.test.ts` and `api/test/approval.test.ts`. These cover provider adapters and injected service/controller/route behavior: thresholds, four safety codes, duration/concreteness hints, fallback, one shared deadline, immediate save/later hints, localOnly filtering, cancellation/stale revisions and limited sanitized output. The Fastify tests inject an authentication predicate with fixture tokens; mobile tests inject storage/navigation/transports. They are not real identity authentication, Expo rendering, a deployed API or database-erasure verification.

The first live synthetic service attempt returned failure/manual fallback without a ladder in 16,343ms, with no automatic retry; preserved evidence is `review/provider-goal-pipeline-initial.json` (04:27:19.438Z). After adding an explicit JSON scaffold to the writer prompt, a separate manually initiated probe completed initial judge→Gemma writer→step judge in 15,574ms, under the 25-second shared budget, with no automatic retries: `review/provider-goal-pipeline.json` (04:29:34.184Z). This is one successful synthetic service path, not repeated reliability or the Expo/network/device demo. Neither result is represented as an automatic retry of one user action.

The synthetic Decisions fixture run evaluated 12 labelled examples in 3,131ms: 12/12 support-label agreements, 8/9 goal-verdict agreements and 0 unavailable results, at unchanged thresholds; `review/decisions-fixtures.json` contains aggregate evidence only. This small authored set is not representative or clinical calibration, and retains no distress probabilities or individual verdicts. The actual SDK access probe remains a separate narrow test.

The fair Gemma comparison used three synthetic goals per model, alternating model order, identical transport/prompt/options, 25-second cap and one attempt/no retry per sample. Five timed out; the 31B reading example returned in 15,290ms. The smaller 26B-A4B returned no ladder before its three deadlines. No result met the under-five-second condition, so 31B configuration remains unchanged and no switch was proposed. Five missing sample ladders were not invented or retried. Reports are `review/gemma-comparison.json` and `review/gemma-comparison.md`; finite attempts are not a stable benchmark. The one returned Tiny reading step also has a documented duration caveat.

This historical 137-test slice did not verify Expo rendering, concrete authentication/database/tunnel or native behavior. Later app/service evidence is recorded at the top and in the acceptance file; no two-phone or Lyria generation pass exists. The acceptance register is not collectively passed; its execution section maps narrow tested assertions to remaining integration work.

## Deterministic message selection (U16)

Eligible recordings are not blocked and match the morning’s selected level. If none, use only the specified gentler sequence easy→medium→hard, medium→hard, hard→none. Never fall back brighter; no eligible recording means step alone. Remove yesterday’s played message only when another remains; prefer recordings never played. Otherwise maximize `(timesFollowedByDoneStep + 1) / (timesPlayed + 2)`. Ties use earliest lastPlayedAt (never-played first), earliest createdAt, then lowest id. Default selection is deterministic.

The conditional Thompson-sampling stretch replaces only scoring step 5, uses a seeded test generator and preserves all earlier filters/ties; it is not authorized to build now. U17 defines learning: count once per message/local day at 3 audible seconds or the end of a shorter recording. Replays add nothing; Settings never counts; pausing after threshold still counts. Only the selected morning message gets done credit on that local day, reversed on Undo. Rested messages get neither play nor credit. Rest after today's selected message was counted removes today's play and credit only, retaining older history. Show the step as message playback begins.

## U17 Decisions-judged goal suggestions

Implementation is explicitly authorized for the bounded goal path. Use the same Gemini key and the specified @google/genai SDK 3.2+ Decisions API v1beta, ai.decisions.create and gemini-decision-1. Read the user-linked official documentation first. The requested initial access test is complete: one harmless synthetic noul call using SDK 3.3.0/gemini-decision-1, 395ms, retries 0 and typed-response validation; sanitized evidence is review/provider-decisions.json. No input/probabilities were retained or output. Access is not full pipeline validation. The phrase list is user-approved, with native Finnish review still unconfirmed as a limitation rather than an added shipping gate.

Normal POST /goals/shrink sequence: shared local/server phrase checking; one goal Decisions call for distress and ok/too_big/too_vague; if distress≥0.3 or one of the specified HTTP 400 safety codes, needs_support/no Gemma; otherwise Gemma writes the ladder only; one Decisions call judges goal+three steps for duration and concrete action. Treat goal-choice confidence<0.6 as ok. Duration levels are “Under 2 minutes, at home”, “2 to 10 minutes”, “10 to 30 minutes”, “More than 30 minutes”; produce sizeHint when argmax exceeds slot index 0/1/2 or concrete probability<0.5. No auto-regeneration. Quiet hint lines do not overrule edits/approval.

Edited non-localOnly Approve saves immediately and gets one step-judge call for hints afterward; never transmit localOnly steps. Initial Decisions unavailability uses the existing Gemma verdict path with source marked. Final-judge failure after generation returns failure/manual steps, no unchecked ladder and no second Gemma call. Safety-block HTTP 400 during duration/concreteness checking triggers Help/localOnly; apply the same rule to edited approval and existing privacy/server-erasure contracts. Keep distress probability entirely out of storage/logs/UI/exposure. Demo-only Under the hood can show duration probabilities and goal verdict, not distress probability. Existing needs_support nonretention still applies.

Waiting uses “Finding a small place to start…” with Write my own steps available immediately. Failure says “We couldn’t suggest steps this time.” with Try again/manual. Selecting manual keeps loading. When suggestions arrive, show Suggestions are ready/View, then Use these steps/Keep mine; if manual text exists, confirm replacement once. Manual approval saves on-phone and defers remote saving until the original check ends; late needs_support opens Help/localOnly and removes prior synced text. Original-request technical failure/timeout releases the approved manual steps for normal sync and retains approval. Use these steps only replaces fields, then requires Approve; confirm existing-text replacement once with “Replace the steps you wrote?” and Replace/Keep mine. U18 fixes server 25 seconds across the whole Decisions→Gemma→Decisions chain, one attempt per stage with no retry, and client 30 seconds. Confident too_big shows “This is a big goal. These steps are a place to start.”; too_vague shows “These steps make a starting point. Edit them to fit you.” Duration hints say “This may take more than {2/10/30} minutes.” and concreteness hints “Try one action someone could see you do.” Combine both into one line when needed.

Add labelled example-goal fixtures and requested tests for safety errors, mis-sized Tiny and fallback. These are pending product acceptance, separate from the already executed synthetic Gemma/parser/phrase checks.

## U21 personal recording and evening flow

Library labels are “For an easier morning”, “For an in-between morning” and “For a hard morning”; morning messages have a 20-second maximum. Replies remain capped at 20 seconds and personal place sounds at 30. Morning messages, replies, answers to replies and place sounds all start on a tap and then offer Play, Record again, Save and Cancel. This personal-recording flow does not make the sensing sample manual.

The five-second sensing sample still begins automatically after a normal/early hold. If Aamu is closed during it, mark failed with zero voice points and continue to the message on reopening; never restart/resume that sample. Its voice state is excluded from fixed-voice/usual-speaking histories under existing rules; an otherwise qualifying timely hold still belongs in the main baseline.

Evening reminder time is 18:00 local; answers are Yes and Not today. The user says no reminder if the step is first offered late in the day, in response to the question about first offers after 18:00. Do not silently suppress every late-hold flow or select another late-day cutoff. U23 resolves the boundary: suppress at/after 18:00 and already-Done steps; Undo before 18:00 restores eligibility, and permission is requested during Alarm setup. Removal cancellation remains confirmed. Local implementation has twelve rule tests; physical notification delivery/actions remain pending.

## Required U11 coverage — execution mapped in the acceptance record

- Usual speaking: n = 4 gives Skip zero; n = 5 with 3 spoke gives one; n = 5 with 2 spoke gives zero; n = 14 with 7 spoke gives one; unavailable/failed entries are excluded from windows.
- Main baseline: 4, 5, 13 and 14 qualifying mornings; excluded days interleaved. Verify the specified default/running/frozen stages.
- Voice baseline: valid recordings lag the main baseline; no quiet-comparison point before five, then running/frozen behavior and source-date persistence.
- Late-step progression: Tiny/true → Small limit; Tiny/false → Tiny; Tiny/null → Tiny.
- Support flow: return keeps goal text; second flag stays inline; manual override saves allowed manual steps; a phrase-matching manual step is not saved and shows inline support.
- Rotation: one, two and three goals; a day with no offer; deletion of a goal mid-rotation. Use U23’s next surviving goal in the existing order; the earlier ordering question is resolved.

## Open questions

Questions below retain stable identifiers. Resolved answers and delegated engineering choices must not be re-asked; remaining product questions are OPEN only where stated. Implemented choices are evidence, not retroactive user decisions. Related decisions may close several questions at once. Suggested alternatives are options to choose from, not defaults.

### Scope, sources and delivery

- **Q01 — PARTLY RESOLVED.** No further references are coming; design all remaining screens in the agreed mix. The screenshot request is fulfilled by the delivered visual review artifacts. Whether M is the complete intended product summary remains open; no reference-branch question remains.
- **Q02.** Is the primary demo user specifically someone after TMS, or a broader recovery audience? What single difficult-morning situation should the demo tell?
- **Q03.** What are the exact Saturday completion cutoff, Sunday submission time and presentation duration? Who is building which parts alongside this work?
- **Q04 — PARTLY RESOLVED.** Both physical test phones are iOS; the first is an iPhone 18 Pro Max reported iOS 26+. The signed simulator app builds/opens Setup. Physical install/OS and the second phone model/OS remain to be checked when the user connects them; Android device validation remains pending.
- **Q05 — PARTLY RESOLVED.** Core includes normal voice, evening reminders, replies and personal place recording; sending a thought is omitted. U15 adds composed dawn only after the core two-phone script passes and event-key Lyria is available. Other old stretch features remain unapproved.
- **Q06 — RESOLVED for selected stack/providers.** Expo/TypeScript, Fastify, Aiven EU PG/Valkey, event-key Gemini and Cloudflare Quick Tunnel are approved. Authenticated model probes and synthetic live Aiven/public transport checks passed. Stable tunnel/device acceptance remains pending; sponsor-entry commitments are separate.
- **Q07 — RESOLVED.** Ordinary folder/library/code-organization decisions are delegated within the approved stack. Old layouts are suggestions; dependency reasons go in NOTES.md. Ask for product/privacy/external-service/demo changes, including new off-device/off-server transmission (C88–89).
- **Q08.** Do you want these rules to govern future Aamu iterations, or also a reusable process for unrelated future products? Who can resolve or change requirements on the team?

### Entry, setup and permissions

- **Q09 — RESOLVED for order/contact placement.** Goals → Voice messages → Place sound → Alarm → Partner → Your people. Safe-person contact is in step 6 (C51). Any care-team-sharing control in that screen is tracked under Q81.
- **Q10 — PARTLY RESOLVED.** Only Goals/Alarm required; setup completion requires connectivity and granted alarm permission. Denied alarm permission blocks and offers Open Settings. Remaining required fields/resume-on-relaunch behavior remain open.
- **Q11 — PARTLY RESOLVED.** Require connectivity to finish setup. This settles offline completion. Anonymous bearer provisioning is implemented as delegated engineering; identity recovery and individual failure UX remain separate.
- **Q12 — PARTLY RESOLVED.** Goal editing/deletion/reordering and personal place recording in Settings are explicitly supported. A blanket no-typing rule cannot forbid approved goal edits. Remaining contact/code and Settings behavior still needs definition.
- **Q13 — PARTLY RESOLVED.** One goal required, three maximum, initially one field with Add another. All three step texts must be non-empty and ≤60 characters to enable approval; save inline edits as written (C59/C61). Goal-text length, duplicate/language rules and character-count convention remain open.
- **Q14 — RESOLVED for approval behavior.** Existing ladder limits/validation stand. Edited non-localOnly Approve saves immediately; one Decisions hints-only check follows, with hints shown afterward. Never transmit localOnly steps or regenerate with Gemma; edits/approval win.
- **Q15 — RESOLVED for advisory behavior/copy.** Confident too_big/too_vague shows the ladder with exact U19 advisories; low confidence<0.6 is ok. No block or automatic rewrite.
- **Q16 — RESOLVED for support-return/phrase approval.** Existing Help return, preserved text, second inline flag and local manual checks remain. U17 approves the phrase list and specifies server erasure for a synced goal becoming localOnly; native review is not an extra shipping gate. Decisions-specific safety/fallback behavior is settled under U18/Q86.
- **Q17 — RESOLVED for selected manual/background outcomes.** Keep loading separately; View/Use/Keep controls, exact replacement confirmation and fields-only replacement/reapproval are fixed. Original check pending defers remote save; failure/timeout releases normal sync with approval intact; needs_support triggers Help/localOnly/erasure. Timeout/attempt/exact copy rules stand.
- **Q18 — RESOLVED.** Recordings are optional; with none, show the step alone and no team-authored/generated text fallback (C51/C57).
- **Q19 — PARTLY RESOLVED.** Library labels are For an easier morning / For an in-between morning / For a hard morning, with 20-second message max. All personal recording types use tap-start, Play/Record again/Save/Cancel. Any separate recording-prompt wording has not been supplied; do not re-ask approved labels/controls.
- **Q20 — PARTLY RESOLVED.** Skipped Place uses Sea; personal≤30 seconds in setup 3/Settings for in-app dawn only, locked sound bundled. Tap/Play/Record again/Save/Cancel are approved. Additional bundled choices and permission/error handling remain open.
- **Q21 — PARTLY RESOLVED.** Denied alarm permission blocks setup and offers Open Settings. U23 selects local-notification permission during Alarm setup. Remaining microphone/notification denied paths and interactions with other permission failures remain product/device acceptance questions.

### Alarm and native system behavior

- **Q22.** Does “closed” include force-quit, and must ringing survive reboot? What minimum supported iOS and Android versions are acceptable after the native feasibility review?
- **Q23 — RESOLVED for handoff and Stop meaning.** System alarm → person opens Aamu → dawn/hold/voice/message (C28). Native Stop alone means “alarm stopped, getting up unconfirmed”, never up (C29). The system supplies its own Stop control. Remaining secondary-control and sensing details are tracked in Q104–109.
- **Q24 — PARTLY RESOLVED.** One daily alarm time and persistent on/off switch; no weekdays, multiple alarms or one-off skip. Re-enable before the scheduled time restores today with no lead minimum; after it keeps today off and schedules tomorrow without ringing/hold. Initial time and behavior exactly at the scheduled instant remain open; do not reopen the before/after rules.
- **Q25 — PARTLY RESOLVED.** Foreground ringing dawn and system-alarm landing durations are settled (C124–127). Bundled locked-screen sound is permitted. Requirements for native vibration/screen brightness beyond supported system alarm presentation remain open.
- **Q25 follow-up — RESOLVED for locked audio and in-app timing.** Bundled sound is acceptable while locked; personal audio is in-app only. U14 settles foreground/landing dawn and hold audio fade. Audio restart/interruption behavior remains Q28–29.
- **Q26 — RESOLVED.** Early control starts at max(alarm−180 minutes, alarm-day local midnight), ends at fire and is hidden off. Silent/static-sky hold cancels today's alarms then voice/message/step, confirms sun/partner. minutesToUp/snoozes = 0; minutesBeforeAlarm is floored non-negative minutes early, null otherwise. localDate is alarm date; U17 completes the cut-off.
- **Q27 — PARTLY RESOLVED.** Hold is two seconds and snooze is five minutes (C41). Early release, dragging away, interruptions and accessible alternatives remain open.
- **Q28 — PARTLY RESOLVED.** Snooze stops sound, schedules native ring at the agreed 5 minutes, unlimited count; sky holds/dims/resumes. Original first-ring 60-minute window never extends; any snooze/open without hold yields stopped. Takeover still cancels the old native occurrence/pending snooze. Interrupted-app recovery remains Q29.
- **Q29 — PARTLY RESOLVED.** Closing during sensing after hold marks failed/zero and resumes at message. Next-launch outcome backfill/late flow are selected. Other lock/crash/call/reboot recovery, native evidence reliability and in-progress alarm-cutoff races remain open.

### Sensing and adaptation

- **Q30 — RESOLVED for selected formula/order.** Prior-history scoring precedes today's append for main/voice; timing comparisons use max(1, stored minutes baseline) without changing storage. Other selected formula/history rules stand. This is not clinical validation; seed/reset/historical corrections remain Q31.
- **Q31 — PARTLY RESOLVED.** U20 settles score-before-append and comparison-only one-minute floor. Fifth uses prior-four defaults; sixth uses prior-five median; same prior-history readiness applies to voice. Seed/reset and correction of historical/frozen records remain open; do not re-ask ordering or zero-baseline treatment.
- **Q32 — PARTLY RESOLVED.** First-touch latency is not scored. Any observed listed interaction yields stopped without timely hold even when system Stop is unavailable; no_response fallback only when nothing observed. FirstTouch field meaning/native evidence reliability remain open.
- **Q33 — RESOLVED for sensing start/skip/close.** Automatic five seconds plus Skip. Closing mid-sample after hold gives failed/zero and continues to message on reopening, without restart/resume. Late wake bypasses sensing; microphone permission handling remains Q21.
- **Q34 — RESOLVED for states/history.** Rolling denominator includes spoke/silent/skipped, numerator spoke only; unavailable/failed/late/off excluded. Use 14/5/one-half. Fixed voice baseline remains qualifying valid spoke only. U14 resolves the independent scoring gates in Q35.
- **Q35 — RESOLVED for scoring gates.** Silent/Skip add one only for a usual speaker with n ≥5, otherwise zero; remove unconditional null-onset point. Spoke onset ≥2500ms or quiet share ≤0.6 × fixed baseline apply only with at least five valid fixed-baseline recordings; total voice ≤1. Detection engineering is delegated within this behavior.
- **Q36 — RESOLVED for carry/gaps.** Shared offered outcomes set carrySize; each stopped/no-offer or no_response day reduces it one rung to Tiny, while off preserves it. No-offer days do not advance rotation. Original no-offer precedence and consecutive-gap questions are settled (C96–99).
- **Q37 — RESOLVED for initial carry.** Start Small: first easy/medium offer Small, hard offers Tiny, never Full. Then normal offered/gap/off rules apply. Delete/recreate goals preserves carry; only app-data reset returns it to Small.
- **Q38 — PARTLY RESOLVED.** Last three observed within fourteen days, skipping off: easy light; medium middle; hard/stopped/no_response heavy. Two heavy →6 minutes, two light →2, otherwise/fewer than three →4; fast 10/15/20 seconds. System landing is 20 seconds. Hold immediately advances, sky finishes in about 3 seconds and sound fades about 2 seconds. Exact lower starting volume, brightness bounds and other interruption behavior remain open.
- **Q39 — RESOLVED for reduction behavior.** Reduce one size per tap; tapping when Tiny is too much removes the step for that day (C46). Exact replacement copy belongs to the remaining copy decisions.
- **Q40 — PARTLY RESOLVED.** Progression/carry/gap/off precedence and removal reminder suppression are settled. Effects of manual reduction on recorded level/clinic/message selection and availability after Done remain open.
- **Q41.** What exact before-and-after learning should the demo prove: step sizing, message selection, dawn timing or all three? Which scenario establishes that it responds to the person's previous actions?

### Morning message, completion and replies

- **Q42 — PARTLY RESOLVED.** Show today's step as soon as the message starts. Normal hold during dawn uses immediate voice plus 3-second sky/2-second audio completion; early Home hold has no dawn/place sound. Leaving before playback ends remains open.
- **Q43 — RESOLVED for default selection.** Not-blocked same-level eligibility; gentler-only easy→medium→hard fallback; no eligible audio means step alone. Exclude yesterday only if another remains; prefer unplayed, otherwise highest smoothed done/played ratio. Ties earliest lastPlayedAt, earliest createdAt, lowest id. No default randomness; conditional Thompson stretch is not authorized now. Played/credit definitions remain Q44.
- **Q44 — RESOLVED for learning rules.** Once/message/local day at 3 audible seconds or shorter end; no replay/Settings increments; pause after threshold counts. Selected message alone gets same-day Done credit, reversed on Undo. Rest today removes today's play/credit only, preserving earlier history. Do not reopen settled threshold or rollback questions.
- **Q45 — PARTLY RESOLVED.** Exclude until the person manually restores it (C45), without automatic expiry. Where/how to restore and whether permanent deletion is separately offered remain open.
- **Q46 — RESOLVED for playback.** Stop playback and play no replacement (C45). Any navigation or transient confirmation copy is still unspecified; do not infer an automatic screen change.
- **Q47 — PARTLY RESOLVED.** Medium/hard Say something back records local note≤20 seconds. Tap-start and Play/Record again/Save/Cancel are selected for replies too. Destination after Save remains open.
- **Q48 — PARTLY RESOLVED.** Easy Home oldest unanswered note→Play/Answer it; answer saves under source level. Answer recording uses approved tap/review/save/cancel flow. Answer-duration detail and original-note retention/archive/ignore behavior remain open; personal audio is not seeded.
- **Q49 — PARTLY RESOLVED.** Done is reversible and Undo decrements the selected message's completion credit under U17. Final Stage C button copy, Not today on Home and detailed completion/Undo presentation remain open.
- **Q50 — RESOLVED by U25.** “That’s enough for today.” appears only after Tiny removal, with five-second Undo then dismissal; not on no-offer/off days or as the Home headline. Old “for now” copy is superseded.
- **Q51 — RESOLVED for U23 reminder rules.** 18:00 local; Yes/Not today; suppress first offer at/after 18:00, Done or removed; restore after Undo before 18:00. Ignored means unknown. Permission during Alarm setup. Native/stale-response delivery acceptance remains pending, not a reason to re-ask settled suppression.
- **Q52.** Where should “No need to reply.” and “You're not alone this morning” appear? What exact wording replaces “Playing your evening message”?

### Home, navigation and appearance

- **Q53 — PARTLY RESOLVED.** Late Home Tiny/optional hard Play, early180-minute I’m already up, and off Home/re-enable behavior are settled. Time display follows device locale/settings. Greeting and remaining Home states stay open.
- **Q54 — PARTLY RESOLVED.** Without a partner, the sun is whole (C35); it represents confirmed getting up, separate from dawn progress in the sky (C40). Still open: paired representation and which screens contain the landscape. Pair/unpair transitions remain in Q110.
- **Q55 — PARTLY RESOLVED.** U14 settles dawn durations/classification, hold animation handoff, snooze sky hold/resume and sun reset at the recorded morning's local midnight. U25 settles later Home sky as current local time, with confirmation-only filled sun and alarm-off/no-hold outline. Other interruptions remain open.
- **Q56 — RESOLVED.** Agreed Stitch/HTML mix and delegated palette govern; no further visual references are coming. All remaining screens are delegated in that style. Existing three review captures are visual artifacts, not native validation or implied palette approval.
- **Q57 — PARTLY RESOLVED.** U11 settles word-labelled full-width pills, sparse lower-half controls and dark layered large-radius cards (C77). Remaining older constraints requiring a decision: no tabs, decorative icons outside buttons, one-container rule, 28-minimum step type, 64-minimum alarm controls and numerical empty-space target. Do not treat the reference mix as blanket approval of every old rule.
- **Q58 — PARTLY RESOLVED.** Minimum text 16 and text contrast ≥4.5:1 throughout dawn are confirmed (C14/C77/C79). Screen-reader, larger-text, reduced-motion and independent sound/haptic/animation/brightness controls remain open.
- **Q59 — PARTLY RESOLVED by U25.** Retained greeting follows configured local time; Preview scenes moves to hidden demo controls; Tiny-removal feedback has the exact five-second Undo behavior. Other unselected extras remain unapproved.

### Partner and live connection

- **Q60 — RESOLVED for real pairing.** Generate a real code with POST /partner/match mode code and no code; the other phone submits it. No fixed/preseeded pair. Anonymous presentation remains. U22 resolves expiry: valid until used, then consumed. Remaining code format/error/rematch details remain Q65.
- **Q61 — RESOLVED for trigger.** Send up immediately after either normal or late hold completes (C50). Subsequent voice/message interaction is not a prerequisite. Offline transmission/retry remains Q88.
- **Q62 — PARTLY RESOLVED.** Unpaired presentation uses a whole sun (C35). Still open: exact waiting, paired/not-up, up, offline, failed and unpaired-again behavior/copy, and which partner facts may be sent.
- **Q63 — PARTLY RESOLVED.** Off does not count toward partnerQuietDays or emit up. Quiet-run pause versus break remains open. Own morning localDate/offset/midnight are settled by U14; cross-partner timezone/day interpretation still needs definition.
- **Q64 — RESOLVED: NOT BUILT.** Omit sending a thought, its control, route, field, event and tests; keep partnerQuietDays. Do not reopen this as a priority question.
- **Q65 — PARTLY RESOLVED.** Real pairing survives restart and reinstall with the same token; public HTTPS/WSS works across separate/mobile networks. WS backoff plus paired/foreground 5-second GET polling and foreground refresh are confirmed; first up observation wins with no duplicate animation. U22 resolves lifetime: valid until used, then consumed, with no time-based expiry. A six-character human-readable code is the delegated engineering format; unpair/rematch and identity recovery remain open. Transport error handling is implemented without claiming full device acceptance.
- **Q66 — RESOLVED for the core U24 Demo.** Simulated anonymous matching is a labelled control in the isolated mobile Demo. It does not create real pairing and Reset only clears Demo state. Additional matching states/delays are not approved requirements.

### Help, safe person and callback simulation

- **Q67 — PARTLY RESOLVED.** Safe contact belongs in optional setup step 6, Your people (C51); name/number are phone-only and never sent to the server (C34). Contact count, manual input/system contacts and a relationship label remain open.
- **Q68.** Does safe-person Help offer calling, SMS or both? What happens if no contact exists? What exact message, if any, is prefilled, and must the user send it themselves?
- **Q69.** What is the order and prominence of emergency help, crisis support, safe person, clinic request and breathing? Which countries/languages are in scope? Support contacts must be verified before implementation, not inherited blindly.
- **Q70 — RESOLVED for the core U24 Demo.** A labelled callback control changes only the isolated mobile Demo state; it sends no real callback request. Clinic fixtures are independently configurable. Additional workflow states are not required by this answer.
- **Q71 — PARTLY RESOLVED.** A simulated callback is allowed only as a labelled demo; outside demo mode the button must genuinely work or be hidden (C33). Still open: care-team-sharing/no-clinic states within the demo and exact honest copy.
- **Q72 — RESOLVED.** Hide callback UI outside demo until a real integration exists. Internal TODO/interface structure is delegated engineering under C88; desired user-visible behavior still follows C33.
- **Q73.** For breathing, define cadence, session length, start/pause/restart/end behavior, sound/haptics and reduced-motion presentation. Is the HTML's proposed cadence intended or merely a reference?
- **Q74.** When Help or an external call opens mid-alarm, do sound, dawn, microphone and timers pause? On return, resume the exact stage and playback position, restart the stage or go Home?

### Clinic web dashboard

- **Q75 — RESOLVED for core demo scope/engineering.** Clinic directory/framework/shared types are delegated and the independent clinic demo is implemented. Public synthetic partner transport works intermittently through the approved tunnel; stable/two-phone acceptance is separate.
- **Q76 — PARTLY RESOLVED.** U14 adds insufficient and its label/reasons/sort order to might_need_call, drifting and steady. Neutral off dots and prior-status historical facts are settled. Old code gate, broader list/detail/filter/callback controls and other screen states remain open.
- **Q77 — RESOLVED by U24.** Clinic web uses its own configurable sample data; mobile Demo has independent isolated history. Simulated phone actions do not write a real clinic feed.
- **Q78 — RESOLVED for observation/windows and backfill policy.** Clinic observes non-off records, not absence. U19 backfills missing past alarm-enabled records from evidence on next launch before sync. Recent final-day7/comparison14 rules stand; late no_response retains 3 and late stopped retains 2.
- **Q79 — RESOLVED for selected calculation/confirmation copy.** Stopped copy distinguishes upAt as specified; late-confirmed no_response says “no response in the first hour; getting up confirmed later”, retaining value 3 and all no_response counts. Other unspecified reason-display details remain separate.
- **Q80.** Should the dashboard update live, on a timer or manually? What does it display when its demo provider is removed? Is real clinic authentication out of scope or required?
- **Q81.** Is a care-team-sharing control still included in the renamed Your people step alongside safe contact? Since real clinic delivery is not required, is that switch simulated, saved locally, sent somewhere or hidden, and what does its explanation promise?

### Data, server boundaries and recovery

- **Q82 — PARTLY RESOLVED.** LocalOnly private text/markers stay off-server, morning stepText null. On synced→localOnly next PUT removes server title/steps and nulls all prior morning stepText for that ID while keeping opaque ID/sizes/outcomes. Other retention and sharing-off behavior remain open; Decisions distress probability must never be stored/logged/exposed.
- **Q83 — PARTLY RESOLVED.** Pair persistence is tied to retaining/restoring the same user token, including reinstall. Anonymous bearer provisioning is implemented; recovery/reset behavior remains open, so do not claim reinstall recovery without a mechanism.
- **Q84.** Does “audio never leaves the phone” also prohibit OS cloud backup? Define retention/deletion for recordings, temporary samples, derived voice numbers, notes and morning data.
- **Q85 — PARTLY RESOLVED.** Safe-person name/number are explicitly allowed only on the phone and never on the server (C34). A clinician-to-patient contact mapping, if any, is separate from that contact and remains an open demo/TODO question.
- **Q86 — RESOLVED for selected Decisions flow.** Approved SDK/API/model/same-key path has a completed 395ms access probe. Whole-chain budget, initial unavailable fallback, final-judge failure/manual, post-judge safety Help/localOnly and immediate edited save/later hints are settled. Product implementation/validation remains separate; advisory wording is Q15.
- **Q87 — RESOLVED for phrase approval/localOnly transition.** User approves the phrase list; Finnish native review remains unconfirmed, not an extra gate. Retained manual needs_support goals stay localOnly. Next PUT removes any previously synced title/steps and nulls historical morning stepText, preserving IDs/outcomes; clean recheck can restore normal sync. Never send localOnly steps to Decisions.
- **Q88 — PARTLY RESOLVED.** Partner transport/backoff/foreground polling and duplicate-up handling are settled (C109). Offline goal/pair operations, queued writes, conflicting updates and stale/day-reset partner observations remain open.
- **Q89 — PARTLY RESOLVED by U24.** Demo Reset clears only Demo history/overrides and preserves real recordings, goals, identity, pairing and history. A broader delete-all/reset product is not selected by this answer.

### Demo mode and acceptance

- **Q90 — RESOLVED by U24.** Visible Demo entry in Settings; isolated mobile controls and independently configurable clinic sample data.
- **Q91 — RESOLVED for selected core timers.** Fast dawn is 10/15/20 seconds and first-ring cutoff 60 seconds. Hold remains two seconds, sensing five seconds and snooze five minutes. U24 approves fast time without authorizing additional accelerated timers.
- **Q92 — RESOLVED by U24.** Partner gets up now is an isolated Demo override; real partner transport is disabled there. Simulated holds/events never send real wake signals. Real WS/poll duplicate-up precedence remains as confirmed.
- **Q93 — RESOLVED for core U24 controls.** Ring now, fast time and selected morning difficulty use separate Demo history. Additional seeded history/measurement controls are not approved requirements.
- **Q94 — RESOLVED for core U24 scope.** Clinic uses independently configurable sample data; mobile callback and matching are labelled isolated simulations. The implemented clinic fixtures are demo assets, not real patient data or clinical validation.
- **Q95 — PARTLY RESOLVED.** U24 Reset preserves real recordings/pairing and clears only Demo history/overrides. Personal audio is never seeded. U15 synthetic composed pieces remain gated; stretch cache lifecycle remains open until that feature is authorized.
- **Q96 — RESOLVED for U24 boundary.** Demo is an explicitly configured isolated route/Settings entry with separate history; clinic fixtures have their own flag. Removal mechanics are delegated engineering. Real alarm/goal/pairing behavior remains independent; callback stays hidden outside Demo until real.
- **Q97 — RESOLVED by U24.** Matching/callback simulations are labelled Demo; their separate history/controls preserve real resources and send no real events. TODO backend integrations remain explicit.
- **Q98 — PARTLY RESOLVED.** Both physical phones are iOS; exact core script, successful-run/restart criteria and Android validation remain open. Lyria is listed on the event key, but full core two-phone pass is still required before composed dawn. Preview/phrase/model-list checks are not that pass.
- **Q99.** For the four equally weighted judging criteria, which concrete moments must demonstrate usefulness, low daily effort, sensing plus individual learning, and originality?
- **Q100.** What supporting deliverables are required besides code: README, setup/build guide, demo script, architecture notes, presentation or recording? Who decides any deadline-driven scope reduction?

### Cross-cutting decisions identified in the final audit

- **Q101.** Which older non-color product boundaries remain mandatory: no patient charts/scores/streaks/history, no transcripts, no text-to-speech/voice cloning, no chat, no background phone surveillance, and no diagnostic patient copy? Which exact copy restrictions should remain, including the banned-word list and punctuation rules?
- **Q102 — RESOLVED for U23 deletion/counts.** Preserve an already offered step; next surviving goal in existing order after deletion; offered/removed once per day; current Done only and Undo subtracts. Existing one-goal-per-offered-day/rotation/shared-learning rules remain. Duplicate-flow concurrency still requires implementation tests.
- **Q103 — PARTLY RESOLVED.** Phone wall-clock timezone/locale formatting and stored offset/midnight rules stand. Early window clips to alarm-day midnight and its localDate is the alarm date. Duplicated/skipped travel dates remain unsupported. Interface, recorded prompts and generated-step languages remain open.

### Follow-ups from the approved system-to-app alarm flow

- **Q104 — RESOLVED for normal takeover/handoff.** Stop the native occurrence and cancel pending native snooze on entry. System landing dawn lasts20 seconds; place audio continues to hold then fades about 2 seconds before message; advance to voice immediately and finish remaining sky motion in about 3 seconds. Interruption recovery remains Q29.
- **Q105 — PARTLY RESOLVED.** Normal getting-up time is scheduled alarm → hold with combined snoozes; early time is 0 plus separate early amount. First-reaction collection/meaning through native/app interactions remains open.
- **Q106 — RESOLVED for stopped/no_response mapping.** Any observed system Stop/snooze/in-app snooze/open within the fixed window without hold→stopped; none→no_response. Both freeze. Late confirmation preserves category and yields offered Tiny; dawn/clinic existing level mapping stands.
- **Q107 — PARTLY RESOLVED.** After first 60 minutes and before stored local midnight, both frozen stopped/no_response use silent hold→Tiny/hard Play, no voice/rescore; same record gets upAt/partner-up and offered status. In-progress flows/exact cutoff races and late native ringing remain edge questions.
- **Q108 — PARTLY RESOLVED.** Early flow/window and off re-enable rules stand. Late opens for either stopped/no_response have the selected hold→Home flow. Uncompleted normal/late flow resumption after interruption remains open.
- **Q109 — RESOLVED.** Native iOS controls are Stop plus Snooze; the person opens Aamu separately (C39).
- **Q110 — PARTLY RESOLVED.** The whole sun represents confirmed getting up; the sky independently represents dawn progress (C40). Unconfirmed cannot be shown as confirmed-up. Visual execution follows the delegated style; pairing/unpairing transitions remain open.

## Suggestions awaiting a decision

These are proposals, not requirements:

- Missing clinic records remain distinct from observations, but U19 requires next-launch backfill of past alarm-enabled gaps from persisted evidence. Do not invent alarm-enabled dates or treat missing/disabled dates uniformly.
- Callback simulations are now governed by confirmed C33; exact copy remains to be chosen.
- Use separate real and demo providers behind agreed interfaces so removing demo behavior is mechanical.
- Prove the native locked/closed-app alarm path on the physical iPhone before investing heavily in presentation polish.
- Link every accepted requirement to a concrete acceptance scene and maintain one active specification.

## Native alarm feasibility evidence

Historical feasibility review, 14 November 2026 before native implementation. The citations below establish documented capabilities only. Current signed build/launch and negative recurrence-probe evidence are recorded in NOTES.md; physical acceptance is still pending.

- Apple documents AlarmKit on iOS 26+ with Xcode 26+, alarm permission, recurring schedules and system-managed behavior when the app is not running. Countdown presentation also requires a widget extension. [Apple sample](https://developer.apple.com/documentation/alarmkit/scheduling-an-alarm-with-alarmkit)
- Apple's alarm alert supplies Stop automatically and allows an optional secondary action. The documented alert cannot enforce the reference's arbitrary two-second hold before a user silences it. The user chose the handoff in C28; native wiring still needs a device test. [Apple alert API](https://developer.apple.com/documentation/alarmkit/alarmpresentation/alert-swift.struct)
- Native APIs beyond Expo Go's bundled capabilities require the app's own native build. Expo documents local physical-iPhone builds using Xcode. A valid local development signing identity is present; app-specific provisioning remains unverified. [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- Android 15 cancels pending intents when the user explicitly force-stops an app. Force Stop is a separate state from ordinary backgrounding or closing the app. [Android stopped-state behavior](https://developer.android.com/about/versions/15/behavior-changes-all)
- Read-only local check: `xcodebuild -version` returned `Xcode 27.1`, build `27A9275`. No build, installation, permission or signing operation was performed by that initial read-only check; later signed simulator build/install/launch evidence is separate.
- Read-only local check: `security find-identity -v -p codesigning` returned one valid Apple Development identity. Output was reduced to counts; no certificate fingerprints, names or account addresses were recorded. This establishes local signing credentials exist, not that Aamu's targets/device are provisioned.
- Apple assigns a signing team per app/extension target. Aamu's team and automatic signing configuration can be verified during its first native build. [Apple signing setup](https://help.apple.com/xcode/mac/current/en.lproj/dev23aab79b4.html)

U5 resolved the iOS handoff, native Stop meaning and permission to use bundled locked-screen audio. Device iOS 26+ is reported; a project-wide minimum deployment version, second/Android devices and the detailed native sequence remain open. Native alarm code and signed simulator builds now exist; the negative recurrence probe did not solve finite-horizon scheduling. Physical locked/closed-phone acceptance remains pending.

## U26 clarification boundaries

- **Q111 — RESOLVED by U26 clarification.** Keep adaptive dawn while ringing; existing adaptive2/4/6-minute,20-second landing and hold-transition timing rules remain. Full-screen styling/current-time Home sky does not replace those behaviors.
- **Q112 — RESOLVED by U26 clarification.** Keep Moments and the past-self note as quiet links inside the one Home card; retain the existing playback/reply data flow without another card or primary action.

- **Q113 — RESOLVED by U27 clarification.** Paired own-only evening keeps You got up today. with Your partner isn’t up yet. below. Both confirmed uses only You both got up today. No missing confirmation is inferred.

## Next updates

U11's authorized visual slice is delivered for review: named colors in `src/theme.ts`, standalone renderer in `review/`, and browser-rendered 390 × 844 Alarm/Message/Home captures in `review/screenshots/`. Palette selection and captures were completed within the 30-minute window. The minimum computed text/background contrast is 7.46:1; fixed opaque text surfaces preserve contrast throughout dawn. These are visual previews, not native/device validation, and delivery does not imply user approval of the proposed palette.

U11–U25 requirements and bounded execution evidence are mapped in aamu-acceptance-tests.md. Keep the current checkpoint synchronized with final native compilation, extended live privacy checks and physical two-phone acceptance. U23 reminder/deletion/count rules and U24 Demo boundaries are resolved; do not reopen them. Composed dawn remains gated.


## U23 — confirmed deletion/counting and reminder boundaries

Source: `requirements/answers/u23.md`. The user approved retaining today's offered step when its goal is deleted, moving rotation to the next surviving goal in the existing circular order, counting offered/removed once per dated morning, and counting Done only while still marked Done (Undo subtracts). This resolves the corresponding Q102 edges. The user also approved suppressing the 18:00 reminder for an already-completed step or a first offer at/after 18:00, rescheduling when Done is undone before 18:00, and requesting local notification permission during Alarm setup. These replace the older unresolved reminder-boundary statements. No remote push service is authorized.

## U24 — isolated Demo implementation boundary

Source: `requirements/answers/u24.md`. The visible Settings Demo has separate history, Ring now/fast time/selected difficulty, Partner gets up now, labelled anonymous matching and callback simulation, and Reset limited to its own history/overrides. Real goals and recordings are read-only resources; real pairing/mornings remain intact. Clinic has independent configurable sample data. The user will connect the physical phone later; native and two-phone acceptance is still required. Implementation/evidence is recorded in the current checkpoint and acceptance file, not inferred from this approval alone.

## Historical U25 verification status — before U26 redesign

The ten corrections in `requirements/answers/u25.md` are implemented. The shared `HomeView` uses the configured local greeting and current-time sky, confirmation-only sun, rounded landscape, labelled controls, one warm alarm-enable action and outlined Help. Tiny removal alone shows “That’s enough for today.” for five seconds with Undo; Done retains its step text. Normal Home has no Preview scenes entry; it is inside flagged Demo controls. Next-alarm wording covers off, enabled pending and tomorrow after an early hold or a missed/off occurrence.

Root observed the actual HomeView in an isolated, fixed-clock web preview at 07:00 and 19:30, including off → turned back on, confirmed hold, Done/Undo and removal/Undo/expiry. Twelve screenshots are under `review/screenshots/home-u25/`; per-fix evidence is in `review/home-u25-report.md`. Nineteen Home regressions and four added Demo regressions pass within aggregate 322; 29 contrast checks pass in `review/home-contrast-u25.json`. The header arrow was the simulator pointer, not an app icon; the real header uses word-labelled Settings. This is bounded browser evidence, not a physical clock/alarm/audio or full two-phone pass. Earlier native smoke remains separate.

## U26 implementation checkpoint

`src/home/presentation.ts` now exposes off/early/up/evening/night, localized alarm time, truthful day label, confirmed hold and separate partner-up fields. State priority preserves off and the real180-minute window; evening requires a confirmed offered nonremoved step whose outcome is exactly null. Eight added tests cover off priority, genuine early timing, no inferred own-up,18:00 boundary, explicit false/true/removal/no-offer outcomes, pre07:00 today versus tomorrow, partner distinction and midnight. All 27 Home tests and API/mobile typechecks pass. The full-screen renderer and grouped Settings now have twelve 390×844 browser captures at 07:30/21:00 (`review/screenshots/home-u26/`), with a 07:00 alarm and labelled forced review states. Root observed Not today→Undo→Yes and off→enable→tomorrow with no console errors. Full aggregate 330 passes. `review/home-u26-contrast.json` bounds Home protected-text contrast≥6.068:1, default morning≥4.769:1, opaque text ≥5.193:1 and control edges≥3.261:1; no text is placed in the clear horizon band. `review/home-u26-report.md` maps the evidence. Final mobile typecheck and full src/modules lint pass; physical and full two-phone acceptance remain pending. The original U26 request is preserved, with the two confirmed clarifications appended.

## U27 implementation checkpoint

`homePresentation` adds `showSleepWell`, `heroTitle` and `partnerLine`, with copy centralized in `homeCopy`. Seven new tests pass (34 Home total), covering07:00 overnight boundaries, midnight-clipped01:00 early window, no Sleep well on off/confirmed/evening states, before-evening partner copy, single both-confirmed evening title, no fabricated both-confirmation and unchanged null-only evening windows. API/mobile typechecks pass at this checkpoint. No fixture override is accepted by the real resolver. Q113 is resolved: the paired own-only evening line explicitly retains truthful partner status. Other scene/layout/motion changes and new screenshot/recording evidence are in progress; no new full aggregate or native acceptance is claimed.


## U37 — presentation review, 15 November 2026

CONFIRMED: the user authorizes reviewing Claude's changes and making bounded fixes for a two-minute video, including clinic web preview, close-friend/family/anonymous partner choice and communication. Raw scope is in requirements/answers/u37.md. Implementation choices and remaining proposals are separated in review/presentation-review.md; they do not change the confirmed real sensing/privacy rules. Browser evidence now includes a real callback appearing at the top of the clinic. Guided partner/history remain simulated/isolated, and physical two-phone acceptance is pending.


## U38 — single post-goal action

CONFIRMED: the post-goal bridge has only Select a partner. Its direct Ring alarm bypass is removed; the guided partner screen now advances to the alarm instead of returning to the bridge. Pairing is not newly mandatory. Latest source publication to the existing GitHub repository is explicitly authorized, with secrets excluded. Source: requirements/answers/u38.md.

U38 follow-up: the user asked why zero points can yield Full. Explained that points measure morning difficulty, and the offered size is the smaller of that morning's cap and progression. The guided demo starts at Full; real first-day carry remains Small. Copy clarified; no algorithm change requested or made.
