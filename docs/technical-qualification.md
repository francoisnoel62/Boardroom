# Plan 01 — technical qualification and isolation limits

This report preserves the Plan 01 probe results. The current build also implements the complete live workflow: see [Plan 02 qualification](plan-02-acceptance.md). `doctor` now reports providers as `implemented-unverified`; the real-account campaign remains pending. The historical blocks below do not mean adapters are absent today.

The tests execute the packaged application on Windows x64, Linux x64 and macOS arm64. `doctor --json`, `trace --output <directory>` and `isolation-check --output <directory>` produce separate technical evidence. None enables model advisers, command tools or MCP adapters.

## Required and optional probes

| Probe | Observation or explicit block | Fallback / next gate |
| --- | --- | --- |
| SQLite/checkpointer and FTS5 | A real graph checkpoint reopens; a real lexical query returns the expected row | Qualified through the copied runtime |
| PDF.js/Mammoth | Actual packaged workers/assets extract physical PDF pages and DOCX blocks, with malformed/partial warnings | No OCR or advanced layout claim |
| Terminal | Actual OS PTYs accept Unicode, multiline paste and resizing during the fictional stream; cancellation restores modes | Real provider streaming remains Plan 02 |
| Local embedding candidate | Not attempted: no Transformers.js runtime or model assets are packaged, and model download is not configured. `doctor` reports this as blocked | Embeddings unavailable; lexical FTS5 remains usable. A packaged runtime trial and retrieval relevance belong to Plan 05 |
| Provider streaming | No configured provider account or authorized development budget in this build | Explicitly blocked on all three targets; real validation is mandatory in Plan 02 |
| Filtered trace export | Tests export event correlation with an explicit field allowlist; paths, bodies and receipt content are absent | Local JSON only; no cloud SDK, upload or credentials |
| Cloud trace candidate | No configured authorized cloud account | Cloud telemetry off; activation and account qualification belong to Plan 08 |

Blocks are not passed integration tests. These optional blocks are permitted by the Plan 01 passage rule. Installing a runtime or receiving an account later requires new actual qualification; it never silently enables a capability.

## Actual isolation experiment

The fixed child process runs from a temporary directory named `copy`. It attempts a direct write to a read-only fictional original, a writable fictional file outside that directory, a writable file inside it, and a TCP connection to a parent-owned loopback listener. All targets are newly created for the experiment. No user-selected file, command, external host, or MCP server is used. Temporary files are removed afterward, except that on Windows Node 24.12 `rmSync` silently keeps paths containing non-ASCII characters. The output report is a new exclusively created JSON file.

The unrestricted baseline can write outside the copy and connect to loopback. Read-only attributes may stop a direct write, depending on the OS/user, but the same owner can normally change permissions. **A directory copy and file attributes are not an isolation boundary.** This experiment measures a candidate's limited restrictions; it is not a comprehensive escape/security audit.

| Platform | Candidate / prerequisite | Product status |
| --- | --- | --- |
| Windows x64 | AppContainer requires a qualified native launcher, capability policy and scoped ACLs. None is bundled; the candidate is explicitly blocked | Commands and local MCP unavailable |
| Linux x64 | Try `bwrap` with read-only host mounts, only the temporary working directory writable, and separate namespaces including networking. Missing executable or denied user namespaces is a recorded block | Commands and local MCP unavailable, even if this limited candidate test passes |
| macOS arm64 | Try `/usr/bin/sandbox-exec` with writes allowed only in the temporary working directory and networking denied. Availability/startup failure is a recorded block | Experimental candidate only; commands and local MCP unavailable |

A candidate is `candidate-tested` only if it permits the control write inside the work directory while denying both original/outside writes and the loopback connection. A startup failure is `blocked`; a boundary failure is `failed`. The report records the actual host result. No retry or disabled assertion turns a failure into qualification. Read access, symlinks, child-process trees, inherited descriptors, escape attacks and resource limits still require Plan 06 work.

Two limits weaken these observations. The "protected" original is read-only, so it is blocked even without a sandbox. A loopback connection with no answer within one second is also recorded as `blocked`, which cannot be distinguished from an enforced denial. The macOS candidate blocked the permitted control write and failed. One suspected cause, to verify in Plan 06, is that the policy names the temporary path under `/var` while macOS resolves it under `/private/var`. **No candidate demonstrates protection at this milestone.**

Local MCP additionally needs scoped protocol permissions and a qualified sandbox around its process. Remote MCP runs under the remote server's control: a local sandbox cannot enforce protection on its filesystem or actions. Remote-side enforcement, authentication and explicit scoped consent must be verified separately. No MCP endpoint is contacted at this milestone.

Primary references: [bubblewrap's policy and namespace responsibilities](https://github.com/containers/bubblewrap), [Microsoft AppContainer isolation](https://learn.microsoft.com/en-us/windows/win32/secauthz/appcontainer-isolation), and [Apple App Sandbox design](https://developer.apple.com/library/archive/documentation/Security/Conceptual/AppSandboxDesignGuide/AboutAppSandbox/AboutAppSandbox.html). The macOS command above is a measured experiment, not a claim that it substitutes for a supported distribution strategy.
