# Final views, human decisions and live exports

[Implementation guide](getting-started.md) · [Sourced revisions](sourced-revisions.md)

After debate finishes, inspect `meeting-proposals` and explicitly request `meeting-views --project <project-id> --id <meeting-id> --version <displayed-version> --allow-provider`. The host vault is the default; `--session` uses the per-route credential environment map. A running debate must finish or receive `execution-conclude` first. The three initial conclusion calls are reserved atomically. All view bodies must repeat the frozen version/hash, valid selected references and an integer confidence in 0–100. Invalid output receives at most one separately reserved correction. Failed calls never produce an opinion.

`meeting-final-views` shows `current`, `missing` or `stale` per adviser, independently of `APPROVED`, `REJECTED` and `INSUFFICIENT_EVIDENCE`. The last is an actual opinion, not a missing response. Confidence is declared assurance, never a probability or a majority weight. Requesting conclusion preserves the approved frame and completed proposal; stopping preserves already completed views on an unchanged proposal. Neither action launches new paid calls automatically.

Save a human choice as a JSON input file, for example:

```json
{"proposalVersion":2,"action":"deferred","rationale":"Investigate willingness to pay before committing."}
```

Run `meeting-decide --project <project-id> --id <meeting-id> --input <json-file>`. Actions are `accepted`, `rejected`, `modified`, `deferred` and `investigation-requested`. The explicit latest displayed proposal version is required, and the immutable record captures available view IDs and missing advisers at that moment. No majority decides for you. An investigation request records intent; it runs no tool.

For `modified`, also provide `modifiedProposal` with the same structured title/item/reference format shown by inspection. A material change creates a new human-authored version, preserves the advised version, and makes prior views stale. The choice can be recorded without new model calls; it must not imply advisers approved the changed plan. Obtaining views on the new version requires another explicit paid command. Guided interventions/recovery remain later plans.

`meeting-decision --project <project-id> --id <meeting-id> --json` reads phases, versions, all decisions, view currency and bounded call receipts. `history --project <project-id>` and `trace --project <project-id> --output <directory>` remain available; technical traces use the field allowlist and contain no bodies or credentials.

Export with `meeting-export --project <project-id> --id <meeting-id> --output <directory> [--with-json]`. Each invocation creates an exclusive new directory containing `plan.md`, `memo.md`, and optionally `meeting.json`. `--json` controls CLI output; `--with-json` controls the optional artifact. Files include phases/status, version history and hashes, actual changes/dispositions, selected evidence, typed assertions/unknowns, objections, individual views, human choices and known versus held unknown usage. Original files are never replaced. Before any proposal, the plan states explicitly that no final plan exists.

The domain export intent is saved before writing. Each completed file gets a durable hash receipt; final success/failure is separate. There is no DB/filesystem atomicity promise. Failed or interrupted exports remain inspectable; handles cannot replay. An explicit later export creates another directory, rather than overwriting or retrying an ambiguous attempt.

Exports redact connection secrets known to this process, available frozen-route credentials and common API-token patterns. Use `--session` to supply those known credentials when the host vault is unavailable; otherwise the artifact reports a partial scan. **Review the artifacts before sharing:** detection is not universal, and selected source text may contain unrelated secrets. Export snapshots omit original paths and credential configuration/references. Hashes identify the original saved version; redacted exported text may differ.

The automated CLI journey uses actual processes, SQLite and graphs, with only external HTTP replaced. It covers a question without a plan → approval → independent analyses → sourced revision → three differing verdicts → human deferral → both files. Service tests also cover missing/invalid views, human modifications, all five actions, decisions against three rejections, unchanged-view currency after stop, partial exports before a proposal, redaction, exclusive output and failed writes. Real provider/account qualification is still required for Plan 02 acceptance.
