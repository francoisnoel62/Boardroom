import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, readFileSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Boardroom } from '../src/application.ts';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

test('decision inspection exposes saved versions and uncertainty across CLI processes', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom decision CLI '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = (...args: string[]) => execFileSync(process.execPath, [cli, ...args, '--data-dir', root], { encoding: 'utf8' });
  const decision = JSON.parse(run('decision', '--json'));
  assert.deepEqual(decision.proposals.map((proposal: { version: number }) => proposal.version), [1, 2]);
  assert.equal(decision.views[2].stance, 'INSUFFICIENT_EVIDENCE');
  run('demo', '--next');
  assert.deepEqual(JSON.parse(run('decision', '--json')), decision);
  assert.match(run('decision'), /Context v1.*proposal v2/);
  assert.match(run('decision'), /Marketing Manager: INSUFFICIENT_EVIDENCE/);
  assert.match(run('decision'), /Human decision: pending/);
});

test('history inspects durable playback and export outcomes without executing pending intent', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom history CLI '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const data = join(root, 'data');
  const run = (...args: string[]) => execFileSync(process.execPath, [cli, ...args, '--data-dir', data], { encoding: 'utf8' });
  run('demo', '--next');
  const exported = JSON.parse(run('export', '--output', join(root, 'exports'), '--json'));
  const app = new Boardroom(data);
  try { app.prepareRecordedExport(join(root, 'pending')); }
  finally { app.close(); }
  const history = JSON.parse(run('history', '--json'));
  assert.deepEqual(history.events.map((event: { type: string }) => event.type), [
    'recorded.message', 'export.prepared', 'export.started', 'export.completed', 'export.prepared',
  ]);
  assert.equal(history.operations[0].id, exported.operationId);
  assert.equal(history.operations[0].status, 'completed');
  assert.equal(history.operations[1].status, 'unconfirmed');
  const display = run('history');
  assert.match(display, /recorded.message/);
  assert.match(display, /unconfirmed/);
  assert.match(display, /Inspect.*before.*new export/);
  assert.match(display, new RegExp(exported.operationId));
  assert.deepEqual(JSON.parse(run('history', '--json')), history);
});

test('launching BOARDROOM describes the recorded local mode and blocked capabilities', () => {
  const output = execFileSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.match(output, /BOARDROOM/);
  assert.match(output, /Recorded example/);
  assert.match(output, /Live meetings: unavailable/);
  assert.match(output, /Commands and MCP: unavailable/);
  assert.match(output, /Cloud telemetry: off/);
});

test('malformed PDF extraction returns a machine-readable failure and a nonzero exit code', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom failed extraction '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'malformed.pdf');
  writeFileSync(source, 'not a PDF');
  const result = spawnSync(process.execPath, [cli, 'document', '--source', source, '--allow-source', '--json', '--data-dir', join(root, 'data')], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  const response = JSON.parse(result.stdout);
  assert.equal(response.extraction.status, 'failed');
  assert.match(response.extraction.warnings.join(' '), /malformed/);
});

test('CLI requires explicit source consent and reopens saved PDF/DOCX citations in a new process', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom document CLI é '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = (...args: string[]) => execFileSync(process.execPath, [cli, ...args, '--data-dir', join(root, 'data')], { encoding: 'utf8' });
  const pdf = join(root, 'launch.pdf');
  const docx = join(root, 'launch.docx');
  copyFileSync(new URL('../assets/validation/launch.pdf', import.meta.url), pdf);
  copyFileSync(new URL('../assets/validation/launch.docx', import.meta.url), docx);
  assert.throws(() => run('document', '--source', pdf), /explicit source consent/);
  const savedPdf = JSON.parse(run('document', '--source', pdf, '--allow-source', '--json'));
  const savedDocx = JSON.parse(run('document', '--source', docx, '--allow-source', '--json'));
  assert.equal(savedPdf.extraction.status, 'complete');
  writeFileSync(pdf, 'Changed original');
  const citation = JSON.parse(run('evidence', '--id', savedPdf.evidence.id, '--page', '2', '--json'));
  assert.equal(citation.text, 'Launch scope: one integration.');
  assert.equal(citation.originalChanged, true);
  assert.match(run('evidence', '--id', savedDocx.evidence.id, '--block', '2'), /Budget: €500/);
});

test('technical validation is explicit and reports durable storage without claiming a live meeting', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom doctor '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const output = execFileSync(process.execPath, [cli, 'doctor', '--data-dir', root, '--json'], { encoding: 'utf8' });
  const result = JSON.parse(output);
  assert.equal(result.mode, 'technical-validation');
  assert.equal(result.fts5, 'verified');
  assert.equal(result.checkpointReopen, 'verified');
  assert.equal(result.liveProviders, 'unavailable');
});

test('Ink terminal renderer displays the recorded message and exits without requiring raw stdin', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom Ink '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const output = execFileSync(process.execPath, [cli, 'demo', '--next', '--terminal', '--data-dir', root], {
    encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', CI: '1' },
  });
  assert.match(output, /Recorded example/);
  assert.match(output, /Product Owner/);
});

test('CLI opens the example, inspects its source, exports and resumes across processes', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom CLI François '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = (...args: string[]) => execFileSync(process.execPath, [cli, ...args, '--data-dir', join(root, 'data')], { encoding: 'utf8' });
  const first = run('demo', '--next');
  assert.match(first, /Recorded example/);
  assert.match(first, /Product Owner/);
  assert.doesNotMatch(first, /Lead Developer/);
  const resumed = run('demo', '--next');
  assert.match(resumed, /Lead Developer/);
  assert.match(run('evidence', '--line', '4'), /Team: two engineers/);
  const exported = JSON.parse(run('export', '--output', join(root, 'exports'), '--json'));
  assert.match(readFileSync(exported.memo, 'utf8'), /Human decision: pending/);
  assert.match(run('demo'), /INSUFFICIENT_EVIDENCE/);
  assert.match(run('demo'), /Recording complete/);
});
