# Aamu — pending acceptance tests

U27 approves the U26 layout direction and adds targeted copy/scene refinements (`requirements/answers/u27.md`). Work is in progress: real-time Sleep well and confirmation copy, plain night text, unboxed early/off controls, smooth sky/tinted water, Settings chevrons and reduced-motion-aware ambient animation. The pure model now passes 34 Home tests (seven new U27 cases), with API/mobile typechecks passing at that checkpoint. The last completed full aggregate remains 330 from U26. New U27 screenshots and the requested 10-second motion recording are pending; the earlier forced 07:30/21:00 review scenarios did not change real early/evening rules. Physical alarm/audio/reminder and complete two-phone acceptance remain pending.

Status checkpoint — 14 November 2026: the main screens and shared rules are implemented; native scheduling and end-to-end acceptance work continues. The signed iOS simulator completed a real synthetic Gemma goal/Approve, setup with alarm-denial gate and Settings grant, then Home → early hold → microphone denial → Small step → Tiny → Done/Undo. Evidence: `review/native-smoke.json` and `review/screenshots/native-smoke/home.png`. This is a scoped simulator flow, not physical locked/closed ringing, recorded audio or two-phone acceptance. Settings goal deletion/reordering and local counts, direct alarm toggling, local evening reminders, isolated mobile Demo and the separate clinic dashboard now exist. After privacy hardening and U25/U26 Home/Demo corrections, the aggregate passes 330 API/shared tests with zero failures (U25 total 322 plus eight U26 state regressions). API/mobile typechecks and final full mobile src/modules lint pass. The focused privacy subset passes 30 tests. These checks validate their stated code paths, not the full acceptance matrix.

Both Aiven services connect with verified TLS. On a fresh tunnel endpoint, public HTTPS/WSS synthetic checks passed at 17:03 UTC: health, real pairing, until-used/single-use codes, idempotent wake events, cut-socket polling and text erasure including clean same-ID re-add versus stale/current morning uploads. After API restart, pair persistence and synthetic-row cleanup also passed over public HTTPS/WSS at 17:05 UTC; both transports and exact timestamps are in `review/live-integration.json`, and that verification script’s synthetic rows were removed. The prior tunnel expired with “Unauthorized: Tunnel not found” after earlier 530/1033 failures. The fresh endpoint works in this bounded run; sustained reliability and physical-phone acceptance are not established. HTTP/2 is not a proven fix, and the earlier time gap does not establish a sole cause.

Private-storage implementation and reviewed backup configuration exclude personal files; actual OS backup/device transfer is untested, and earlier backups cannot be removed retroactively. Four separate Android configuration checks pass (`review/android-backup/README.md`); they are not added to the 330-test aggregate. Saved-audio playback now verifies private file ownership before loading. Goal snapshot revisions and acknowledged-revision-bound morning text prevent the reviewed stale-write paths, with explicit local retries. Pending-check text filtering, foreground pairing discovery and cutoff navigation fixes are implemented. Clinic has 19 rule tests plus 3 build/removal checks and browser QA; local reminders have 12 logic tests; mobile Demo has 12 logic tests and browser flow/reset evidence. Android module/full ARM64 debug APK builds, eight native JUnit checks, API36 emulator install/React Native entry startup and packaged backup-rule inspection pass (`review/android-build.json`). Android visual UI, permissions, alarm/audio delivery and physical acceptance remain pending. Local Android voice sensing is implemented: 17 unit checks and five emulator tests using the actual bundled Silero model pass, with full APK build/install and bundled-license evidence in `review/android-voice.json`. No microphone or personal audio was used. The eight calendar tests, 22 voice checks and four backup checks remain separate from aggregate 330. The iOS recurrence experiment returned a negative result and was cleaned up, with Aamu restored; this does not solve the finite scheduling horizon or closed-app timezone limits. Physical phones will be connected later; full native audio/alarm and two-phone acceptance remain pending. Composed dawn remains gated. U22–U27 answers are preserved under `requirements/answers/`.

Source: U11–U25 user answers, with earlier confirmed decisions in aamu-discovery.md. Test outcomes do not authorize filling unresolved product choices; reconcile disagreement against actual answers.

`USER` means a case/family explicitly requested in U11–U15. `DERIVED` is additional coverage from a confirmed rule, not a new requirement. Unanswered expectations remain separately listed without invented results.

## Shared fixture conventions

- Use a fixed local date called `today`, explicit dated morning records and deterministic event times. No test depends on the real clock.
- Keep morning category, confirmed getting up, voice acquisition state, offered step and step outcome as separate fields. `stepDone` has three values: `true`, `false`, `null` (unknown).
- In step tests, size order is `Tiny < Small < Full`. A morning limit is an input already supplied by the approved morning logic. These tests do not introduce a new category-to-size mapping or first-day default.
- An offered day is a day on which the person was actually offered a step. A later removal does not erase that offer. A day with no offered step is not an offered day.
- Phrase-check tests use matching/nonmatching fixtures. U17 approves the EN/FI list; native Finnish review is unconfirmed without adding another shipping gate. Product/Decisions integration needs its own evidence.
- Test identifiers below are specification identifiers, not claims that test files exist.

## Usually speaks, voluntary Skip and valid silence

Confirmed U13 rule: exclude today/late/off/unavailable/failed, then take the latest 14 spoke/silent/skipped mornings. n counts all three eligible states; spoken counts spoke alone. Filtering precedes the 14-record limit. U14 confirms valid silence uses exactly the voluntary-Skip gate below. Spoke onset/quiet conditions instead use fixed-baseline readiness; the whole voice term is capped at one. Remove unconditional null-onset scoring.

- If `n < 5`, voluntary Skip and valid silent recording each contribute zero points.
- If `n >= 5`, the person usually speaks when `spoken >= ceil(n × 0.5)`. A voluntary Skip or valid silent recording then contributes one point; otherwise it contributes zero.
- Window length `14`, minimum observations `5` and speaking proportion `0.5` must come from configuration.
- Denied/unavailable and technical failure contribute zero and occupy neither numerator nor denominator. Late/off days are excluded. Silent occupies the denominator/window but not spoken count; fixed speechShare baseline remains spoke-only.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| US-01 | USER | Four eligible prior mornings, all `spoke`; voluntarily Skip today. | `n = 4`; Skip contribution `0`. |
| US-02 | USER | Five eligible prior mornings: three `spoke`, two `skipped`; voluntarily Skip today. | `n = 5`, `spoken = 3`; usually speaks; contribution `1`. |
| US-03 | USER | Five eligible prior mornings: two `spoke`, three `skipped`; voluntarily Skip today. | `n = 5`, `spoken = 2`; does not usually speak; contribution `0`. |
| US-04 | USER | Fourteen eligible prior mornings: seven `spoke`, seven `skipped`; voluntarily Skip today. | Threshold is inclusive; contribution `1`. |
| US-05 | USER | Interleave eligible mornings with unavailable, failed, late-flow and off records; include today. | Excluded records affect neither n nor spoken and occupy no place in the eligible 14-record window. Today is excluded. |
| US-06 | DERIVED | More than 14 eligible prior mornings, with older excluded records interleaved. | Select exactly the latest 14 eligible mornings by date; older eligible records do not affect the predicate. |
| US-07 | DERIVED | A usual speaker encounters permission denial or technical recording failure today. | Contribution remains `0`; do not turn unavailable/failed into voluntary Skip. |
| US-08 | DERIVED | Supply nondefault window/minimum/proportion configuration in a pure-function test. | Selection and threshold use supplied configuration rather than hard-coded `14`, `5` or `0.5`. |
| US-09 | DERIVED | Acquire a successful silent recording. | Store silent, never spoke/unavailable/failed. It is eligible for the rolling window/denominator but never increases spoken count. |
| US-10 | USER | Prior window is 5 spoke and 9 silent; voluntarily Skip today. | n = 14, spoken = 5; not usually speaks; voice points 0. |
| US-11 | USER | Same 5-spoke/9-silent prior window; a successful silent recording today. | Voice points 0. The old unconditional null-onset +1 must not override this expected result. |
| US-12 | USER | Four eligible prior mornings, all spoke; acquire valid silent recording today. | n = 4; silent contribution 0. Null onset does not create a point. |
| US-13 | USER | Rolling history qualifies as usually speaks; acquire valid silent recording. | Voice contribution 1, using the same gate as Skip. |
| US-14 | USER | Rolling history has at least five eligible mornings but does not qualify as usually speaks; acquire valid silent recording. | Voice contribution 0. |

## Personal sensing baselines

Main eligibility includes normal completed holds within 60 minutes, early holds and hard mornings; excludes stopped/late/no_response/off. Early minutesToUp is 0 with amount early separate. Normal duration still uses the scheduled-alarm origin.

U20 ordering: score today against prior eligible history, then append today if qualifying. The stored baselines below therefore become inputs to the next morning; no current observation affects its own score. Fifth qualifying morning uses defaults, sixth first uses the five-prior median. For the first 14 qualifying mornings in chronological order:

- Fewer than five: use `0` snoozes and `8` getting-up minutes.
- Five through thirteen: calculate medians from the qualifying observations collected so far, with snoozes capped at `1` and minutes capped at `12`.
- At fourteen: calculate and freeze the values and record the dates used. Future mornings do not roll the window or change the frozen baseline.

