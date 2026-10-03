import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Boardroom } from '../src/application.ts';

test('recorded discussion resumes from the next message and keeps the sourced objection', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom replay é '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let app = new Boardroom(root);
  const meeting = app.openRecordedExample();
  assert.equal(meeting.mode, 'recorded');
  assert.equal(meeting.humanDecision, 'pending');
  assert.equal(app.nextRecordedMessage()?.role, 'Product Owner');
  app.close();
  app = new Boardroom(root);
  try {
    const objection = app.nextRecordedMessage();
    assert.equal(objection?.role, 'Lead Developer');
    assert.equal(objection?.citation?.firstLine, 4);
    const source = app.resolveCitation(meeting.projectId, meeting.evidenceId, 4, 4);
    assert.equal(source.text, 'Team: two engineers; four weeks available for the launch.');
    assert.equal(app.nextRecordedMessage()?.role, 'Marketing Manager');
    assert.equal(app.nextRecordedMessage()?.phase, 'revision');
    assert.equal(app.nextRecordedMessage()?.phase, 'final-views');
    assert.equal(app.nextRecordedMessage(), null);
    assert.equal(app.openRecordedExample().position, 5);
  } finally { app.close(); }
});

test('two exports create distinct UTF-8 plans and memos while preserving existing files', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom exports '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const existing = join(root, 'plan.md');
  writeFileSync(existing, 'An original plan — à préserver.');
  const source = new URL('../assets/demo/context.md', import.meta.url);
  const before = createHash('sha256').update(readFileSync(source)).digest('hex');
  const app = new Boardroom(join(root, 'data'));
  try {
    const first = app.exportRecordedExample(root);
    const second = app.exportRecordedExample(root);
    assert.notEqual(first.directory, second.directory);
    assert.match(readFileSync(first.plan, 'utf8'), /Recorded example/);
    assert.match(readFileSync(first.plan, 'utf8'), /plan v2/);
    assert.match(readFileSync(first.memo, 'utf8'), /INSUFFICIENT_EVIDENCE/);
    assert.match(readFileSync(first.memo, 'utf8'), /Human decision: pending/);
    assert.match(readFileSync(first.memo, 'utf8'), new RegExp(before));
    assert.equal(readFileSync(existing, 'utf8'), 'An original plan — à préserver.');
    assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'), before);
  } finally { app.close(); }
});
