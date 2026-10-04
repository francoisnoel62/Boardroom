# Start a live decision

[Getting started](getting-started.md) · [Terminal commands](interactive-live-terminal.md) · [Acceptance evidence and remaining gate](plan-02-acceptance.md)

The implemented workflow accepts a question without an initial plan, waits for your framing approval, obtains independent analyses, confronts specific objections, revises the PO proposal, collects individual views and saves your choice plus Markdown exports. The deterministic packaged campaign exercises these commands. **No real-account campaign has been performed yet.** This guide is an executable setup/run procedure, not a claim that any particular account has access to the selected models.

You need a development candidate for Windows x64, Linux x64 or macOS arm64, API accounts with access to all three supported model IDs below, and an explicit USD spending ceiling. See [dated adapter/pricing notes](provider-preflight.md) before choosing that ceiling. Calls reserve the full published input bound, capped output and protected revision/conclusion funds; the required headroom can greatly exceed the eventual usage charge. An expired/incompatible catalog is refused. Never increase the ceiling just to bypass a refusal without reviewing the limits.

The following PowerShell preparation runs from an extracted Windows candidate. It makes no provider call. Use a disposable data directory for the fictional source, or substitute a file you are authorized to send and its exact selected line ranges.

```powershell
$data = Join-Path $env:LOCALAPPDATA 'Boardroom\pilot-example'
New-Item -ItemType Directory -Force $data | Out-Null
foreach ($route in @(
  @{ id = 'po-route'; providerId = 'openai'; modelId = 'gpt-4.1-mini-2025-04-14' },
  @{ id = 'dev-route'; providerId = 'anthropic'; modelId = 'claude-haiku-4-5-20251001' },
  @{ id = 'marketing-route'; providerId = 'openai'; modelId = 'gpt-4.1-2025-04-14' }
)) {
  $route | ConvertTo-Json | Set-Content -Encoding utf8 "$data/route.json"
  .\boardroom.cmd route-configure --catalog --input "$data/route.json" --data-dir $data
}
.\boardroom.cmd team-configure --input assets/validation/team-02.json --data-dir $data
$project = .\boardroom.cmd project-create --name 'Pilot decision' --language en --data-dir $data --json | ConvertFrom-Json
$source = .\boardroom.cmd source --project $project.id --source assets/demo/context.md --allow-source --data-dir $data --json | ConvertFrom-Json
@{
  question = 'What scope fits our staffing for a four-week pilot?'
  constraints = @('Four weeks')
  durationTargetSeconds = 600
  costCeiling = @{ amount = 0; currency = 'USD' }
  passages = @(@{ evidenceId = $source.id; firstLine = 4; lastLine = 4 })
} | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 "$data/question.json"
```

The zero ceiling deliberately allows preparation only: the terminal refuses to start with it. Choose an approved ceiling in `question.json` before execution; for this team the smallest funded ceiling is 6.37 USD and the smallest duration target 390 s ([why](controlling-calls.md)). Do not add credentials to that file. Store each route's credential through masked input:

```powershell
.\boardroom.cmd credential-set --route po-route --data-dir $data
.\boardroom.cmd credential-set --route dev-route --data-dir $data
.\boardroom.cmd credential-set --route marketing-route --data-dir $data
```

[Vault prerequisites and explicit session injection](configuring-routes.md) explain unavailable host stores. Multi-adviser `--session` consumes `BOARDROOM_SESSION_KEYS`, a JSON object keyed by route ID, provisioned from your secret manager outside shell history. It is removed from the child environment and cleared from process memory on exit; clear the parent environment yourself. Never supply keys as CLI arguments.

After reviewing providers, selected passages, ceiling and reserve sizes, this command explicitly permits paid calls when you advance phases:

```powershell
.\boardroom.cmd live --project $project.id --team decision-02 --input "$data/question.json" --data-dir $data --output "$data/exports" --allow-provider
```

On Linux/macOS replace `.\boardroom.cmd` with `./boardroom` and construct the same three route JSON objects, team and question using your shell/editor. All packaged commands use the included runtime. From a checkout use `node dist/cli.js` after `npm ci`/`npm run build`.

In the terminal: review/edit `question TEXT`, choose `select 1`, then `start`. Read the saved framing and enter `approve N` for its actual displayed version (or `correct N FILE`). Continue with `analyse`, `debate`, `views N` for the displayed proposal version, then `decide N deferred REASON` or another explicit choice. `export` saves plan.md, memo.md and meeting.json in a fresh directory. Inspect `evidence`, `history` and `inspect` at any point. Escape/Ctrl+C stops and attempts partial exports; `conclude` protects early final views, while `stop` prevents more calls.

For separate CLI phases, follow [framing](framing-a-question.md), [analyses](independent-analyses.md), [debate](sourced-revisions.md) and [views/decision/export](live-decisions.md). A paid preflight is a separate explicit command on a prepared meeting with execution reserves; it consumes that meeting's envelope and does not certify remote cancellation. Keep preflight/cancellation campaign budgets separate from the main meeting.

The packaged deterministic example proves this chain: the selected staffing line supports a fact assertion; the developer objects to five integrations; the PO preserves v1 and creates v2 with one integration and a linked accepted disposition; three distinct verdicts bind v2; the human defers because demand is unknown. The dialogue is generated by an external test fixture. [Retained campaign artifacts](plan-02-acceptance.md) contain actual terminal text/VT recording, analysis payloads and both exports. A distributable real-provider example must still replace this evidence for milestone acceptance.

## Recording the real inputs

To prove from the meeting itself that the three initial analyses carried no other adviser's conclusion, record what is sent. The recorder is a campaign tool outside the candidate; it keeps request bodies and never reads headers or credentials, and passes every request through untouched:

```powershell
$env:BOARDROOM_QUALIFICATION_RECORD = "$data/requests.jsonl"
$env:NODE_OPTIONS = "--import=" + [uri]::new((Resolve-Path qualification/record-http.mjs).Path).AbsoluteUri
node dist/cli.js live ...   # the command above, from a checkout
```

The recorded bodies contain your selected passages and the questions: review the file like any export, and do not publish it unreviewed.

Review exports before sharing. Known credentials and API-token patterns are redacted, but unrelated source secrets may remain. Local SQLite, snapshots and checkpoints are readable by the machine owner. Arbitrary commands, web/MCP, cloud telemetry, free phase interventions and automatic incident recovery remain outside this workflow.