Voice follows the same score-first/append-after ordering, independently: fifth qualifying valid recording cannot enable its own voice term, sixth first uses five prior valid samples. The voice baseline uses the first 14 qualifying mornings with voiceState=spoke and a valid recording. Before five valid samples, both delayed-onset and quiet-share conditions contribute zero without a 0.5 default. At 5–13 use a speech-share median floored at 0.4; at 14 freeze with source dates. Silent never enters this fixed baseline; it is included in the rolling usually-speaking denominator. Once the fixed voice baseline is ready, spoke onset ≥2500ms or share ≤0.6 × baseline contributes one total, regardless of how many conditions fire.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| BL-01 | USER | Four qualifying main observations whose medians differ from the defaults. | Main baseline is exactly snoozes `0`, minutes `8`; it is not frozen. |
| BL-02 | USER | Five qualifying main observations; snoozes `[0, 1, 3, 4, 5]`, minutes `[1, 8, 20, 25, 30]`. | Medians are capped to snoozes `1`, minutes `12`; not frozen. |
| BL-03 | USER | Thirteen qualifying observations: seven with snoozes `0`/minutes `4`, six with snoozes `1`/minutes `10`. | Medians are snoozes `0`, minutes `4`; not frozen. Defaults no longer apply. |
| BL-04 | USER | Fourteen qualifying observations: seven with snoozes `0`/minutes `4`, seven with snoozes `1`/minutes `10`. | Freeze snoozes `0.5`, minutes `7`; record exactly those fourteen dates. |
| BL-05 | USER | Interleave qualifying mornings with stopped-unconfirmed, late-stopped-confirmed and no_response including late-confirmed. | Exclude these no-hold/late categories from baseline count, medians and dates. |
| BL-06 | USER | Reach fourteen main qualifying mornings while fewer than fourteen valid qualifying voice samples exist. | Main baseline freezes; voice baseline remains at its own count and follows its own under-five or five-to-thirteen rule. |
| BL-07 | USER | After freeze, append many qualifying mornings with substantially different values. | Main and, once separately frozen, voice values and sample dates never drift to a rolling window. |
| BL-08 | DERIVED | Include an early hold and a qualifying hard morning. | Both count toward the main baseline. Early getting-up time is 0, with how early stored separately; neither early timing nor hard level excludes an otherwise eligible morning. |
| BL-09 | DERIVED | Compare an otherwise qualifying hold at exactly 60 minutes after first ring with a late hold after 60 minutes. | Exactly 60 minutes qualifies; the late/stopped morning does not. |
| BL-10 | DERIVED | Interleave deliberately off days into eligible main/voice history. | Off does not contribute to either baseline, source dates or usually-speaking history. |
| VB-01 | USER | Four valid qualifying spoke recordings. | Neither delayed-onset nor quiet-share comparison contributes a point; no 0.5 fallback baseline; not frozen. |
| VB-02 | USER | Five valid qualifying speech shares `[0.10, 0.20, 0.30, 0.50, 0.60]`. | Median `0.30` becomes baseline `0.40`; not frozen. |
| VB-03 | USER | Thirteen valid qualifying speech shares: seven at `0.60`, six at `0.80`. | Baseline `0.60`; not frozen. |
| VB-04 | USER | Fourteen valid qualifying speech shares: seven at `0.60`, seven at `0.80`. | Freeze baseline `0.70` and exactly the fourteen valid qualifying sample dates. |
| VB-05 | USER | Interleave valid qualifying `spoke` recordings with skipped, unavailable, failed, invalid recording, late-flow and otherwise nonqualifying mornings. | Only valid recordings from qualifying `spoke` mornings increment the voice count or affect its baseline. |
| VB-06 | USER | Main baseline is already frozen; add valid qualifying voice observations until the voice count reaches fourteen. | Voice freezes at its own fourteenth sample, possibly on a later date; main values/dates stay unchanged. |
| VB-07 | USER | Append different speech shares after voice freeze. | Frozen voice value and sample dates remain unchanged. |
| VB-08 | USER | At least five valid fixed-baseline recordings; today’s spoke recording has delayed onset ≥2500ms and speechShare ≤0.6 × baseline. | Voice contribution 1, not 2; both conditions share the one-point cap. |
| VB-09 | DERIVED | Interleave successful silent mornings with qualifying valid spoke samples. | Silent does not enter the spoke-only fixed voice baseline or its source dates. Main-baseline eligibility still follows the hold rule. |
| VB-10 | DERIVED | Only four valid fixed-baseline recordings; today’s spoke recording meets both onset and quiet-share conditions. | Voice contribution 0; neither condition bypasses the five-valid-recording gate. |
| VB-11 | DERIVED | Fixed voice baseline is ready, rolling history does not usually speak, and today has spoke with delayed onset or quiet share. | Apply the selected spoke condition for one point; the silent/Skip history gate does not replace fixed-baseline readiness for spoke recordings. |
| BL-11 | DERIVED | Four prior qualifying mornings; score the fifth whose values differ from their median. | Use default 0 snoozes/8 minutes. Only after scoring append it and calculate the stored five-sample median. |
| BL-12 | DERIVED | Five prior qualifying observations; score the sixth with an outlying value. | Use the first five’s stored median, excluding the sixth until after its score. |
| BL-13 | DERIVED | Thirteen prior qualifying observations; score and append the fourteenth. | Score against the thirteen-sample running median; afterward freeze the fourteen-sample median/dates for subsequent mornings. |
| VB-12 | DERIVED | Four prior valid qualifying spoke samples; today is the fifth and meets onset/quiet conditions. | Voice contribution 0 from these conditions; append afterward to produce five-sample stored baseline. |
| VB-13 | DERIVED | Five prior valid qualifying spoke samples; today is sixth. | Apply readiness/quiet comparison using five prior samples, then append today if eligible. Main/voice counts remain independent. |

## Timing comparison floor (U20)

Full-product acceptance remains PENDING; shared baseline/scoring implementation and local boundary tests now exist (see current execution record). Use comparisonBaselineMinutes=max(1, stored baselineMinutes) in both timing thresholds; preserve storage and measured early zero.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| TM-01 | DERIVED | Stored baselineMinutes = 0 and today minutesToUp = 0. | Timing points 0; stored baseline remains 0. The comparison-only floor does not rewrite the median. |
| TM-02 | DERIVED | Stored baseline 0; compare timing inputs 1.49,1.5,9.99,10 minutes. | Points 0,1,1,2 respectively: lower threshold 1.5 and upper max(10,2)=10. Storage stays 0. |
| TM-03 | DERIVED | Stored baseline 0.5 versus 2 with otherwise identical scoring inputs. | Effective comparison baselines 1 and 2 respectively; stored values 0.5 and 2 unchanged. Floor is not a universal replacement with 1. |

## Late Tiny and size progression

Late holds preserve frozen stopped OR no_response and offer Tiny; offered outcomes set shared carry independently of either category. Each following no-offer stopped/no_response day reduces carry one rung to Tiny. Off preserves it. Apply the current-morning cap on the next offer. No-offer days never advance goal rotation.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| SP-01 | USER | A late Tiny was offered; `stepDone = true`; next morning limit permits Small or Full. | Previous-offered-day limit is Small; next offered size is Small. |
| SP-02 | USER | A late Tiny was offered; `stepDone = false`. | Previous-offered-day limit is Tiny; next offered size is Tiny. |
| SP-03 | USER | A late Tiny was offered; `stepDone = null`. | Unknown holds Tiny; next offered size is Tiny. |
| SP-04 | DERIVED | Keep final size/outcome fixed while prior category varies among stopped/no_response/easy/medium/hard. | Same progression; a late no_response offered step is not a no-offer gap. |
| SP-05 | DERIVED | Previous-offered-day limit is Small but current morning limit is Tiny. | Final offered size is Tiny. |
| SP-06 | DERIVED | Previous-offered-day limit is Tiny but current morning limit is Full. | Final offered size is Tiny. |
| SP-07 | DERIVED | Full was reduced to Small and completed. | Progression starts from final Small and permits Full, then applies the current morning limit. |
| SP-08 | DERIVED | An offered Tiny was removed for that day. | Its removal preserves the offered-day fact; next-offer progression starts at Tiny, following the already confirmed removal rule. |
| SP-09 | DERIVED | Monday final Small completed; Tuesday stopped with no offered step; Wednesday morning permits Small or Full. | Monday produces Full; Tuesday reduces the carried progression limit one rung; Wednesday limit and offered size are Small. Do not reuse Full or shrink Monday’s Small directly to Tiny. |
| SP-10 | USER | Start carrySize Full; then three no-offer stopped days. | Carry sequence Full → Small → Tiny → Tiny; no automatic step removal. |
| SP-11 | USER | Start Full; interleave no-offer no_response and stopped days. | Each qualifying no-offer day reduces carry once; same one-rung/Tiny-floor behavior across both categories. |
| SP-12 | USER | Carry Small and goal pointer B; deliberately disable before firing. | Off preserves Small and B, with no offer/rotation advance. |
| SP-13 | USER | No prior offered step; first morning easy, medium and hard in separate fixtures. | Initialize carrySize Small; offer Small, Small and Tiny respectively. Never Full on first day. |
| SP-14 | USER | First day Small is completed; next morning permits Full. | Carry becomes Full and next offered step may be Full. |
| SP-15 | DERIVED | Existing carry Full; delete all goals and create new goals later. | Preserve carry Full; goal replacement does not reset learning. Empty-goal navigation remains separately open. |
| SP-16 | DERIVED | Reset app data with a non-Small carry. | Carry returns to Small. This does not decide which other data is deleted by reset. |

## Returning from needs_support

Initial `needs_support` opens Help with no ladder. Help keeps its usual controls and supplies `Back to my goal`; returning preserves editable goal text. The goal screen shows exactly `You can change the wording, or write your own steps.` and offers `Check again` and `Write my own steps`. A second flag is shown inline with `Need help now?`, rather than navigating to Help again. Never model-generate steps for a goal whose latest verdict is `needs_support`.

Check both goal and manual-step text locally first using the shared config. A local matching goal is not submitted and follows needs_support Help; a matching manual step is not saved/sent. Emit no local-match event/report. Only nonmatching goals reach POST /goals/shrink, where server recheck precedes the model. Server needs_support stores/logs no text/verdict/row/counter/metric; route/status/duration logs are allowed. Only approved non-localOnly PUT /goals stores goals. No /goals/check-steps route. A retained manual override after either local or endpoint needs_support stores its title and all three step texts only on the phone, without a server marker. Its morning still sends opaque goalId, size/outcome and null stepText. U17 approves the list and authorizes Decisions after the shared check. Never store/expose distress probability or send localOnly steps to a judge.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| NS-01 | USER | Initial flag → Help → `Back to my goal`, without editing. | Goal text returns intact and editable. Show exactly `You can change the wording, or write your own steps.` with `Check again` and `Write my own steps`. |
| NS-02 | USER | Initial flag → Help → `Back to my goal` → `Check again` flags again. | Stay on the goal screen with inline feedback and `Need help now?`; do not send the user through Help again; do not model-generate a ladder for that flagged goal. |
| NS-03 | USER | Initial needs_support from local check or endpoint → return → Write my own steps; enter three valid nonmatching steps and approve. | Save exact title and steps on the phone as localOnly; three-nonempty/60-character rules still apply. Do not model-generate replacement steps or require/suggest changing the title. |
| NS-04 | USER | Manual override contains a matching step; attempt save. | Do not save/upload it; show helper/Help and run the approved shared checker locally. No native-language accuracy claim is implied. |
| NS-05 | DERIVED | Initial flag → return → delete the flagged goal while another goal remains. | Deletion is available; flagged goal is removed. Do not invent what the app does when the last goal is deleted. |
| NS-06 | DERIVED | An earlier accepted request produced a model ladder, then the latest request returns `needs_support`. | Do not display the earlier model steps as if they were approved under the latest verdict or model-generate new steps for that flagged goal. |
| NS-07 | DERIVED | Exercise each flagged/manual path with backend persistence and outgoing clinic/partner payloads observed. | No verdict or flag is persisted on the backend or included in clinic/partner exposure. Transient request/response handling is not misreported as persistence. |
| NS-08 | DERIVED | Exercise the same paths with logging captured, including validation failures. | Goal and step text do not appear in logs. |
| NS-09 | DERIVED | Phrase-check fixture matches a manual step, then inspect all save effects. | Matching text has not been saved locally or remotely; a disabled UI button alone is insufficient evidence if a save path still accepts it. |
| NS-10 | DERIVED | Return with goal text intact, edit it, then `Check again` returns an accepted verdict. | Check the edited text and transition according to that latest accepted result; do not retain an outdated flag as the current verdict. |
| NS-11 | DERIVED | Local checker matches goal text before POST /goals/shrink. | Do not submit the text or emit a local-match event/report; enter the existing needs_support Help flow. |
| NS-12 | DERIVED | Local nonmatch goal reaches server; server list matches. | Return needs_support before any model call; create no text/verdict row, counter or metric. |
| NS-13 | DERIVED | Local/server list nonmatch; model returns needs_support. | Same Help response and no-storage/no-text/no-verdict/no-counter/no-metric constraints. Permitted log fields are route/status/duration only. |
| NS-14 | DERIVED | Generate a nonmatching goal ladder, then approve and PUT /goals. | Shrinking/checking alone does not store the goal; approved non-localOnly PUT is the persistence boundary. LocalOnly overrides follow NS-15–19 instead. |
| NS-15 | USER | Approve a localOnly manual override, then capture PUT /goals and related outgoing traffic. | The entire goal is omitted; no title, step text or localOnly/existence marker is sent. Do not offer consent-to-send. |
| NS-16 | USER | Submit a morning for a localOnly goal whose opaque ID has never existed on the server. | Send locally generated opaque goalId, stepSize and stepDone with stepText null; server accepts nullable text/unknown goal without depending on either. No privacy marker is added. |
| NS-17 | USER | Rotate through mixed ordinary and localOnly goals with identical final sizes/outcomes. | Both kinds participate identically in rotation, shared carry, per-goal phone-local counts and Home/message behavior. |
| NS-18 | USER | Person voluntarily rewords a localOnly goal; local check and endpoint check both pass. | Clear localOnly and include it in the next PUT /goals. Revised nonmatching text may use the approved endpoint/model path. |
| NS-19 | DERIVED | A localOnly goal is rechecked and the latest verdict is still needs_support. | It stays localOnly; a locally matching revision is not submitted. No consent/title-edit requirement is introduced. |
| NS-20 | DERIVED | Synced goal becomes localOnly; next PUT /goals runs. | Remove server title/step texts and null stepText on every existing morning with that goalId; keep opaque ID, sizes and outcomes. No private text/marker is sent. |

## Goal rotation and shared progression

