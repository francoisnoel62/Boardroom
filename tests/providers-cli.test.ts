import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { providerSetup } from './support/providers.ts';

test('paid CLI preflight requires explicit consent and uses only a test-owned external HTTP boundary', t => {
  const { app, project, meeting, root } = providerSetup(t, async () => { throw new Error('Not used by CLI.'); });
  const log = join(root, 'http.jsonl');
  const args = ['src/cli.ts', '--data-dir', root, 'provider-preflight', '--project', project.id,
    '--id', meeting.id, '--adviser', 'po', '--session'];
  const env = { ...process.env, BOARDROOM_SESSION_KEY: 'CLI_KEY_SENTINEL', TEST_HTTP_LOG: log };
  const run = (consent: boolean) => spawnSync(process.execPath, ['--import', './tests/support/provider-http.mjs', ...args,
    ...(consent ? ['--allow-provider'] : [])], { encoding: 'utf8', env });
  const refused = run(false); assert.equal(refused.status, 1); assert.match(refused.stderr, /explicit --allow-provider/);
  assert.equal(existsSync(log), false); assert.equal(app.callLedger(project.id, meeting.id).calls.length, 0);
  const accepted = run(true); assert.equal(accepted.status, 0, accepted.stderr);
  const result = JSON.parse(accepted.stdout); assert.equal(result.verified, true);
  assert.equal(result.receipts.length, 5, 'the proposal author is checked against framing, analysis, proposal, revision and final view');
  assert.equal(app.getRoute('po').verification, 'verified');
  const sent = readFileSync(log, 'utf8'); assert.equal(sent.includes('CLI_KEY_SENTINEL'), false);
  assert.equal(sent.includes('Two engineers.'), false); assert.equal(sent.trim().split('\n').length, 5);
  assert.equal(accepted.stdout.includes('CLI_KEY_SENTINEL'), false);
});
