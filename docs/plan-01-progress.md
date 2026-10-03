# Plan 01 — implementation evidence

Date: 2026-10-01. Status: **started; not accepted**. This report records the first usable local increment. All unchecked milestone acceptance criteria remain in force.

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

The package copy initially failed using Node's recursive `cpSync` on this Windows environment. Copying files and directories individually resolved the observed failure; the same package E2E then passed. This is not a claim that all Windows environments have that issue.

## Local evidence and limits

Environment: Windows x64; Node 24.12.0; npm 11.6.2. The tests use real temporary files, SQLite databases, immutable snapshots, application processes, and a copied runtime. No live provider, embedding download, or cloud account is used.

Local result: **11 tests passed**, none skipped; `npm run typecheck` passed. The configured remote CI matrix is still unexecuted.

The candidate test covers playback, restart, evidence inspection, exports, Ink rendering, and the storage probe from the packaged application with its own Node. It sets `PATH`, `NODE_PATH`, and `NODE_OPTIONS` to empty in child processes. This is evidence of runtime independence on the present host, not a clean OS installation.

The README transcript is captured from the compiled CLI with a fresh local demonstration data directory. Its SVG is a static rendering of that actual text, not a photograph of a terminal window. Fictional model labels are visibly identified.

## Still required before accepting Plan 01

- Clean-machine packages on Windows x64, Linux x64, and macOS arm64; execute the CI matrix, review native packaging and launcher behavior on each.
- Interactive streaming input, multiline paste, resizing, Unicode, and cancellation with real terminal automation.
- Packaged PDF.js assets/workers, Mammoth DOCX extraction, malformed/partial-document cases, and the optional embedding candidate qualification.
- Versioned context/proposal/stance/event/action contracts, durable event/action journal and operation identifiers, storage migration and reconciliation groundwork.
- Protection experiments for commands and local/remote MCP: protected temporary originals, outside-copy files, filesystem/network restrictions, platform prerequisites. All such tools remain blocked in the product.
- Filtered trace export experiment, optional embedding results, and provider-streaming evidence or an explicit access-related block. Real provider calls require separately authorized accounts and spending.
- A real terminal capture, GitHub rendering review, copied quickstart commands against each candidate, and a novice installation/readability check.
- Dependency production pruning, full license/distribution review, and release decisions where applicable.

No plan acceptance box has been checked. No remote CI run, external account integration, public release, purchase, or signing has occurred.
