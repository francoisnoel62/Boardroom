import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { liveSetup } from './support/live.ts';
import { openTerminal } from './support/terminal.ts';

const draft = { id: 'maintenance', type: 'clarification', reason: 'Who maintains the pilot?', scope: 'ordinary', requestedDocument: null,
  references: [], consumers: [{ adviserId: 'dev', phase: 'confrontation' }] };

test('CLI lists request details, defers, denies and records one answer across competing processes', async t => {
  const { app, project, meeting, root, store, sent } = await liveSetup(t, (phase, request, normal) =>
    phase === 'analysis' && request.adviserId === 'dev' ? { ...normal, humanRequests: [draft] } : normal);
  await app.analyseMeeting(project.id, meeting.id, store);
  const request = app.inspectParticipation(project.id, meeting.id).requests[0]!;
  const path = join(root, 'response.json');
  const run = (name: string, ...args: string[]) => new Promise<{ code: number | null; out: string; err: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['dist/cli.js', name, '--data-dir', root, '--project', project.id, '--id', meeting.id, '--json', ...args]);
    let out = '', err = ''; child.stdout.on('data', x => { out += x; }); child.stderr.on('data', x => { err += x; });
    child.on('error', reject); child.on('exit', code => resolve({ code, out, err }));
  });
  const detail = await run('meeting-requests', '--request', request.id);
  assert.equal(detail.code, 0, detail.err); assert.equal(JSON.parse(detail.out).reason, draft.reason);
  for (const [index, action] of ['defer', 'deny', 'answer'].entries()) {
    writeFileSync(path, JSON.stringify({ commandId: randomUUID(), requestId: request.id, author: 'CEO', expectedContextVersion: 1,
      expectedRequestVersion: index + 1, text: action === 'answer' ? 'Operations team' : 'No answer yet' }));
    const results = await Promise.all([run(`meeting-${action}`, '--input', path), run(`meeting-${action}`, '--input', path)]);
    for (const result of results) assert.equal(result.code, 0, result.err);
    assert.deepEqual(JSON.parse(results[0]!.out), JSON.parse(results[1]!.out));
  }
  const listed = await run('meeting-requests'); assert.equal(listed.code, 0, listed.err);
  assert.equal(JSON.parse(listed.out)[0].responses.length, 3);
  assert.equal(JSON.parse(listed.out)[0].status, 'answered');
  assert.equal(sent.length, 4);
});

test('real PTY accepts a versioned answer while another adviser is streaming', { timeout: 30000 }, async t => {
  let terminal: ReturnType<typeof openTerminal> | undefined, finished = false;
  t.after(async () => { if (terminal && !finished) { terminal.write('\x03'); await terminal.finish(); } });
  const { app, project, meeting, root } = await liveSetup(t, (phase, _request, normal) => phase === 'framing'
    ? { ...normal, humanRequests: [{ ...draft, consumers: [{ adviserId: 'dev', phase: 'analysis' }] }] } : normal);
  const request = app.inspectParticipation(project.id, meeting.id).requests[0]!;
  terminal = openTerminal(t, ['--import', './tests/support/provider-http.mjs', 'dist/cli.js', 'live', '--data-dir', root, '--project', project.id,
    '--id', meeting.id, '--output', join(root, 'out'), '--allow-provider', '--session'], { env: {
      BOARDROOM_SESSION_KEYS: JSON.stringify({ po: 'KEY', dev: 'KEY', marketing: 'KEY' }), TEST_STREAM_DELAY_MS: '20000', TEST_DELAY_PHASE: 'analysis',
      TEST_OUTPUT: JSON.stringify({ assertions: [{ id: 'a', kind: 'unknown', text: 'STREAM_ACTIVE', references: [] }], risks: [], assumptions: [], recommendations: ['Pilot'] }) } });
  await terminal.waitFor(/approved.*v1/);
  const command = async (text: string) => { terminal!.write(text); await terminal!.waitFor(screen => screen.includes(`Draft: ${text}`)); terminal!.write('\r'); };
  await command('analyse'); await terminal.waitFor(/STREAM_ACTIVE/);
  await command(`answer ${request.id} 1 Operations team`);
  await terminal.waitFor(/Response saved.*answered/);
  assert.equal(app.inspectParticipation(project.id, meeting.id).requests[0]!.status, 'answered');
  terminal.write('\x03'); assert.equal((await terminal.finish()).exitCode, 130); finished = true;
});
