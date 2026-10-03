# Local recorded-example architecture

Status: recorded workflow, PDF/DOCX, durable history, and terminal-validation increments of Plan 01, updated 2026-10-03. The complete milestone and public release are not accepted yet.

## Public boundaries

The approved plan defines the seams: application commands, the terminal/CLI, and the distributed package. Tests use those boundaries rather than querying private tables or mocking internal services.

`Boardroom` opens a fictional project, captures explicitly authorized UTF-8/PDF/DOCX sources, resolves saved citations, advances recorded playback, and creates new exports. PDF/DOCX extraction runs on the exact bytes read after source consent. The CLI passes commands and displays results. Ink renders the transcript; it does not own domain state. The recorded workflow remains command-oriented. A separate `terminal-check` command exercises typing, multiline paste, resize, and cancellation during a fictional stream; it opens no application service or database.

## Durable data

- `domain.sqlite`: versioned, schema-validated project, evidence, recorded-meeting, and export-operation records, plus an append-only event journal; WAL with a finite busy timeout. Playback position and its event commit in one immediate transaction. First recording creation also serializes so concurrent initial readers cannot reset progress. The current recording is stored in the meeting record, so updating bundled assets does not rewrite an existing recording.
- `snapshots/<sha256>`: original bytes saved with exclusive creation. Document evidence adds a separate content-addressed, schema-validated extraction JSON. Citation resolution validates both original and extraction snapshot hashes. Text references use saved line ranges; PDFs use physical pages and DOCX uses saved text blocks. Invalid UTF-8 is rejected by the plain-text extractor.
- `checkpoints.sqlite`: the separate technical probe uses the official `SqliteSaver`; a minimal graph increments a count and reopens its saved state. It is not the replay engine or a live meeting.
- Export directories: unique `boardroom-recorded-<operation-id>` directories containing exclusively created `plan.md` and `memo.md`. Exports include saved evidence identity and preserve disagreement and the pending human decision.

There is no network/human wait inside a SQLite transaction. Document parsing finishes before a short immediate transaction rechecks evidence identity and allocates its revision. Concurrent captures of identical bytes reuse one durable identity; they do not leave competing revision-1 records. Export filesystem writes run outside SQLite transactions. A full asynchronous write coordinator, a general migration runner, and the live-domain contracts remain outstanding.

## Playback journal and export receipts

`recordedDecision(projectId)` and the `decision` CLI project the saved recording through version-1 context, proposal, and adviser-view schemas. Views must reference an available proposal and the same context version. The fixed recording's explicitly labeled final-view format supplies its stances; this adapter is not a parser for model output. Previous candidates' saved recordings remain readable, without replacing their transcript with newer bundled assets. Export-operation records are the minimal action contract for this milestone; executable command/MCP contracts remain for later tool activation. These projections do not implement live context editing or incident reconciliation.

`history(projectId)` returns events and operation receipts from one SQLite read snapshot. Events use a version-1 envelope with a global sequence, timestamp, and project scope. Playback entries reference the saved meeting/message and resulting position; export entries reference the operation ID. They omit source and transcript bodies. The journal covers playback and exports in this increment; it does not claim to audit every project or evidence command.

`prepareRecordedExport` saves intent and planned paths before any output creation. It returns a process-local execution handle; the ordinary `exportRecordedExample` command immediately uses that handle. An immediate transaction claims a single attempt before filesystem writes. The same handle cannot execute again after success or failure, and no handle is reconstructed from an old ID on restart.

The export operation starts as `unconfirmed`. Starting, completing, or failing an attempt saves its operation state and event together. A completed receipt contains both paths and hashes of bytes written; a caught filesystem failure records its code and the writes that finished, without deleting partial files. If execution or receipt persistence is interrupted, the durable intent remains unconfirmed. That state also describes an active operation, so inspection never assumes it has crashed or changes its state. SQLite and filesystem writes are not one atomic commit; uncertain outcomes require directory inspection rather than automatic replay.

The event table is added without rewriting existing records or snapshots. Data from the PR 2 candidate was reopened on Windows: position 2 and the saved citation survived, the next message advanced to position 3, and only the new event was journaled. Prior playback/export events are not invented. This is an additive compatibility check, not a general upgrade/rollback system.

Tests kill a real process after durable export intent and before output writes. They also run four simultaneous first readers and inspect history while another process exports. Crash points inside file writes, disk-full/power-loss behavior, recovery reconciliation, and general command/MCP receipts still need qualification. Receipt hashes describe bytes written at the time; they do not certify that the user has left those files unchanged.

## Dependency and runtime decision

The terminal probe uses the already pinned Ink hooks for input, bracketed paste, window size, and exit. The CLI requires a TTY for both input and output; rendering explicitly stays interactive even when the environment sets `CI=true`. A 200 ms timer changes the fictional sample independently of input. Draft and last accepted input remain component-local; the timer and input modes are released on cancellation. Backspace uses Node's grapheme segmentation so it does not leave a broken combining character or emoji. CR/CRLF become LF, and C0/C1 control bytes are removed except tabs and newlines. This is an append/backspace probe, not a general editor.

