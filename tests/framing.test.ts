import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Boardroom } from '../src/application.ts';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { providerSetup, streamResponse, openaiEvents } from './support/providers.ts';
import { catalogInstant } from './support/clock.ts';

test('a question without a plan runs a real checkpointed PO framing and reopens human waiting without another call', async t => {
  let response: string, sent: any, calls = 0;
  const { app, store, project, meeting, root } = providerSetup(t, async (_url, init) => {
    calls++; sent = JSON.parse(String(init?.body)); return streamResponse(openaiEvents(response));
  });
  const body = { decisionQuestion: 'Which pilot first?', summary: 'One small pilot in four weeks.',
    initialProposal: 'Deliver one integration.', assumptions: ['Pilot demand is unproven.'], references: meeting.context.passages };
  response = JSON.stringify(body);
  await app.setRouteCredential('po', 'PRIVATE_KEY_SENTINEL', store);
  assert.throws(() => app.reserveCall(project.id, meeting.id, { adviserId: 'dev', phase: 'analysis', contextVersion: 1,
    subjectVersion: 1, pool: 'work', limits: { maxInputTokens: 200000, maxOutputTokens: 1000, maxDurationMs: 1000 } }), /approved framing/);
  const result = await app.startMeeting(project.id, meeting.id, store);
  assert.equal(result.status, 'awaiting-human'); assert.equal(result.versions.length, 1);
  assert.deepEqual(result.versions[0].body, body); assert.equal(result.approvedVersion, undefined);
  assert.deepEqual(result.checkpoint.next, ['human']); assert.equal(calls, 1);
  const prompt = sent.input;
  const facts = JSON.parse(prompt.slice(prompt.indexOf('\n') + 1));
  assert.equal(facts.language, 'fr'); assert.equal(facts.question, 'First?'); assert.equal(facts.initialPlan, undefined);
  assert.deepEqual(facts.constraints, ['Four weeks']); assert.equal(facts.passages.length, 1);
  assert.equal(facts.passages[0].text, 'Two engineers.');
  assert.equal(prompt.includes('PRIVATE_UNSELECTED'), false); assert.equal(prompt.includes('PRIVATE_KEY_SENTINEL'), false);
  assert.equal(app.callLedger(project.id, meeting.id).calls[0].phase, 'framing');
  const reopened = new Boardroom(root, { fetch: async () => { throw new Error('Unexpected network replay.'); } });
  try {
    const saved = await reopened.inspectMeeting(project.id, meeting.id);
    assert.deepEqual(saved.versions, result.versions); assert.deepEqual(saved.checkpoint.next, ['human']);
    await assert.rejects(reopened.startMeeting(project.id, meeting.id, store), /already started/);
    assert.equal(calls, 1);
  } finally { reopened.close(); }
});

test('explicit approval binds the displayed version; human correction preserves history and invalidates old consent/intents', async t => {
  let response: string, requests = 0;
  const { app, store, project, meeting } = providerSetup(t, async () => { requests++; return streamResponse(openaiEvents(response)); });
  const body = { decisionQuestion: 'First pilot?', summary: 'One integration.', initialProposal: null,
    assumptions: [], references: meeting.context.passages };
  response = JSON.stringify(body); await app.setRouteCredential('po', 'KEY', store);
  await app.startMeeting(project.id, meeting.id, store);
  const approved = await app.approveFraming(project.id, meeting.id, 1);
  assert.equal(approved.status, 'approved'); assert.equal(approved.approvedVersion, 1);
  assert.deepEqual(approved.checkpoint.next, []);
  const intent = app.reserveCall(project.id, meeting.id, { adviserId: 'dev', phase: 'analysis', contextVersion: 1,
    subjectVersion: 1, pool: 'work', limits: { maxInputTokens: 200000, maxOutputTokens: 1000, maxDurationMs: 1000 } });
  const corrected = await app.correctFraming(project.id, meeting.id, 1, { ...body, summary: 'Human: compare two options first.' });
  assert.equal(corrected.status, 'awaiting-human'); assert.equal(corrected.approvedVersion, undefined);
  assert.deepEqual(corrected.versions.map(version => version.version), [1, 2]);
  assert.equal(corrected.versions[0].body.summary, 'One integration.'); assert.equal(corrected.versions[1].author, 'human');
  assert.equal(corrected.versions[1].body.initialProposal, null); assert.notEqual(corrected.versions[0].sha256, corrected.versions[1].sha256);
  await assert.rejects(app.approveFraming(project.id, meeting.id, 1), /current version/);
  await assert.rejects(intent.execute({ text: 'Old analysis' }, async () => { throw new Error('Must not enter provider.'); }), /approved framing/);
  const current = await app.approveFraming(project.id, meeting.id, 2);
  assert.equal(current.approvedVersion, 2); assert.equal(requests, 1);
  await assert.rejects(intent.execute({ text: 'Still obsolete' }, async () => ({ text: '{}' })), /approved framing/);
  assert.equal(app.callLedger(project.id, meeting.id).calls.filter(call => call.status === 'running').length, 0);
});