Rotate through one, two or three goals in setup order, one goal per offered day. Advance the pointer when a step is offered regardless of later completion or removal. A day with no offered step does not advance it. Size progression is shared across goals and reads the previous offered day, not the previous calendar day and not the last occurrence of that particular goal.

Keep local per-goal counts for offered, done and removed. Those counters do not select goals, size steps or rank goals. Editing/reordering goals preserves identity and the pointer's goal identity; if that goal is deleted, move to the next goal. U23 confirms preserving an already offered step after deletion and moving the pointer to the next surviving goal in the existing order. Offered/removed count once per day; Done counts only while currently Done, and Undo subtracts it.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| GR-01 | USER | One goal A; offer a step on consecutive offered days. | Selection sequence A, A, A. |
| GR-02 | USER | Two goals in setup order A, B; offer on four offered days. | Selection sequence A, B, A, B. |
| GR-03 | USER | Three goals in setup order A, B, C; offer on six offered days. | Selection sequence A, B, C, A, B, C. |
| GR-04 | USER | Offer A, then one or more no-offer days, then offer again. | Next goal remains B; gaps do not consume goals. Sizing follows carry reductions for stopped/no_response and preservation for off (SP-10–12). |
| GR-05 | USER | Order A, B, C; pointer is B; delete B before offering. | Next selected goal is C; wrap through surviving goals in the existing order. No surviving goal means no manufactured replacement. Preserve any step already offered today. |
| GR-06 | DERIVED | Offer A and compare later outcomes completed, explicitly not done, unknown and removed. | Every case advances the rotation to B exactly as an offer does; outcomes affect shared size progression, not goal choice. |
| GR-07 | DERIVED | Offer A at final Small and mark done; next selected goal is B and current morning permits Full. | B receives the shared progression result Full, rather than restarting or using B's older history. |
| GR-08 | DERIVED | Edit goal B's text or its step text while the pointer identifies B. | Goal identity and pointer remain B. Text editing does not reset rotation or counts. |
| GR-09 | DERIVED | Reorder existing goals while the pointer identifies B. | Preserve B's identity as the next selected goal; do not reinterpret the old array index as another goal. |
| GR-10 | DERIVED | Alter per-goal offered/done/removed counters while keeping the actual rotation pointer and previous offered-day record unchanged. | Selected goal and size do not change; counters are not inputs to these decisions. |
| GR-11 | DERIVED | Capture storage and outgoing requests after offers, completions and removals. | The per-goal counters remain local and are not exposed through clinic/partner data. U23 counts each offered/removed day once and current Done only; Undo subtracts Done. |

## Early wake

All early cases are PENDING. U17 completes the window: max(alarm−180 minutes, alarm-day local midnight) until fire, hidden otherwise/off. Early localDate is alarm date; minutesBeforeAlarm is floored non-negative early minutes, null otherwise. Silent/static-sky flow and zero minutesToUp/snoozes remain.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| EW-01 | DERIVED | Before the scheduled alarm, select quiet Home control I’m already up and complete the hold. | Cancel that day's alarm; record minutesToUp 0 and the amount early in a separate field. Do not store a negative baseline input. |
| EW-02 | DERIVED | Complete the early hold. | Continue through normal voice, message and step flow; do not use the late flow. Completed-hold confirmation/partner-up still applies. |
| EW-03 | DERIVED | Add that early completed morning to main-baseline collection. | Count it as qualifying with a zero-minute duration. Its separate early amount is not substituted into minutesToUp. |
| EW-04 | DERIVED | Home is 181,180 and 1 minute before an alarm whose window does not cross midnight, then after fire. | Hidden at 181, available from 180 until fire, hidden afterward; earlyHoldWindowMinutes comes from config. |
| EW-05 | DERIVED | Home is inside the early window but today is off. | Early control is hidden; re-enable before scheduled time restores availability under the normal window. |
| EW-06 | DERIVED | Complete early hold with place audio and a composed piece otherwise available. | No dawn animation/place/composed sound; static current-time sky, direct voice→message→step. |
| EW-07 | DERIVED | Complete early hold while today’s system/in-app alarms are scheduled. | Cancel both for today, fill/raise sun and publish partner_up immediately; recurring future schedule remains. |
| EW-08 | DERIVED | Persist early versus normal/late holds. | Early minutesToUp = 0/snoozes = 0; minutesBeforeAlarm=floor(early minutes), non-negative. Non-early holds store null. |
| EW-09 | USER | Alarm 07:15. | Early control opens 04:15 on its calendar day. |
| EW-10 | USER | Alarm 02:00. | Opens 00:00 that date, never 23:00 the previous day. |
| EW-11 | USER | Hold 00:30 for 02:00 alarm. | minutesBeforeAlarm = 90; localDate is alarm calendar date. |
| EW-12 | DERIVED | Hold 90 minutes 59 seconds early. | minutesBeforeAlarm = 90, flooring fractional minutes. |

## Included local recording features

All cases are PENDING. Personal recorded audio is not seeded; presenter records it beforehand. Bundled place/alarm sounds remain permitted. U15 permits pre-generated synthetic composed-dawn pieces only after its two gates; this does not alter the personal-recording rules.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| RP-01 | DERIVED | Open message stage on a medium or hard normal morning and use Say something back. | Permit a phone-local note of at most 20 seconds; associate its source morning level. |
| RP-02 | DERIVED | Easy Home has several unanswered notes with different dates. | Offer the oldest unanswered note with play and Answer it. |
| RP-03 | DERIVED | Answer a hard-origin note on an easy morning. | Save a new real recording in the hard message category, using the note's source level rather than today's easy level. |
| RP-04 | DERIVED | Load demo history without previously recorded personal notes/messages. | Do not manufacture or seed personal audio. Presenter preparation supplies recordings; bundled sounds are a separate approved feature. |
| PS-01 | DERIVED | Record personal place sound in setup 3/Settings. | Both use≤30 seconds and tap-start→Play/Record again/Save/Cancel. Permission/error states remain separate. |
| PS-02 | DERIVED | Use a saved personal place recording for a normal in-app dawn, then schedule the locked alarm. | In-app dawn uses the personal sound; the locked alarm keeps an approved bundled variant. No recorded audio is uploaded. |

## Personal recording controls and sensing interruption (U21)

Full-product acceptance remains PENDING. Recorder and native audio/voice code now exist and the combined simulator build passes; actual recording/audio-device behavior is not inferred from compilation or goal tests. Personal recordings are tap-initiated; the five-second sensing sample stays automatic.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| RC-01 | DERIVED | Open morning-message library. | Exact labels For an easier morning / For an in-between morning / For a hard morning. |
| RC-02 | DERIVED | Record a morning message. | Maximum 20 seconds; do not substitute the five-second sensing duration. |
| RC-03 | DERIVED | Separately create morning message, reply, answer to reply and personal place recording. | Each starts on a tap and offers Play, Record again, Save and Cancel afterward. |
| RC-04 | DERIVED | Compare the personal recording screen with normal sensing stage. | No automatic personal recording; sensing remains automatic five seconds with Skip. |
| VC-01 | DERIVED | After completed hold, close Aamu during five-second sample and reopen. | voiceState failed, zero voice points; continue to message without restarting/resuming sample. |
| VC-02 | DERIVED | That failed sample came from an otherwise timely qualifying hold. | Exclude failed voice from usual-speaking/fixed-voice histories, while main-baseline eligibility still follows the hold. |

## Evening reminder (U21)

Native delivery acceptance remains PENDING. U23 suppresses a first offer at/after 18:00, already Done and removed steps; Undo before 18:00 restores eligibility. Request notification permission during Alarm setup. Twelve local rule tests pass; they do not prove notification delivery/actions on a physical phone.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| ER-01 | DERIVED | An eligible offered step still awaits its evening response. | Reminder time 18:00 local; exact answer labels Yes and Not today. |
| ER-02 | USER U23 | Step is first offered at or after 18:00. | No reminder for that first offer; do not suppress an earlier offer merely because its flow was late relative to the alarm. |
| ER-03 | DERIVED | An offered Tiny is removed before its reminder. | Cancel that day’s reminder under the already selected removal rule. |
| ER-04 | DERIVED | Evening reminder is ignored. | Completion remains unknown under the existing rule; do not turn silence into explicit Not today. |
| ER-05 | USER U23 | Mark an eligible step Done, then Undo before 18:00. | Cancel while Done and restore the eligible reminder after Undo. |
| ER-06 | USER U23 | Reach Alarm setup. | Request local notification permission; keep the separate required system-alarm permission gate. |

## Final alarm outcomes, backfill and snooze (U19)

Native/full-product acceptance remains PENDING. Shared lifecycle/backfill tests now cover selected branches; they do not establish native delivery. No hold within 60 minutes of first ring: any observed Stop/system or in-app snooze/Aamu open gives stopped; none gives no_response. Re-rings never reset the window; fast mode 60 seconds. Final categories freeze while late confirmation can add upAt/partner-up and an offered step. Next launch backfills past alarm-enabled gaps from persisted evidence, then syncs.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| NR-01 | USER | Untouched alarm through 60 minutes from first ring. | Final no_response; timeout alone creates no upAt/partner-up/step offer. |
| NR-02 | USER | One observed system Snooze, then no hold by cutoff. | Final stopped even without other interaction. |
| NR-03 | USER | Aamu opened/closed, no hold by cutoff. | Final stopped. |
| NR-04 | USER | Next launch finds three past enabled dates without records, with persisted evidence. | Backfill all three from evidence, then sync; not only the latest day. |
| NR-05 | USER | Frozen no_response; late hold before recorded local midnight. | Keep no_response; set upAt/partner_up; same record offers Tiny/hard message behind Play, no voice/automatic sound. Counts as offered for carry/rotation. |
| NR-06 | DERIVED | One observed system Stop or in-app Snooze, separately, without hold. | Either gives stopped at cutoff; neither alone confirms up. |
| NR-07 | DERIVED | Several snoozes/re-rings before cutoff. | Deadline remains firstRing+60 minutes; never extended. |
| NR-08 | DERIVED | Fast mode with no hold. | Same rules finalize at 60 elapsed seconds from first ring. |
| NR-09 | DERIVED | Not running at cutoff; launch later with ring/Stop/snooze/open evidence. | Finalize from persisted evidence on launch. |
| NR-10 | DERIVED | Actions arrive after stopped/no_response finalized. | Neither final level converts to the other; late hold changes upAt/offer separately. |
| NR-11 | DERIVED | System Stop unavailable and no other interaction observed. | Record no_response and disclose native limitation. With any other observed listed interaction, use stopped instead (NR-14). |
| NR-12 | DERIVED | Missing dates include known enabled and deliberately disabled dates. | Backfill past enabled gaps; do not fabricate alarms for disabled dates. |
| NR-13 | DERIVED | Late no_response Tiny offered and completed. | Exclude sensing baseline; completion permits Small next time before morning cap, independent of no_response level. |
| NR-14 | DERIVED | System Stop unobservable, but a snooze or app opening was recorded during the first 60 minutes without hold. | Final stopped; unobservable Stop cannot erase positive interaction evidence. |
| SN-01 | DERIVED | Normal-time in-app Snooze while sound plays. | Stop sound and schedule native ringing five minutes later. |
| SN-02 | DERIVED | Repeated Snooze. | No count cap; combined count still updates and original outcome deadline stays fixed. |

## Setup completion gates (U19)

All cases are PENDING; other permissions and detailed reconnect/resume behavior remain separately open.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| SU-01 | DERIVED | Required fields complete but no connectivity. | Cannot finish setup until connected. |
| SU-02 | DERIVED | Alarm permission denied. | Block setup completion and offer Open Settings. |

## Off days

