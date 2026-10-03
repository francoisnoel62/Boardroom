# Plan 02 implementation evidence

## Increment 4 — two bounded provider adapters

Official API/model/pricing pages were read on 2026-10-03 before selecting the restricted candidates: OpenAI Responses (`gpt-4.1-mini-2025-04-14`, `gpt-4.1-2025-04-14`) and Anthropic Messages (`claude-haiku-4-5-20251001`). [Route notes](provider-preflight.md) give primary sources, dated rates and exclusions. Catalog expiry is deliberately short. No live account or paid smoke was authorized or used; real availability/cancellation acceptance remains open.

Observed red cycles in `tests/providers.test.ts`: supported-route API absent; premature Anthropic `message_stop` incorrectly accepted; unexpected tools/model substitution incorrectly released unknown billing; credential replacement left a verified label. Each corresponding assertion passed after its fix. Nine provider/CLI tests now cover both adapters on a chunked HTTP boundary, pinned URLs/model identities, explicit token/deadline bounds, JSON/reference repair with a new charged intention, no third repair, unknown usage, refused/truncated/tool output, quota/auth/server errors without raw bodies, cancellation and a cut stream. An unfunded correction sends no second request and leaves the first receipt readable.

The real CLI preflight subprocess refuses absent spending consent before any HTTP or receipt. Its authorized deterministic run passes, sends no selected context, excludes key sentinels and updates only the disposable fixture route. The HTTP import is test-only and is not shipped. Ordinary structured calls never confer a verified label. Final typecheck, full suite/package and remote platform results are recorded in the PR.

## Increment 3 — durable call control

Nine public-service/process tests exercise real SQLite, real files, a minimal real LangGraph and an external deterministic provider boundary. Observed red cycles: route pricing rejected as unknown; execution handle absent; stop API absent; invalid metering accepted; monotonic waiting/overlap returned real elapsed time instead of 200 ms; CLI execution command unknown. Each corresponding test passed after implementation. Correction, timeout, pool protection and four-process affordability also pass. The crash test kills processes after durable reservation and reopening does not reconstruct execution handles.

Receipts contain bounded metadata only. Pricing, scope, available budget and active-time admission are checked before saving an intention. Missing usage and ambiguous failure keep the reservation; cancellation does not presume zero remote billing. Ordinary calls preserve revision/conclusion funds/time. Separate call deadlines are distinct from the meeting's active-duration target. A correction gets a new charged intention. CLI configuration/inspection/stop is tested across actual independent processes; provider boundary errors and request sentinels are absent from saved receipt/history metadata.

See [the receipt guide](controlling-calls.md). Real provider/account verification remains outside this increment. Final local and remote validation are recorded in its PR.

## Increment 1 — real projects and frozen text context

Scope: application service, CLI processes and the installed package, as agreed in the [ten-PR implementation plan](../boardroom-plans/02-PLAN-IMPLEMENTATION-EN-10-PR.md). No provider connection or model call is implemented in this increment. Hotelix was offered as a read-only local smoke-test project; automated tests use disposable files and do not depend on that directory.

### Observed red → green cycles

