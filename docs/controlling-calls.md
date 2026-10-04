# Call control and receipts

The call controller is local infrastructure. In increment 3, no provider is connected. Routes used for an execution must have a current, dated, bounded text-only USD pricing record. Declared prices do not verify a provider or an account; production adapters will additionally require an official supported bound.

After preparing a meeting with a frozen team and a USD ceiling, freeze its protected reserves. Without a file they are **computed from the frozen team's routes and the call bounds**:

```powershell
boardroom execution-configure --project <project-id> --id <meeting-id>
boardroom calls --project <project-id> --id <meeting-id> --json
boardroom execution-stop --project <project-id> --id <meeting-id>
```

| Reserve | Covers | Example team (gpt-4.1-mini proposes; Claude Haiku 4.5 and gpt-4.1 review) |
| --- | --- | --- |
| Conclusion | one final view per adviser | 2,744,084 micro-USD and 90 s |
| Revision | a proposal and one revision by the proposal author | 851,168 micro-USD and 120 s |

One micro is one millionth of a USD. A correction is funded from the same pool once the failed attempt's cost is known. If that cost is unknown (timeout, cancellation, missing usage), the failed attempt's reservation stays committed, the correction is refused and the view or revision stays missing: nothing is fabricated and nothing is replayed.

The ceiling and duration must also admit the largest concurrent batch of ordinary work, the independent analyses. For the example team the smallest funded ceiling is **6.37 USD** and the smallest duration target **390 s**. `execution-configure` and the terminal's `start` refuse anything lower, with these figures, before any request or meeting is created. The floor is high because every call reserves its whole context window; it is not a forecast of the charge, which is released as reliable usage arrives.

For an advanced case, `--input reserves.json` freezes explicit figures, for example `{"revisionMicros":200000,"conclusionMicros":200000,"revisionMs":30000,"conclusionMs":30000}`. Explicit reserves below the computed minimum are accepted for a connection test, but framing, analyses, confrontations, revisions and final views all refuse to start until they match it; `provider-preflight` is exempt. Routes outside the catalog cannot reach a provider, so their reserves remain the caller's. Freeze reserves once; they must fit both the declared ceiling and duration target. Ordinary work cannot spend revision/conclusion pools. A conclusion request (`execution-conclude`) stops ordinary work and preserves the ability to call the conclusion phase; it does not yet generate a conclusion.

Dated rates are usable from their `asOf` day through their `validUntil` day inclusive, judged against the UTC day the service is given: the wall clock by default, an injected date in tests. Past the last day, every reservation and provider call is refused until the catalog is refreshed after a new review of the providers' documentation; the monotonic clock only measures durations. A rate refresh changes the catalog price that frozen routes are compared with, so routes, team and meeting are created again.

Every call first persists an intention and its conservative maximum cost in an immediate SQLite transaction. Known costs, all unknown reservations, protected reserves and the next maximum must fit the ceiling. Reliable usage releases the unused portion. Missing usage, timeout, cancellation and ambiguous failures keep the full reservation. Remote cancellation does not guarantee zero billing. A receipt cannot be executed twice, and reopening never replays unfinished intentions.

The CLI ledger reports known costs, committed unknown costs, remaining reserves, active milliseconds and committed maximum milliseconds. Active time uses a monotonic clock and merges overlapping calls within one process; intervals from different process clocks are conservatively added. Human waiting is excluded. Admission uses each call's separate deadline plus protected revision/conclusion time against the meeting target. A controller timeout is a local limit, not a promise about remote execution.

Receipts retain route/model/revision, phase, context/subject version, dated pricing, token/deadline bounds, usage when known, latency and a bounded stop reason. They contain neither credentials, request text nor raw provider errors/responses. The technical trace only includes event identities. Model output remains separate from accounting receipts.