test('correction cancels already running analysis of the superseded approved framing', async t => {
  let response: string;
  const { app, store, project, meeting } = providerSetup(t, async () => streamResponse(openaiEvents(response)));
  const body = { decisionQuestion: 'First?', summary: 'Small pilot.', initialProposal: null, assumptions: [], references: meeting.context.passages };
  response = JSON.stringify(body); await app.setRouteCredential('po', 'KEY', store);
  await app.startMeeting(project.id, meeting.id, store); await app.approveFraming(project.id, meeting.id, 1);
  const handle = app.reserveCall(project.id, meeting.id, { adviserId: 'dev', phase: 'analysis', contextVersion: 1,
    subjectVersion: 1, pool: 'work', limits: { maxInputTokens: 200000, maxOutputTokens: 1000, maxDurationMs: 1000 } });
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const running = handle.execute({ text: 'Analysis v1' }, async () => { started(); return new Promise(() => {}); });
  await ready; await app.correctFraming(project.id, meeting.id, 1, { ...body, summary: 'Compare first.' });
  const cancelled = await running;
  assert.equal(cancelled.receipt.reason, 'cancelled'); assert.equal(cancelled.receipt.knownCostMicros, undefined);
});

test('a known response completing between cancellation polls still cannot accept a superseded frame', async t => {
  let response: string;
  const { app, store, project, meeting } = providerSetup(t, async () => streamResponse(openaiEvents(response)));
  const body = { decisionQuestion: 'First?', summary: 'Small pilot.', initialProposal: null, assumptions: [], references: meeting.context.passages };
  response = JSON.stringify(body); await app.setRouteCredential('po', 'KEY', store);
  await app.startMeeting(project.id, meeting.id, store); await app.approveFraming(project.id, meeting.id, 1);
  const handle = app.reserveCall(project.id, meeting.id, { adviserId: 'dev', phase: 'analysis', contextVersion: 1,
    subjectVersion: 1, pool: 'work', limits: { maxInputTokens: 200000, maxOutputTokens: 1000, maxDurationMs: 1000 } });
  const completed = await handle.execute({ text: 'Analysis v1' }, async () => {
    await app.correctFraming(project.id, meeting.id, 1, { ...body, summary: 'Compare first.' });
    return { text: '{"accepted":true}', usage: { inputTokens: 1, outputTokens: 1 } };
  });
  assert.equal(completed.text, undefined); assert.equal(completed.receipt.reason, 'cancelled');
  assert.equal(completed.receipt.knownCostMicros, 6);
});

