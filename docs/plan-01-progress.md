# Plan 01 — implementation evidence

Updated: 2026-10-03. Status: **accepted with reservations**. This report retains the red → green evidence; the [acceptance report](plan-01-acceptance.md) records the complete target matrix, optional blocks, accepted limits and later-milestone work. Merging PRs #1–#7 records the acceptance.

## Red → green record

Each behavior below was introduced after executing its failing test. Run the resulting deterministic suite with `npm test`.

| Slice | Observed red result | Green behavior |
| --- | --- | --- |
| CLI launch | Empty CLI output failed the expected BOARDROOM header | English help identifies the recorded mode and unavailable capabilities |
| Project durability | Application service was absent | A real SQLite project reopens unchanged |
| Saved citation | `captureSource` was absent | A saved revision resolves after the source changes and the service reopens |
| Malformed extraction | Invalid UTF-8 did not raise the expected error | Invalid text is refused; consent, project scoping, and line-range guards also pass |
| Recorded playback | `openRecordedExample` was absent | Recorded messages resume at the next saved position and preserve the sourced objection |
| Export preservation | `exportRecordedExample` was absent | Successive exports are distinct; existing files and the bundled source remain unchanged |
| CLI journey | CLI returned help rather than a recorded message | Separate processes read, inspect, export, and resume |
| Ink rendering | `--terminal` was unknown | The compiled renderer outputs the message and exits without raw stdin |
| Official checkpointer | Technical probe module was absent | LangGraph state survives close/reopen; native SQLite FTS5 executes a real query |
| Bundled candidate | Packaging command was absent | Copied Node and native SQLite run from a Unicode/space path with empty PATH |
| Technical CLI | `doctor` was unknown | Separate technical-validation mode reports checkpoint reopen and FTS5 without claiming provider support |
| Physical PDF references | Document extractor was absent | Two real PDF pages resolve as separate page chunks |
| DOCX block references | DOCX extraction was unavailable | Unicode text is preserved in saved blocks, with layout/pagination limitations |
| Extraction limitations | A blank page returned `complete` | Empty/partial and malformed documents return explicit warning/status fields |
| Durable document evidence | `captureDocument` was absent | Saved page/block citations resolve after original edits and service restart |
| Citation kind boundary | Raw PDF bytes could be cited as text lines | Document evidence requires a page/block locator and rejects cross-project access |
| Overlapping capture | Concurrent captures created different evidence IDs | An immediate metadata transaction reuses one identity/revision |
| Document CLI | `--source` was unknown | Explicit file consent, extraction, and saved citation inspection work across processes |
| Machine-readable failure | Malformed PDF extraction exited successfully | JSON remains parseable and failed extraction exits with code 2 |
| Packaged document probe | `doctor` reported PDF/DOCX unavailable | Candidate loads its PDF.js worker/assets and Mammoth; saved citations resolve through its own runtime |
| Playback journal | `history` was absent | Playback position and an ordered, versioned event survive reopen together |
| Export identity and receipt | Both exports returned undefined operation IDs | Distinct IDs, ordered events, and file-hash receipts survive reopen |
| Known export failure | A refused output stayed `unconfirmed` | Failure code and receipt survive reopen; the existing file stays unchanged |
| Interrupted export intent | Child process failed because `prepareRecordedExport` was absent | Killing it after saved intent leaves an inspectable unconfirmed operation, without replay |
| Single export attempt | Reusing a handle attempted directory creation again | Completed and failed attempts reject repetition without changing history |
| History CLI | `history` was an unknown command | New processes inspect text/JSON outcomes without executing pending intent |
| Concurrent first readers | Four readers received only one distinct message ID | Serialized first creation and playback deliver four successive messages |
| Consistent history | An operation appeared without its prepared event | A read transaction keeps events and receipts on one snapshot during concurrent exports |
| TTY boundary | `terminal-check` was unknown | Piped input is refused before any project data is created |
| Input during streaming | PTY showed help instead of the validation screen | Typed input can be submitted while the fictional sample continues |
| Cancellation | Escape did not exit the process | Escape and Ctrl+C stop the sample, exit with code 130, and restore the cursor |
| Unicode editing | Backspace left the combined accent unchanged | Whole graphemes are removed without breaking Unicode input |
| Multiline paste | Submission retained CRLF rather than normalized LF | Bracketed paste stays one draft, normalizes newlines, and restores paste mode on exit |
| Window resize | Current dimensions were absent | Narrower/wider PTY windows update dimensions and preserve an editable Unicode draft |
| Pasted controls | ANSI bytes changed the displayed draft's styling | Control bytes are removed and do not cancel or issue terminal commands |
| Interactive TTY in CI | Candidate PTY stayed blank with `CI=true`; reproduced locally | Explicit interactive rendering keeps input and sample updates visible in a real TTY |
| Recorded decision contracts | `recordedDecision` was absent | Context, two proposals and three version-bound views survive reopen; human decision stays pending |
| Decision CLI | `decision` was unknown | Separate processes inspect saved versioned records and preserved uncertainty |
| Local filtered trace | `exportFilteredTrace` was absent | New JSON exports keep correlation metadata while omitting paths, bodies and receipts |
| Trace CLI | `trace` was unknown | The compiled application creates a new local filtered artifact |
| Optional probe blocks | `doctor` had no prerequisite explanations | Runtime/assets and authorized account/budget blocks are explicit; no optional pass is fabricated |
| Isolation report | `isolation-check` was unknown | Real fixed temporary writes and loopback access are measured; command/MCP capabilities stay unavailable |
| Installed qualification | The copied runtime could not find its shipped installed suite | The actual launcher completes the account-free journey and retains environment, trace, isolation and terminal evidence |