All cases are PENDING. Off means the person deliberately disabled the alarm before it fired, not a failed delivery or an unanswered ringing alarm.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| OF-01 | USER | Deliberately disable before firing with known carry and goal pointer. | level off; preserve carry/pointer; no step offer or rotation advance. |
| OF-02 | DERIVED | Observe histories and partner events for that off day. | Exclude from main/voice baselines and usual-speaking window; no partner_up; do not count it toward partnerQuietDays. Quiet-run pause/reset remains OPEN-11. |
| OF-03 | DERIVED | Mix off with non-off clinic days in 7/14-day windows. | Omit off from averages and adverse counts; show neutral off marker in last14. Below three observed mornings in seven days, use insufficient per CL cases. |
| OF-04 | USER | Current consecutive off run reaches seven days, then eight. | Off-duration reason uses the correct N and prior-status facts. Insufficient applies when recent observations are below three; do not carry the prior status as current just to preserve the earlier off-run rule. |
| OF-05 | DERIVED | Open Home on an off day. | Show Alarm is off today. and a re-enable action; follow OF-06–09 on activation. |
| OF-06 | USER | Off day, current time before today’s scheduled alarm; re-enable. | Restore original system/in-app schedule and normal pending status. Show early control only inside the configured 180-minute window. |
| OF-07 | USER | Re-enable one minute before today’s scheduled time. | Same restoration as OF-06; no minimum lead time blocks it. |
| OF-08 | USER | Re-enable after today’s scheduled time. | Today remains off under all off rules; schedule tomorrow and show transient “Your alarm is back on for tomorrow at {time}.” |
| OF-09 | USER | Observe alarm actions and record changes during the after-time re-enable path. | No ring, hold flow or creation/mutation beyond level off; carry, rotation and history follow off rules unchanged. |
| OF-10 | DERIVED | Leave the switch off across several local dates. | It stays off until explicitly switched on; no automatic next-day re-enable or one-off-skip behavior. |

## Clinic insufficient observations

All cases are PENDING. U16 fixes recent seven calendar days (today included only when final) and the preceding fourteen comparison days. Observed values are easy = 0/medium = 1/hard = 2/stopped = 2/no_response = 3; exclude off/absent dates. Apply insufficient first, might_need_call next, then drifting, then steady. Both average comparisons are disabled below five comparison observations. Count and completion thresholds are specified below; isolate other triggers when exercising a boundary. U17 splits stopped reason counts by upAt presence while both remain valued 2/included in stopped rules.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| CL-01 | USER | Brand-new user, no prior classified status and fewer than three observed mornings in the last seven days. | insufficient with “Not enough recent mornings”; reason “Started D days ago. N mornings recorded.” Never steady or a fabricated previous status. |
| CL-02 | USER | All-off week with an existing last classified status/date. | insufficient; exclude off from counts/averages; retain neutral off markers and reason “Alarm off for N days. Last status: X, D days ago.” with factual values. |
| CL-03 | USER | All-off 21 days with an older classified status/date. | Current status remains insufficient; historical X/date remain facts, not the current classification. Do not manufacture a numerical average from the empty observations. |
| CL-04 | USER | Exactly two observed non-off mornings in the last seven days. | insufficient regardless of the prior status; missing records/off do not provide the third observation. |
| CL-05 | USER | At least three recent observations, fewer than five in the preceding fourteen days, and none of the selected count/completion rules fire. | Skip both average comparisons; steady with limited history appended. Do not evaluate an earlier-average trigger using insufficient comparison history. |
| CL-06 | USER | Insufficient recent observations and a stored previous classified status/date; no recent records. | Reason “No mornings recorded in the last 7 days. Last status: X, D days ago.” with real historical values; never copy X into current status. |
| CL-07 | DERIVED | Sort rows across all four statuses and insufficient rows with different known last-observation dates. | might_need_call, drifting, insufficient, steady; within insufficient longest since observation first. Never-observed/tie cases are not invented. |
| CL-08 | DERIVED | Count a mixed fixture of easy/medium/hard/stopped/no_response/off and absent dates. | Every non-off record is observed, including stopped/no_response; off and absent dates are excluded. |
| CL-09 | DERIVED | Supply alternate thresholds in a pure calculation fixture. | All readiness/count/difference/completion thresholds are configurable; selected defaults remain3/5,3/5,1.0,3,0.5 and 2/4 as specified. |
| CL-10 | USER | Sufficient recent observations, other higher-priority triggers controlled; recent no_response count 3 versus 2. | no_response trigger fires at 3, not 2. Stopped never contributes to this count. |
| CL-11 | USER | Recent hard+stopped+no_response count 5 versus 4. | Combined might_need_call count trigger fires at 5, not 4; another lower-priority trigger may still classify the below case. |
| CL-12 | USER | At least five comparison observations; recent minus comparison average 1.0 versus 0.99. | might_need_call average trigger fires at 1.0, not 0.99. The lower drifting trigger is separately evaluated. |
| CL-13 | USER | No might_need_call trigger; recent hard+stopped count 3 versus 2. | drifting count trigger fires at 3, not 2. |
| CL-14 | USER | No might_need_call trigger and at least five comparison observations; average difference 0.5 versus 0.49. | drifting average trigger fires at 0.5, not 0.49. |
| CL-15 | USER | Compare completion-count pairs (recent 2, prior 4), (recent 3, prior 4), (recent 2, prior 3). | Completion-decline trigger true only for the first pair: recent≤2 AND prior≥4. Windows are recent seven days and seven immediately before. |
| CL-16 | USER | Three stopped mornings with no other might_need_call trigger, then five stopped in a separate fixture. | Three→drifting; five→might_need_call. Each stopped has value 2, including late-confirmed stopped; none counts as no_response. |
| CL-17 | USER | Today’s morning is pending, then becomes final in a separate calculation. | Exclude pending today; once final, include it in the recent seven calendar days and place the comparison fourteen immediately before that recent window. |
| CL-18 | DERIVED | Mix off/absent with observed values in either average window. | Divide by observed days only; do not insert zero values for excluded dates. |
| CL-19 | DERIVED | Multiple rules fire. | Highest-priority status wins; list every fired rule and distinguish stopped confirmation groups. |
| CL-20 | DERIVED | Stopped records with and without upAt appear together. | Reason counts separately: “alarm stopped; getting up confirmed later” with upAt; “alarm stopped but getting up not confirmed” without. Both value 2/in stopped rules, neither no_response. |
| CL-21 | DERIVED | Frozen no_response later has upAt from late hold. | Exact “no response in the first hour; getting up confirmed later”; retain value 3 and every no_response count. |

## Scheduling and recorded timezone

All cases are PENDING. One daily alarm and persistent on/off switch are the selected build scope. Duplicate/skipped travel dates are explicitly unsupported, not additional edge-case behavior to invent.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| TZ-01 | USER | Phone reports a timezone change after an alarm is scheduled. | Reschedule the next alarm at the chosen wall-clock time in the new phone timezone. |
| TZ-02 | USER | Ring/early hold creates a morning, then the phone changes timezone at midday. | Existing localDate and stored utcOffsetMinutes remain fixed; future schedule follows the new timezone. |
| TZ-03 | USER | Change phone timezone after morning creation and advance through midnight in the recorded timezone/offset. | Late cutoff, unknown step outcome finalization, carrySize update and sun reset use the recorded midnight, not the newly selected timezone’s midnight. |
| TZ-04 | DERIVED | First ring and, separately, an early hold create the record. | Use the phone’s local date/UTC offset at that event; API accepts optional utcOffsetMinutes. |
| TZ-05 | DERIVED | Change device locale and 12/24-hour setting. | Display follows those device settings without changing the chosen daily wall-clock alarm time. |
| TZ-06 | DERIVED | Inspect alarm setup/Settings scope and leave alarm off. | One daily time and one persistent switch; no weekdays, multiple alarms or one-off skip controls. NOTES lists weekday selection/travel-date limits. |
| TZ-07 | DERIVED | System reports a clock change without a timezone change. | Reschedule the next alarm as required by the system-change contract. |

## In-app dawn classification and handoff

All cases are PENDING, including audio/device rendering. Use dated history fixtures; the classification window is last three observed mornings within the past fourteen days, skipping off. Concrete history boundaries/partial-day ordering must follow the eventual agreed observation convention rather than invented fixtures at an ambiguous boundary.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| DA-01 | USER | Three eligible observed mornings within fourteen days, at least two easy. | Light dawn: 2 minutes. |
| DA-02 | USER | Three eligible observed mornings, at least two heavy; exercise hard, stopped and no_response as heavy inputs. | Heavy dawn: 6 minutes with a lower starting volume. Exact volume value remains unselected. |
| DA-03 | USER | Three eligible observed mornings with neither two light nor two heavy, including medium/mixed histories. | Middle dawn: 4 minutes. |
| DA-04 | USER | Interleave off records among eligible histories. | Skip off before taking the last three observed mornings; off does not count as light/middle/heavy. |
| DA-05 | USER | Zero, one or two observed mornings in the last fourteen days. | Default middle dawn: 4 minutes. |
| DA-06 | USER | Previous history is separated from today by a 15-day gap, with fewer than three newer observations. | Older observations do not qualify; use 4 minutes. |
| DA-07 | USER | Complete the hold at 10% of dawn. | Advance to voice immediately; sun fills/rises on the hold; remaining sky finishes smoothly in about 3 seconds, without jump/freeze; place audio fades about 2 seconds before any message plays. |
| DA-08 | DERIVED | Run foreground ringing/Ring now in fast mode for light/middle/heavy. | Durations are 10/15/20 seconds respectively; durations/thresholds come from config. |
| DA-09 | DERIVED | Open Aamu after a system alarm within the normal window. | Use the separate 20-second landing dawn rather than the foreground 2/4/6-minute classification duration. |
| DA-10 | DERIVED | Snooze during dawn, then native re-ring. | Sound stops; native ring follows the agreed five minutes; sky holds/dims then resumes. Unlimited count; first-ring finalization deadline unchanged. |

## Real partner pairing and transport

Two-phone acceptance is PENDING. Synthetic public HTTPS/WSS service checks passed the named cases in review/live-integration.json; they are not phone execution. Pairing is not hard-coded or seeded.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| PT-01 | USER | Phone A requests POST /partner/match with mode code and no code; phone B submits the returned code. | Establish a real pair through those requests, without fixed/preseeded identity pairing. |
| PT-02 | USER | Restart both paired apps retaining their user tokens. | Pair remains associated with those tokens. Reinstall recovery itself awaits an identity-restoration mechanism; do not claim it from restart alone. |
| PT-03 | USER | With paired app foregrounded, cut its WebSocket and change the partner's up state through the real service. | GET /partner polling every five seconds/foreground refresh observes the up state while WS reconnects with backoff. |
| PT-04 | USER | WS and polling both report the same partnerUpToday transition. | The first report updates the sun; the later duplicate does not replay the animation. |
| PT-05 | DERIVED | Put the two real phones on different networks, including mobile data. | Use public HTTPS/WSS; no direct phone-to-phone/LAN dependency. |
| PT-06 | DERIVED | Invoke demo Partner gets up now in the allowed demo mode. | U24 places the control in isolated Demo state; it never changes the real partner or publishes a wake signal. Real transports are disabled on the Demo route. |
| PT-07 | USER U22 | Create a pairing code, leave it unredeemed, then redeem it; attempt the same code again and concurrently. | No time-based expiration. One successful redemption consumes the code; repeated/concurrent redemption cannot succeed again. Explicit configuration is PAIR_CODE_TTL_SECONDS=0, while unset remains unconfigured. |

U22 narrow local evidence: `api/test/valkey.test.ts` verifies NX without EX for zero, positive TTL compatibility, collision protection and owner-checked atomic consumption. `api/test/runtime.test.ts` verifies zero/unset/positive configuration and simultaneous identical joins with one success, followed by rejection of reuse. These adapter/injected-route checks and the synthetic live Valkey no-expiry/single-use check pass. Real two-phone acceptance remains pending.

## Deterministic message selection

