# Sourced confrontation and proposal revisions

[Implementation guide](getting-started.md) · [Independent analyses](independent-analyses.md)

After three current analyses are complete, explicitly run `meeting-debate --project <project-id> --id <meeting-id> --allow-provider`. Credentials use the host vault, or `--session` with the per-route `BOARDROOM_SESSION_KEYS` environment map described in the analysis guide. This command authorizes bounded paid proposal/confrontation/revision work; it does not silently generate final views.

The PO authors a structured common proposal, with stable item IDs and selected frozen references. Only then do the Lead Developer and Marketing Manager see the three analyses and this proposal. Each objection targets an existing `adviserId`/`assertionId` pair or a proposal `itemId`, and records justification, impact, optional amendment and sources. Foreign targets and references are refused, with at most one newly reserved output correction.

Only the PO writes the common proposal. A revision stores a new immutable version, body hash, actual item changes and one accepted/rejected/unresolved disposition per new objection, with a reason. An accepted item objection must change that target; cited support is retained on resulting changed items. No refusal or failed response becomes a proposal. The earlier version and every completed intervention remain readable after reopen.

The scheduler allows at most two internal confrontation/revision cycles. It compares objection content without its generated ID; repeating the same target, justification, impact, amendment and sources ends debate without another revision. It does not wait for unanimity. Changed paraphrases can use the second cycle, but cannot extend beyond the internal bound. Budget/time reservations can stop work sooner. Each initial confrontation pair is reserved atomically, and every correction is charged independently. The conclusion reserve stays protected.

`execution-conclude` can be issued from another process. It preserves approved framing and completed proposals, cancels ordinary work best effort, and permits later explicit conclusion work. `meeting-stop` stops all provider work. Neither action invents agreement or launches final calls itself. Settlement rechecks both execution status and the exact framing authorization, including responses that arrive between cancellation polls. Known usage remains charged even when a late result is rejected; unknown usage retains its bound.

Inspect `meeting-proposals --project <project-id> --id <meeting-id> --json` for all versions, dispositions, actual changes, completed/failed confrontation records and the stop reason. A framing change makes old proposals historical. A phase claim is durable and attempted once per framing; reopening an interrupted phase exposes uncertainty and completed work, without blind provider replay. Guided incident recovery belongs to Plan 04.

Deterministic integration tests exercise real LangGraph/SQLite and CLI subprocesses. The fixture traces two engineers → staffing objection → five integrations reduced to one, retains rejected amendments, checks the repetition/bound, early conclusion, target integrity and rapid framing correction. This is a test fixture, not evidence of a real model's quality or account availability.
