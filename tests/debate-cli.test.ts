import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { liveSetup } from './support/live.ts';

test('CLI confronts and revises once, then reopens both proposal versions without replay', async t => {
  const { app, store, project, meeting, root } = await liveSetup(t);
  await app.analyseMeeting(project.id, meeting.id, store);
  const references = meeting.context.passages, log = join(root, 'http.jsonl');
  const proposal = { title: 'Pilot', items: [{ id: 'integrations', text: 'Five integrations', references }] };
  const outputs = { proposal, confrontation: {
    'claude-haiku-4-5-20251001': { objections: [{ id: 'capacity', target: { kind: 'proposal-item', itemId: 'integrations', adviserId: null, assertionId: null }, justification: 'Two engineers', impact: 'Capacity risk', amendment: 'One integration', references }] },
    'gpt-4.1-2025-04-14': { objections: [] },
  }, revision: { proposal: { ...proposal, items: [{ ...proposal.items[0], text: 'One integration' }] },
    dispositions: [{ adviserId: 'dev', objectionId: 'capacity', action: 'accepted', reason: 'Staffing constraint', changedItemIds: ['integrations'] }] } };
  const run = (command: string, ...args: string[]) => spawnSync(process.execPath, ['--import', './tests/support/provider-http.mjs', 'dist/cli.js', command,
    '--data-dir', root, '--project', project.id, '--id', meeting.id, '--json', ...args], { encoding: 'utf8', env: { ...process.env,
      BOARDROOM_SESSION_KEYS: JSON.stringify({ po: 'KEY', dev: 'KEY', marketing: 'KEY' }), TEST_OUTPUTS: JSON.stringify(outputs), TEST_HTTP_LOG: log } });
  assert.equal(run('meeting-debate', '--session').status, 1);
  const result = run('meeting-debate', '--allow-provider', '--session'); assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).proposals.length, 2);
  const inspect = run('meeting-proposals'); assert.equal(inspect.status, 0, inspect.stderr);
  assert.equal(JSON.parse(inspect.stdout).current.version, 2);
  assert.equal(run('meeting-debate', '--allow-provider', '--session').status, 1);
  assert.equal(readFileSync(log, 'utf8').trim().split('\n').length, 6);
});