All cases are PENDING. Eligibility/filtering order is not blocked+same level, then only the ordered gentler fallback easy→medium→hard or medium→hard (hard has none), then omit yesterday if another remains, then prefer unplayed, then maximize `(timesFollowedByDoneStep+1)/(timesPlayed+2)`. Ties use earliest lastPlayedAt (never-played first), earliest createdAt, then lowest id. U17/U18 learning is specified in ML cases below; Rest removes today’s play/credit only, keeping older history. Thompson sampling is a conditional future stretch, not authorized implementation; if later built it replaces only scoring and uses a seeded test generator while preserving filters/ties.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| MS-01 | USER | No same-level recording; available recordings include brighter and permitted gentler levels. | Follow only the specified gentler fallback order; never choose brighter. |
| MS-02 | USER | Hard morning with only easy recordings. | No audio; show the step alone. |
| MS-03 | USER | Two eligible unplayed messages with different createdAt values. | Both sort as never-played; choose earliest createdAt. |
| MS-04 | USER | Two eligible played messages with equal smoothed score and different lastPlayedAt. | Choose earliest lastPlayedAt. |
| MS-05 | DERIVED | Same-level eligible message exists alongside gentler eligible messages. | Select within same level; fallback does not mix levels when same-level eligibility exists. |
| MS-06 | DERIVED | Yesterday’s played message and at least one other eligible message remain. | Exclude yesterday before unplayed preference/scoring. |
| MS-07 | DERIVED | Yesterday’s played recording is the only eligible one. | Keep it eligible rather than manufacturing no audio. |
| MS-08 | DERIVED | Eligible never-played and previously played recordings remain. | Prefer never-played regardless of the played recording’s smoothed score. |
| MS-09 | DERIVED | No unplayed candidates; two eligible recordings have different smoothed done/played ratios. | Choose highest specified ratio. Counter mutation semantics are not inferred here. |
| MS-10 | DERIVED | lastPlayedAt and createdAt tie exactly. | Choose lowest id using the selected tie order. |
| MS-11 | DERIVED | Repeat selection with identical input/configuration. | Same selected message; default path uses no random sampling. |
| MS-12 | DERIVED | All recordings at permitted levels are blocked. | No eligible audio; step alone without authored fallback. |

## Message learning and step timing (U17–U18)

All cases are PENDING. Play and completion credit are separate from ranking; counters use the morning’s local day.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| ML-01 | DERIVED | Audible message exceeds 3 seconds; advance from 2.99 to 3. | Increment timesPlayed once at 3 seconds, never before. |
| ML-02 | DERIVED | Message shorter than 3 seconds reaches its audible end. | Count once at its end. |
| ML-03 | DERIVED | Replay the counted message the same local day. | No additional play count. |
| ML-04 | DERIVED | Selected message played past threshold; its stepDone becomes true that day. | Increment selected message’s completion credit only. |
| ML-05 | DERIVED | Undo that Done that day. | Decrement its completion credit. |
| ML-06 | DERIVED | Pause after the audible threshold. | Play remains counted. |
| ML-07 | DERIVED | Play from Settings, beyond threshold/end. | No learning-counter change. |
| ML-08 | DERIVED | Morning message begins. | Show today’s step immediately. |
| ML-09 | DERIVED | Other recordings played that day, then morning stepDone becomes true. | Only the selected morning message can earn credit. |
| ML-10 | DERIVED | Today’s selected message has today’s play/credit plus older history; Rest it. | Remove today’s play and credit only; preserve all older history. |
| ML-11 | DERIVED | A rested/excluded recording has no new daily playback/credit. | It earns neither play nor completion credit. |

## Goal waiting and Decisions integration (U17–U18)

Full product/UI acceptance is PENDING. Narrow module/controller/route assertions and live provider service evidence are mapped below. Whole server budget 25 seconds covers Decisions→Gemma→Decisions, one attempt per stage/no retry; client 30 seconds. Initial Decisions unavailability uses Gemma verdict fallback; final-judge failure offers manual steps, never unchecked ladder/another Gemma attempt. Safety-block 400 during step checking triggers Help/localOnly.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| GW-01 | DERIVED | Waiting for goal suggestions. | Exact “Finding a small place to start…” with immediately available Write my own steps. |
| GW-02 | DERIVED | Failure/timeout. | Exact “We couldn’t suggest steps this time.” plus Try again and Write my own steps. |
| GW-03 | DERIVED | Three provider stages consume the shared deadline. | Server cap 25 seconds total, client 30; at most one attempt/stage and no automatic retry. No fresh 25-second allowance per stage. |
| GW-04 | DERIVED | Choose manual steps while suggestions load. | Continue the request; eventual Suggestions are ready/View offers Use these steps/Keep mine. Never overwrite manual text automatically. |
| GW-05 | DERIVED | Suggestions arrive after manual entry. | Show exact Suggestions are ready with View, then Use these steps and Keep mine; result is separate from manual edits. |
| GW-06 | DERIVED | Manual text exists; choose Use these steps. | Ask once “Replace the steps you wrote?” with Replace/Keep mine. Only Replace changes editable fields; still require existing Approve, never auto-save/approve replacement. Keep mine preserves text. |
| GW-07 | DERIVED | Approve manual steps while original check is still pending. | Save on phone immediately; perform no remote save while that original check is pending. |
| GW-08 | DERIVED | Original check later returns needs_support after manual approval. | Open Help, set localOnly and remove previously synced text via existing erasure contract. Do not upload retained private text. |
| GW-09 | DERIVED | Original check fails or times out after manual steps were approved locally. | Release normal sync for those approved manual steps; keep approval. Technical failure alone does not make them localOnly or require a successful recheck. |
| GW-10 | DERIVED | Use these steps confirms replacement of approved manual text. | Only fields are replaced; approval of the new fields is still required before treating them as newly approved steps. |
| GC-01 | DERIVED | Duration hint for Tiny/Small/Full. | Exact “This may take more than {2/10/30} minutes.” with the corresponding single slot limit. |
| GC-02 | DERIVED | Concreteness hint. | Exact “Try one action someone could see you do.” |
| GC-03 | DERIVED | Both hints apply. | Combine both approved sentences into one quiet line under the step. |
| DJ-01 | DERIVED | First harmless synthetic Decisions access call. | Report access/latency without prompt/probability output or retention. Narrow completed evidence appears below. |
| DJ-02 | DERIVED | Shared phrase list matches before provider flow. | Existing needs_support path; no Decisions/Gemma request for matched text. |
| DJ-03 | DERIVED | Initial distress probability equals/exceeds configured 0.3 versus below. | At/above returns needs_support and skips Gemma; never retain/expose probability. |
| DJ-04 | USER | Initial Decisions HTTP 400 code safety/prohibited_content/blocklist/content_blocked, separately. | Return needs_support, no Gemma. |
| DJ-05 | DERIVED | Goal-choice confidence<0.6. | Treat verdict as ok. |
| DJ-06 | DERIVED | Confident too_big/too_vague. | Show ladder with respective exact advisory: “This is a big goal. These steps are a place to start.” / “These steps make a starting point. Edit them to fit you.” No block/regeneration. |
| DJ-07 | DERIVED | Initial judgment permits generation. | One Gemma ladder-only call, then one Decisions goal+three-step check; no automatic regeneration. |
| DJ-08 | USER | Tiny duration’s most probable level index>0. | sizeHint as one quiet line beneath Tiny; preserve edit/approval. |
| DJ-09 | DERIVED | Concrete-action probability<0.5 despite fitting duration. | Add per-step hint. |
| DJ-10 | DERIVED | Duration argmax at/below slot index 0/1/2 versus above, concrete probability≥0.5. | Oversize hint only when above slot; use all four exact duration labels. |
| DJ-11 | DERIVED | Approve edited non-localOnly steps while judge is pending. | Save immediately; one hints-only judge call follows; display hints afterward without replacing edits or regenerating. |
| DJ-12 | DERIVED | Approve/edit localOnly steps. | No step transmission to Decisions/remote judge. |
| DJ-13 | USER | Initial Decisions unavailable. | Existing Gemma verdict path with source marked; observe one-attempt/shared-budget rules. |
| DJ-14 | DERIVED | Final Decisions fails after Gemma generated a ladder. | Return failure/manual option; no unchecked ladder and no second Gemma attempt. |
| DJ-15 | DERIVED | Safety-block HTTP 400 during final duration/concreteness check, or during edited-step approval check. | Trigger Help and localOnly. Apply existing localOnly privacy and next-PUT erasure if already synced. |
| DJ-16 | DERIVED | Inspect storage/log/responses/clinic/partner/demo outputs. | Distress probability is never stored/logged/displayed/exposed. Demo-only Under the hood may show step-duration probabilities and goal verdict only; existing needs_support nonretention remains. |
| DJ-17 | USER | Labelled example-goal fixtures exercise thresholds. | Review finite fixture labels/outcomes; configured initial distress 0.3 is not silently changed by test results. No clinical-accuracy claim. |
| DJ-18 | DERIVED | Inspect questions/schema and per-step labels. | Full positive sentences, one decision each; explicit distress criteria and exact U17 duration levels; required SDK/API/model/key configuration. |

## Event-key model discovery and gated composed dawn

U15/U16 authenticated ListModels is complete; sanitized results and the narrowly passed MD-01 evidence are recorded below. Composition is still deferred until the full core script passes on two phones; Lyria listing does not prove audio generation/quota. These DERIVED cases do not authorize building ahead of the gates.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| MD-01 | DERIVED | Event GEMINI_API_KEY is privately available; perform authenticated paginated ListModels. | Report actual returned Gemma and Lyria music entries without assuming public-doc names or printing the key; select no name absent from the result. |
| MD-02 | DERIVED | A listed Gemma is configured for shrinking with the event key. | PARTIAL evidence: synthetic OpenAI-compatible ladder and later live three-stage service success. Module/route-injection checks pass within their scopes; real auth, deployed route/Expo, database erasure and repeated latency are unverified. |
| MD-03 | DERIVED | Compare listed smaller Gemma/current model, three sample ladders each. | Six one-attempt samples completed: 5 timeouts, 1 returned 31B ladder in 15,290ms; none under 5 seconds, so no switch proposed/made. Five requested ladders were unavailable, never invented; see comparison evidence. |
| CD-01 | DERIVED | Either the full core two-phone script has not passed or event-key Lyria availability remains unknown. | Composed-dawn implementation/pre-generation remains gated; do not treat candidate tests, previews or missing credentials as passing either gate. |
| CD-02 | DERIVED | Authenticated discovery establishes no available Lyria for the key. | Do not build composed dawn; tell the user. Absence of a key/request is not this result. |
| CD-03 | DERIVED | Both gates pass; POST /dawn/compose receives the specified place/tier/seconds selectors. | Use fixed instrumental prompts: no vocals, no sudden changes, near-silent start/rise and slower/sparser heavy tier. No IDs, goals, raw levels/history or person-authored text reaches the model. |
| CD-04 | DERIVED | Successful gated Gemini/Lyria composition with request/persistence capture. | Stream generated audio back without server storage; accept no incoming audio upload. User recordings never become model inputs. |
| CD-05 | DERIVED | Morning flow completes and the permitted background task runs. | Request tomorrow’s piece and cache it on the phone; no composition request is initiated by the alarm path. |
| CD-06 | DERIVED | Enter normal in-app dawn with a cached generated piece, then without one, and exercise early hold separately. | Normal cached piece plays under place sound; absent cache leaves dawn unchanged. Early hold uses neither piece nor place sound. Locked alarm retains bundled sound. |
| CD-07 | DERIVED | Tap Not this sound while a generated piece is selected/playing. | Discard the piece and fall back to place sound. Do not silently define extra regeneration or permanent opt-out behavior. |
| CD-08 | DERIVED | Both gates pass before presentation. | Pre-generate synthetic pieces for demo phones as instructed; this does not seed personal voice/notes or authorize audio upload. |

## Phrase approval and candidate-checker evidence

U12 requested the candidate/test family; U17 approves the phrase list and integration. Native Finnish review is unconfirmed as a limitation, not an extra gate. Candidate results remain separate from integrated NS/DJ cases and do not certify clinical or native-language accuracy.

Candidate artifacts: [phrase draft](review/safety/distress-phrases.draft.mjs), [checker](review/safety/draft-checker.mjs), [test examples](review/safety/draft-checker.test.mjs) and [limitations/source boundaries](review/safety/README.md). The isolated run recorded below passed 104 fixtures. These 104 examples are finite candidate coverage. U17 approval is separate; native Finnish review and product integration are not inferred.

