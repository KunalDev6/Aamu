# Aamu

An Expo/React Native morning companion with a Fastify API and a separate clinic demo.

The latest user answers are authoritative. Read [working rules](AGENTS.md), [implementation plan](aamu-implementation-plan.md), [acceptance register](aamu-acceptance-tests.md), and [implementation notes](NOTES.md). The older brief/frontend/backend drafts are subordinate to those answers.

## Run locally

Use Node 24 for Expo and the API.

1. In `api/`, run `npm ci`. Configure the ignored `.env` from `.env.example`. Aiven PostgreSQL needs its project CA certificate; TLS verification is enabled. Start with `npm start`.
2. Run `cloudflared tunnel --no-autoupdate --protocol http2 --url http://127.0.0.1:3000`. Keep this process and the API running during the demo, with the laptop awake and its lid open. The temporary URL changes on restart. Both QUIC and HTTP/2 have disconnected on this network; HTTP/2 is the current test configuration, not a verified fix. Confirm public `/health` before pairing the phones.
3. Put that HTTPS URL in `mobile/.env.local` as `EXPO_PUBLIC_API_URL`. Set `EXPO_PUBLIC_DEMO_MODE=true` to expose the isolated demo controls. Secrets belong only in `api/.env`.
4. In `mobile/`, run `npm ci`, then start Metro with `EXPO_NO_TELEMETRY=1 npx expo start --port 8081`.
5. Build the local native iOS app. AlarmKit and local speech analysis require this custom app; Expo Go cannot supply them. Use a signed simulator build too, because SecureStore needs the simulated application identifier. Physical devices require the existing Apple signing team and device provisioning.

On this Mac, the verified simulator command below runs from `mobile/`. It uses a writable derived-data directory instead of Xcode's configured external-volume location:

```sh
xcodebuild -workspace ios/Aamu.xcworkspace -scheme Aamu -configuration Debug \
  -sdk iphonesimulator -destination 'id=0FFB83D1-C037-40AF-816B-87343B478997' \
  -derivedDataPath /tmp/aamu-derived-data \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=YES build
```

The simulator destination is specific to this Mac. For physical testing, use the connected iPhone and the project’s Apple Development signing settings; the ad-hoc `-` identity above is only for the simulator. Follow [DEVICE-CHECKS.md](DEVICE-CHECKS.md) for the remaining acceptance run.

The clinic runs independently from its own `clinic/` directory; follow its README. It contains only configurable fictional demo data and no real clinic integration.

## Check the build

From `api/`: `npm run typecheck` and `npm test`.

From `mobile/`: `npx tsc --noEmit` and `npm run lint`.

The real service smoke check is described in [api/README.md](api/README.md). Its sanitized result is [review/live-integration.json](review/live-integration.json). Passing it proves API behavior, not the locked-phone or two-phone presentation script.

## Privacy boundaries

Recordings, replies, personal place sounds, safe-person contact details, and localOnly goals stay on the phone. Local-only text is filtered before requests; normal approved goals may reach the configured model and server. No analytics, hosted speech, crash reporting, remote push service, or audio upload is added.

The shared phrase list is a limited safety net, not a risk detector. The morning and clinic formulas are the agreed demo heuristics, not clinical validation.

## Still awaiting acceptance

The physical iPhones are not connected yet. Locked/closed-app ringing, actual recording/playback, and the full cross-network two-phone script remain unverified. Native Android work and the iOS finite scheduling-horizon limitation are tracked in the implementation notes. Composed dawn remains gated until the full core script passes on two physical phones.
