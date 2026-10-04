import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('configuration CLI separates shareable routes, session credentials and frozen team identity', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom config CLI '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const sentinel = 'CLI-SENTINEL-private-key-98be';
  const invoke = (...args: string[]) => spawnSync(process.execPath, ['dist/cli.js', ...args, '--data-dir', join(root, 'data')],
    { encoding: 'utf8', env: { ...process.env, BOARDROOM_SESSION_KEY: sentinel,
      LANGSMITH_TRACING: 'true', LANGCHAIN_TRACING_V2: 'true' } });
  const run = (...args: string[]) => {
    const result = invoke(...args);
    assert.ok(!result.stdout.includes(sentinel)); assert.ok(!result.stderr.includes(sentinel));
    assert.equal(result.status, 0, result.stdout + result.stderr); return JSON.parse(result.stdout);
  };
  const file = join(root, 'config.json');
  for (const [id, providerId, modelId] of [['po', 'a', 'a1'], ['dev', 'b', 'b1'], ['marketing', 'a', 'a2']]) {
    writeFileSync(file, JSON.stringify({ id, providerId, modelId, capabilities: { streaming: true,
      structuredOutput: 'json', tools: false, cancellation: 'best-effort', usage: 'tokens' }, limitations: ['Not verified.'] }));
    assert.equal(run('route-configure', '--input', file, '--json').verification, 'unverified');
  }
  writeFileSync(file, JSON.stringify({ id: 'decision', proposalAuthorId: 'po', advisers: [
    { id: 'po', role: 'Product Owner', routeId: 'po' }, { id: 'dev', role: 'Lead Developer', routeId: 'dev' },
    { id: 'marketing', role: 'Marketing Manager', routeId: 'marketing' },
  ] }));
  assert.equal(run('team-configure', '--input', file, '--json').revision, 1);
  const config = run('configuration', '--json'); assert.equal(config.routes.length, 3);
  assert.ok(!JSON.stringify(config).includes('credentialRef'));
  assert.deepEqual(run('credential-check', '--route', 'po', '--session', '--json'), { status: 'available', source: 'session' });
  for (const args of [
    ['credential-set', '--route', 'po', '--key', sentinel], ['configuration', '--' + sentinel],
  ]) {
    const rejected = invoke(...args); assert.equal(rejected.status, 1);
    assert.ok(!rejected.stderr.includes(sentinel)); assert.ok(!rejected.stdout.includes(sentinel));
  }
  writeFileSync(file, `{"id":"${sentinel}`);
  const malformed = invoke('route-configure', '--input', file);
  assert.equal(malformed.status, 1); assert.ok(!malformed.stderr.includes(sentinel));
  const project = run('project-create', '--name', 'Pilot', '--json');
  const source = join(root, 'context.md'); writeFileSync(source, 'Two engineers.');
  const evidence = run('source', '--project', project.id, '--source', source, '--allow-source', '--json');
  writeFileSync(file, JSON.stringify({ question: 'First?', durationTargetSeconds: 600,
    costCeiling: { amount: 0, currency: 'USD' }, passages: [{ evidenceId: evidence.id, firstLine: 1, lastLine: 1 }] }));
  const meeting = run('meeting-prepare', '--project', project.id, '--team', 'decision', '--input', file, '--json');
  assert.equal(meeting.team.id, 'decision'); assert.equal(meeting.advisers[1].providerId, 'b');
  const trace = run('trace', '--project', project.id, '--output', join(root, 'trace'), '--json');
  assert.ok(!readFileSync(trace.path, 'utf8').includes(sentinel));
  const probe = run('doctor', '--json'); assert.equal(probe.cloudTelemetry, 'off');
  const demo = invoke('demo', '--next'); assert.equal(demo.status, 0);
  assert.ok(!demo.stdout.includes(sentinel)); assert.ok(!demo.stderr.includes(sentinel));
});