| ID | Origin | Given / action | Required result |
| --- | --- | --- | --- |
| DC-01 | USER | Review the EN/FI draft configuration. | Roughly 15–25 explicit-intent entries per language, structured for future Swedish; one entry per line with an English-meaning comment; every Finnish entry marked needs native review. |
| DC-02 | USER | Evaluate matching and nonmatching English examples, including capitalization, Unicode-normalized text, punctuation and repeated whitespace. | Apply normalized whole-phrase matching. Standalone broad/ambiguous words are not enough to match. |
| DC-03 | USER | Evaluate matching/nonmatching Finnish examples and representative inflections. | Apply the specified normalization and Finnish stem matching; draft expectations remain subject to native review. |
| DC-04 | USER | Evaluate ordinary goals containing tired, hopeless, pain, burden, die or kill alone, and corresponding Finnish nonmatching examples. | Do not match broad/ambiguous words on their own. Scope remains explicit self-harm/death intent statements. |
| DC-05 | DERIVED | Local first-pass goal/manual check matches, with network/log capture. | No matched text, event or report is submitted; no input or match is logged. Goal matches enter Help; manual matches block save. |
| DC-06 | DERIVED | Reconcile configuration after U17 phrase approval. | Record user approval; keep native-review uncertainty/safety-net limitation without adding a shipping gate. Never display phrase list in-app. Product integration requires evidence. |

Sending a thought is omitted, including its tests. No thought-specific cases are added here. partnerQuietDays remains in scope; its final behavior is not invented by the omission.

## Unresolved expectations — do not implement by assumption

| ID | Decision needed | Test dependency |
| --- | --- | --- |
| OPEN-01 | RESOLVED by U13–U14: silent occupies rolling denominator/window, never numerator/fixed voice baseline, and scores through the Skip gate. | US-09–14 capture selected behavior; spoke readiness is VB-08/10/11. |
| OPEN-02 | RESOLVED by U12: early minutes are clamped to 0, with how early stored separately; early Home hold cancels today’s alarm and proceeds normally. | EW-01–03 and BL-08 cover the selected behavior and remain pending execution. |
| OPEN-03 | RESOLVED U23: preserve any already offered step and move to the next surviving goal in the existing order. | Goal Settings and pure tests cover reorder/deletion/empty candidates; do not manufacture a replacement goal. |
| OPEN-04 | RESOLVED: U17 approves phrase list/integration; native Finnish review remains unconfirmed, not another gate. | Candidate tests remain finite evidence; product tests are separate. |
| OPEN-05 | PARTLY RESOLVED U20: score using prior main/voice history, then append; timing comparisons floor at 1 without changing stored zero. Historical correction/reset policy remains open. | BL-11–13, VB-12–13, TM-01–03 pending; no ordering/zero-floor question remains. |
| OPEN-06 | RESOLVED U23: offered/removed count once per day; Done counts only while marked Done; Undo subtracts. | Goal Settings tests cover replay and reversal; counters remain unused by rotation/sizing and never leave the phone. |
| OPEN-07 | What happens if multiple alarm flows attempt to offer a step on the same local day? | Enforcing one offered goal per day under repeated/duplicate flow execution. |
| OPEN-08 | RESOLVED by U13: each stopped/no-offer or no_response day reduces carry once to Tiny; off preserves carry and rotation. | SP-09–12 and OF-01 cover the chosen rules and remain pending execution. |
| OPEN-09 | RESOLVED by U13–U14: local matches are not submitted; nonmatching/reworded goals may reach server/model; needs_support retains no text/verdict/row/counter/metric. Only approved non-localOnly PUT stores goals. | NS-11–19 and DC-05 remain pending integration/privacy checks. |
| OPEN-10 | RESOLVED by U14: valid silent uses the usual-speaking gate; spoke delayed-onset and quiet-share require at least five valid fixed-baseline recordings; whole voice term ≤1. | US-12–14 and VB-08/10/11; no unconditional null-onset point. |
| OPEN-11 | Does an off day pause or break the consecutive partnerQuietDays run? | It never counts as quiet, but the run-update expectation needs a decision. |
| OPEN-12 | RESOLVED: U14/U16/U17 select clinic observation/windows/formula and stopped reason split by upAt. | CL-20 captures selected wording; no remaining late-confirmation conflict. |
| OPEN-13 | RESOLVED before/after by U14: before restores today without lead time; after keeps today off, schedules tomorrow, no ring/hold or other record changes. Exactly at scheduled instant remains undefined. | OF-06–09 pending; boundary-equality fixture must wait. |
| OPEN-14 | RESOLVED: next PUT removes formerly synced localOnly title/steps and nulls historical morning stepText, retaining IDs/sizes/outcomes. | NS-15–20 capture privacy and erasure. |
| OPEN-15 | RESOLVED: early window clips to alarm-day midnight; early localDate is alarm date; minutesBeforeAlarm floor/non-negative/null otherwise. | EW-04/08–12 cover the complete answer. |
| OPEN-16 | RESOLVED by U16: Cloudflare Quick Tunnel selected for local demo HTTPS/WSS. | Synthetic public HTTPS/WSS checks passed; intermittent tunnel drops and absent physical phones leave PT-05 unaccepted. |
| OPEN-17 | Authenticated model listing is complete and Lyria entries are present, but full core two-phone script/pass criteria remain open and no core pass exists. | Composed dawn stays gated. Listing is not an audio-generation/quota test. |
| OPEN-18 | Gated composed-dawn seconds validation, cache lifetime/retry and audio mixing values are not yet specified. | Resolve only for the authorized stretch after its gates; do not invent values or let the stretch replace core completion. |
| OPEN-19 | RESOLVED U18: 25 seconds covers whole three-stage sequence, one attempt each/no retry; client 30. | GW-03 pending. |
| OPEN-20 | RESOLVED U18: final-judge failure returns failure/manual, never unchecked ladder or another Gemma attempt. | DJ-14 pending. |
| OPEN-21 | RESOLVED U19: exact advisory, waiting/failure and hint copy is approved. | Rendered GW/DJ/GC checks pending; wording is no longer open. |
| OPEN-22 | RESOLVED U18: edited Approve saves immediately; hints arrive afterward. | DJ-11 pending. |
| OPEN-23 | RESOLVED U18: step-check safety-block 400 triggers Help/localOnly, including edited approval. | DJ-15 pending; use NS-20 for any required server erasure. |
| OPEN-24 | RESOLVED U18: Rest removes today’s selected-message play/credit only, preserving older history. | ML-10 pending. |
| OPEN-25 | RESOLVED U20/U21: separate controls/confirmation, fields-only replacement requiring Approve, local-first/deferred sync, late needs_support privacy and failure-released sync all selected. | GW-04–10 pending separate execution; do not re-ask failure behavior. |
| OPEN-26 | RESOLVED U20: any observed listed interaction means stopped without timely hold; unobservable Stop fallback only when nothing observed. | NR-11/14 pending. |
| OPEN-27 | RESOLVED U20: late no_response clinic copy confirms the later wake while keeping value 3/all no_response counts. | CL-21 pending. |
| OPEN-28 | RESOLVED U23 for at/after-18:00 suppression, Done/Undo and permission during Alarm setup. | ER-01–06 and local tests cover confirmed rules; native delivery and stale-action behavior still require acceptance. |

## Implementation and execution record

Before marking a case passed, add the actual test-file/test-name reference, execution command, result and date. Unit tests should cover the pure calculations; UI/state-transition tests should cover the Help return paths; storage/payload/log assertions should cover the data boundaries. Device alarm tests are separate from these logic tests.

Current execution status after privacy hardening and U26:330 API/shared tests passed; API/mobile typechecks and final full mobile src/modules lint pass. The runtime/goal-sync/morning-sync privacy subset passed 30 tests. The latest extended synthetic live erase/re-add regression passed over public HTTPS/WSS at 17:03 UTC; restart persistence/cleanup also passed publicly at 17:05 UTC. Entries saying PENDING still refer to complete acceptance even when their bounded logic assertions pass; no row automatically passes because the aggregate is green.

### Current app/module evidence — 14 November 2026

| Area | Executed or observed evidence | Remaining boundary |
| --- | --- | --- |
| Goal/setup UI | Earlier browser manual Save/Continue evidence remains. New native smoke: real synthetic Gemma ladder → Approve, optional setup screens, alarm-denial gate → Settings grant → scheduling/local-notification permission → Home. `review/native-smoke.json`. | Complete Help/edit/error branches, physical permissions and real phone acceptance remain pending. |
| US / BL / VB / TM / progression / dawn | `api/test/mornings.test.ts` covers prior-five/default/frozen medians, independent voice baseline, silent/Skip gates, timing floor, carry and dawn history. | Real voice acquisition and every matrix fixture are not established by pure tests. |
| NR / OFF / timezone / sample interruption | `api/test/lifecycle.test.ts` covers backfill, observed events, deduplication, frozen outcomes, entry/cutoff routes, snooze, recorded midnight and failed-sample recovery. | Native events, closed-app clock changes, finite scheduling horizon and full UI paths remain pending. |
| MS / ML | 18 message-engine tests pass: filtering/ties, three-second/short completion, replay/Settings exclusion, selected credit/Undo and today-only Rest. | Audible measurement and UI playback timing require physical acceptance. |
| Goal/morning text privacy | `goal-sync.test.ts`, `morning-sync.test.ts` and runtime tests bind non-null text to an acknowledged user-level snapshot revision; erase/re-add/stale-upload regression passes locally. Saved playback verifies private ownership. | Extended live same-ID regression passes over public HTTPS/WSS; native audio privacy/playback and end-to-end Help paths remain pending. |
| API auth/storage/pairing | Controlled runtime tests plus `review/live-integration.json` synthetic public HTTPS/WSS checks pass until-used/single-use codes, wake deduplication, cut-socket polling and omission/redaction including clean re-add. Latest API restart persistence/cleanup also passed over public HTTPS/WSS. Test rows removed. | Tunnel intermittently disconnects even with HTTP/2. No stable/two-phone acceptance or identity-restore UI claim. |
| Native iOS build/flow | Signed app on iPhone 18 Pro Max simulator, iOS 27.0: setup plus early two-second hold, denied mic, no-message Small step, Too much → Tiny, Done/Undo/Done. Stored values: early 14min, minutesToUp/snoozes 0, unavailable voice, easy/0 points. Today suppressed; seven future dates appear in the journal, which is not an authoritative OS queue. Test alarm disabled; synthetic goal/morning retained for inspection. `review/native-smoke.json`, `review/screenshots/native-smoke/home.png`. | No physical locked/closed/Focus alarm acceptance. The iOS 27.0 probe could not Stop a scheduled relative alarm 88.5s early (AlarmError 0); it still alerted. Alerting Stop and fixed control succeeded. `review/alarmkit-recurrence-probe/README.md`. This is not a replacement for the finite queue. |
| Native voice helpers | iOS: eight interval/five analyzer tests passed on this Mac; synthetic silence took 113ms. Android: 17 Kotlin unit checks and five API36 actual-model instrumentation cases pass, plus full APK build/install (`review/android-voice.json`). | No actual microphone/personal audio was used for the Android fixtures; real voice/noise/whisper, device latency and physical sensing acceptance remain pending. Native fixture passes are not clinical calibration. |
| Android | Full ARM64 debug APK build passed (10m56s, 416 tasks); module compile and eight JUnit calendar tests pass. API36 emulator install and cold MainActivity/React Native main startup succeeded without an observed JS exception/native crash. `review/android-build.json`. | No visual UI/permission/alarm/audio/physical acceptance. One pre-context soft exception and dependency/emulator warnings are recorded. Debug APK needs Metro; before-first-unlock delivery is not guaranteed. Android local voice sensing now has separate passing unit/actual-model emulator and APK evidence in review/android-voice.json; physical microphone/audio remains pending. |
| Android backup configuration | Four separate checks in `review/android-backup/configuration.test.cjs` pass against real Expo config/plugin output and installed XML. `allowBackup:false` plus sharedpref-only allowlists exclude file/database domains. | Not included in aggregate 330. Packaged resources also pass inspection in review/android-build.json; actual cloud/OEM device transfer remains untested; the flag alone is not sufficient evidence. |
| U23 goal Settings/counts | `api/test/goal-settings.test.ts` has ten passing tests for reorder/delete, kept offered step and local idempotent counts. | Complete native Settings/sync acceptance pending. |
| U23 evening reminder | Local notification/action coordinator exists; twelve rule tests pass. No remote push registration. | Physical permission, delivery, action and interruption acceptance pending. |
| U24/U25 mobile Demo | Twelve pure tests, including four U25 removal/Undo regressions; browser Ring → hold → five-second simulated voice → message, simulated pair/callback and Reset → zero verified. Separate history and disabled real transports. | Browser had no saved goal/audio; no fabricated content. Native personal-audio playback and real two-phone flow remain separate. |
| Clinic web demo | 19 rule + 3 fixture-removal/build checks; browser scenarios/filter/search/selection/reset tested, no console warnings/errors, text ≥16px, 390px no overflow. `clinic/review.md`, `clinic/screenshots/overview-desktop.jpg`, `overview-mobile.jpg`. | Configurable sample data only; no real clinic feed/callback or clinical validation. |
| Visual/audio assets | Font-correct 390×844 previews under `review/screenshots/mobile-preview/`; Sea/Forest AAC decoding and provenance checks pass. | Previews are labelled sample states; native listening/recording/fade/locked sound acceptance pending. |

