# Frame a question and approve its version

This is the first live phase: the Product Owner proposes a framing from your frozen selected context, then waits for explicit human approval. Three analyses, debate, final adviser views and live decision exports remain future increments. A configured team has three model identities; framing calls only its PO route.

Prerequisites: Node 24.12.0 (or the bundled runtime), a supported current [provider catalog](provider-preflight.md), a configured frozen team, a prepared meeting with a USD ceiling, [protected execution reserves](controlling-calls.md), and your explicitly supplied account credentials. A declared route is unverified until its paid preflight succeeds. The implementation's deterministic tests certify neither your account nor remote billing/cancellation.

From the checkout, run `npm run build`. This PowerShell 7 preparation uses one selected line from the bundled **fictional** source and makes no provider call:

```powershell
$data = '.boardroom/framing-example'
$project = node dist/cli.js project-create --name 'My pilot' --language en --data-dir $data --json | ConvertFrom-Json
$evidence = node dist/cli.js source --project $project.id --source assets/demo/context.md --allow-source --data-dir $data --json | ConvertFrom-Json
$routes = @(
  @{ id = 'po'; providerId = 'openai'; modelId = 'gpt-4.1-mini-2025-04-14' },
  @{ id = 'dev'; providerId = 'anthropic'; modelId = 'claude-haiku-4-5-20251001' },
  @{ id = 'marketing'; providerId = 'openai'; modelId = 'gpt-4.1-2025-04-14' }
)
foreach ($route in $routes) {
  $route | ConvertTo-Json | Set-Content -Encoding utf8 "$data/route.json"
  node dist/cli.js route-configure --catalog --input "$data/route.json" --data-dir $data
}
@{ id = 'decision'; proposalAuthorId = 'po'; advisers = @(
  @{ id = 'po'; role = 'Product Owner'; routeId = 'po' },
  @{ id = 'dev'; role = 'Lead Developer'; routeId = 'dev' },
  @{ id = 'marketing'; role = 'Marketing Manager'; routeId = 'marketing' }
) } | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 "$data/team.json"
node dist/cli.js team-configure --input "$data/team.json" --data-dir $data
@{ question = 'Which integration should the pilot deliver?'; constraints = @('Four weeks');
  durationTargetSeconds = 600; costCeiling = @{ amount = 10; currency = 'USD' };
  passages = @(@{ evidenceId = $evidence.id; firstLine = 4; lastLine = 4 })
} | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 "$data/question.json"
$meeting = node dist/cli.js meeting-prepare --project $project.id --team decision --input "$data/question.json" --data-dir $data --json | ConvertFrom-Json
@{ revisionMicros = 1000000; conclusionMicros = 1000000; revisionMs = 10000; conclusionMs = 10000 } |
  ConvertTo-Json | Set-Content -Encoding utf8 "$data/reserves.json"
node dist/cli.js execution-configure --project $project.id --id $meeting.id --input "$data/reserves.json" --data-dir $data
```

The declared USD 10 is a ceiling, not a forecast. Full-context reservations are deliberately much larger than typical actual usage. The PO framing caps each attempt at 4,096 output tokens and 60 seconds. A malformed JSON/reference output permits at most one separately reserved correction; all attempts and unknown usage remain in receipts. Refresh the catalog after its documented expiry.

To make a **paid** framing request, store your PO credential through the masked host-vault prompt (or use explicit `--session` injection as documented in the preflight guide), then deliberately run:

```powershell
node dist/cli.js credential-set --route po --data-dir $data
node dist/cli.js provider-preflight --project $project.id --id $meeting.id --adviser po --allow-provider --data-dir $data
node dist/cli.js meeting-start --project $project.id --id $meeting.id --allow-provider --data-dir $data
node dist/cli.js meeting-framing --project $project.id --id $meeting.id --data-dir $data --json
node dist/cli.js calls --project $project.id --id $meeting.id --data-dir $data --json
```

`meeting-framing` shows immutable versions, their authors, source references, hashes, call IDs, agreement status and technical checkpoint status. Preparation metadata remains immutable and separate. No analysis starts on a timer or on reopening. The prompt contains only the question, constraints, language, optional initial plan and selected saved text; unselected source lines, credentials, configuration histories and other adviser conclusions are excluded.

Read the displayed framing before approving its exact version:

```powershell
node dist/cli.js meeting-approve --project $project.id --id $meeting.id --version 1 --data-dir $data
```

To correct it, save a complete body JSON with `decisionQuestion`, `summary`, nullable `initialProposal`, `assumptions` and `references`. Preserve valid selected-context references. Then run:

```powershell
node dist/cli.js meeting-correct --project $project.id --id $meeting.id --version 1 --input correction.json --data-dir $data
node dist/cli.js meeting-approve --project $project.id --id $meeting.id --version 2 --data-dir $data
```

A human correction is local and free: it creates a new version, keeps the previous body and removes the current approval. It does not implicitly ask the model for a rewrite. Any automatic model correction of invalid framing remains a paid controller call. Stale approvals/analysis intentions are refused; in-flight work on a superseded approved version is cancelled locally with billing kept conservative.

```powershell
node dist/cli.js meeting-stop --project $project.id --id $meeting.id --data-dir $data
```

Stop preserves completed framing. An interrupted/ambiguous call leaves an explicit uncertain state and committed receipt, without fabricated framing or automatic retry. Invalid output ends visibly after its one affordable correction. Start returns exit code 2 for an unsuccessful framing; inspection and stop remain available. A completed domain framing can be read/approved despite a missing technical checkpoint without calling a model to reconstruct it. Domain versions/consent are authoritative; checkpoints contain phase/version identities only. Human waiting consumes neither active duration nor another call.

The preparation commands and deterministic compiled CLI journey are tested locally; no real paid request was run during implementation. The installed package additionally loads the framing inspection path; full packaged/live meeting qualification remains in later increments.
