# Gemma comparison — synthetic examples

Run: 14 November 2026, 06:16–06:18 Europe/Helsinki.

**No switch proposed.** The smaller Gemma timed out on all three attempts. Neither model returned a ladder in under five seconds. `LLM_MODEL` remains `gemma-4-31b-it`.

Fresh authenticated ListModels returned 64 models, including `gemma-4-31b-it` and `gemma-4-26b-a4b-it`. Each received the same three invented goals, prompt template, temperature 0.2 and 2,048-token output limit. Calls were sequential with alternating model order, one attempt each, a 25-second timeout and no retries.

| Synthetic goal | 31B | 26B-A4B |
| --- | --- | --- |
| Get back to swimming | Timed out at 25 s; no ladder | Timed out at 25 s; no ladder |
| Read more books | 15.290 s; HTTP 200; schema valid | Timed out at 25 s; no ladder |
| Keep my desk tidy | Timed out at 25 s; no ladder | Timed out at 25 s; no ladder |

Timeouts are censored observations: 25 seconds is the abort limit, not the model’s eventual completion latency. No average treats a timeout as a completed response.

## Actual returned ladder

**Read more books — Gemma 31B — 15.290 seconds**

- Tiny: Read one page.
- Small: Read for 10 minutes.
- Full: Read for 30 minutes.

The returned steps are concrete, observable and doable at home. Small and Full explicitly fit their 10/30-minute caps. Tiny uses one page rather than a two-minute cap; a page can take longer depending on its contents and reader. This is a manual textual review, not an extra judge-model call or a timing test.

## Missing examples and conclusion

Five of the six requested ladders were not returned within the single allowed attempt. There are no smaller-model ladders to assess. The missing examples are reported as timeouts rather than replaced, invented or retried.

The evidence does not support switching to the smaller model. Keep the configured 31B unchanged, with the approved manual-step fallback for failures/timeouts. Three observations per model do not establish stable latency or generation quality; the smaller model’s timeouts do not establish permanent unavailability.

Only synthetic prompts and parsed synthetic ladders are retained in the companion JSON. No credential, real user goal, raw provider response or provider error body is stored. Existing provider inventory evidence and private model configuration were not modified.
