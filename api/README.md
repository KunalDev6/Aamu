# Aamu API

Fastify serves anonymous identity, goal generation/checking, approved-goal and morning persistence, code pairing, and partner wake updates. PostgreSQL and Valkey run on the approved Aiven EU services; the demo listener runs on the laptop behind Cloudflare Quick Tunnel. Audio, safe-person contacts and localOnly goal text are never accepted.

Use Node 24. Copy `.env.example` to ignored `.env`, fill private values, and download the Aiven PostgreSQL project CA to `ca.pem`; set `DATABASE_CA_PATH` to its absolute path. TLS verification stays enabled. Set `PAIR_CODE_TTL_SECONDS=0` for codes valid until used.

From this directory: `npm ci`, then `npm start`. `GET /health` checks both stores. `src/server.ts` creates the schema, starts the listener, and reconnects Valkey after temporary outages without retrying individual model calls.

`POST /users` returns an opaque bearer token; store it only on the phone. Authenticated routes are `/goals/shrink`, `/goals/hints`, `/goals/revision`, `/goals`, `/mornings/:localDate`, `/partner/match`, `/partner`, `/partner/up` and receive-only WebSocket `/live`. The last route takes the bearer header in the native client. No clinic or audio-upload route exists.

`src/goals/configured.ts` constructs the real provider adapters using private `GEMINI_API_KEY`, `LLM_MODEL` and `LLM_BASE_URL`. `createApp(service, authorize)` registers `/goals/shrink` and `/goals/hints`; the caller must supply authorization. Logging is disabled, response caching is disabled, and strict JSON bodies reject extra fields and audio. No patient data is persisted by these routes.

## Behavior

1. The phone checks the shared approved phrase list before sending text. The server repeats it.
2. Decisions judges the goal. A distress threshold of 0.3 or one of the four specified safety blocks returns needs_support before Gemma. Its distress probability never leaves the adapter.
3. Gemma writes one ladder. Decisions then checks each step's duration/concreteness. Confident too_big/too_vague verdicts accompany the ladder for advisory UI; choice confidence below 0.6 becomes ok. No regeneration occurs.
4. Initial Decisions unavailability uses one Gemma verdict/ladder fallback, marked `judgeSource: gemma_fallback`. Final Decisions failure returns `source: fallback` and no ladder. A final safety block returns needs_support.
5. One 25-second deadline covers all stages. No stage retries automatically. The mobile helper adds its own 30-second bound and cancellation support.

Success responses retain string `steps` and add a `sizeHints` map keyed by tiny/small/full, containing `exceedsSlot` and `needsConcreteAction`. The mobile GoalEditor renders approved quiet hints and the separate-result/manual-approval flow. Server-controlled demo mode alone adds `underTheHood` with goal verdict and duration distributions. No distress or concreteness probability is exposed.

Edited approval saves locally immediately, then requests hints once. The pure controller in `../src/goals/approval.ts` preserves edits, rejects stale responses, and makes a safety-blocked goal localOnly before the next filtered sync snapshot. A technical hint failure preserves approval. Revision-checked `PUT /goals` removes omitted text and nulls historical morning step text in a transaction. Stale goal snapshots cannot resurrect erased text; morning writes retain text only for a currently approved server goal. The mobile coordinator withholds step text while that goal's check is pending.

## Verification

From `api/`, run `npm run typecheck` and `npm test`. Tests use built-in Node test/assert with injected provider responses and in-process Fastify requests. Use Node 24; no system Node installation was changed.

`node --env-file=.env scripts/verify-live.mjs` explicitly creates two synthetic identities and tests real TLS stores, non-expiring single-use pairing, WebSocket delivery, polling and text redaction. Set `VERIFY_API_URL` to the current tunnel URL to test HTTPS/WSS. Restart the API and run the same command with `--resume` to verify persistent pairing and remove only those synthetic rows. Its temporary token checkpoint is owner-readable in `/tmp`; the durable report contains no tokens, IDs, goal text or credentials. This is not a two-phone acceptance test.

Private live commands, run from `api/` after entering configuration in `.env`:

- `npm run models:list`
- `npm run models:probe-decisions` — one harmless access call.
- `npm run models:evaluate-decisions` — twelve authored synthetic fixtures; reports aggregate agreement only.
- `npm run models:probe-pipeline` — one synthetic full-sequence attempt, retaining metadata only.

Evidence lives under `../review/`: the Decisions access call took 395 ms; the updated full sequence completed in 15,574 ms. The preceding failed pipeline attempt remains separately recorded. The fair six-sample Gemma comparison produced five timeouts and one 15.290-second ladder; it did not justify switching models or establish reliable latency. The fixture check agreed with 12/12 support labels and 8/9 goal labels. These small checks do not establish clinical accuracy or production reliability; thresholds remain the user's configured starting values.

The implementation follows the [Decisions API documentation](https://aistudio.google.com/docs/decisions-api.md), read before the access probe. SDK 3.3.0 uses `apiVersion: v1beta`, `ai.decisions.create` and `maxRetries: 0`.
