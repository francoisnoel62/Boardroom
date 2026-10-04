# Plan 02 implementation evidence

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
