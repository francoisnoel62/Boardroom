# Human participation

Plan 03 increments 1–2 add durable contributions and structured human requests. Real-account qualification of Plan 02 still gates integration and milestone acceptance; these increments are exercised with external deterministic HTTP fixtures.

In the live terminal, enter `say dev Check operational maintenance` (use an adviser ID from the frozen team), or `say all Compare the maintenance assumptions` for the next common confrontation. `participation` shows saved contributions and delivery inputs. These commands work while an HTTP stream is running. Enter submits a contribution once; entering the same text again is a new command. The terminal records the local author as `human`.

For a retryable CLI submission, create `contribution.json`:

```json
{
  "commandId": "9d17e383-fdd8-4b6b-999f-7069b26d2c80",
  "author": "CEO",
  "expectedContextVersion": 1,
  "recipientId": "dev",
  "text": "Check operational maintenance."
}
```

```sh
boardroom meeting-say --project PROJECT_ID --id MEETING_ID --input contribution.json --json
boardroom meeting-participation --project PROJECT_ID --id MEETING_ID --json
```

Use a new UUID for each deliberate contribution; retain it when retrying. A repeated ID and identical parsed payload returns the original receipt. Reusing it with another payload is refused. `recipientId: null` addresses the common discussion. Text is limited to 12,000 characters; author and recipient are bounded too. Unknown project, meeting, recipient and context versions are refused.

`queued` means saved, awaiting an eligible recipient call. `delivered` means the contribution was bound to the immutable input at local dispatch; it does not certify successful provider processing. The associated call receipt distinguishes success, failure and uncertain delivery. Refused admission and reservations never sent leave the contribution queued. A correction attempt keeps its original input. A stopped meeting, completed final-view attempt or ended common confrontation exposes `unconsumed` with a reason. Repeating a command always returns its original receipt; inspection shows its current delivery state.

A targeted contribution goes into that adviser's next newly admitted work. It cannot alter an input already dispatched or an analysis already saved. An untargeted contribution enters the next confrontation call, never the independent analyses. No inspection or contribution command starts a provider call. Existing explicit paid phase commands still control dispatch.

Contributions are attributed human statements, not sourced evidence, context revisions or tool permissions. Context changes, pause/resume, extensions and automatic rescheduling remain later increments. All saved contributions appear in `meeting-decision`, `memo.md` and optional `meeting.json`; JSON also retains dispatched inputs. Bodies stay out of technical events and graph checkpoints. Exports redact known credentials, but must still be reviewed before sharing.

## Requests, responses and waiting work

An adviser can return a structured clarification or missing-document request. `requests` in the terminal or `meeting-requests --project PROJECT_ID --id MEETING_ID --json` lists its ID, version, originating adviser/call, context/framing versions, reason, ordinary/structural scope, selected evidence references and consumers. Use `requests REQUEST_ID` or CLI `--request REQUEST_ID` for details. A document request also names the expected document.

Consumers are explicitly declared adviser/phase pairs within that context and framing. In this increment, a pair covers future admissions in that phase, including later confrontation rounds. This is intentionally a simple scope; exact task dependency propagation and context invalidation follow in increments 3–4. A request cannot alter an input already dispatched.

Use the displayed **request version** for terminal responses:

```text
answer REQUEST_ID 1 The operations team maintains the pilot.
deny REQUEST_ID 1 I cannot provide this information.
defer REQUEST_ID 1 I will check with the team.
answer-structural REQUEST_ID 1 Change the staffing constraint.
```

Each action persists a response and increments the request version. Re-read it before your next action. These commands work during streams; `requests` and `participation` are also available. The terminal uses the current displayed meeting context and records author `human`.

For CLI retries, save `response.json` with a stable UUID:

```json
{
  "commandId": "b478f020-4f99-4e49-a20b-88139629e3eb",
  "author": "CEO",
  "requestId": "REPLACE_WITH_DISPLAYED_REQUEST_UUID",
  "expectedContextVersion": 1,
  "expectedRequestVersion": 1,
  "text": "The operations team maintains the pilot."
}
```

```sh
boardroom meeting-answer --project PROJECT_ID --id MEETING_ID --input response.json --json
```

The corresponding commands are `meeting-deny` and `meeting-defer`. A structural answer adds `"scope": "structural"` to the JSON. An ordinary answer inherits the request's declared scope. IDs are shared with the contribution command journal: identical retries return the same receipt; changed payloads, stale request/context/framing versions and foreign meeting requests are refused. The author is a local attribution, not an authenticated multi-user identity.

Ordinary answers resolve the request and appear, attributed to their human author, in subsequent consumer inputs. Refusal/deferral never resolve the uncertainty, even after a long wait or another client's reopening. A later explicit answer can resolve an ordinary refusal/deferral using the new request version. A model or source saying “approved” cannot resolve anything.

A structural answer remains `awaiting-context`; following it with ordinary prose cannot clear that material change. A document answer remains `awaiting-source`: supplying a path does not read it or grant consent. The existing source command still requires `--allow-source`; adding newly supplied material to frozen context needs the forthcoming context-versioning increment. No web, MCP or shell tools are enabled.

Blocked consumers have `blocked` outcomes with request IDs; their phase reports `waiting-human`. Other eligible consumers finish normally. After an answer, explicitly repeat the same `analyse`, `debate` or `views N` phase command (or its paid CLI equivalent). Only work blocked on human input is continued; completed, failed or uncertain calls are not replayed. This is normal human-wait continuation, not crash recovery or the general scheduler. Waiting consumes no provider calls; existing budget, time, framing approval and provider-authorization gates still apply. Exporting partial work or explicitly requesting conclusion does not resolve requests.

The memo, JSON and public inspection preserve requests, all responses, denied/deferred states, attribution and versions. Provider wire schemas and synthetic preflight include the new request fields on OpenAI and Anthropic routes. Their acceptance by actual accounts remains unqualified; no deterministic test establishes real-provider support.
