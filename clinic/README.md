# Aamu clinic — local demo dashboard

The dashboard reads one protected demo feed: connected presenter records plus four fictional profiles covering the four clinic statuses. Fictional profiles are owned by `api/src/demo`; the browser does not add copies. Clinic call requests use the real persistent demo route and appear at the top with **Asked for a call** and their timestamp. This records a request in the demo workspace; it does not place a call or promise a clinician response.

Use the project's Node 24 runtime and the existing API TypeScript installation. No clinic package installation is needed.

```sh
npm run demo
```

Open http://localhost:4174. The API must run at http://127.0.0.1:3000. `CLINIC_PORT` can select another loopback port. `scripts/serve.mjs` privately loads `api/.env` with Node's `process.loadEnvFile`, including `DEMO_DASHBOARD_TOKEN`. The browser requests only `/api/clinic/patients`; the local server adds the private header for `/clinic/patients`. That header is never placed in browser assets, URLs or responses. The proxy does not follow redirects and returns generic failures without exposing upstream error bodies.

The small Demo label distinguishes this workspace. Each row also identifies connected presenter or fictional profile. Search, status filters, row selection and comparison details remain available. Refresh fetches immediately; automatic refresh waits five seconds between completed requests while the page is visible. Hiding the page aborts pending work and cancels polling; returning refreshes immediately. A failure preserves the last accepted records with an explicit stale-data message. Filtering and an open comparison survive updates.

## One demo flag and removal boundary

`DEMO_MODE=true` is the default, matching the API. The old `CLINIC_DEMO` flag is retired and ignored. To return the clinic to an empty workspace:

```sh
DEMO_MODE=false npm run build
DEMO_MODE=false npm start
```

Also disable/restart the API with `DEMO_MODE=false`. The clinic proxy route is absent when disabled, the browser does not fetch or display sample records, and the build contains no fixtures. A disabled build remains disabled even if subsequently served without an environment override. Runtime mode can disable an enabled build, but cannot re-enable a disabled build.

The old `clinic/demo/provider.mjs` scenarios remain test/review-only historical fixtures. They are never imported by the current app, copied into `dist/`, or merged into the live list. All active fictional patient seeds live behind the API demo flag. No browser-local history or reset control is used for connected records.

`CLINIC_OUT_DIR` supports disposable builds outside the workspace. Source directories are rejected before removal. The server binds to loopback, blocks cross-site reads and non-read methods, and serves no private environment file. No new service or off-device SDK was added.

## Rules and checks

`shared/clinic/engine.ts` retains the approved U14/U16/U17/U20 calculations, exclusions and reasons. Pattern order remains call → drifting → insufficient → steady; known insufficient observation dates sort oldest first and unknown/tied positions retain the previous policy. Outstanding call requests are a stable first group, preserving that ordering within requested and non-requested records. The request never replaces a calculated status or changes its counts.

```sh
npm test
npm run build
```

The clinic suite has 35 passing checks: 19 rule tests and 16 build, provider, callback-order, foreground-polling and proxy checks. The rules are also imported by the API suite. Tests confirm disabled empty behavior, no browser credential, narrow response fields, generic errors, fixed upstream routing and cross-site rejection. Browser QA of this connected version and real callback display are separate acceptance checks; old screenshots show the previous independent fixture dashboard.

## Dependencies and assets

No package or service was added. The build reuses the existing API TypeScript compiler for the shared engine. Node HTTP, fetch, environment loading, filesystem and test APIs provide the local proxy and checks. Colors come only from `src/theme.ts`; the existing Plus Jakarta Sans font and OFL license are bundled locally. There are no remote fonts, analytics or third-party browser SDKs.
