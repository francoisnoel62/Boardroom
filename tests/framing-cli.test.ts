import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { providerSetup } from './support/providers.ts';

test('CLI question without a plan frames, corrects, rejects stale approval and approves without more HTTP', t => {
  const { app, project, meeting, root } = providerSetup(t, async () => { throw new Error('CLI only.'); });
  const log = join(root, 'http.jsonl');
  const body = { decisionQuestion: 'Pilot?', summary: 'Start small.', initialProposal: 'One integration.',
    assumptions: ['Demand unproven.'], references: meeting.context.passages };
  const env = { ...process.env, BOARDROOM_SESSION_KEY: 'FRAME_KEY_SENTINEL', TEST_HTTP_LOG: log, TEST_OUTPUT: JSON.stringify(body) };
  const run = (command: string, ...args: string[]) => spawnSync(process.execPath, ['--import', './tests/support/provider-http.mjs',
    'dist/cli.js', command, '--data-dir', root, '--project', project.id, '--id', meeting.id, '--json', ...args], { encoding: 'utf8', env });
  const refused = run('meeting-start', '--session'); assert.equal(refused.status, 1); assert.equal(existsSync(log), false);
  const started = run('meeting-start', '--allow-provider', '--session'); assert.equal(started.status, 0, started.stderr);
  const frame = JSON.parse(started.stdout); assert.equal(frame.status, 'awaiting-human'); assert.equal(frame.latestVersion, 1);
  const correction = join(root, 'correction.json'); writeFileSync(correction, JSON.stringify({ ...body, summary: 'Human: compare alternatives.' }));
  const changed = run('meeting-correct', '--version', '1', '--input', correction); assert.equal(changed.status, 0, changed.stderr);
  assert.equal(JSON.parse(changed.stdout).latestVersion, 2);
  const stale = run('meeting-approve', '--version', '1'); assert.equal(stale.status, 1); assert.match(stale.stderr, /current version/);
  const approved = run('meeting-approve', '--version', '2'); assert.equal(approved.status, 0, approved.stderr);
  assert.equal(JSON.parse(approved.stdout).approvedVersion, 2);
  const inspect = run('meeting-framing'); assert.equal(inspect.status, 0, inspect.stderr);
  const saved = JSON.parse(inspect.stdout); assert.equal(saved.status, 'approved'); assert.equal(saved.versions.length, 2);
  assert.deepEqual(saved.checkpoint.next, []);
  const replay = run('meeting-start', '--allow-provider', '--session'); assert.equal(replay.status, 1);
  const sent = readFileSync(log, 'utf8'); assert.equal(sent.trim().split('\n').length, 1);
  assert.equal(sent.includes('PRIVATE_UNSELECTED'), false); assert.equal(sent.includes('FRAME_KEY_SENTINEL'), false);
  assert.equal(app.history(project.id).events.filter(event => event.type === 'framing.approved').length, 1);
  const trace = JSON.parse(readFileSync(app.exportFilteredTrace(project.id, join(root, 'trace')), 'utf8'));
  assert.equal(trace.events.find((event: any) => event.type === 'framing.approved').version, 2);
  assert.equal(JSON.stringify(trace).includes('FRAME_KEY_SENTINEL'), false);
  assert.equal(JSON.stringify(trace).includes('Human: compare alternatives.'), false);
  const stopped = run('meeting-stop'); assert.equal(stopped.status, 0, stopped.stderr);
  assert.equal(JSON.parse(stopped.stdout).status, 'stopped');
});
