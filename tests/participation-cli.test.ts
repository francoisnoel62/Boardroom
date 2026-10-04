import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { liveSetup } from './support/live.ts';
import { openTerminal } from './support/terminal.ts';

test('two CLI processes submit one durable contribution and inspection does not send HTTP', async t => {
  const { app, project, meeting, root, sent } = await liveSetup(t);
  const command = join(root, 'contribution.json');
  writeFileSync(command, JSON.stringify({ commandId: randomUUID(), author: 'CEO', expectedContextVersion: 1,
    recipientId: 'dev', text: 'Maintenance\u001b[31m française' }));
  const run = (name: string, ...args: string[]) => new Promise<{ code: number | null; out: string; err: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['dist/cli.js', name, '--data-dir', root, '--project', project.id, '--id', meeting.id, '--json', ...args]);
    let out = '', err = ''; child.stdout.on('data', x => { out += x; }); child.stderr.on('data', x => { err += x; });
    child.on('error', reject); child.on('exit', code => resolve({ code, out, err }));
  });
  const results = await Promise.all([run('meeting-say', '--input', command), run('meeting-say', '--input', command)]);
  for (const result of results) assert.equal(result.code, 0, result.err);
  assert.deepEqual(JSON.parse(results[0]!.out), JSON.parse(results[1]!.out));
  const inspected = await run('meeting-participation');
  assert.equal(inspected.code, 0, inspected.err);
  assert.equal(JSON.parse(inspected.out).contributions.length, 1);
  assert.equal(app.history(project.id).events.filter(e => e.type === 'contribution.received').length, 1);
  assert.equal(sent.length, 1);
});

test('real PTY accepts say while analyses stream and keeps the queued receipt after reopening', { timeout: 30000 }, async t => {
  let terminal: ReturnType<typeof openTerminal> | undefined, finished = false;
  t.after(async () => { if (terminal && !finished) { terminal.write('\x03'); await terminal.finish(); } });
  const { app, project, meeting, root } = await liveSetup(t);
  const output = { assertions: [{ id: 'a', kind: 'unknown', text: 'STREAM_ACTIVE', references: [] }], risks: [], assumptions: [], recommendations: ['Pilot'] };
  terminal = openTerminal(t, ['--import', './tests/support/provider-http.mjs', 'dist/cli.js', 'live', '--data-dir', root, '--project', project.id,
    '--id', meeting.id, '--output', join(root, 'out'), '--allow-provider', '--session'], { env: {
      BOARDROOM_SESSION_KEYS: JSON.stringify({ po: 'KEY', dev: 'KEY', marketing: 'KEY' }), TEST_OUTPUT: JSON.stringify(output),
      TEST_STREAM_DELAY_MS: '20000', TEST_DELAY_PHASE: 'analysis' } });
  await terminal.waitFor(/approved.*v1/);
  terminal.write('analyse'); await terminal.waitFor(/Draft: analyse/); terminal.write('\r'); await terminal.waitFor(/STREAM_ACTIVE/);
  terminal.write('say dev Check maintenance'); await terminal.waitFor(/Draft: say dev Check maintenance/); terminal.write('\r');
  await terminal.waitFor(/Contribution saved.*queued/);
  assert.equal(app.inspectParticipation(project.id, meeting.id).contributions[0]?.text, 'Check maintenance');
  terminal.write('\x03'); assert.equal((await terminal.finish()).exitCode, 130); finished = true;
  assert.equal(app.inspectParticipation(project.id, meeting.id).contributions[0]?.status, 'unconsumed');
});
