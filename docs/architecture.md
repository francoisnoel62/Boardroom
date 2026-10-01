# Local recorded-example architecture

Status: first Plan 01 increment, 2026-10-01. Public distribution and the complete milestone are not accepted yet.

## Public boundaries

The approved plan defines the seams: application commands, the terminal/CLI, and the distributed package. Tests use those boundaries rather than querying private tables or mocking internal services.

`Boardroom` opens a fictional project, captures explicitly authorized UTF-8 sources, resolves saved citations, advances recorded playback, and creates new exports. The CLI passes commands and displays results. Ink renders the transcript; it does not own domain state. The current terminal is command-oriented; interactive streaming, typing, multiline paste, resize, and cancellation still require their own implementation and qualification.

## Durable data

- `domain.sqlite`: versioned, schema-validated project, evidence, and recorded-meeting records; WAL with a finite busy timeout. Writes are short synchronous statements. The current recording is stored in the meeting record, so updating bundled assets does not rewrite an existing recording.
- `snapshots/<sha256>`: original UTF-8 bytes saved with exclusive creation. Citations validate the snapshot hash and expose revision, original location, and line range. Invalid UTF-8 is rejected instead of silently replacing characters.
- `checkpoints.sqlite`: the separate technical probe uses the official `SqliteSaver`; a minimal graph increments a count and reopens its saved state. It is not the replay engine or a live meeting.
- Export directories: unique `boardroom-recorded-*` directories containing exclusively created `plan.md` and `memo.md`. Exports include saved evidence identity and preserve disagreement and the pending human decision.

There is no network/human wait inside a SQLite transaction. The present synchronous application service serializes its local operations; it does not yet implement the future asynchronous write coordinator or action reconciliation. Durable action receipts, migrations beyond this initial schema, and the live-domain contracts remain outstanding.

## Dependency and runtime decision

The actual qualified local combination is Node **24.12.0**, Ink **7.1.1**, React **19.2.4**, LangGraph **1.4.18**, the official SQLite checkpointer **1.0.4**, and `better-sqlite3` **12.10.0**. Exact top-level versions and transitive resolutions are in `package.json` and `package-lock.json`.

The official checkpointer declares `better-sqlite3 ^12.10.0`. Keeping 12.10.0 lets the application and checkpointer use the same compatible native driver instead of silently selecting a different major version. [Official checkpointer manifest](https://raw.githubusercontent.com/langchain-ai/langgraphjs/main/libs/checkpoint-sqlite/package.json). Ink's stable package supports this Node/React combination; the upstream README also documents its rendering API. [Ink](https://github.com/vadimdemedes/ink).

The runtime is pinned to the installed and tested Node version rather than claiming the newest Node 24 patch was tested. The package builder requires 24.12.0 and builds only for the current host ABI. This is a reversible initial qualification choice; update the pinned runtime and its included license together when qualifying another patch.

The candidate includes the complete installed dependency tree, including development dependencies. This simplifies the initial native-packaging proof but increases size. Production pruning, reproducibility from a clean checkout, installers, signing, and dependency-distribution review remain release work. Node's full license is bundled from its [official versioned source](https://github.com/nodejs/node/blob/v24.12.0/LICENSE).

## Target qualification matrix

Initial targets: Windows x64, Linux x64, and macOS arm64. Other architectures are not implied. The CI matrix uses a Windows x64 runner, a Linux x64 runner, and an explicitly selected arm64 Node on a macOS runner. A missing or incompatible runner blocks that qualification; a configured job is not proof of support.

The workflow uses the currently documented v7 actions and the documented macOS arm64 runner label: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [upload-artifact](https://github.com/actions/upload-artifact), and [GitHub-hosted runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). Artifact permission/executable-mode preservation on Unix remains part of distribution qualification.

Only Windows x64 has local automated evidence at this stage. Empty-PATH process tests show that the candidate invokes its own Node; they do not substitute for a clean-machine installation test. No paid infrastructure or provider account is needed for the present tests.

## Protection and provenance limits

Authorization is checked before reading an external source. Evidence resolution rejects a project mismatch. This is application-level scoping, not OS sandboxing. Command and MCP adapters remain unavailable; no directory copy is treated as a security barrier.

Snapshots and exports preserve original bytes but remain ordinary local files owned by the user. Saved source paths may reveal local directory names. The current exports describe only the bundled fictional source and do not include credentials.

The demo is a handwritten scripted fixture with fictional model labels. It proves the reading/export workflow, not provider integration or the quality of an actual AI debate. PDF.js, Mammoth, local embeddings, provider streaming, and filtered trace export are not installed or verified by this increment.
