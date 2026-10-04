# Explicit paid connection test

Supported adapters: [OpenAI](providers/openai.md) and [Anthropic](providers/anthropic.md). Their dated catalog, input reservations and account limits are documented in those route notes. Every route is unverified by default.

Save a supported route JSON containing only `id`, `providerId`, `modelId`, then configure it:

```powershell
boardroom route-configure --input po-route.json --catalog
```

Configure a three-adviser team with three distinct supported model identities, prepare a question and freeze its execution reserves as in [call control](controlling-calls.md). Store credentials in the host vault or explicitly inject one session key for the selected route. Checking configuration/presence and preparing context do not contact a provider.

```powershell
boardroom provider-preflight --project <project-id> --id <meeting-id> --adviser po --allow-provider
boardroom configuration --json
boardroom calls --project <project-id> --id <meeting-id> --json
```

This command spends from the meeting's declared USD ceiling. `--allow-provider` is required; it allows the fixed test request and at most one paid JSON correction if separately affordable. The test does not send the selected source passages. The request caps output at 256 tokens and each attempt at 30 seconds; full-context admission can require considerably more headroom than actual final usage. The CLI emits receipts and returns exit code 2 when the route is not verified.

`--session` reads `BOARDROOM_SESSION_KEY` for this process and clears it from the environment before application work. Avoid putting keys in arguments or route JSON. A successful explicitly requested, structured and metered preflight marks the matching current route revision verified with its date. Configuration edits, credential replacement/deletion invalidate that status. A successful result with unknown metering remains unverified. Verification records one connection test; it does not certify cancellation or a complete multi-adviser meeting. Frozen meeting metadata remains immutable.

Implementation tests use a test-only HTTP import in disposable processes; it is excluded from the product package. No actual user route has been marked verified by this work, and no real paid smoke test has been run. Plan 02 acceptance stays open pending account access and an explicit spending envelope.
