# Configure routes and protect credentials

Routes and teams can now be configured locally. A route identifies one provider/model pair and declares its capabilities and limitations. **These declarations do not verify a provider account, model availability or pricing. No provider request is implemented yet.** Cost enforcement and actual adapters follow in Plan 02 PRs 3 and 4.

The qualified Plan 02 profile has a Product Owner, Lead Developer and Marketing Manager, three distinct provider/model identities and at least two providers. Adviser IDs are independent of role labels. The PO authors the shared proposal. Other team sizes belong to later implementation of the configurable product vision.

## Configure a disposable example

From the development checkout, build first with `npm run build`. These fictitious provider/model identifiers exercise local configuration only. Replace them with your chosen routes when adapters become available; declaring an identifier does not make that model accessible.

```powershell
$data = '.boardroom/configured-question'
New-Item -ItemType Directory -Force $data | Out-Null
$capabilities = @{ streaming = $true; structuredOutput = 'json'; tools = $false; cancellation = 'best-effort'; usage = 'tokens' }
foreach ($entry in @(
  @{ id = 'po-route'; providerId = 'provider-a'; modelId = 'model-a' },
  @{ id = 'dev-route'; providerId = 'provider-b'; modelId = 'model-b' },
  @{ id = 'marketing-route'; providerId = 'provider-a'; modelId = 'model-c' }
)) {
  $entry.capabilities = $capabilities
  $entry.limitations = @('Declared only; provider account and pricing are not verified.')
  $entry | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 "$data/route.json"
  node dist/cli.js route-configure --input "$data/route.json" --data-dir $data
}
node dist/cli.js team-configure --input assets/validation/team-02.json --data-dir $data
node dist/cli.js configuration --data-dir $data --json
$project = node dist/cli.js project-create --name 'Configured pilot' --language en --data-dir $data --json | ConvertFrom-Json
$evidence = node dist/cli.js source --project $project.id --source assets/demo/context.md --allow-source --data-dir $data --json | ConvertFrom-Json
$question = Get-Content -Raw assets/validation/live-question.json | ConvertFrom-Json
$question.PSObject.Properties.Remove('advisers')
$question.PSObject.Properties.Remove('proposalAuthorId')
$question.passages[0].evidenceId = $evidence.id
$question.costCeiling.amount = 0
$question | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 "$data/question.json"
$meeting = node dist/cli.js meeting-prepare --project $project.id --team decision-02 --input "$data/question.json" --data-dir $data --json | ConvertFrom-Json
node dist/cli.js meeting --project $project.id --id $meeting.id --data-dir $data
```

`configuration --json` is shareable metadata: credentials and even opaque credential references are omitted. Do not put keys in names, limitations, question bodies or source files. Strict configuration schemas reject credential properties, arbitrary URLs and unknown fields. Model identifiers use letters, numbers, `.`, `_` and `-`. Provider/model identity is the pair of IDs, not an inferred alias comparison.

Changing a route increments its revision; changing a team increments its revision. Preparation takes a single database snapshot of the selected team and its routes. The saved meeting retains these identities, capability declarations, limitations and opaque credential references after configuration changes. A provider ID cannot be changed under an existing route: create a new route and credential. Existing PR 1 meetings remain readable; preparations without `--team` retain the earlier metadata-only mode and do not become executable profiles.

Preparation revalidates three distinct identities, provider diversity, declared streaming, JSON or JSON Schema output, best-effort cancellation and token usage. Declared tool support is descriptive; tools, commands and MCP remain disabled. Cancellation and usage declarations are not proof of billing behavior; actual checks arrive with the adapters.

## Store a key

```powershell
node dist/cli.js credential-set --route po-route --data-dir $data
node dist/cli.js credential-check --route po-route --data-dir $data --json
node dist/cli.js credential-delete --route po-route --data-dir $data
```

The first command asks for a masked token in a real terminal. Backspace edits it; Escape or Ctrl+C cancels and restores input mode. It never accepts a `--key` or password argument. A secret-manager pipeline can instead supply one token on stdin with explicit `--secret-stdin`; piping without that option is refused. No plaintext config/file fallback is implemented. Tokens must be nonempty, contain no whitespace/control characters, and fit within 2,560 UTF-8 bytes.

`credential-check` shows `available`, `missing` or `unavailable` and its source, without showing the key. It checks storage presence only, not connectivity/authentication. Missing/unavailable checks return exit code 2. Vault failures return bounded product diagnostics without native error bodies. A lock, unavailable session or host permission can prevent access even when the platform has the required native binding.

For an explicitly injected session, provision `BOARDROOM_SESSION_KEY` from your secret manager outside shell history, then use `credential-check --route po-route --session`. The CLI consumes and removes that environment variable before graph/native-client work; it stores the value only in process memory. Clear the variable in the parent environment afterwards. This command does not persist the key for the next process. Service consumers can inject `SessionSecretStore`, then clear it explicitly. No real key is needed to try the configuration example.

## Host vault and qualification

The exact dependency is [`@napi-rs/keyring` 2.1.0](https://github.com/Brooooooklyn/keyring-node), with host-specific Node-API binaries in the lockfile. Boardroom uses Windows Credential Manager, macOS Keychain and Linux Secret Service. Linux is explicitly pinned to `secret-service`; the binding's default fallback to the kernel keyring is disabled. UUID credential references address only Boardroom's own entries; the application never enumerates other credentials.

Windows x64 was exercised locally with a dummy token: set, reopen/read from a new store, delete, missing. The CI producer matrix requires working vaults on Windows x64/macOS arm64 and runs Linux x64 inside an unlocked disposable D-Bus/gnome-keyring session. Installed Windows/macOS jobs require the same round trip through the packaged launcher. The offline Linux no-Node image intentionally has no desktop vault: its proof must report `unavailable`, exercise explicit session injection and never claim host-vault success. See the PR checks and its `protected-configuration.json` installation artifacts for actual platform results.

The installed macOS harness preserves the real login home for Keychain access and uses an explicit temporary `--data-dir`. Replacing the login home with an empty test directory made its host vault unavailable, even while the normal service vault test passed. Linux/Windows retain isolated application-data environment paths.

Inherited `LANGSMITH_TRACING`, `LANGCHAIN_TRACING`, `LANGCHAIN_TRACING_V2` are set to `false`, and `OTEL_SDK_DISABLED` to `true`, before graph/client imports at CLI, application and storage-probe entry points. Explicit user-facing diagnostics are allowed; parser, native and third-party error bodies are replaced. Local traces retain their field allowlist. None of this promises detection of arbitrary secrets embedded in user source documents, or removal of memory from a debugger/crash dump; export-content review is part of the later live export increment.