| Behavior | Red observed before implementation | Green verification |
| --- | --- | --- |
| Create/reopen a real named project and preserve the recorded project | `node --test tests/live-context.test.ts`: `app.createProject is not a function` | Same test passed after adding validated real-project records and public retrieval |
| Concurrent text captures share one identity/revision | `node --test --test-name-pattern='simultaneous text' tests/live-context.test.ts`: eight processes produced seven distinct IDs, expected one | Same test passed after serializing snapshot publication and revision allocation in an immediate transaction |
| Prepare a question without an initial plan and preserve selected context across reopen | `node --test --test-name-pattern='question without' tests/live-context.test.ts`: `app.prepareMeeting is not a function` | Same test passed with immutable source references, a prepared meeting and atomic preparation event |
| Reject ambiguous/missing proposal author | `node --test --test-name-pattern='ambiguous or missing' tests/live-context.test.ts`: missing expected exception for an absent author | Same test passed with unique adviser IDs and author membership validation |
| Limit selected context to 64 KiB UTF-8 | `node --test --test-name-pattern='64 KiB' tests/live-context.test.ts`: oversized context was accepted | Same test passed; 32,769 `é` characters are refused, 32,768 accepted, refusal leaves no meeting event |
| Keep recorded projects separate from real preparation | `node --test --test-name-pattern='recorded projects cannot' tests/live-context.test.ts`: recorded project incorrectly accepted | Same test passed. It also characterizes reused source-consent, project-scope, line-range and snapshot-integrity guards through the new meeting boundary |
| Save a declared zero-cost ceiling | `node --test --test-name-pattern='declared zero-cost' tests/live-context.test.ts`: schema rejected zero | Same test passed; negative cost, empty question/context and invalid duration are rejected before journaling |
| Bound text snapshot publication | `node --test --test-name-pattern='bounded to 4 MiB' tests/live-context.test.ts`: 4 MiB + 1 byte accepted | Same test passed, exact 4 MiB accepted as revision 1 after the oversized input was refused |
| CLI real project and source selection | `node --test tests/live-cli.test.ts`: unsupported `--name`, then unsupported `--project` when testing consent | After implementing project commands and authorized source capture, the journey progressed to the next missing command |
| CLI meeting preparation and inspection | Same E2E: unsupported `--input`, then unknown `meeting-context` command | After adding prepared-meeting commands, the journey progressed to history inspection |
| CLI history/trace project scope | Same E2E: expected `live.meeting-prepared`, received empty recorded-project history | Same full E2E passed after history/trace used the explicitly selected project |
| Require an actually executed installed preparation journey | `node --test tests/package.test.ts`: `live-preparation.json` missing, despite nested runner exit code 0 | Full suite passed after extending installed qualification and removing inherited `NODE_TEST_CONTEXT` from its independent runner |

During the CLI cycles, `npm run build` refreshed the actual `dist/cli.js` before each red/green run. All assertions use public services, actual CLI processes, real SQLite and source files. The large-file concurrent test synchronizes eight real processes over IPC; it does not mock storage or query private tables.

### Final validation

On Windows x64 / Node 24.12.0:

- `npm run typecheck`: passed.
- `npm test`: **57/57 passed**, zero failed/skipped; approximately 87.6 seconds. The package test ran the native Windows launcher, bundled SQLite/runtime and the installed qualification as an independent Node test runner, and read its `live-preparation.json` proof.
- Executed the PowerShell commands in [the preparation quickstart](preparing-a-question.md) as written: prepared context v1, expected frozen line, metadata-only event and visibly unavailable provider calls.
- Read-only Hotelix smoke: authorized README lines 11–19 prepared in French with no initial plan; reopening retained the same meeting and source SHA-256 was unchanged. Snapshots, question and local report are in ignored application data; no Hotelix content is committed or exported to a provider.
- Source/Markdown links checked; `git diff --check` passed. No new dependency installed. Existing dependency JSON locks match the local checkout used to populate dependencies; a fresh installation was not certified locally.

The package regression initially exposed an existing false positive: `NODE_TEST_CONTEXT=child-v8` made the nested Node `--test` invocation skip its files as recursive execution, returning 0 with a warning. A small local process probe reproduced this without running product code. Clearing that inherited runner flag and requiring the generated preparation proof prevents exit-code-only success. The three standalone CI installation jobs did not depend on that nested invocation; they now also exercise the new preparation commands.

The configured CI matrix additionally verifies fresh dependency installs, producer packages and independent installations on Windows x64, Linux x64 and macOS arm64. Its remote results belong to the PR checks. Completing this increment does not accept Plan 02's live multi-provider milestone.

PR 1's commit `5e1e64ef355d1de43bf232a00a47e9b2d2d895f0` passed all six producer/installed jobs in both the [push run](https://github.com/francoisnoel62/Boardroom/actions/runs/37110709047) and [PR run](https://github.com/francoisnoel62/Boardroom/actions/runs/37110718382). The increment is [PR #8](https://github.com/francoisnoel62/Boardroom/pull/8); it remains open, not merged by this work.

## Increment 2 — routes, team and protected credentials

Scope: the same approved service, real CLI/process, PTY and installed-package boundaries. This branch is based on PR 1 and its PR targets that dependency branch. No provider adapter or billable request is delivered.

### Observed red → green cycles

