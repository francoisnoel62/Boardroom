# OpenAI bounded text route

Reviewed 2026-10-03; catalog valid through 2026-10-14. Supports the pinned `gpt-4.1-mini-2025-04-14` and `gpt-4.1-2025-04-14` snapshots. Account availability is unverified until an explicit successful preflight. These are deliberately non-reasoning candidates, not a recommendation about the newest model.

Official sources: [mini model](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [4.1 model](https://developers.openai.com/api/docs/models/gpt-4.1), [streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [structured output](https://developers.openai.com/api/docs/guides/structured-outputs).

| Snapshot | Input USD / million | Output USD / million | Cached input USD / million | Context | Maximum output |
| --- | --- | --- | --- | --- | --- |
| 4.1 mini | 0.40 | 1.60 | 0.10 | 1,047,576 | 32,768 |
| 4.1 | 2.00 | 8.00 | 0.50 | 1,047,576 | 32,768 |

Boardroom uses `POST https://api.openai.com/v1/responses` with a user Bearer token, streaming, `store:false`, standard/default service tier, explicit `max_output_tokens`, strict JSON shape, empty tools and no previous-response/conversation state. No SDK, transport retry, redirected request or model substitution is permitted. Cached input is conservatively rated at the full input price; tools, images, audio, priority tiers and reasoning models are unsupported.

Admission reserves the entire published context window plus the explicit output bound. This also covers hidden input formatting/schema overhead without pretending a byte count is an accurate tokenizer. The service separately bounds serialized request bytes; actual reliable total input/output usage releases the unused amount. Rates are conservative inference for this restricted payload, not a spending guarantee for arbitrary OpenAI features, taxes or an unexpected serving model.

Only a complete final response with the pinned model identity can be accepted. Refusal, incomplete output, tool requests and stream/final mismatch cannot become domain output. Missing final metering remains committed; unexpected tool/model billing remains unknown. Abort is best effort and may still be charged. Raw HTTP error bodies are discarded. A shape/reference failure permits one new reserved correction, with no continuation of truncated output.
