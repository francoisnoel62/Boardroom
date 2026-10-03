import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('a demo project and its capabilities survive reopening the application service', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom François '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { Boardroom } = await import('../src/application.ts');
  let app = new Boardroom(root);
  const project = app.openDemo();
  assert.equal(project.name, 'Launch Ledger — fictional SaaS');
  assert.equal(project.recorded, true);
  assert.equal(app.capabilities().cloudTelemetry, 'off');
  app.close();
  app = new Boardroom(root);
  try {
    assert.deepEqual(app.openDemo(), project);
  } finally {
    app.close();
  }
});

test('source access requires consent, stays project-scoped and rejects malformed text', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom boundaries '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'notes.md');
  writeFileSync(source, 'Authorized content\n');
  const { Boardroom } = await import('../src/application.ts');
  const app = new Boardroom(join(root, 'data'));
  try {
    const project = app.openDemo();
    assert.throws(() => app.captureSource(project.id, source, { authorized: false }), /authorization/);
    assert.throws(() => app.captureSource('other-project', source, { authorized: true }), /Project unavailable/);
    const evidence = app.captureSource(project.id, source, { authorized: true });
    assert.throws(() => app.resolveCitation('other-project', evidence.id, 1, 1), /outside this project/);
    assert.throws(() => app.resolveCitation(project.id, evidence.id, 0, 1), /range/);
    writeFileSync(source, Buffer.from([0xff, 0xfe, 0x00]));
    assert.throws(() => app.captureSource(project.id, source, { authorized: true }), /UTF-8 text/);
  } finally { app.close(); }
});

test('an authorized citation resolves the saved revision even after the original changes', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom evidence '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'contexte é.md');
  writeFileSync(source, '# Launch\nOnly two engineers are available.\n', 'utf8');
  const { Boardroom } = await import('../src/application.ts');
  let app = new Boardroom(join(root, 'data'));
  const project = app.openDemo();
  const evidence = app.captureSource(project.id, source, { authorized: true });
  writeFileSync(source, '# Launch\nA different staffing plan.\n', 'utf8');
  app.close();
  app = new Boardroom(join(root, 'data'));
  try {
    const citation = app.resolveCitation(project.id, evidence.id, 2, 2);
    assert.equal(citation.text, 'Only two engineers are available.');
    assert.equal(citation.originalChanged, true);
    assert.equal(citation.revision, 1);
    assert.equal(citation.location, `${source}:2-2`);
    const updated = app.captureSource(project.id, source, { authorized: true });
    assert.equal(updated.revision, 2);
    assert.equal(app.resolveCitation(project.id, evidence.id, 2, 2).text, 'Only two engineers are available.');
  } finally { app.close(); }
});

test('a saved text citation stays readable and flagged after its authorized original is deleted', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom deleted original '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'contexte é.md');
  writeFileSync(source, '# Launch\nOnly two engineers are available.\n', 'utf8');
  const { Boardroom } = await import('../src/application.ts');
  let app = new Boardroom(join(root, 'data'));
  const project = app.openDemo();
  const evidence = app.captureSource(project.id, source, { authorized: true });
  app.close();
  // unlinkSync: Node 24.12 rmSync silently keeps non-ASCII Windows paths.
  unlinkSync(source);
  app = new Boardroom(join(root, 'data'));
  try {
    const citation = app.resolveCitation(project.id, evidence.id, 2, 2);
    assert.equal(citation.text, 'Only two engineers are available.');
    assert.equal(citation.originalChanged, true);
  } finally { app.close(); }
});

test('text evidence refuses snapshot bytes that no longer match their saved digest', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom snapshot integrity '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const data = join(root, 'data');
  const saved = join(root, 'saved.md');
  const occupied = join(root, 'occupied.md');
  writeFileSync(saved, '# Launch\nOnly two engineers are available.\n', 'utf8');
  writeFileSync(occupied, '# Pricing\nThe pilot is free.\n', 'utf8');
  const { Boardroom } = await import('../src/application.ts');
  const app = new Boardroom(data);
  try {
    const project = app.openDemo();
    const evidence = app.captureSource(project.id, saved, { authorized: true });
    writeFileSync(join(data, 'snapshots', evidence.sha256), '# Launch\nFive engineers are available.\n', 'utf8');
    assert.throws(() => app.resolveCitation(project.id, evidence.id, 2, 2), /Snapshot integrity check failed/);
    const digest = createHash('sha256').update(readFileSync(occupied)).digest('hex');
    writeFileSync(join(data, 'snapshots', digest), 'Different bytes under the same digest.');
    assert.throws(() => app.captureSource(project.id, occupied, { authorized: true }), /Snapshot integrity check failed/);
  } finally { app.close(); }
});

test('a missing text snapshot is refused with an explicit integrity error', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom missing snapshot '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const data = join(root, 'data');
  const source = join(root, 'context.md');
  writeFileSync(source, '# Launch\nOnly two engineers are available.\n', 'utf8');
  const { Boardroom } = await import('../src/application.ts');
  const app = new Boardroom(data);
  try {
    const project = app.openDemo();
    const evidence = app.captureSource(project.id, source, { authorized: true });
    unlinkSync(join(data, 'snapshots', evidence.sha256));
    assert.throws(() => app.resolveCitation(project.id, evidence.id, 2, 2),
      /Snapshot integrity check failed: the saved snapshot is missing\./);
  } finally { app.close(); }
});
