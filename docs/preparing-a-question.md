# Prepare your own question locally

Preparation creates real projects and saves a question with immutable text context. **These commands do not contact model providers or run a debate.** Provider/model labels, duration and monetary ceiling are saved declarations. To execute a supported route, also configure [protected reserves](controlling-calls.md), [explicit preflight](provider-preflight.md) and [human framing](framing-a-question.md).

A question and selected context are sufficient. An initial plan is optional. The recorded example remains available with its existing commands.

To select a configured team and freeze its route revisions, use [route and credential configuration](configuring-routes.md). The example below preserves the PR 1 metadata-only preparation path.

## Try the prepared-question workflow

From a development checkout with Node 24.12.0 and installed dependencies, run `npm run build`. This PowerShell example selects line 4 of the bundled **fictional** source; replace the source and line range to prepare your own context.

```powershell
$data = '.boardroom/local-question'
$project = node dist/cli.js project-create --name 'My pilot' --language en --data-dir $data --json | ConvertFrom-Json
$evidence = node dist/cli.js source --project $project.id --source assets/demo/context.md --allow-source --data-dir $data --json | ConvertFrom-Json
$question = Get-Content -Raw assets/validation/live-question.json | ConvertFrom-Json
$question.passages[0].evidenceId = $evidence.id
$question | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 "$data/question.json"
$meeting = node dist/cli.js meeting-prepare --project $project.id --input "$data/question.json" --data-dir $data --json | ConvertFrom-Json
node dist/cli.js meeting --project $project.id --id $meeting.id --data-dir $data
node dist/cli.js meeting-context --project $project.id --id $meeting.id --data-dir $data
node dist/cli.js history --project $project.id --data-dir $data
```

For a packaged candidate, replace `node dist/cli.js` with `.\boardroom.cmd` on Windows or `./boardroom` on Linux/macOS. Run from the candidate directory, or use absolute paths to your input files. Each command supports `--json`. Repeated project creation creates a new identity; save the returned project and meeting IDs for subsequent inspection.

The selected passage is `Team: two engineers; four weeks available for the launch.` The prepared meeting has context v1, no initial plan and status `prepared`. The displayed budget is a declaration, not an active monetary guarantee.

## Preparation input

[live-question.json](../assets/validation/live-question.json) is a template. Replace its evidence placeholder with the UUID returned by authorized source capture. It records:

- `question` and optional `initialPlan`; `constraints` defaults to an empty list.
- Optional `language`, otherwise the saved project language.
- `advisers`: stable IDs, role labels, provider/model identifiers; `proposalAuthorId` must identify one selected adviser. IDs must be unique. This local increment records a configurable selection; it does not certify any provider, model, team size or debate profile.
- `durationTargetSeconds`: positive integer; `costCeiling`: nonnegative amount and three-uppercase-letter currency label. Zero can be declared. The bounded execution path currently requires USD with at most six decimal places and a supported, current pricing catalog; a preparation alone does not authorize spending.
- `passages`: saved evidence ID and inclusive 1-based `firstLine` / `lastLine` ranges. Multiple passages/files are supported.

Do not place `projectId` or credentials in this JSON. The CLI takes the project exclusively from `--project` and rejects unknown preparation fields. These are declarative data, not instructions granting filesystem/network/tool access.

## Source and persistence guarantees

`source` captures one explicitly authorized UTF-8 text/Markdown file, at most **4 MiB**. Consent is checked before reading it. The complete original bytes are saved locally in a SHA-256 snapshot; only the selected passages are included in the prepared context. Aggregate selected text is limited to **64 KiB of UTF-8**, counting every selected passage. Narrowing passages does not authorize uploading the entire snapshot.

Preparation stores the exact evidence identity, revision, hash and line range. The meeting record and its metadata-only preparation event commit together. A changed/deleted original triggers a warning during inspection while saved bytes remain readable. Missing or modified snapshots are refused. Preparation on the recorded project, another project's evidence, invalid line ranges or an oversized context is refused without a meeting event. This increment provides no context-editing command: prepare a new meeting for a different question/context.

Text revision allocation and snapshot publication are serialized across local processes. Original reading/UTF-8 validation happens before the write transaction; snapshot publication is bounded by the 4 MiB limit. No provider/human wait occurs inside a transaction. Snapshot files and SQLite records are not a shared atomic commit: an interrupted capture may leave an unreferenced snapshot, never a reference to replacement original bytes.

`history --project <id>` and `trace --project <id> --output <directory>` inspect that project's metadata. Preparation events and filtered traces omit question/source bodies and source paths. Source snapshots and prepared meetings contain the explicitly selected local data and remain readable by the machine owner. No cloud upload occurs.

PDF/DOCX extraction stays available for the recorded project, but those locators are not accepted in the prepared text context. The [live quickstart](live-quickstart.md) selects an executable team and continues through framing approval, debate, individual views, human decisions and live exports.

## Validation

Integration tests use the real service, SQLite and disposable files. CLI E2E starts new application processes; the candidate test runs the native launcher with only the bundled runtime and retains `live-preparation.json`. All three configured installation jobs execute the same prepared-question journey. Actual platform results are recorded in the PR checks, rather than inferred from the workflow configuration.

[TDD evidence](plan-02-progress.md) · [Architecture](architecture.md) · [Implementation plan](../boardroom-plans/02-PLAN-IMPLEMENTATION-EN-10-PR.md)
