import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { providerSetup } from './support/providers.ts';

test('CLI requires explicit paid access then saves three independently inspectable analyses', async t => {
  const { app, store, project, meeting, root } = providerSetup(t, async () => { throw new Error('CLI only'); });
  const frame = { decisionQuestion: 'Pilot?', summary: 'Small pilot', initialProposal: null, assumptions: [], references: meeting.context.passages };
  const log = join(root, 'http.jsonl');
  const run = (command: string, output: unknown, ...args: string[]) => spawnSync(process.execPath, ['--import', './tests/support/provider-http.mjs',
    'dist/cli.js', command, '--data-dir', root, '--project', project.id, '--id', meeting.id, '--json', ...args],
    { encoding: 'utf8', env: { ...process.env, BOARDROOM_SESSION_KEY: 'PRIVATE_KEY', BOARDROOM_SESSION_KEYS: JSON.stringify({ po: 'PRIVATE_KEY', dev: 'PRIVATE_ANTHROPIC', marketing: 'PRIVATE_MARKETING' }), TEST_OUTPUT: JSON.stringify(output), TEST_HTTP_LOG: log } });
  assert.equal(run('meeting-start', frame, '--allow-provider', '--session').status, 0);
  assert.equal(run('meeting-approve', frame, '--version', '1').status, 0);
  const body = { assertions: [{ id: 'capacity', kind: 'fact', text: 'Two engineers', references: meeting.context.passages }], risks: [], assumptions: [], recommendations: ['Pilot'] };
  const refused = run('meeting-analyse', body, '--session'); assert.equal(refused.status, 1);
  assert.equal(readFileSync(log, 'utf8').trim().split('\n').length, 1);
  const analysed = run('meeting-analyse', body, '--allow-provider', '--session'); assert.equal(analysed.status, 0, analysed.stderr);
  assert.equal(JSON.parse(analysed.stdout).status, 'complete');
  const saved = run('meeting-analyses', body); assert.equal(saved.status, 0, saved.stderr);
  assert.equal(JSON.parse(saved.stdout).analyses.length, 3);
  assert.equal(run('meeting-analyse', body, '--allow-provider', '--session').status, 1);
  const sent = readFileSync(log, 'utf8'); assert.equal(sent.trim().split('\n').length, 4);
  assert.equal(sent.includes('PRIVATE_KEY'), false); assert.equal(sent.includes('PRIVATE_UNSELECTED'), false);
});