| Behavior | Observed red | Green verification |
| --- | --- | --- |
| Durable declared routes and shareable configuration | `node --test tests/routes.test.ts`: `app.configureRoute is not a function` | Configure/reopen retains the opaque reference; shareable metadata excludes it and reports unverified |
| Team-selected preparation pins profile/route revisions | Same test file: `app.configureTeam is not a function` | Two preparations around route/profile edits retain their respective identities after service reopen |
| Secret boundary and bounded vault diagnostics | `node --test tests/credentials.test.ts`: `app.setRouteCredential is not a function` | Injected sentinel is available only from the secret boundary; simulated host error bodies are absent from the public failure; domain bytes contain no token |
| Disable inherited tracing before real checkpoint work | `node --test tests/privacy.test.ts`: child did not exit within 15 seconds with inherited tracing enabled | Same real graph/checkpointer subprocess exits, all four tracing settings disabled, no sentinel in output |
| Real CLI route/profile/session configuration | `node --test tests/routes-cli.test.ts`: unknown `route-configure` command | Real processes configure three routes, a team, an explicit session key, prepare selected context and inspect frozen identities/trace/checkpoint without the sentinel |
| Reject Unicode whitespace and C1 controls before credential writes | `node --test --test-name-pattern='invalid token' tests/credentials.test.ts`: Unicode em-space was accepted | Same test passes for empty, ASCII/Unicode whitespace, C1 control and oversized tokens; no value reaches the secret store |
| Concurrent fresh database startup | CI first-reader failures initially lacked child stderr. Synchronizing constructor entry reproduced `SQLITE_BUSY` at WAL promotion on Windows before the fix | Ten synchronized local attempts passed after bounding retries to idempotent schema/WAL setup only; no domain operation is retried |
| Packaged macOS vault uses the actual login session | First macOS CI: native service vault passed, installed runner reported required vault unavailable after replacing `HOME` with a nonexistent fake login home | Installed qualification now preserves the macOS login home and explicitly isolates application data; the same remote test must confirm the result |

Additional service assertions cover PO authorship, exactly three advisers/roles, distinct model identities, provider diversity, unsupported capability refusal, unknown secret properties, immutable provider identity and capability changes rejected at preparation. The PTY exercises masked entry, backspace, Ctrl+C cancellation, native readback where available, and cleanup. These characterize the implemented boundaries rather than mocking SQLite, graph or terminal internals.

The native dependency was selected after official registry/type/API verification: `@napi-rs/keyring` **2.1.0**. Its Linux default fallback was deliberately disabled with `{ linux: { store: 'secret-service' } }`. The host test uses a new UUID and never lists existing credentials. Windows host set/reopen/read/delete passed with an authorized host-access process. A sandboxed full run correctly refused protected-store writes; its two failures were not counted as qualification. The full suite was rerun with access to the test-owned dummy entries. This is distinct from production vault unavailability, which is surfaced without a plaintext fallback.

Native Windows/macOS vaults are required in CI; Linux producer tests require a real unlocked temporary Secret Service. The offline installed Linux image reports no host vault and verifies explicit session injection. Actual per-platform outcomes appear in PR checks and the generated `protected-configuration.json` proof. Platform configuration alone is not evidence of a passing round trip.

### Validation

- Windows x64 / Node 24.12.0: `npm run typecheck` passed; final full `npm test` passed **66/66**, zero failed/skipped, approximately 98.1 seconds, with required access to the native vault. This includes the Unicode-token regression and synchronized fresh-start regression added after the initial 65-test run.
- The package regression executed the independent installed runner and required its protected-configuration proof: session injection, frozen profile, sentinel exclusion and native Windows vault round trip.
- Executed the first PowerShell example in [the configuration guide](configuring-routes.md) as written: three declared routes, team revision 1, a question with zero declared ceiling and frozen identities; no key or model call required.
- Remote Windows/Linux/macOS results are tracked in [PR #9's checks](https://github.com/francoisnoel62/Boardroom/pull/9/checks); use the latest commit's checks and generated installation proofs. No Hotelix file was needed or modified in this increment; no real credential was used.

The initial CI found a latent startup race at `PRAGMA journal_mode = WAL`, before the first-reader test's ready message. SQLite can refuse this lock promotion without invoking its normal busy handler. The constructor now retries only idempotent local setup within a monotonic five-second bound and restores the normal 5,000 ms busy timeout afterward. Non-busy errors and domain operations are never replayed. The existing concurrent regression now synchronizes all four constructor entries and includes child diagnostics, making the original failure locally reproducible instead of depending on timing.
