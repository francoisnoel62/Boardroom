# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub: [report a vulnerability](https://github.com/francoisnoel62/Boardroom/security/advisories/new) (repository **Security** tab → **Report a vulnerability**). Do not put details in a public issue, pull request or discussion.

If private reporting is unavailable, open an issue that only asks for a private contact, without any detail about the problem.

A useful report says which component is affected (application, installer, release workflow or website), the version or commit, the platform, the steps to reproduce and the impact you observed. Reports are acknowledged on the advisory. BOARDROOM is a small project: there is no committed response time yet, and fixes are published with a public advisory once users can update.

## Supported versions

No release has been published yet. Fixes land on the `main` branch. Once releases exist, the newest release receives security fixes.

## Scope

- The application and its packaged runtime.
- The installers in [`scripts/`](scripts/) and the release workflow.
- The website and documentation in [`site/`](site/).

## Current security model and its limits

BOARDROOM runs locally, with no account and no BOARDROOM server. The current build plays a recorded example and makes no model calls. Authorization is checked before an external source is read; this is application-level scoping, not operating-system sandboxing. PDF and DOCX files are read as text: scripts are never executed and HTML is never rendered. Installers verify the SHA-256 of a package before installing it.

Known limits are documented rather than hidden:

- **No isolation candidate demonstrates protection yet.** Command and MCP tools stay unavailable until Plan 06 qualifies one ([acceptance record](docs/plan-01-acceptance.md), [technical qualification](docs/technical-qualification.md)).
- Packages are not code-signed or notarized, and they still include development dependencies.
- Snapshots and exports are ordinary local files; saved source paths may reveal local directory names ([architecture](docs/architecture.md#protection-and-provenance-limits)).