The following historical records remain unchanged in meaning; their old totals are not the current aggregate.

### Historical bounded local suite and live service evidence — 14 November 2026

Root reports `npm run typecheck` and `npm test` in `api/` passed. Total 137 = 104 phrase checks + 5 parser checks + 28 goal/client/route checks. Root reports the same 137 tests/typecheck passed again after parser promotion; this does not test the new U19 alarm/setup/UI rules. Source files inspected: [goal tests](api/test/goals.test.ts), [approval/client tests](api/test/approval.test.ts), [parser tests](api/scripts/parse-model-object.test.mjs), [phrase tests](review/safety/draft-checker.test.mjs). No assertion below claims physical-device or full-product execution.

| Acceptance area | Passed bounded evidence | Remaining scope |
| --- | --- | --- |
| GW-03; DJ-02–05,07,13–14 | Service/adapter tests cover phrase precheck, inclusive thresholds, all four initial safety codes, single stage calls, initial fallback, final failure and shared deadline. | Real mobile wait/retry UI, all real failure modes and deployed request lifecycle remain pending. |
| DJ-06,08–10,18 | Injected happy path preserves too_big advisory verdict; argmax Tiny and concreteness boundary tests pass; question tests identify each step. | U19 copy is approved; rendered hints/advisories and comprehensive question/size coverage remain pending. |
| NS-03/04/15; DJ-11–12,15 | Approval controller saves exact text before hints, filters localOnly text, blocks manual phrase matches and handles post-approval safety→Help/localOnly through injected ports. Cancellation, stale-revision and 30-second client deadline assertions pass. | Expo UI/storage and concrete PUT/redaction code now exist; complete Help/privacy flow, latest revision changes are tested locally and synthetic Aiven erasure has bounded evidence; complete device NS-20 acceptance remains pending. |
| DJ-16; NS privacy boundaries | Adapter/result sanitization, approved demo diagnostic keys and remote snapshot field checks pass. Fastify route injection rejects uploads/extra identity fields and sets no-store. | This historical injected Bearer fixture was not real authentication. Concrete token/runtime code now exists; no comprehensive live logging, retention or clinic/partner transport acceptance is claimed. |
| DJ-17 | Live 12-fixture aggregate evaluation: 12/12 support-label and 8/9 goal-verdict agreements; 0 unavailable, 3,131ms total, unchanged thresholds. | Small authored synthetic set, not representative/clinical calibration; one goal-verdict mismatch remains. No probabilities/individual verdicts retained. |
| MD-02; DJ-07 | Later synthetic live service run completes initial judge, writer and final judge within 25 seconds. | One live success is not repeated reliability, real user data handling or a two-phone pass. |
| MD-03 | Fair comparison made all six authorized one-attempt requests and recorded timeouts/output faithfully. No under-five-second result or model switch. | Only one actual ladder returned; the five missing sample outputs are not claimed delivered. No stable benchmark conclusion. |

Live service evidence preserves both attempts:

- [Initial attempt](review/provider-goal-pipeline-initial.json), 04:27:19.438Z: 16,343ms, failure/manual fallback, no ladder, no automatic retry.
- After an explicit JSON-scaffold writer-prompt change, a separate manually initiated [successful attempt](review/provider-goal-pipeline.json), 04:29:34.184Z: 15,574ms, all three stages completed, source model/judgeSource decisions, 25-second shared deadline, 0 automatic retries. This is not an automatic second attempt for one user action.
- [Decision fixtures](review/decisions-fixtures.json) contain aggregate synthetic evidence only. [Comparison JSON](review/gemma-comparison.json) and [review](review/gemma-comparison.md) preserve six sample outcomes: five 25-second timeouts, one 31B reading ladder in 15,290ms, none under 5 seconds. The smaller 26B-A4B timed out three times. 31B stays configured; no switch proposed. The returned Tiny reading step has a noted duration caveat.
- Those provider observations alone establish no app/auth/database/native or two-phone demonstration. The newer app/runtime/build evidence is scoped above; a synthetic public tunnel check now exists, but Lyria generation and the two-phone pass do not. Composed dawn remains gated.

### Model-discovery preparation and authenticated listing — 14 November 2026

- Root prepared `api/.env.example`, `api/.gitignore`, `api/scripts/list-models.mjs` and its README; this audit inspected the script.
- Root reports `node --check api/scripts/list-models.mjs` passed.
- Invocation without GEMINI_API_KEY exited 2 before a provider request. No private dotenv file/environment key was available in that check; no key was printed.
- Subsequent U16 execution by root: authenticated paginated ListModels succeeded at 2026-11-14T03:46:02.737Z; one page, 64 total models. Sanitized evidence: `review/provider-models.json`, inspected during this audit. This passes MD-01 only.
- Returned Gemma: models/gemma-4-31b-it; models/gemma-4-26b-a 4b-it. Root selected the listed 31B identifier in ignored configuration.
- Returned Lyria: models/lyria-3-clip-preview; models/lyria-3-pro-preview; models/lyria-3.5; models/lyria-realtime-exp.
- No credential is reproduced here. Listing alone is not generation evidence; the subsequent synthetic probe below separately establishes a narrow generation/compatibility capability. The later live service probe adds bounded shrinking evidence below; full Expo/deployed integration and the two-phone pass remain pending, so composed dawn stays gated.

### Synthetic Gemma capability and parser checks — 14 November 2026

- Inspected sanitized evidence: `review/provider-generation.json`, recorded at 2026-11-14T03:58:16Z.
- Model gemma-4-31b-it; Google Gemini OpenAI-compatible chat completions; HTTP 200; successful live request 12983ms; synthetic goal only; zod 4.6.7 validated; no system role or JSON mode.
- Root reports four HTTP probes. The first three failed strict response parsing. The fourth output was held transiently and validated after a local parser correction without another provider request. No request/response text is retained in the report.
- Local `api/scripts/parse-model-object.test.mjs`: 5 passed, 0 failed, reported by root. Parser ignores the exact echoed scaffold, deduplicates identical schema-valid answers and rejects distinct alternatives.
- This partially substantiates MD-02’s provider capability, not the product endpoint, full local/server safety integration, quota or dependable latency. The later U18 budget is fixed at 25 seconds server/30 seconds client with no retry; this older capability probe does not validate full waiting UI or repeated latency.
- No Lyria generation or two-phone core demo pass occurred. Composed dawn remains gated. No secret was read or copied during this documentation update.

### Decisions access probe — 14 November 2026

- Inspected `review/provider-decisions.json`: 2026-11-14T04:15:39.567Z, gemini-decision-1, SDK 3.3.0, one harmless synthetic noul call, 395ms, access and typed response validated.
- Root reports retries 0 and no prompt/probabilities stored/output. This passes DJ-01 only; it does not validate distress classification, threshold quality, full goal/step pipeline or UI/privacy integration.
- This access probe alone implies no product/two-phone pass. Later local GW/DJ assertions and live service evidence are mapped above; full UI/device integration remains pending.

### Candidate checker execution — 14 November 2026

- Command: `node --test review/safety/draft-checker.test.mjs`
- Runtime: Node 22.6.0.
- Reported execution by the requirements-audit agent: **104 passed, 0 failed**.
- At that historical run: 24 English/20 Finnish entries, then unreviewed/production-disabled and not imported into app/API. U17 subsequently approves the list/integration; prior metadata is not a continuing approval block.
- Test output uses fixture identifiers. Known contextual false positives/false negatives are deliberately characterized; their passing tests document limitations rather than approve that behavior.

| Acceptance area | Executed candidate coverage | Remaining status |
| --- | --- | --- |
| DC-01 | Historical list-size/review metadata and unsupported Swedish slot checked. | User approval supplied U17; native review unconfirmed, not another gate. |
| DC-02 | English positive/nonmatching fixtures, whole-word boundaries and case/Unicode/punctuation/whitespace handling passed. | Limited lexical fixture coverage; no general accuracy or context understanding claim. |
| DC-03 | Finnish canonical fixtures/selected inflections/nonmatches passed. | Native review remains unconfirmed; do not claim it or make it a new gate. |
| DC-04 | Ordinary excluded-word goals and other finite nonmatching fixtures passed. Known contextual/figurative counterexamples are separately exposed. | Do not treat this as comprehensive intent classification or clinical validation. |
| DC-05 | Checker returns a boolean; source has no network/log/storage behavior. | Local goal/manual save routing and network/log-capture integration assertions remain PENDING. |
| DC-06 | Historical opt-in/unapproved guards passed before U17. | User now approves integration; product checks remain pending. Historical guards do not add another approval requirement. |

## Additional privacy and Demo acceptance boundaries

| ID | Origin | Given / action | Required result / evidence |
| --- | --- | --- | --- |
| NS-21 | DERIVED | Erase a formerly synced goal, cleanly re-add the same ID, then deliver an old morning PUT. | Old acknowledged snapshot revision cannot restore erased stepText. A current acknowledged revision may save currently approved text. Local runtime regression and the public HTTPS/WSS synthetic regression pass; no physical-phone pass is implied. |
| NS-22 | DERIVED | Morning text waits while goal checks/snapshot are pending, then acknowledgement changes while upload is in flight. | Send measurements with null text and no revision while deferred; retain retry; only matching acknowledged user-level revision authorizes text. Pure projection/sync tests pass. |
| DM-01 | USER U24 | Ring, hold, select difficulty, simulate partner/matching/callback, then Reset in Demo. | Write only separate demo history/overrides; preserve real goals, audio, pairing and morning history; no real wake/callback signal. Twelve pure tests (including four U25 cases) and browser controls/reset evidence pass; native personal-audio path remains pending. |
| DM-02 | DERIVED | Play a saved message or personal ambience, including immediate Skip after hold. | Validate the private file before loading; do not accept remote URI; preserve the two-second fade before message playback. Type/lint checks pass; physical playback acceptance remains pending. |

## Historical U25 Home corrections — logic/web checks; layout superseded by U26

Source: requirements/answers/u25.md. Actual HomeView was exercised by root through an isolated fixed-clock web preview at 07:00 and 19:30. Twelve captures are in `review/screenshots/home-u25/`; per-fix mapping is in `review/home-u25-report.md`. New logic evidence: 19 Home tests and four added Demo tests, all passing within aggregate 322; API/mobile typechecks and full mobile lint pass. `review/home-contrast-u25.json` records 29 passing contrast checks. The status below is limited to those observed web and code paths: physical phones, OS alarms/notifications, recording and the complete two-phone demo remain pending. Earlier native smoke is separate evidence.

Relevant commands: `cd api && node --experimental-require-module --experimental-strip-types --test test/home.test.ts test/demo-session.test.ts`; aggregate `cd api && npm test`; mobile `npm run typecheck` and `npm run lint`. The 19 Home tests also passed with message/count/reminder regressions (59 tests). Root reported the final aggregate 322 pass after the added Demo cases.