The package copy initially failed using Node's recursive `cpSync` on this Windows environment. Copying files and directories individually resolved the observed failure; the same package E2E then passed. This is not a claim that all Windows environments have that issue.

## Local evidence and limits

Environment: Windows x64; Node 24.12.0; npm 11.6.2. The tests use real temporary files, SQLite databases, immutable snapshots, application processes, and a copied runtime. No live provider, embedding download, or cloud account is used.

The baseline had **19 passing tests**. [PR 1](https://github.com/francoisnoel62/Boardroom/pull/1) contains the 11-test recorded workflow and [PR 2](https://github.com/francoisnoel62/Boardroom/pull/2) adds extraction; both passed Windows x64, Linux x64, and macOS arm64 jobs on their push and PR workflows. [PR 3](https://github.com/francoisnoel62/Boardroom/pull/3) adds eight journal/service/CLI tests and extends the candidate journey with history inspection. Its validation is recorded separately below.

Durable-history local result: **27 tests passed**, none skipped; `npm run typecheck` and `git diff --check` passed. The full suite includes the candidate's own runtime with empty `PATH`. Remote results are available on the PR 3 checks page; a configured matrix alone is not a passing result.

The candidate test covers playback, restart, evidence inspection, exports, Ink rendering, and the storage probe from the packaged application with its own Node. It sets `PATH`, `NODE_PATH`, and `NODE_OPTIONS` to empty in child processes. This is evidence of runtime independence on the present host, not a clean OS installation.

The candidate test now also extracts packaged PDF/DOCX fixtures, runs both document probes through `doctor`, and inspects saved PDF page 2 and DOCX block 2 through new processes. See the [fixture provenance and exact limits](../assets/validation/README.md). The added dependencies are PDF.js 6.3.289 and Mammoth 1.13.0; the lockfile retains exact resolutions.

The history checks include a real process killed after saved intent, four concurrent first readers, and thirty exports written by another process while history is read. The interruption check covers the gap before output creation; it does not qualify every crash point or power-loss durability. Unconfirmed operations remain visible and are never replayed automatically. Export receipts cover writes that finished; they do not eliminate the SQLite/filesystem commit gap.

Additive compatibility was also checked against data created by the retained PR 2 Windows candidate: saved position 2 and source citation survived; playback continued at position 3, and the new event and export receipt were saved. Existing data has no fabricated historical events. No general migration runner or recovery reconciliation is delivered yet.

The earlier README SVG rendered captured CLI text. The final README uses a screenshot of the actual packaged PTY screen, with timestamped VT recording and accessible screen text. [Capture provenance](media/README.md) distinguishes that rendered screen from a native-window photograph. Fictional model labels remain explicit.

## Terminal-validation increment — PR 4

`terminal-check` runs a fictional sample in an actual terminal, using the existing Ink runtime. Scratch input is in memory only. Seven new CLI/PTY tests cover TTY refusal, input during updates, Unicode backspace, multiline paste, narrower/wider resize, pasted control bytes, and Escape/Ctrl+C cancellation. The candidate journey also exercises the probe through its copied Node with empty PATH and checks unchanged project history.

Local result: **34 tests passed**, none skipped, including the bundled-runtime PTY journey; type checking passed. This extends the 27-test PR 3 baseline. The GitHub Actions matrix runs the same suite on Windows x64, Linux x64, and macOS arm64; its result must be checked independently.

The first remote run exposed Ink's default noninteractive rendering when `CI=true`, even inside a real PTY. Extending the existing input test with that environment reproduced the blank screen locally. Explicit interactive rendering at the TTY-only command boundary makes the same seven terminal tests pass, including ongoing updates after typing. The bundled-runtime journey also passes locally with `CI=true`, empty PATH, and unchanged project history. The candidate test retains the CI environment rather than disabling it.

The test driver is Microsoft `node-pty` 1.2.0-beta.15, with system ConPTY on Windows, plus `@xterm/headless` 6.0.0 to interpret actual VT output. The earlier stable driver retained Windows workers after exit; the selected beta completed the same cleanup checks. No production dependency or provider access was added. This proof concerns the documented sample and window sizes; it does not qualify every terminal, IME, editing operation, or real provider stream. Remote results are tracked on [PR 4](https://github.com/francoisnoel62/Boardroom/pull/4/checks).

## Final increments and acceptance

[PR 5](https://github.com/francoisnoel62/Boardroom/pull/5) adds the versioned saved-decision projection and CLI: **36 local tests passed**, with both three-target matrices green. [PR 6](https://github.com/francoisnoel62/Boardroom/pull/6) adds local filtered traces, actual temporary isolation experiments and explicit optional blocks: **40 local tests passed**, with both three-target matrices green.

[PR 7](https://github.com/francoisnoel62/Boardroom/pull/7) extends the candidate test with its shipped installed journey, archives executable modes and runs separate download/install jobs. The first complete campaign passed all six jobs in each workflow: three producer/test jobs and three fresh-environment installation jobs. Windows/macOS system/cache application Node was removed; Linux used an offline fresh Ubuntu image without Node. Complete evidence was downloaded locally, and compact results are [retained in the repository](validation/plan01-targets.json).

The final screenshot comes from the actual packaged CLI in a real Windows PTY. A local first-frame startup exceeded the old ten-second readiness window; the final qualifier records startup timing with a bounded thirty-second cold-start window while subsequent interaction checks remain bounded at ten seconds. No test is skipped or automatically retried. The final-head matrix remains the authority for the submitted PR.

All Plan 01 criteria have passing mandatory evidence or the explicit optional blocked/failed outcomes allowed by its passage rule. [Acceptance and future work](plan-01-acceptance.md) distinguish those outcomes from live integration or tool activation. Broader editing/recovery, retrieval, tools, novice onboarding, cloud observability and public release remain in their respective plans. No paid account, product release or automatic merge occurred.

## Acceptance review — evidence guarantees

The review found guarantees promised by the README and architecture without any test. The tests below are **characterization tests**: each was written after its behavior and passed. It then failed for the expected reason once its guard was temporarily removed, and passed again after restoration. They secure the behavior; they do not claim TDD-first. Each check ran `npm run build`, then `node --test --test-name-pattern="<test name>" <test file>`.

| Guarantee | Guard removed | Observed failure | Restored behavior |
| --- | --- | --- | --- |
| Deleted text original | Missing-original fallback when citing text | `ENOENT` instead of a citation | Saved snapshot text with `originalChanged: true` |
| Deleted document original, service and CLI | Missing-original fallback when citing a page or block | `ENOENT`; the CLI printed `BOARDROOM: ENOENT` | Saved page plus the visible CLI warning |
| Altered text, PDF or extraction snapshot | Digest check when citing | Missing expected integrity exception | `Snapshot integrity check failed` |
| Altered snapshot when capturing text | Digest check on an existing snapshot | Capture succeeded over conflicting bytes | Capture refused |
| Altered snapshot when capturing a document | Digest check on an existing snapshot | Evidence was saved before a later failure, so the file could not be captured again | A refused capture saves nothing; a later capture gets revision 1 |
| Unsupported document format | Extension guard | A `.txt` capture was not rejected | `Document extraction supports PDF and DOCX files only` |

One behavior was changed test-first:

| Slice | Observed red result | Green behavior |
| --- | --- | --- |
| Missing snapshot | `node --test --test-name-pattern="missing .*snapshot is refused" tests/project.test.ts tests/document-evidence.test.ts` failed with a raw `ENOENT` naming the internal snapshot path | One shared snapshot reader refuses missing and altered snapshots with an explicit integrity error |

The first deleted-original test failed for an unrelated reason. On Windows, Node 24.12 `rmSync` returned without deleting a path containing `é`, so the original still existed. `unlinkSync` deletes it, and the product fallback was correct. The same runtime behavior can leave temporary directories with non-ASCII names after tests on Windows.

The installed qualification suite now also retains the first exported plan and memo with its evidence.

Local result: **48 tests passed**, none skipped; type checking and `git diff --check` passed. A locally built candidate also ran its installed suite with empty `PATH` and retained `export-plan.md` and `export-memo.md`.
