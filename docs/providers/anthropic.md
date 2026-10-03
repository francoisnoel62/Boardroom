# Anthropic bounded text route

Reviewed 2026-10-03; catalog valid through 2026-10-14. Pinned snapshot: `claude-haiku-4-5-20251001`. Account access remains unverified. The published earliest retirement date is October 15, 2026; refresh eligibility and pricing before extending this catalog.

Official sources: [models and limits](https://platform.claude.com/docs/en/models/overview), [pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Messages API](https://platform.claude.com/docs/en/api/messages/create), [streaming](https://platform.claude.com/docs/en/build-with-claude/streaming), [JSON output](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [stop reasons](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons).

Standard USD rates per million tokens: input 1, output 5, cache read 0.10; 5-minute/1-hour cache writes 1.25/2. Context is 200,000 tokens and maximum output 64,000. Boardroom reserves full context plus the chosen output bound. Cache reads are included at the higher base input rate. Cache writes and thinking are disabled; an unexpected cache write keeps billing unknown.

Uses `POST https://api.anthropic.com/v1/messages`, `x-api-key` and `anthropic-version:2023-06-01`, one user text message, explicit `max_tokens`, streaming and `output_config.format` JSON schema. No tools, cache controls, fallback model list, beta feature or SDK retry is sent. Provider shape constraints are simplified; the original local schema and reference validator remain authoritative.

The stream must contain a matching model start, text deltas, a final stop reason and message stop. Input usage plus cache reads and cumulative final output usage settle costs conservatively. Only `end_turn` is accepted; refusal, token/context limit, tool use and other stops are failures. Cancellation is best effort, with uncertain billing retained. HTTP auth/quota failures have bounded diagnostics and no raw bodies. JSON/reference correction is a separate reserved call, limited to one.

No real account or paid request was exercised during implementation. Deterministic HTTP boundaries prove adapter behavior, not availability, remote cancellation or provider quality.
