import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Boardroom } from '../src/application.ts';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

test('isolation validation measures outside-copy and network access while leaving product tools unavailable', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom isolation report '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = JSON.parse(execFileSync(process.execPath, [cli, 'isolation-check', '--output', root, '--json', '--data-dir', join(root, 'unused')], { encoding: 'utf8' }));
  const report = JSON.parse(readFileSync(result.path, 'utf8'));
  assert.equal(report.mode, 'technical-isolation-validation');
  assert.equal(report.baseline.outsideCopyWrite, 'allowed');
  assert.equal(report.baseline.loopbackNetwork, 'allowed');
  assert.equal(report.baseline.copyIsBoundary, false);
  assert.equal(report.product.commands, 'unavailable');
  assert.equal(report.product.localMcp, 'unavailable');
  assert.equal(report.product.remoteMcp, 'unavailable');
  assert.ok(['blocked', 'candidate-tested', 'failed'].includes(report.sandboxCandidate.status));
  assert.match(report.remoteMcpLimit, /remote.*server/i);
});

test('doctor explains missing runtime assets and authorized accounts instead of claiming optional probes passed', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom optional probes '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const doctor = JSON.parse(execFileSync(process.execPath, [cli, 'doctor', '--json', '--data-dir', root], { encoding: 'utf8' }));
  assert.equal(doctor.optionalProbes.embeddings.status, 'blocked');
  assert.match(doctor.optionalProbes.embeddings.reason, /runtime.*asset/i);
  assert.match(doctor.optionalProbes.providerStreaming.reason, /account.*budget/i);
  assert.equal(doctor.optionalProbes.cloudTrace.status, 'blocked');
  assert.equal(doctor.cloudTelemetry, 'off');
});

test('trace CLI produces a filtered local artifact', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom trace CLI '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = (...args: string[]) => execFileSync(process.execPath, [cli, ...args, '--data-dir', join(root, 'data')], { encoding: 'utf8' });
  run('demo', '--next');
  const result = JSON.parse(run('trace', '--output', join(root, 'traces'), '--json'));
  assert.equal(result.mode, 'local-filtered-trace');
  assert.equal(JSON.parse(readFileSync(result.path, 'utf8')).events[0].position, 1);
});

test('local trace export keeps event correlation while excluding paths and discussion bodies', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom private trace '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = new Boardroom(join(root, 'private data'));
  try {
    app.nextRecordedMessage();
    const exported = app.exportRecordedExample(join(root, 'private outputs'));
    const first = app.exportFilteredTrace(app.openDemo().id, join(root, 'traces'));
    const bytes = readFileSync(first, 'utf8');
    const trace = JSON.parse(bytes);
    assert.equal(trace.schemaVersion, 1);
    assert.equal(trace.mode, 'local-filtered-trace');
    assert.equal(trace.events.length, 4);
    assert.equal(trace.events[0].type, 'recorded.message');
    assert.equal(trace.events[3].operationId, exported.operationId);
    assert.ok(trace.events.every((event: object) => Object.keys(event).every(key =>
      ['sequence', 'type', 'occurredAt', 'operationId', 'position'].includes(key))));
    assert.ok(!bytes.includes(root) && !bytes.includes('five integrations') && !bytes.includes('context.md'));
    assert.notEqual(app.exportFilteredTrace(app.openDemo().id, join(root, 'traces')), first);
    assert.equal(readFileSync(first, 'utf8'), bytes);
  } finally { app.close(); }
});
