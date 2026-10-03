# Plan 01 — implementation evidence

Updated: 2026-10-03. Status: **started; not accepted**. This report records the local workflow, PDF/DOCX, durable-history, and terminal-validation increments. All unchecked milestone acceptance criteria remain in force.

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

The package copy initially failed using Node's recursive `cpSync` on this Windows environment. Copying files and directories individually resolved the observed failure; the same package E2E then passed. This is not a claim that all Windows environments have that issue.

## Local evidence and limits

Environment: Windows x64; Node 24.12.0; npm 11.6.2. The tests use real temporary files, SQLite databases, immutable snapshots, application processes, and a copied runtime. No live provider, embedding download, or cloud account is used.

The baseline had **19 passing tests**. [PR 1](https://github.com/francoisnoel62/Boardroom/pull/1) contains the 11-test recorded workflow and [PR 2](https://github.com/francoisnoel62/Boardroom/pull/2) adds extraction; both passed Windows x64, Linux x64, and macOS arm64 jobs on their push and PR workflows. [PR 3](https://github.com/francoisnoel62/Boardroom/pull/3) adds eight journal/service/CLI tests and extends the candidate journey with history inspection. Its validation is recorded separately below.

Durable-history local result: **27 tests passed**, none skipped; `npm run typecheck` and `git diff --check` passed. The full suite includes the candidate's own runtime with empty `PATH`. Remote results are available on the PR 3 checks page; a configured matrix alone is not a passing result.

The candidate test covers playback, restart, evidence inspection, exports, Ink rendering, and the storage probe from the packaged application with its own Node. It sets `PATH`, `NODE_PATH`, and `NODE_OPTIONS` to empty in child processes. This is evidence of runtime independence on the present host, not a clean OS installation.

The candidate test now also extracts packaged PDF/DOCX fixtures, runs both document probes through `doctor`, and inspects saved PDF page 2 and DOCX block 2 through new processes. See the [fixture provenance and exact limits](../assets/validation/README.md). The added dependencies are PDF.js 6.3.289 and Mammoth 1.13.0; the lockfile retains exact resolutions.

The history checks include a real process killed after saved intent, four concurrent first readers, and thirty exports written by another process while history is read. The interruption check covers the gap before output creation; it does not qualify every crash point or power-loss durability. Unconfirmed operations remain visible and are never replayed automatically. Export receipts cover writes that finished; they do not eliminate the SQLite/filesystem commit gap.

Additive compatibility was also checked against data created by the retained PR 2 Windows candidate: saved position 2 and source citation survived; playback continued at position 3, and the new event and export receipt were saved. Existing data has no fabricated historical events. No general migration runner or recovery reconciliation is delivered yet.

The README transcript is captured from the compiled CLI with a fresh local demonstration data directory. Its SVG is a static rendering of that actual text, not a photograph of a terminal window. Fictional model labels are visibly identified.

## Terminal-validation increment — PR 4

`terminal-check` runs a fictional sample in an actual terminal, using the existing Ink runtime. Scratch input is in memory only. Seven new CLI/PTY tests cover TTY refusal, input during updates, Unicode backspace, multiline paste, narrower/wider resize, pasted control bytes, and Escape/Ctrl+C cancellation. The candidate journey also exercises the probe through its copied Node with empty PATH and checks unchanged project history.

Local result: **34 tests passed**, none skipped, including the bundled-runtime PTY journey; type checking passed. This extends the 27-test PR 3 baseline. The GitHub Actions matrix runs the same suite on Windows x64, Linux x64, and macOS arm64; its result must be checked independently.

The first remote run exposed Ink's default noninteractive rendering when `CI=true`, even inside a real PTY. Extending the existing input test with that environment reproduced the blank screen locally. Explicit interactive rendering at the TTY-only command boundary makes the same seven terminal tests pass, including ongoing updates after typing. The bundled-runtime journey also passes locally with `CI=true`, empty PATH, and unchanged project history. The candidate test retains the CI environment rather than disabling it.

The test driver is Microsoft `node-pty` 1.2.0-beta.15, with system ConPTY on Windows, plus `@xterm/headless` 6.0.0 to interpret actual VT output. The earlier stable driver retained Windows workers after exit; the selected beta completed the same cleanup checks. No production dependency or provider access was added. This proof concerns the documented sample and window sizes; it does not qualify every terminal, IME, editing operation, or real provider stream. Remote results are tracked on [PR 4](https://github.com/francoisnoel62/Boardroom/pull/4/checks).

## Still required before accepting Plan 01

- Clean-machine packages on Windows x64, Linux x64, and macOS arm64; execute the CI matrix, review native packaging and launcher behavior on each.
- Broader terminal/editor qualification and the real-provider streaming gate in Plan 02. The separate fictional-stream probe now covers input, multiline paste, resizing, Unicode, and cancellation through real PTYs and the packaged runtime.
- Broader document/font/layout qualification and optional embedding candidate qualification. The basic packaged worker/assets, DOCX text, and empty/malformed cases have passed the three-target CI matrix.
- Live context/proposal/stance contracts and general command/MCP action contracts. Versioned playback/export events, operation IDs, receipts, and additive storage compatibility are implemented; a migration runner, recovery reconciliation, and further crash/disk-fault qualification remain.
- Protection experiments for commands and local/remote MCP: protected temporary originals, outside-copy files, filesystem/network restrictions, platform prerequisites. All such tools remain blocked in the product.
- Filtered trace export experiment, optional embedding results, and provider-streaming evidence or an explicit access-related block. Real provider calls require separately authorized accounts and spending.
- A real terminal capture, GitHub rendering review, copied quickstart commands against each candidate, and a novice installation/readability check.
- Dependency production pruning, full license/distribution review, and release decisions where applicable.

No plan acceptance box has been checked. The source repository and dependent PRs are public at the user's request; no product release, external model-account integration, purchase, or signing has occurred. PRs are left open for review, without automatic merging.