| ID | Origin | Given / action | Required result | Executed evidence / boundary |
| --- | --- | --- | --- | --- |
| HM-01 | USER U25 | Inspect Home before 12:00, at 12:00, through 17:59 and from 18:00. | Retained greeting follows configured morning/afternoon/evening ranges, or greeting is removed. | PASS logic + web: home.test.ts checks 07:00, 12:00, 17:59, 18:00 and 19:30; both clock capture sets show the configured greeting. |
| HM-02 | USER U25 | Inspect Home at current local 19:33 and capture 07:00/19:30. | Sky follows local time; evening is dusk/night, never dawn. | PASS bounded clock rendering: 07:00/19:30 captures; contrast evidence records sky progress 0 at 18:00/19:30/19:33. Physical clock-change behavior remains separate. |
| HM-03 | USER U25 | Compare no hold today, alarm off, confirmed hold and partner_up. | No-hold/off state is unlit outline; fill only follows confirmed hold or partner_up for partner half. | PASS logic + web: hold/partner/off gating tests and off/confirmed captures. Partner event transport and physical wake acceptance remain separate. |
| HM-04 | USER U25 | Remove offered Tiny, observe Undo, then wait five seconds; compare no-offer/off days. | “That’s enough for today.” only for Tiny removal, with five-second Undo then dismissal; no old “for now” copy, no appearance on no-offer/off days, never Home's largest text. | PASS logic + web: removal/Undo/expiry observed; tests cover exact five-second cutoff, no-offer/off exclusion, recorded midnight, exact Tiny/outcome restoration and safe message credit. Done keeps its step text. |
| HM-05 | USER U25 | Inspect normal Home and hidden demo controls with flag on/off. | Preview scenes is behind the demo flag in hidden controls. | IMPLEMENTED with bounded source/browser evidence: normal Home has no Preview scenes; the entry is within flagged Demo controls. Twelve Demo logic tests pass; full native Demo acceptance remains pending. |
| HM-06 | USER U25 | Inspect header controls. | Arrow has a word label or is removed; no unlabelled icon buttons. | PASS observed header: Settings has a word label. The apparent arrow was the simulator pointer, not an app icon; no phantom app-control change is claimed. |
| HM-07 | USER U25 | Inspect the alarm-off Home action hierarchy. | Turn alarm on is the single warm-accent primary button. | PASS web off captures at both times: Turn alarm on is the sole warm primary action. |
| HM-08 | USER U25 | Measure Help, Settings and secondary contrast. | Help text ≥4.5:1 with visible outline; secondary/Settings contrast is checked. | PASS computed + web: 29 shared text/button/outline checks, with Help outline visible in both capture sets; Settings/secondary use the checked styles. |
| HM-09 | USER U25 | Inspect landscape edges. | Match other cards' large radius, with no hard top edge, or full bleed. | PASS web: rounded shared landscape card in both clock capture sets. |
| HM-10 | USER U25 | Inspect Home alarm time while off and after enabling. | Show next alarm time; off “Alarm is off today.”; once turned on “Next alarm: tomorrow {time}”. | PASS logic + web: off and after-enable captures; local locale-time tests cover pending today, passed time, early cancellation and retained off day pointing to tomorrow. |

## U26 Home/Settings redesign — logic and bounded browser evidence

Source: `requirements/answers/u26.md`, including the confirmed adaptive-dawn and quiet-link clarifications; retained U25 Undo/confirmation rules remain. Eight new `api/test/home.test.ts` cases pass,27 Home total, within full aggregate 330. Root captured all twelve 390×844 Home/Settings scenarios at 07:30/21:00 with 07:00 alarm; see `review/screenshots/home-u26/` and `review/home-u26-report.md`. Impossible clock/state combinations are labelled forced review fixtures; the real early window is unchanged. Root observed Not today→Undo→Yes and off→enable→next-alarm tomorrow with no browser errors. Contrast checks pass in `review/home-u26-contrast.json`; final mobile typecheck and full src/modules lint pass. Physical alarm/audio/reminder and full two-phone acceptance remain pending.

| ID | Origin | Given / action | Required result | Evidence / status |
| --- | --- | --- | --- | --- |
| HM-11 | USER U26 | Home and each morning-flow screen. | Full-screen time-based landscape replaces the boxed landscape; existing tokens/font retained. | PASS bounded Home browser/contrast evidence; SceneScreen and Alarm/Voice/Message full-screen conversion pass source type/lint checks. Q111 resolved: adaptive dawn remains while ringing. Native morning-flow/physical acceptance remains pending. |
| HM-12 | USER U26 + DERIVED priority | Alarm off with prior hold, early clock or unanswered evening step; compare unconfirmed enabled morning. | One bottom state card; off takes priority. No level, step or partner event alone confirms own up. | PASS logic and twelve state captures: off priority/no inferred own-up. Real native coordinator/physical acceptance remains separate. |
| HM-13 | USER U26 + retained timing | Night/resting before early window, after alarm time and after confirmed early cancellation. | Large/light locale-formatted next alarm, truthful Alarm today/tomorrow and Sleep well. Never claim tomorrow before today's pending07:00 occurrence. | PASS logic and both night browser captures: day label/locale clock/typography. Fixed review state does not alter real scheduling. |
| HM-14 | USER U26 | Unconfirmed07:00 alarm at 03:59,04:00,06:59 and 07:30. | Only real180-minute early window gets I’m already up;07:30 is not naturally early. | PASS logic: actual-window test. Forced screenshot states remain isolated and labelled. |
| HM-15 | USER U26 | Confirmed hold with offered step; then Done/Undo and Tiny removal/Undo/expiry. | You’re up, paired line, Today’s step · size, actual text, Done primary and Too much today quiet within one card. Preserve old credit/outcome/expiry behavior. | PASS logic and both up captures. Existing Undo/removal/credit tests pass; root observed response Undo in the new browser UI. Physical playback and full morning path remain pending. |
| HM-16 | USER U26 + existing outcome semantics |17:59→18:00→23:59 with confirmed offered step, compare null/false/true/removed/no offer. | Only null unanswered nonremoved offered step gets Did you get to it?, Yes and Not today. False/true/removed/no offer never re-prompt; midnight cannot reuse yesterday’s record. | PASS logic plus both evening captures; root observed Not today→Undo→Yes without repeat prompting. Native reminder actions remain separately pending. |
| HM-17 | USER U26 | Every Home state/header. | Small aamu left; Help/Settings text right always visible ≥4.5:1; no bottom Help pill or extra greeting. | PASS bounded browser and compositing measurements: always-visible header text, no bottom Help, protected Home text ≥6.068:1. Native accessibility/large-font acceptance remains separate. |
| HM-18 | USER U26 | Settings with current alarm/goals/messages/place/pairing/clinic configuration. | Back top-left; two grouped lists/current values; Moments naming; no stacked pills/duplicate Your alarm card. No fabricated Clinic on/paired state. | PASS bounded browser Settings captures at both clocks; grouped current-value rows and Moments label. Real native Settings interaction branches remain separate. |
| HM-19 | USER U26 | Each of the five Home states and Settings. | One warm primary for an actionable state; resting/completed states do not invent an action. Remaining controls are outlined/text. Off primary turns alarm on through existing schedule rules. | PASS bounded Home/Settings composition evidence. Off→enable→next-alarm tomorrow was observed; actual OS schedule changes remain a separate native acceptance case. |
| HM-20 | USER U26 | Capture five Home states plus Settings at 07:30 and 21:00, alarm07:00. | Twelve state/screen captures, explicitly labelled fixed-clock/forced review scenarios where necessary; no real records or schedule changes. | PASS capture delivery: all twelve 390×844 JPGs in review/screenshots/home-u26, mapped by review/home-u26-report.md. These are labelled browser review scenarios, not physical-clock results. |
| HM-21 | USER U26 clarification | Playback or unanswered past-self note exists alongside state content. | Keep Moments and past-self note as quiet links within the single card; note route preserves Play and Answer it before Recorder. | RESOLVED/implemented. Browser/code placement evidence; actual personal-audio playback and physical reply acceptance remain pending. |

Relevant resolver command: `cd api && node --experimental-require-module --experimental-strip-types --test test/home.test.ts` —27 passed, zero failures. The matching eight U26 named tests are the new logic evidence. Separate browser/compositing evidence above does not pass the platform or full-demo matrix.

## U27 approved-layout refinements — partial logic evidence

Source: `requirements/answers/u27.md`. Seven new pure model tests pass,34 Home total; API/mobile typechecks pass at that checkpoint. Last full aggregate is330 from U26. No actual route accepts forced review-state flags; earlier preview scenes are disclosed isolated fixtures. New screenshots, motion recording and integrated checks remain pending.

| ID | Origin | Given / action | Required result | Evidence / status |
| --- | --- | --- | --- | --- |
| HM-22 | USER U27 | Actual 07:00 alarm around 03:59/04:00/06:59/07:00/07:30 and 17:59/18:00. | Early appears only 04:00–06:59; evening only 18:00+ for confirmed offered nonremoved stepDone null. False/true/removed do not prompt. Forced review states never enter the actual route. | PASS pure boundary/outcome tests; actual-route source/UI verification pending. |
| HM-23 | USER U27 | Resting07:00 alarm overnight and daytime; compare01:00 alarm/midnight clip and off/confirmed states. | Sleep well plain below time only 18:00–03:59 for07:00 alarm; absent when early, morning alarm passed, off or confirmed. No previous-date early window. | PASS pure clock/state tests; plain-text layout screenshots pending. |
| HM-24 | USER U27 | Morning own/partner status; evening both-confirmed, unpaired, own-only and no own hold. | Morning You’re up.; partner-not-up exact wording; evening both confirmed one You both got up today., unpaired You got up today.; no false both. | PASS copy/confirmation tests. Paired own-only secondary line explicitly confirmed and asserted in the same test. |
| HM-25 | USER U27 | Early and off layouts. | Early Alarm at {time} above button; no extra early/off card around the single action. Preserve schedule/Undo/data behavior. | Integrated UI/screenshots pending. |
| HM-26 | USER U27 |06:00–10:00 scene top, horizon and water; night/dusk comparison. | Smooth full-height multi-stop sky, lighter morning top, sky-token-tinted water without hard band/flat grey strip; maintain text contrast. | Scene implementation/contrast/screenshots pending. |
| HM-27 | USER U27 | All Settings rows. | Trailing chevron alongside word label/current value; no new unlabelled action. | UI/screenshots pending. |
| HM-28 | USER U27 | Night stars, water, clouds and lit/unlit sun; toggle Reduce Motion and leave/background app. | Subtle token-based motion, no lit glow on unconfirmed sun; all ambient animation disabled with Reduce Motion; lightweight work. | Motion/reduced-motion checks/recording pending; battery acceptance is separate. |
| HM-29 | USER U27 | Same five Home states plus Settings at 07:30/21:00, plus ten-second recording. | Deliver twelve updated labelled captures and motion recording; explain forced scenes; no native/physical claim from browser media. | Delivery pending. |

Relevant command: `cd api && node --experimental-require-module --experimental-strip-types --test test/home.test.ts` —34 passed, zero failures at the pure-model checkpoint.


## U37 verified checkpoint — 15 November 2026

384 API/shared tests and 36 clinic tests pass with zero failures; API/mobile typechecks and full mobile lint pass. Browser-only rehearsal: generated synthetic goal → Approve → first Full step → explicit two-snooze cut → Tiny → Done → Help; anonymous simulated sun preview; real callback route → clinic first row with timestamp, retained after refresh. See review/presentation-review.md and review/screenshots/presentation-review/. These are not physical alarm/audio/two-phone results.


## U38 navigation/copy verification

Browser observed exactly one post-goal button, Select a partner; it opened the partner choices with Ring alarm as the next action. The existing morning's expanded explanation now labels Morning difficulty points and explains that fewer means easier; sizing logic is unchanged. Mobile typecheck and targeted lint pass. Screenshot: review/screenshots/presentation-review/select-partner-only.jpg.
