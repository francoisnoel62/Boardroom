# Small dependent pull requests

Each PR delivers one usable increment of a milestone, describes its public behavior and validation, and keeps the milestone's unfulfilled gates visible. A PR is not automatically a completed milestone.

Start behavior changes with a failing test at the approved public seams: application service, CLI/terminal, or packaged application. Use real internal components, files, databases, and processes. Keep accounts and billable provider calls out of the deterministic suite.

For dependent work, branch from the preceding PR and target that branch as the next PR's base. This keeps the follow-up diff limited to its own changes. After the base PR merges, retarget the follow-up to `main` and update its branch if the merge strategy changed commit ancestry. Rerun the checks on that final base. Do not merge the follow-up before its prerequisite.

Independent increments can target `main` directly. Keep stacks shallow, update the relevant documentation and evidence log, and wait for required checks before merging. Public source publication does not select the project's license or approve a product release.

The [README](../README.md) presents the enduring product vision, audience, decision story and a concise account of available capabilities. Update it at each milestone together with the [implementation guide](getting-started.md), relevant public site pages, qualification results and limits. Keep detailed commands in their guides, fictional examples clearly identified and design principles distinct from available capabilities. A path to an existing evidence file does not by itself prove that an editorial claim is still current.

The product direction clarified on 2026-10-03 is a team whose size, roles, and AI models are chosen by the human CEO. The three advisers in the recorded example and original V1 plans are one scenario, not a limit on the product vision. Future implementation plans must reconcile their fixed-role assumptions with this direction.
