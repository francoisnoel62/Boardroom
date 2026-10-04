# Human participation

Plan 03 increment 1 adds durable contributions. Real-account qualification of Plan 02 still gates integration and milestone acceptance; this increment is exercised with external deterministic HTTP fixtures.

In the live terminal, enter `say dev Check operational maintenance` (use an adviser ID from the frozen team), or `say all Compare the maintenance assumptions` for the next common confrontation. `participation` shows saved contributions and delivery inputs. These commands work while an HTTP stream is running. Enter submits a contribution once; entering the same text again is a new command. The terminal records the local author as `human`.

For a retryable CLI submission, create `contribution.json`:

```json
{
  "commandId": "9d17e383-fdd8-4b6b-999f-7069b26d2c80",
  "author": "CEO",
  "expectedContextVersion": 1,
  "recipientId": "dev",
  "text": "Check operational maintenance."
}
```

```sh
boardroom meeting-say --project PROJECT_ID --id MEETING_ID --input contribution.json --json
boardroom meeting-participation --project PROJECT_ID --id MEETING_ID --json
```

Use a new UUID for each deliberate contribution; retain it when retrying. A repeated ID and identical parsed payload returns the original receipt. Reusing it with another payload is refused. `recipientId: null` addresses the common discussion. Text is limited to 12,000 characters; author and recipient are bounded too. Unknown project, meeting, recipient and context versions are refused.

`queued` means saved, awaiting an eligible recipient call. `delivered` means the contribution was bound to the immutable input at local dispatch; it does not certify successful provider processing. The associated call receipt distinguishes success, failure and uncertain delivery. Refused admission and reservations never sent leave the contribution queued. A correction attempt keeps its original input. A stopped meeting, completed final-view attempt or ended common confrontation exposes `unconsumed` with a reason. Repeating a command always returns its original receipt; inspection shows its current delivery state.

A targeted contribution goes into that adviser's next newly admitted work. It cannot alter an input already dispatched or an analysis already saved. An untargeted contribution enters the next confrontation call, never the independent analyses. No inspection or contribution command starts a provider call. Existing explicit paid phase commands still control dispatch.

Contributions are attributed human statements, not sourced evidence, context revisions or tool permissions. Context changes, pause/resume, extensions and automatic rescheduling remain later increments. All saved contributions appear in `meeting-decision`, `memo.md` and optional `meeting.json`; JSON also retains dispatched inputs. Bodies stay out of technical events and graph checkpoints. Exports redact known credentials, but must still be reviewed before sharing.
