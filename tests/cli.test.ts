import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

test('launching BOARDROOM describes the recorded local mode and blocked capabilities', () => {
  const output = execFileSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.match(output, /BOARDROOM/);
  assert.match(output, /Recorded example/);
  assert.match(output, /Live meetings: unavailable/);
  assert.match(output, /Commands and MCP: unavailable/);
  assert.match(output, /Cloud telemetry: off/);
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
