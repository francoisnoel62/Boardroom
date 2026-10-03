# Plan 01 — technical acceptance

Date: 2026-10-03. **Complete for the local recorded-example milestone**, delivered in the dependent PR stack #1–#7. PRs remain open for human review; completion does not merge them or publish a product release.

## Acceptance evidence

The first complete campaign passed on commit `94c0409`, in [push workflow 37102969019](https://github.com/francoisnoel62/Boardroom/actions/runs/37102969019) and [PR workflow 37102973196](https://github.com/francoisnoel62/Boardroom/actions/runs/37102973196). Both ran three producer jobs and three independent installation jobs. The final README and qualification-readiness changes must also have green [PR 7 checks](https://github.com/francoisnoel62/Boardroom/pull/7/checks).

| Plan 01 criterion | Observed evidence |
| --- | --- |
| TDD-first, integration/E2E and CI | The [red → green log](plan-01-progress.md) records each behavior's observed missing/broken result. Forty deterministic tests pass; the candidate test also executes the shipped installed journey. No test is skipped |
| English README with verified initial journey | Both native launchers execute the account-free commands; the README links the actual VT recording, accessible text and architecture |
| Three targets without application Node preinstalled | Distinct Windows/macOS VMs remove system/Homebrew and cache Node; a fresh offline Ubuntu image has no Node package. No source checkout or application build occurs in the consumer jobs |
| Saved exact citation revision | Real source changes and new application processes leave the snapshot/page citation unchanged, with a visible changed-original warning |
| Separate exports and intact originals | Two new export directories have distinct operation IDs; plans/memos are UTF-8 and the original source hash stays identical |
| Recorded label and no account/cloud calls by default | The CLI, exported files and screen visibly identify the scripted fictional recording; no provider or cloud exporter is enabled |
| Input during a representative stream | Real PTYs cover typing, multiline paste, Unicode/graphemes, narrower/wider resizing, Escape/Ctrl+C and restored terminal modes; the installed candidate repeats the journey |
| Packaged PDF/DOCX | Actual workers/assets extract physical PDF pages and DOCX blocks; malformed/partial extraction produces visible warnings and failure code 2 |
| Checkpoint, FTS5 and optional probe results | A real checkpoint reopens and FTS5 executes. Missing embedding runtime/assets, provider account/budget and cloud-trace account are explicitly blocked on each target. A local filtered trace export is tested |
| Isolation report with prerequisites and limits | Real temporary original/outside/work writes and loopback access are recorded. Candidate failures/blocks remain visible, and commands/local MCP/remote MCP remain unavailable |

## Independent environment results

| Target | Application Node | Installed journey | Isolation candidate |
| --- | --- | --- | --- |
| Windows x64 | System and hosted-tool-cache directories removed; `node.exe` unavailable | Passed through `boardroom.cmd`, native SQLite, copied runtime and real ConPTY | AppContainer blocked: no qualified launcher/capability/ACL policy |
| Linux x64 / Ubuntu 24.04 | Fresh image without Node; candidate read-only, non-root, network disabled | Passed through `boardroom`, native SQLite, copied runtime and real PTY | bubblewrap blocked: candidate executable absent in the clean image |
| macOS arm64 | Homebrew Node formulas and tool-cache versions removed; `node` unavailable | Passed through `boardroom`, native SQLite, copied runtime and real PTY | sandbox-exec failed its control write: the sample policy blocked the intended writable work file too |

The macOS candidate denied outside writes and loopback, but blocking the permitted control write makes it unusable; it is **not qualified**. The Linux/Windows candidates are **blocked**, not passed. These outcomes satisfy the milestone's investigation/report requirement, with product tools disabled and activation still gated in Plan 06.

GitHub internal action runtimes remain in its orchestration control plane on Windows/macOS; BOARDROOM does not use them. Restart evidence concerns new application processes, not whole-machine reboot or power-loss durability. [Full installation procedure and limits](installation-qualification.md). Compact observed results are retained in [the target evidence record](validation/plan01-targets.json); the complete artifacts were downloaded locally before workflow retention expires.

## Deferred work belongs to later milestones

- Plan 02: real streaming, three distinct models from at least two providers, live context/proposal/view contracts and actual human decision.
- Plans 03–04: full interaction/editing, migrations and incident reconciliation beyond the additive saved-recording compatibility already tested.
- Plan 05: optional model assets, retrieval relevance and broader document/layout qualification.
- Plan 06: usable command isolation, scoped local/remote MCP permissions and enforcement.
- Plans 07–08: novice onboarding and complete README composition, optional cloud observability and account setup.
- Plan 09: production dependency pruning, full licensing/distribution decisions, installers/signing, public beta and integrated release qualification.

These items do not block the Plan 01 local consultation/export workflow under its explicit passage rule. No optional block is represented as a successful live integration.