test('an interrupted real graph/call reopens as uncertain and cannot be started or approved again', { timeout: 15000 }, async t => {
  let child: ReturnType<typeof spawn> | undefined;
  t.after(async () => { if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
  } });
  const { app, store, project, meeting, root } = providerSetup(t, async () => { throw new Error('No replay.'); });
  const program = `import {Boardroom} from ${JSON.stringify(new URL('../src/application.ts', import.meta.url).href)};
    import {SessionSecretStore} from ${JSON.stringify(new URL('../src/secrets.ts', import.meta.url).href)};
    const app = new Boardroom(process.env.TEST_ROOT, {now: () => new Date(process.env.TEST_UTC_NOW), fetch: async () => {process.send('in-flight'); return new Promise(() => {});}});
    const store = new SessionSecretStore(); await app.setRouteCredential('po','DUMMY_KEY',store);
    setInterval(() => {},1000); await app.startMeeting(process.env.TEST_PROJECT,process.env.TEST_MEETING,store);`;
  child = spawn(process.execPath, ['--input-type=module', '-e', program], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    env: { ...process.env, TEST_ROOT: root, TEST_PROJECT: project.id, TEST_MEETING: meeting.id, TEST_UTC_NOW: catalogInstant() } });
  let stderr = ''; child.stderr!.on('data', chunk => { stderr += chunk; });
  await Promise.race([once(child, 'message'), once(child, 'exit').then(() => { throw new Error(stderr); })]);
  const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
  const state = await app.inspectMeeting(project.id, meeting.id);
  assert.equal(state.status, 'uncertain'); assert.equal(state.versions.length, 0);
  assert.equal(app.callLedger(project.id, meeting.id).calls[0].status, 'running');
  assert.ok(app.callLedger(project.id, meeting.id).committedMicros > 0);
  await assert.rejects(app.startMeeting(project.id, meeting.id, store), /already started/);
  await assert.rejects(app.approveFraming(project.id, meeting.id, 1), /current version/);
  assert.equal(app.callLedger(project.id, meeting.id).calls.length, 1);
});

test('invalid/out-of-context JSON fails after one correction; stopping waiting preserves completed work', async t => {
  let response: string;
  const { app, store, project, meeting } = providerSetup(t, async () => streamResponse(openaiEvents(response)));
  const body = { decisionQuestion: 'First?', summary: 'Small pilot.', initialProposal: null, assumptions: [],
    references: meeting.context.passages.map(passage => ({ ...passage, firstLine: 2, lastLine: 2 })) };
  response = JSON.stringify(body); await app.setRouteCredential('po', 'KEY', store);
  const failed = await app.startMeeting(project.id, meeting.id, store);
  assert.equal(failed.status, 'failed'); assert.equal(failed.versions.length, 0);
  const receipts = app.callLedger(project.id, meeting.id).calls;
  assert.equal(receipts.length, 2); assert.deepEqual(receipts.map(receipt => receipt.phase), ['framing', 'framing-correction']);
  assert.ok(receipts.every(receipt => receipt.reason === 'invalid-output'));
  const next = app.prepareTeamMeeting({ projectId: project.id, teamId: 'team', question: 'Second?', durationTargetSeconds: 600,
    costCeiling: { amount: 10, currency: 'USD' }, passages: meeting.context.passages.map(({ evidenceId, firstLine, lastLine }) => ({ evidenceId, firstLine, lastLine })) });
  app.configureExecution(project.id, next.id);
  response = JSON.stringify({ ...body, references: next.context.passages });
  await app.startMeeting(project.id, next.id, store); app.stopExecution(project.id, next.id);
  const stopped = await app.inspectMeeting(project.id, next.id);
  assert.equal(stopped.status, 'stopped'); assert.equal(stopped.versions.length, 1);
  await assert.rejects(app.approveFraming(project.id, next.id, 1), /current version/);
});

test('durable framing can be approved after a missing technical checkpoint without replaying the provider', async t => {
  let response: string, requests = 0;
  const { app, store, project, meeting, root } = providerSetup(t, async () => { requests++; return streamResponse(openaiEvents(response)); });
  response = JSON.stringify({ decisionQuestion: 'First?', summary: 'Small pilot.', initialProposal: null, assumptions: [], references: meeting.context.passages });
  await app.setRouteCredential('po', 'KEY', store); await app.startMeeting(project.id, meeting.id, store); app.close();
  unlinkSync(join(root, 'live-checkpoints.sqlite'));
  const reopened = new Boardroom(root, { fetch: async () => { throw new Error('No provider replay.'); } });
  try {
    const missing = await reopened.inspectMeeting(project.id, meeting.id);
    assert.equal(missing.status, 'awaiting-human'); assert.equal(missing.checkpoint.status, 'unconfirmed');
    const approved = await reopened.approveFraming(project.id, meeting.id, 1);
    assert.equal(approved.status, 'approved'); assert.deepEqual(approved.checkpoint.next, []); assert.equal(requests, 1);
  } finally { reopened.close(); }
});

