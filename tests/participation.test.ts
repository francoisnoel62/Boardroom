import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Boardroom } from '../src/application.ts';
import { liveSetup } from './support/live.ts';
import { phaseLimits } from '../src/reserves.ts';
import { AnalysisBodySchema } from '../src/deliberation-domain.ts';

test('a contribution received twice during an analysis is durable and reaches only the next targeted work', async t => {
  const ready = Promise.withResolvers<void>(), release = Promise.withResolvers<void>();
  const { app, project, meeting, root, store, sent } = await liveSetup(t, async (phase, request, normal) => {
    if (phase === 'analysis' && request.adviserId === 'dev') { ready.resolve(); await release.promise; }
    return normal;
  });
  const run = app.analyseMeeting(project.id, meeting.id, store);
  await ready.promise;
  const other = new Boardroom(root);
  try {
    const command = { commandId: randomUUID(), projectId: project.id, meetingId: meeting.id,
      author: 'François', expectedContextVersion: 1, recipientId: 'dev', text: 'Check operational maintenance.' };
    const receipt = app.contribute(command);
    assert.equal(receipt.status, 'queued');
    assert.deepEqual(other.contribute(command), receipt);
    assert.equal(other.inspectParticipation(project.id, meeting.id).contributions.length, 1);
    assert.equal(app.history(project.id).events.filter(e => e.type === 'contribution.received').length, 1);
    release.resolve(); await run;
    await app.debateMeeting(project.id, meeting.id, store);
    const delivered = other.inspectParticipation(project.id, meeting.id).contributions[0]!;
    assert.equal(delivered.status, 'delivered');
    assert.ok(delivered.callId);
    const inputs = sent.filter(s => s.request.humanContributions?.some((c: any) => c.commandId === command.commandId));
    assert.equal(inputs.length, 1);
    assert.equal(inputs[0]!.phase, 'confrontation');
    assert.equal(inputs[0]!.request.humanContributions[0].text, command.text);
    assert.equal(sent.filter(s => s.phase === 'analysis').some(s => JSON.stringify(s).includes(command.text)), false);
    assert.deepEqual(other.contribute(command), receipt);
  } finally { release.resolve(); await run; other.close(); }
});

test('a correction reuses its frozen input and does not consume a contribution queued after its first attempt', async t => {
  let queue: (() => void) | undefined, attempts = 0;
  const { app, project, meeting, store, sent } = await liveSetup(t, (phase, request, normal) => {
    if (phase === 'analysis' && request.adviserId === 'dev' && ++attempts === 1) { queue!(); return { ...normal, assertions: [] }; }
    return normal;
  });
  queue = () => { app.contribute({ commandId: randomUUID(), projectId: project.id, meetingId: meeting.id,
    author: 'CEO', expectedContextVersion: 1, recipientId: 'dev', text: 'After the first attempt' }); };
  await app.analyseMeeting(project.id, meeting.id, store);
  assert.equal(attempts, 2);
  assert.ok(sent.filter(s => s.phase === 'analysis').every(s => !s.request.humanContributions));
  assert.equal(app.inspectParticipation(project.id, meeting.id).contributions[0]?.status, 'queued');
});

test('a refused budget or reservation never sent leaves the contribution queued', async t => {
  const { app, project, meeting, store, sent } = await liveSetup(t, undefined, 6.37);
  const command = { commandId: randomUUID(), projectId: project.id, meetingId: meeting.id,
    author: 'CEO', expectedContextVersion: 1, recipientId: 'marketing', text: 'Maintenance still pending' };
  const receipt = app.contribute(command);
  const route = meeting.team!.routes.find(r => r.id === 'marketing')!;
  const input = { adviserId: 'marketing', phase: 'analysis' as const, contextVersion: 1 as const, subjectVersion: 1,
    pool: 'work' as const, limits: phaseLimits('analysis', route) };
  app.reserveCall(project.id, meeting.id, input);
  assert.equal(app.inspectParticipation(project.id, meeting.id).contributions[0]!.status, 'queued');
  await assert.rejects(app.callStructured(project.id, meeting.id, { ...input, limits: { ...input.limits, maxInputTokens: 2000000 } },
    { text: 'Analyse\n{}', schema: AnalysisBodySchema }, store), /insufficient budget/);
  assert.deepEqual(app.contribute(command), receipt);
  assert.equal(app.inspectParticipation(project.id, meeting.id).contributions[0]!.status, 'queued');
  assert.equal(sent.length, 1);
});

test('inspection and exports preserve attribution and explain a contribution with no remaining recipient work', async t => {
  const { app, project, meeting, root, store } = await liveSetup(t);
  app.stopExecution(project.id, meeting.id);
  const command = { commandId: randomUUID(), projectId: project.id, meetingId: meeting.id,
    author: 'CEO', expectedContextVersion: 1, recipientId: 'dev', text: 'Later note DUMMY_PRIVATE_KEY' };
  const receipt = app.contribute(command);
  assert.equal(receipt.status, 'unconsumed');
  assert.match(receipt.reason!, /stopped/);
  assert.throws(() => app.contribute({ ...command, text: 'Different text' }), /different payload/);
  assert.throws(() => app.contribute({ ...command, commandId: randomUUID(), expectedContextVersion: 2 }), /version/);
  assert.throws(() => app.contribute({ ...command, commandId: randomUUID(), recipientId: 'unknown' }), /recipient/);
  assert.throws(() => app.contribute({ ...command, commandId: randomUUID(), projectId: 'foreign' }));
  assert.throws(() => app.contribute({ ...command, commandId: randomUUID(), text: 'x'.repeat(12001) }));
  assert.equal((await app.inspectLiveDecision(project.id, meeting.id)).participation.contributions.length, 1);
  const exported = await app.exportLiveMeeting(project.id, meeting.id, join(root, 'exports'), { json: true }, store);
  const content = readFileSync(exported.json!, 'utf8');
  assert.equal(JSON.parse(content).participation.contributions[0].author, 'CEO');
  assert.ok(content.includes('[REDACTED]')); assert.ok(!content.includes('DUMMY_PRIVATE_KEY'));
  assert.match(readFileSync(exported.memo, 'utf8'), /Later note/);
});
