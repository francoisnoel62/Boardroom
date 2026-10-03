# Plan 01 — installed candidate qualification

Target matrix: Windows x64, Linux x64 and macOS arm64. A passing development test with empty PATH is only a precursor. Acceptance requires the separate `installed` jobs on the final candidate, with retained environment and journey evidence.

## Distribution experiment

The producer compiles the application, runs the deterministic integration/E2E suite, builds a candidate with Node 24.12.0 and prepared native dependencies, then archives it as `boardroom.tar.gz`. Tar preserves Unix executable modes; raw artifact ZIP extraction alone would not. A distinct job downloads and extracts that archive into `Boardroom clean François`. It has no source checkout, npm install, build step or setup-node step.

- Windows: a new GitHub-hosted VM removes the existing system application Node directory and cached Node versions. Checked absolute paths and hosted-runner guards prevent use of the removal script on a development machine. `node.exe` must no longer resolve and both installation directories must be absent.
- macOS: a new GitHub-hosted VM uninstalls Homebrew Node formulas and removes cached Node versions, with checked prefixes and hosted-runner guards. `node` must no longer resolve and the relevant paths must be absent.
- Linux: a fresh Ubuntu 24.04 image includes the required C++ runtime libraries and no Node package. Qualification runs as the runner's non-root UID, with networking disabled and the downloaded candidate mounted read-only.

GitHub's internal action runtimes remain in its orchestration control plane on the Windows/macOS VMs; they are off the application's PATH and are never used to launch BOARDROOM. This is a qualification of fresh application environments without system/cache Node, not a claim that the VM contains no Node binary anywhere. These CI guards are tooling, not an isolation feature of the product. The scripts must never be used to uninstall Node from a user's machine.

## Observed public journey

The candidate's own Node executes the shipped qualification suite. User commands run through the actual `boardroom.cmd`/`boardroom` launcher. The suite checks help, two successive recorded interventions across fresh processes, saved citation inspection, two distinct exports, preserved original hashes, reopened history and pending human decision. Default durable data locations are redirected to a temporary user home and must remain outside the candidate.

It also saves PDF/DOCX evidence, edits the PDF original, reopens its exact saved page, observes malformed-extraction exit code 2, runs the actual checkpoint/FTS5/document probes, inspects explicit optional blocks, exports a filtered local trace and retains an isolation report. A real OS PTY checks multiline Unicode input, resizing, submission and cancellation with code 130. A second real PTY captures the installed recorded example and its unresolved objection.

`local-empty-path` mode is used by the ordinary package regression test and does not assert clean-environment acceptance. `clean` mode additionally requires a removal/image proof, verifies absent paths and refuses a reachable host Node. CI archives retain the environment proof, installation JSON, exact command sequence, doctor results, isolation report, filtered trace, the first exported plan and memo, actual terminal recording and rendered screen text.

One local first launch missed the original ten-second PTY readiness window; a diagnostic launch and both fresh-VM matrices completed the same journey. The installed probe therefore records actual first-frame readiness and allows a bounded thirty-second cold startup, separately from the unchanged ten-second interaction checks. This is not a startup-performance claim or permission to retry failed assertions. No test is skipped or automatically rerun.

Restart here means stopping and starting application processes. Whole-machine reboot, power-loss recovery, comprehensive migrations, signed installers, Gatekeeper/SmartScreen onboarding, novice onboarding and public distribution remain later-milestone qualification.

## Evidence access

Open the final [PR 7 checks](https://github.com/francoisnoel62/Boardroom/pull/7/checks), select a successful workflow run, and download the matching artifacts:

- `boardroom-candidate-<runner>-<architecture>`: the candidate archive.
- `boardroom-installation-evidence-<runner>-<architecture>`: observed journey and environment proof.

Artifacts have GitHub's workflow retention limit; keep important candidates/evidence locally before expiry. The accepted campaign's archives are kept outside the repository and listed with their SHA-256 in [the retained-candidate record](validation/plan01-retained-candidates.json). No GitHub release or signed installer is published at this milestone.

Primary references: [GitHub-hosted VM lifecycle and platform labels](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), [artifact download and executable-mode preservation](https://github.com/actions/download-artifact), and the [macOS](https://github.com/actions/runner-images/blob/main/images/macos/macos-14-arm64-Readme.md) / [Windows](https://github.com/actions/runner-images/blob/main/images/windows/Windows2025-Readme.md) runner inventories. The exact runtime and OS image actually used are retained in job logs.
