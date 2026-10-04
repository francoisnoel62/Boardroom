# Plan 03 implementation evidence

The [ten-PR plan](../boardroom-plans/03-PLAN-IMPLEMENTATION-EN-10-PR.md) remains authoritative. Plan 02 is not accepted: its real-provider campaign and recorded reservations remain open. These are development increments, not a milestone acceptance, merge authorization or paid qualification.

## Increment 1 — durable contributions

Public seams: Boardroom service, spawned CLI processes and real OS PTY, as approved in the contribution guide. Internal SQLite, graph and files remain real; only HTTP is controlled.

Observed red → green with `node --test --import ./tests/support/test-clock.ts tests/participation.test.ts`: missing `contribute` during an in-flight analysis; stopped contributions incorrectly stayed queued; a correction failed to reuse the first immutable input. Each failure preceded its implementation. The resulting tests cover single acceptance, another client's inspection, delivery to the next targeted request, preservation of independent initial inputs, historical analyses, stopped status, bounded/foreign commands and credential-redacted exports. Additional checks confirm a budget refusal or an unsent reservation leaves the inbox queued.

Observed red → green with `tests/participation-cli.test.ts`: unknown CLI command; after correcting a test's PTY keystroke synchronization, `say` was refused by the busy gate during actual streams. Green scenarios cover two independent CLI processes submitting one UUID and a real PTY accepting the contribution before cancellation. No provider credentials or billable calls were used.

Validation: pending final checks. Windows x64 / Node 24.12.0 is the local environment; other platforms require CI. The installed full participation campaign remains increment 10.
