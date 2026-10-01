import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('the official SQLite checkpointer preserves a minimal LangGraph state after reopen', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom checkpoint '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { StorageProbe } = await import('../src/technical-validation.ts');
  let probe = new StorageProbe(root);
  assert.equal(await probe.runCheckpoint(), 2);
  assert.equal(probe.checkFts5(), true);
  probe.close();
  probe = new StorageProbe(root);
  try { assert.equal(await probe.readCheckpoint(), 2); }
  finally { probe.close(); }
});
