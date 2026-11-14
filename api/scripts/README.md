# Event-key model discovery

The API runtime is documented in `../README.md`. These discovery/probe scripts fulfill the model-access checks separately from the app and physical-device acceptance.

Enter `GEMINI_API_KEY` privately in the server environment, or copy `api/.env.example` to `api/.env` and fill it there. `api/.env` is ignored by Git. Do not paste the key into chat or a command line.

From the repository root, with an exported environment variable:

```sh
node api/scripts/list-models.mjs
```

Or, on the installed Node 22 runtime, with the local environment file:

```sh
node --env-file=api/.env api/scripts/list-models.mjs
```

The script follows all ListModels pages and reports Gemma/Lyria names and supported methods. It sends the key only in the provider request header, makes no generation calls, writes no files, does not print provider error bodies, and infers no availability when authentication/network/pagination fails. It requires no third-party dependencies. A listed model still needs an authorized capability/quota check before generation is considered proven.

Provider reference: [Google ListModels](https://aistudio.google.com/api-reference/models/list-models).

## Bounded goal-generation probe

`probe-goal-generation.mjs` uses the configured, actually listed Gemma model and the same event key. It sends one fixed synthetic swimming goal; it accepts no real user input. It is a capability probe, not POST /goals/shrink or that endpoint's final schema. It uses Node fetch and local zod validation, only a user message and no JSON-mode parameters. It prints metadata only, never the key, prompt or model text.

```sh
node --env-file=api/.env api/scripts/probe-goal-generation.mjs
node --test api/scripts/parse-model-object.test.mjs
```

The parser accepts one schema-valid result, ignores the literal request-schema scaffold, and deduplicates repeated identical validated objects. Conflicting valid alternatives, invalid fields and truncated candidates are rejected. The five local parser tests cover these cases. This handling is isolated to the probe and does not approve an unresolved production contract.

Authenticated discovery evidence is in `review/provider-models.json`; the real synthetic-generation check is in `review/provider-generation.json`. No Lyria generation was performed. Its composed-dawn implementation still requires the full core demo to pass on two phones.
