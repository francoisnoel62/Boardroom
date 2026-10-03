---
title: Why Boardroom ships its own Node runtime
description: A single-binary build was tempting. One native dependency, and the ABI it was compiled against, decided otherwise — and a clean-machine campaign checks the result.
date: 2026-10-03
sources:
  - boardroom-plans/BOARDROOM_V1_SPEC.md
  - docs/architecture.md
  - scripts/package.mjs
  - docs/installation-qualification.md
  - docs/plan-01-acceptance.md
---

A terminal tool should install like a terminal tool: download, run, done. No "first install Node 24", no `npm install -g`, no version manager. The obvious way to get there in 2026 is to compile the TypeScript application into a single executable, and Bun makes that one command away.

Boardroom does not do that yet. It ships a copy of the exact Node runtime it was tested with, next to the application. This note explains why, and how we check that the choice actually holds on machines that have never seen Node.

## The dependency that decides

Boardroom keeps its meetings durable: a meeting interrupted by a crash must resume without replaying what already happened. The orchestration layer, LangGraph, does this with a checkpointer, and the official SQLite checkpointer depends on `better-sqlite3 ^12.10.0`.

That driver is a native module. Version 12 is written against Node's V8 interfaces, not the stable Node-API; version 13 moves to Node-API, but it sits outside the range the checkpointer accepts. Bun implements Node-API, so its compatibility says nothing about a module built on V8 internals. Compiling with Bun would have meant either betting on behaviour no one had demonstrated, or replacing a dependency the durability story rests on.

The specification records the conclusion plainly: bundled Node is the conservative initial distribution choice, and Bun can be reconsidered once a compatible dependency set is demonstrated. It is a reversible decision, written down with its sources, rather than a preference.

## One ABI, pinned

A native module is compiled for one ABI. If the runtime that loads it differs, the failure comes at startup on someone else's machine. So the packaging script refuses to run on anything but the qualified runtime — Node 24.12.0 — and builds only for the host it runs on. It copies that exact `node` executable into the package, with its licence, and records the runtime's SHA-256 and native ABI in a manifest.

The launcher is three lines: it finds its own directory and runs the bundled `node` on the bundled application. It never looks at `PATH`. That is also why the installers write a small relay script instead of a symbolic link: a symlinked launcher would resolve its directory to the wrong place and lose its runtime.

Pinning has a cost we accept for now: the runtime is updated deliberately, together with its licence, when another patch is qualified — not silently whenever a newer one appears.

## Proving it on machines without Node

"Works with an empty `PATH` on my machine" is a precursor, not proof. Plan 01 was accepted only after a separate installation campaign:

- on fresh Windows and macOS virtual machines, the system and cached Node installations are removed, and the job checks that `node` no longer resolves;
- on Linux, a fresh Ubuntu 24.04 image with no Node package runs the candidate read-only, as a non-root user, with networking disabled.

These jobs have no source checkout, no `npm install` and no build step. They download the archived candidate, extract it into a directory whose name contains a space and an accent, and run the public journey through the real launcher: the recorded example, citations, PDF and DOCX evidence, exports, history, and a real pseudoterminal session with resizing and cancellation.

All three targets passed. The acceptance record also says what this does not cover: packages are not signed, they still include development dependencies, and byte-reproducible packaging belongs to the public beta.

## What it costs, and what it buys

A bundled runtime makes the package larger than a compiled binary would be, and every runtime update is a qualification task. In exchange, the program users run is the program the tests ran — same runtime, same native driver, same ABI — and that is checked on machines that have never had Node installed.

When a compatible dependency set exists, a single-binary build is worth reopening. Until then, the boring option is the one with evidence.
