# Demo clinic and data boundary

U28 enables `DEMO_MODE=true` by default. The actual listener requires a private
`DEMO_DASHBOARD_TOKEN` (32–256 base64url characters) while enabled. It never enters
client bundles, responses or request logs. `DEMO_MODE=false` registers no clinic
routes, loads no clinic fixtures and rejects demo-namespace data requests.

The same opaque authenticated identity is used for real pairing/wake events.
`X-Aamu-Demo: true` separately selects demo goal revisions, goals and mornings on
`GET /goals/revision`, `PUT /goals`, and `PUT /mornings/:localDate`. Successful demo
responses include `demo:true`; clients verify the revision endpoint before any
seeded write. Missing/disabled demo storage never falls back to ordinary tables.
Demo snapshots retain the ordinary locked revision, omission/redaction and
acknowledged-revision-bound morning-text semantics.

- `PUT /clinic/sharing`, user Bearer: `{enabled, code?}`. Enabling requires
  `AAMU-DEMO` (case-insensitive, outer whitespace ignored). Success is
  `{demo:true, enabled}`. Disabling removes membership and its outstanding request.
- `POST /clinic/callback`, user Bearer: `{}`. Requires current membership. Success
  is `{demo:true, callbackRequestedAt}` in UTC epoch milliseconds; repeated taps
  preserve the first outstanding timestamp. Disconnected returns409; failures
  return503, never simulated success. This records a demo dashboard request and
  does not promise a clinical call.
- `GET /clinic/patients`, dashboard Bearer or `X-Demo-Dashboard-Token`: returns
  `{demo:true, patients}`. The clinic connection code is never read authorization.

Patients contain only opaque ID, presenter/fictional marker, `startedOn`, numeric
or categorical morning projection (`localDate`, `level`, `upAt`, `stepDone`),
`lastClassified` and callback timestamp. The SQL membership join reads **only
`aamu_demo_mornings`**, never ordinary morning data or goal/contact/audio fields.
Historical presenter classifications are derived with the unchanged shared
clinic engine from prior recorded dates. Four fictional profiles in
`clinic-fixtures.ts` cover all four engine statuses; their dates are relative to
the server's UTC calendar date. The dashboard labels them fictional.

Tables: `aamu_demo_goal_revisions`, `aamu_demo_goals`, `aamu_demo_mornings`,
`aamu_demo_clinic_memberships`. These reference the existing user ID. Synthetic
integration cleanup must remove their rows before deleting its synthetic user.
Turning demo mode off does not erase either demo or ordinary data.

Verification: focused demo/clinic plus existing runtime injection/SQL-contract
suite22 passing; API typecheck passing. These use controlled repositories/SQL
stubs. Actual PostgreSQL migration/restart and live dashboard delivery require
the separate integration check; no physical-device acceptance is claimed here.
