# Interactive live decision terminal

[Getting started](getting-started.md) · [Preparation](preparing-a-question.md) · [Protected routes](configuring-routes.md) · [Spending controls](controlling-calls.md)

The `live` command connects the Ink terminal to the same durable application services as the individual CLI commands. Configure the three-adviser team and authorize/capture your selected text first. Accounts and an explicit spending ceiling are required for actual provider traffic. Deterministic PTY tests replace HTTP externally; they do not certify real accounts or remote cancellation.

In a development checkout:

```sh
node dist/cli.js live --project PROJECT_ID --team TEAM_ID --input question.json --output ./exports --allow-provider
```

In a Windows candidate replace `node dist/cli.js` with `.\boardroom.cmd`; on Linux/macOS use `./boardroom`. Use `--id MEETING_ID` instead of `--team/--input` to inspect a saved meeting and explicitly advance eligible phases. A prepared saved meeting needs [configured execution reserves](controlling-calls.md). Reopening never replays an uncertain call.

`question.json` contains `question`, optional `constraints`/`initialPlan`, `durationTargetSeconds`, a USD `costCeiling` and selected `passages` (`evidenceId`, `firstLine`, `lastLine`). Project/team come from the flags. Before `start`, edit with `question TEXT` and `select 1,2`. Start first checks that the ceiling and duration could ever reach the final views, then freezes the selection and the reserves [computed from the team's call bounds](controlling-calls.md). A ceiling or duration below the smallest funded one is refused with the figures, before any meeting is created; the draft stays editable. Choose CLI preparation/execution configuration if you need other reserve sizes.

Enter submits a typed command. Pasted multiline text remains a draft until Enter. Backspace removes a grapheme, including combined accents/emoji. The draft is limited to 65,536 UTF-16 units; the screen shows its last three lines. Narrow windows truncate individual display lines and reduce help/detail; durable inspection remains complete in the CLI. Model/source controls are removed before display.

| Command | Result |
| --- | --- |
| `start` | Ask the PO for framing; wait for the human |
| `approve N` | Explicitly approve the displayed framing version |
| `correct N FILE` | Save a complete human framing body from JSON; approval is needed again |
| `analyse` | Dispatch the three independent analyses |
| `debate` | Build, confront and revise the common proposal |
| `views N` | Collect final individual views on that exact proposal |
| `decide N ACTION REASON` | Record accepted, rejected, deferred or investigation-requested |
| `decision-file FILE` | Record a structured choice, including a material modified proposal |
| `inspect`, `evidence`, `history` | Inspect saved work; terminal detail is bounded |
| `conclude` | Stop ordinary work and allow explicit final views on a saved proposal |
| `stop` | Stop pending/in-flight work and retain uncertain commitments |
| `export` | Write new plan.md, memo.md and sanitized meeting.json |
| `quit` | Exit; if work is running, stop and save partial artifacts |

Escape/Ctrl+C requests cancellation, waits for settlement, attempts a partial export to the explicit output directory, restores terminal modes and exits with code 130. Cancellation does not establish zero remote billing. Export can fail (for example, unavailable storage); inspect the saved operation/receipts rather than assuming all files exist. Idle `quit` exits normally and does not automatically export.

Streams are labeled provisional until schema/reference validation and domain commit. All three model identities, phase status, proposal/view versions, known cost, held unknown cost, protected reserves and active duration are visible. Missing/stale views never become approvals. The human choice is separate. During a phase only inspection, stop, conclude and export are admitted; free interventions and guided recovery belong to later plans.

Five real OS PTY scenarios cover the full journey, three simultaneous streams, Unicode/multiline drafts and resizing, Ctrl+C and Escape, zero-budget refusal without HTTP, early conclusion, a missing view alongside insufficient evidence, long saved history and partial exports. Internal graphs, SQLite and filesystem remain real. [Installed qualification](plan-02-acceptance.md) adds the full journey with the bundled runtime and retained artifacts.