test('waiting for a human consumes neither active time nor another provider call', async t => {
  let now = 0, response: string, requests = 0;
  const { app, store, project, meeting } = providerSetup(t, async () => {
    now = 25; requests++; return streamResponse(openaiEvents(response));
  }, () => now);
  response = JSON.stringify({ decisionQuestion: 'First?', summary: 'Small pilot.', initialProposal: null, assumptions: [], references: meeting.context.passages });
  await app.setRouteCredential('po', 'KEY', store); await app.startMeeting(project.id, meeting.id, store);
  assert.equal(app.callLedger(project.id, meeting.id).activeMs, 25);
  now = 600000; assert.equal((await app.inspectMeeting(project.id, meeting.id)).status, 'awaiting-human');
  assert.equal(app.callLedger(project.id, meeting.id).activeMs, 25);
  await app.approveFraming(project.id, meeting.id, 1);
  assert.equal(requests, 1); assert.equal(app.callLedger(project.id, meeting.id).activeMs, 25);
});

test('two real processes cannot start two PO framings for one meeting', { timeout: 15000 }, async t => {
  const children: ReturnType<typeof spawn>[] = [];
  t.after(async () => {
    await Promise.all(children.map(async child => {
      if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; }
    }));
  });
  const { app, project, meeting, root } = providerSetup(t, async () => { throw new Error('Child boundary only.'); });
  const body = { decisionQuestion: 'First?', summary: 'Small pilot.', initialProposal: null, assumptions: [], references: meeting.context.passages };
  const program = `import {Boardroom} from ${JSON.stringify(new URL('../src/application.ts', import.meta.url).href)};
    import {SessionSecretStore} from ${JSON.stringify(new URL('../src/secrets.ts', import.meta.url).href)};
    const text=process.env.TEST_FRAME; let requests=0;
    const app=new Boardroom(process.env.TEST_ROOT,{now:()=>new Date(process.env.TEST_UTC_NOW),fetch:async()=>{requests++;return new Response([
      {type:'response.output_text.delta',delta:text},{type:'response.completed',response:{status:'completed',model:'gpt-4.1-mini-2025-04-14',
      usage:{input_tokens:100,output_tokens:10},output:[{type:'message',content:[{type:'output_text',text}]}]}}
      ].map(e=>'data: '+JSON.stringify(e)+'\\n\\n').join(''),{headers:{'Content-Type':'text/event-stream'}});}});
    const store=new SessionSecretStore();await app.setRouteCredential('po','DUMMY_KEY',store);setInterval(()=>{},1000);process.send('ready');
    process.once('message',async()=>{try{const result=await app.startMeeting(process.env.TEST_PROJECT,process.env.TEST_MEETING,store);
      process.send({status:result.status,requests});}catch(error){process.send({error:error.message,requests});}});`;
  for (let i = 0; i < 2; i++) children.push(spawn(process.execPath, ['--input-type=module', '-e', program], {
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env: { ...process.env, TEST_ROOT: root, TEST_UTC_NOW: catalogInstant(),
      TEST_PROJECT: project.id, TEST_MEETING: meeting.id, TEST_FRAME: JSON.stringify(body) },
  }));
  const reply = (child: typeof children[number]) => {
    let diagnostic = ''; child.stderr!.on('data', chunk => { diagnostic += chunk; });
    return Promise.race([once(child, 'message').then(([value]) => value), once(child, 'exit').then(() => { throw new Error(diagnostic); })]);
  };
  await Promise.all(children.map(reply)); const pending = children.map(reply);
  for (const child of children) child.send('start');
  const results = await Promise.all(pending);
  assert.equal(results.filter(result => result.status === 'awaiting-human').length, 1);
  assert.equal(results.filter(result => /already started/.test(result.error)).length, 1);
  assert.equal(results.reduce((sum, result) => sum + result.requests, 0), 1);
  await Promise.all(children.map(async child => { const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; }));
  assert.equal((await app.inspectMeeting(project.id, meeting.id)).versions.length, 1);
  assert.equal(app.callLedger(project.id, meeting.id).calls.length, 1);
});
