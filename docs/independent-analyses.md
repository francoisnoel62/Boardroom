# Independent initial analyses

[Implementation guide](getting-started.md) · [Human framing](framing-a-question.md)

After explicitly approving the displayed framing version, run `meeting-analyse --project <project-id> --id <meeting-id> --allow-provider`. This makes three concurrent paid requests to the frozen team, through the common budget/time controller. Without `--allow-provider`, the CLI refuses before dispatch. This increment does not automatically confront the advisers or obtain final views.

The host vault is the default credential source. For explicit session injection, set `BOARDROOM_SESSION_KEYS` to a JSON object whose keys are the three frozen route IDs and whose values are their API keys, then add `--session`. Supply credentials securely through your session environment; never put them in CLI arguments, committed JSON, or shell history. The CLI removes the environment variable before importing the graph. All three credentials and initial reservations must succeed before any analysis request leaves. A route needs current catalog pricing; deterministic tests do not mark routes verified.

Each request contains the same selected passages, approved framing, language and constraints, with a common SHA-256 digest, plus its adviser's role. The PO's framing is common input; its initial analysis is a separate response. Requests never include other advisers' initial responses, including those that finish first. Source text grants no permission. Tools, command execution and cloud tracing remain disabled.

Assertions have IDs unique within their adviser and a type: `fact`, `hypothesis`, `opinion`, or `unknown`. Facts require references to selected frozen passages. Validation checks evidence identity, revision, hash and line bounds; a valid citation does not establish that a statement is true. Risks, assumptions and recommendations are structured. Invalid output gets at most one separately reserved correction; an unfunded correction fails without another paid request.

Use `meeting-analyses --project <project-id> --id <meeting-id> --json` to inspect completed bodies, immutable attribution, outcomes and historical framing versions. Every success is committed immediately, before other requests finish. Partial results survive reopen. A phase is attempted once per approved framing version; reopen never replays missing or ambiguous calls. `meeting-stop` preserves results and requests cancellation of work in flight. Billing with no reliable usage remains held at its reserved bound.

A human framing correction clears approval. Existing analyses remain historical, excluded from `current`. After approving the new version, an explicit new analysis command can incur three new calls. Guided recovery and structural recadrage belong to later plans.

Tests use real SQLite, LangGraph and CLI subprocesses with only HTTP replaced. They capture every payload, inspect successes while the third response is blocked, exercise malformed/out-of-context references and all-or-none affordability. No real provider account is certified by these tests.
