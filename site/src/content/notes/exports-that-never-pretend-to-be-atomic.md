---
title: Exports that never pretend to be atomic
description: SQLite commits atomically; the filesystem does not join that transaction. Boardroom records intent, attempts and receipts so that an interrupted export stays honest instead of looking finished.
date: 2026-10-03
sources:
  - docs/architecture.md
  - docs/getting-started.md
  - docs/plan-01-progress.md
---

When Boardroom exports a meeting, it writes two files — a plan and a memo — and remembers that it did. The remembering happens in SQLite. The writing happens in the filesystem. Those are two systems, and no transaction spans both.

Most applications paper over that gap: write the files, then mark the export done, and hope nothing happens in between. For a decision tool whose value is a trustworthy record, "hope" is the wrong word to find in the design. This note describes what Boardroom does instead.

## Say what you are about to do

Before any file is created, Boardroom saves the export's intent: an operation with a stable ID and the paths it plans to write. Only then does it touch the disk. Starting the attempt is claimed in an immediate SQLite transaction, and the handle that runs it can execute once — not again after a success, not again after a failure, and it is never rebuilt from an old ID after a restart.

## Record what actually happened

Every state change of the operation is saved together with its event in the project's journal:

- a **completed** export stores a receipt with both paths and the SHA-256 of the bytes written;
- a **failed** export stores the error code and the writes that did finish — partial files are left in place, not deleted behind your back;
- anything else stays **unconfirmed**.

## The honest middle state

`unconfirmed` is the important one. If the process is killed after the intent is saved but before the receipt is, the operation stays unconfirmed. That same state describes an export that is still running, so Boardroom never assumes a crash, never changes the state on inspection, and never replays the export automatically. Reopening the project or reading `history` is always read-only.

The guidance for users follows directly: when an export is unconfirmed, look in its directory before asking for a new one. The directory is the truth; the database says honestly that it does not know.

## How it is tested

Each behaviour started as a failing test, recorded in the plan's red → green log. The tests use real processes and real files, not mocks:

- a child process is killed after the intent is saved and before any output is written; a new process finds an inspectable unconfirmed operation and does not replay it;
- a refused output records its failure code and receipt, and the file that was already there stays unchanged;
- four processes open a project for the first time simultaneously, and history is read while another process writes thirty exports — events and receipts always come from one consistent snapshot.

## What it does not claim

The receipts describe the bytes written at that moment; they do not certify that nobody edited the files since. The kill test covers the gap before output creation, not every crash point inside a write, and not disk-full or power-loss behaviour. Recovery reconciliation is planned with the recovery and incidents plan.

None of this makes SQLite and the filesystem atomic. It makes the gap visible, so that the record never claims more than what happened.
