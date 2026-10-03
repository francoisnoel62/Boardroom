# Call control and receipts

The call controller is local infrastructure. In increment 3, no provider is connected. Routes used for an execution must have a current, dated, bounded text-only USD pricing record. Declared prices do not verify a provider or an account; production adapters will additionally require an official supported bound.

After preparing a meeting with a frozen team and a USD ceiling, save this example as `reserves.json`:

```json
{"revisionMicros":200000,"conclusionMicros":200000,"revisionMs":30000,"conclusionMs":30000}
```

```powershell
boardroom execution-configure --project <project-id> --id <meeting-id> --input reserves.json
boardroom calls --project <project-id> --id <meeting-id> --json
boardroom execution-stop --project <project-id> --id <meeting-id>
```

One micro is one millionth of a USD. Freeze reserves once; they must fit both the declared ceiling and duration target. Ordinary work cannot spend revision/conclusion pools. A conclusion request (`execution-conclude`) stops ordinary work and preserves the ability to call the conclusion phase; it does not yet generate a conclusion.

Every call first persists an intention and its conservative maximum cost in an immediate SQLite transaction. Known costs, all unknown reservations, protected reserves and the next maximum must fit the ceiling. Reliable usage releases the unused portion. Missing usage, timeout, cancellation and ambiguous failures keep the full reservation. Remote cancellation does not guarantee zero billing. A receipt cannot be executed twice, and reopening never replays unfinished intentions.

The CLI ledger reports known costs, committed unknown costs, remaining reserves, active milliseconds and committed maximum milliseconds. Active time uses a monotonic clock and merges overlapping calls within one process; intervals from different process clocks are conservatively added. Human waiting is excluded. Admission uses each call's separate deadline plus protected revision/conclusion time against the meeting target. A controller timeout is a local limit, not a promise about remote execution.

Receipts retain route/model/revision, phase, context/subject version, dated pricing, token/deadline bounds, usage when known, latency and a bounded stop reason. They contain neither credentials, request text nor raw provider errors/responses. The technical trace only includes event identities. Model output remains separate from accounting receipts.