Tests use real OS pseudoterminals and a VT screen emulator, observing the rendered CLI rather than component internals. Test-only dependencies are `node-pty` **1.2.0-beta.15** and `@xterm/headless` **6.0.0**. The earlier stable PTY 1.1.0 retained Windows connection workers after child exit in this environment. The pinned beta with system ConPTY completed the same tests and cleanup; it is a deliberate test-tool qualification choice. The product does not import either dependency, although the current candidate still copies development dependencies. [Microsoft node-pty API](https://github.com/microsoft/node-pty), [xterm headless API and experimental status](https://github.com/xtermjs/xterm.js/tree/master/headless).

The PTY tests cover 100×30, 44×18, and 110×34 windows, ASCII, accented text, emoji, a combining accent, CRLF multiline paste, control-byte paste, and Escape/Ctrl+C. Cancellation must exit the actual child with code 130 and restore cursor/paste modes. Candidate tests repeat paste, resize, submission, and cancellation with the copied runtime and empty PATH, and verify that project history stays unchanged. Terminal-specific IMEs, advanced editing, much larger pastes, and streaming from a real provider remain outside this proof.

The actual qualified local combination is Node **24.12.0**, Ink **7.1.1**, React **19.2.4**, LangGraph **1.4.18**, the official SQLite checkpointer **1.0.4**, and `better-sqlite3` **12.10.0**. Exact top-level versions and transitive resolutions are in `package.json` and `package-lock.json`.

The document increment adds PDF.js (`pdfjs-dist` **6.3.289**) and Mammoth **1.13.0**, checked against their current npm manifests. PDF.js uses its Node-compatible legacy build, bundled worker, CMaps, standard fonts, and WASM asset paths. Assets are resolved relative to the installed application, with Windows path separators normalized for PDF.js. PDF.js reads a byte array rather than an arbitrary URL and never renders scripts. Mammoth raw-text extraction reads only the supplied DOCX buffer; HTML is neither rendered nor executed. [Official PDF.js Node example](https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/node/getinfo.mjs), [Mammoth raw-text API and limitations](https://github.com/mwilliamson/mammoth.js).

The official checkpointer declares `better-sqlite3 ^12.10.0`. Keeping 12.10.0 lets the application and checkpointer use the same compatible native driver instead of silently selecting a different major version. [Official checkpointer manifest](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/libs/checkpoint-sqlite/package.json). Ink's stable package supports this Node/React combination; the upstream README also documents its rendering API. [Ink](https://github.com/vadimdemedes/ink).

The runtime is pinned to the installed and tested Node version rather than claiming the newest Node 24 patch was tested. The package builder requires 24.12.0 and builds only for the current host ABI. This is a reversible initial qualification choice; update the pinned runtime and its included license together when qualifying another patch.

The candidate includes the complete installed dependency tree, including development dependencies. This simplifies the initial native-packaging proof but increases size. Production pruning, reproducibility from a clean checkout, installers, signing, and dependency-distribution review remain release work. Node's full license is bundled from its [official versioned source](https://github.com/nodejs/node/blob/v24.12.0/LICENSE).

## Target qualification matrix

Initial targets: Windows x64, Linux x64, and macOS arm64. Other architectures are not implied. The CI matrix uses a Windows x64 runner, a Linux x64 runner, and an explicitly selected arm64 Node on a macOS runner. A missing or incompatible runner blocks that qualification; a configured job is not proof of support.

The workflow uses the currently documented v7 actions and the documented macOS arm64 runner label: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [upload-artifact](https://github.com/actions/upload-artifact), and [GitHub-hosted runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). Artifact permission/executable-mode preservation on Unix remains part of distribution qualification.

The recorded workflow and document increment passed [PR 1's remote CI](https://github.com/francoisnoel62/Boardroom/pull/1/checks) and [PR 2's remote CI](https://github.com/francoisnoel62/Boardroom/pull/2/checks) on all three targets. The durable-history increment has its own [PR 3 matrix](https://github.com/francoisnoel62/Boardroom/pull/3/checks). Empty-PATH process tests show that the candidate invokes its own Node; they do not substitute for a clean-machine installation test. No paid infrastructure or provider account is needed for the present tests.

## Protection and provenance limits

Authorization is checked before reading an external source. Evidence resolution rejects a project mismatch. This is application-level scoping, not OS sandboxing. Command and MCP adapters remain unavailable; no directory copy is treated as a security barrier.

Snapshots and exports preserve original bytes but remain ordinary local files owned by the user. Saved source paths may reveal local directory names. The current exports describe only the bundled fictional source and do not include credentials.

The demo is a handwritten scripted fixture with fictional model labels. It proves the reading/export workflow, not provider integration or the quality of an actual AI debate. Textual PDF/DOCX extraction is verified against the documented fictional fixtures, including empty/malformed inputs. DOCX raw text does not preserve original layout or Word pagination. Empty PDF pages are reported as possibly blank/scanned, with OCR unavailable. Partial and failed extraction stay visible, and citations cannot substitute raw PDF bytes for an extracted-text line reference. Local embeddings, provider streaming, and filtered trace export remain unavailable.
