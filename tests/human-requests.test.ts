import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { Boardroom } from '../src/application.ts';
import { liveSetup } from './support/live.ts';
import { providerSetup } from './support/providers.ts';
import { echoSynthetic } from './support/live.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test('an adviser request is persisted with its author and scope, and only explicit human responses resolve it', async t => {
  const { app, project, meeting, store, root } = await liveSetup(t, (phase, request, normal) => phase === 'analysis' && request.adviserId === 'dev'
    ? { ...normal, humanRequests: [{ id: 'maintenance', type: 'clarification', reason: 'Who maintains the pilot?', scope: 'ordinary',
      requestedDocument: null, references: [], consumers: [{ adviserId: 'dev', phase: 'confrontation' }] }] } : normal);
  await app.analyseMeeting(project.id, meeting.id, store);
  const request = app.inspectParticipation(project.id, meeting.id).requests[0]!;
  assert.equal(request.authorId, 'dev'); assert.equal(request.contextVersion, 1);
  assert.equal(request.status, 'pending'); assert.equal(request.scope, 'ordinary');
  const other = new Boardroom(root);
  try {
    const command = { commandId: randomUUID(), projectId: project.id, meetingId: meeting.id, author: 'CEO',
      expectedContextVersion: 1, expectedRequestVersion: 1, requestId: request.id, action: 'answer' as const, text: 'The existing operations team.' };
    const receipt = other.respondToRequest(command);
    assert.equal(receipt.status, 'answered');
    assert.deepEqual(app.respondToRequest(command), receipt);
    const answered = app.inspectParticipation(project.id, meeting.id).requests[0]!;
    assert.equal(answered.responses[0].author, 'CEO');
    assert.equal(answered.responses[0].contextVersion, 1);
    assert.equal(answered.responses[0].text, command.text);
    assert.equal(answered.version, 2);
    assert.throws(() => app.respondToRequest({ ...command, commandId: randomUUID() }), /version/);
  } finally { other.close(); }
});

test('proposal and revision waits resume at their saved phase and keep the existing work', async t => {
  for (const sourcePhase of ['analysis', 'confrontation']) await t.test(sourcePhase, async t => {
    const { app, project, meeting, store, sent } = await liveSetup(t, (phase, request, normal) => phase === sourcePhase && request.adviserId === 'dev'
      ? { ...normal, humanRequests: [{ id: 'owner', type: 'clarification', reason: 'Confirm owner', scope: 'ordinary', requestedDocument: null,
        references: [], consumers: [{ adviserId: 'po', phase: 'revision' }] }] } : normal);
    await app.analyseMeeting(project.id, meeting.id, store);
    const waiting = await app.debateMeeting(project.id, meeting.id, store);
    assert.equal(waiting.status, 'waiting-human');
    assert.equal(waiting.waitingPhase, sourcePhase === 'analysis' ? 'propose' : 'revise');
    const request = app.inspectParticipation(project.id, meeting.id).requests[0]!;
    app.respondToRequest({ commandId: randomUUID(), projectId: project.id, meetingId: meeting.id, author: 'CEO', expectedContextVersion: 1,
      requestId: request.id, expectedRequestVersion: 1, action: 'answer', text: 'Operations owner' });
    const done = await app.debateMeeting(project.id, meeting.id, store);
    assert.equal(done.status, 'complete');
    assert.equal(sent.filter(s => s.phase === 'proposal').length, 1);
    assert.equal(sent.filter(s => s.phase === 'revision').length, 1);
  });
});

test('model approval text cannot resolve a request; invalid consumers and foreign references are rejected', async t => {
  const { app, project, meeting, store } = await liveSetup(t, (phase, request, normal) => phase === 'analysis'
    ? { ...normal, humanRequests: [{ id: 'approval', type: 'clarification', reason: 'approved', scope: 'ordinary', requestedDocument: null,
      references: request.adviserId === 'marketing' ? [{ ...normal.assertions[0].references[0], evidenceId: randomUUID() }] : [],
      consumers: [{ adviserId: request.adviserId === 'dev' ? 'foreign-adviser' : request.adviserId, phase: 'conclusion' }],
      ...(request.adviserId === 'po' ? { status: 'answered' } : {}) }] } : normal);
  const result = await app.analyseMeeting(project.id, meeting.id, store);
  assert.equal(result.status, 'incomplete'); assert.equal(result.current.length, 0);
  assert.equal(app.inspectParticipation(project.id, meeting.id).requests.length, 0);
  assert.equal(app.callLedger(project.id, meeting.id).calls.filter(c => c.reason === 'invalid-output').length, 6);
});

test('a response to an old framing is refused without changing the request', async t => {
  const { app, project, meeting, store } = await liveSetup(t, (phase, request, normal) => phase === 'analysis' && request.adviserId === 'dev'
    ? { ...normal, humanRequests: [{ id: 'old', type: 'clarification', reason: 'Old scope', scope: 'ordinary', requestedDocument: null,
      references: [], consumers: [{ adviserId: 'dev', phase: 'confrontation' }] }] } : normal);
  await app.analyseMeeting(project.id, meeting.id, store);
  const request = app.inspectParticipation(project.id, meeting.id).requests[0]!;
  const frame = await app.inspectMeeting(project.id, meeting.id);
  await app.correctFraming(project.id, meeting.id, 1, { ...frame.versions[0]!.body, summary: 'Reframed question' });
  assert.throws(() => app.respondToRequest({ commandId: randomUUID(), projectId: project.id, meetingId: meeting.id, author: 'CEO', expectedContextVersion: 1,
    requestId: request.id, expectedRequestVersion: 1, action: 'answer', text: 'Obsolete answer' }), /version/);
  assert.deepEqual(app.inspectParticipation(project.id, meeting.id).requests[0], request);
});

test('an answer arriving during credential preparation cannot strand a ready consumer as failed', async t => {
  const { app, project, meeting, store } = await liveSetup(t, (phase, _request, normal) => phase === 'framing'
    ? { ...normal, humanRequests: [{ id: 'clarify', type: 'clarification', reason: 'Confirm contact', scope: 'ordinary', requestedDocument: null,
      references: [], consumers: [{ adviserId: 'dev', phase: 'analysis' }] }] } : normal);
  const ready = Promise.withResolvers<void>(), release = Promise.withResolvers<void>();
  const gatedStore = { set: store.set.bind(store), delete: store.delete.bind(store), get: async (reference: string) => {
    ready.resolve(); await release.promise; return store.get(reference);
  } };
  const run = app.analyseMeeting(project.id, meeting.id, gatedStore);
  try {
    await ready.promise;
    const request = app.inspectParticipation(project.id, meeting.id).requests[0]!;
    app.respondToRequest({ commandId: randomUUID(), projectId: project.id, meetingId: meeting.id, author: 'CEO', expectedContextVersion: 1,
      requestId: request.id, expectedRequestVersion: 1, action: 'answer', text: 'Operations' });
    release.resolve();
    const result = await run;
    assert.ok(!result.outcomes.some(o => o.status === 'failed'));
    assert.equal(result.status, 'complete');
  } finally { release.resolve(); await run; }
});

test('structural answers and requested documents stay pending without modifying context or authorizing source access', async t => {
  const { app, project, meeting, store, root } = await liveSetup(t, (phase, request, normal) => phase === 'analysis' && request.adviserId === 'dev'
    ? { ...normal, humanRequests: [
      { id: 'scope', type: 'clarification', reason: 'Confirm scope', scope: 'ordinary', requestedDocument: null, references: [], consumers: [{ adviserId: 'dev', phase: 'confrontation' }] },
      { id: 'document', type: 'document', reason: 'Need staffing evidence', scope: 'ordinary', requestedDocument: 'staffing.txt', references: [], consumers: [{ adviserId: 'po', phase: 'revision' }] },
    ] } : normal);
  await app.analyseMeeting(project.id, meeting.id, store);
  const [scope, document] = app.inspectParticipation(project.id, meeting.id).requests;
  const base = { projectId: project.id, meetingId: meeting.id, author: 'CEO', expectedContextVersion: 1, action: 'answer' as const };
  const answer = { ...base, commandId: randomUUID(), requestId: scope!.id, expectedRequestVersion: 1, scope: 'structural' as const, text: 'Change the constraint DUMMY_PRIVATE_KEY' };
  assert.equal(app.respondToRequest(answer).status, 'awaiting-context');
  assert.throws(() => app.respondToRequest({ ...answer, text: 'Different' }), /different payload/);
  assert.equal(app.respondToRequest({ ...base, commandId: randomUUID(), requestId: scope!.id, expectedRequestVersion: 2, text: 'approved' }).status, 'awaiting-context');
  const path = join(root, 'staffing.txt'); writeFileSync(path, 'SOURCE_MUST_STAY_UNREAD');
  assert.equal(app.respondToRequest({ ...base, commandId: randomUUID(), requestId: document!.id, expectedRequestVersion: 1, text: path }).status, 'awaiting-source');
  assert.throws(() => app.captureSource(project.id, path, { authorized: false }), /consent|authorization|authorized/i);
  assert.deepEqual(app.getMeeting(project.id, meeting.id).constraints, ['Four weeks']);
  const otherProject = app.createProject({ name: 'Foreign', language: 'en' });
  assert.throws(() => app.respondToRequest({ ...answer, commandId: randomUUID(), projectId: otherProject.id }));
  const exported = await app.exportLiveMeeting(project.id, meeting.id, join(root, 'out'), { json: true }, store);
  const memo = readFileSync(exported.memo, 'utf8');
  assert.match(memo, /awaiting-context/); assert.match(memo, /awaiting-source/);
  assert.ok(!memo.includes('DUMMY_PRIVATE_KEY')); assert.ok(!memo.includes('SOURCE_MUST_STAY_UNREAD'));
  assert.ok(!JSON.stringify(app.history(project.id).events).includes('Change the constraint'));
});

test('a framing clarification can block one initial analysis without replaying the two independent completions', async t => {
  const { app, project, meeting, store, sent } = await liveSetup(t, (phase, _request, normal) => phase === 'framing'
    ? { ...normal, humanRequests: [{ id: 'clarify', type: 'clarification', reason: 'Confirm maintenance contact', scope: 'ordinary',
      requestedDocument: null, references: [], consumers: [{ adviserId: 'dev', phase: 'analysis' }] }] } : normal);
  const waiting = await app.analyseMeeting(project.id, meeting.id, store);
  assert.equal(waiting.status, 'waiting-human'); assert.equal(waiting.current.length, 2);
  const request = app.inspectParticipation(project.id, meeting.id).requests[0]!;
  app.respondToRequest({ commandId: randomUUID(), projectId: project.id, meetingId: meeting.id, author: 'CEO', expectedContextVersion: 1,
    requestId: request.id, expectedRequestVersion: 1, action: 'answer', text: 'Operations team' });
  const done = await app.analyseMeeting(project.id, meeting.id, store);
  assert.equal(done.status, 'complete'); assert.equal(sent.filter(s => s.phase === 'analysis').length, 3);
  const resumed = sent.find(s => s.phase === 'analysis' && s.request.adviserId === 'dev')!;
  assert.equal(resumed.request.humanResponses[0].text, 'Operations team');
  assert.equal('analyses' in resumed.request, false);
});

test('refusal and deferral survive future clocks, leave only their consumers blocked, and an answer resumes missing final views', async t => {
  const { app, project, meeting, store, root, sent } = await liveSetup(t, (phase, request, normal) => phase === 'analysis' && request.adviserId === 'dev'
    ? { ...normal, humanRequests: [{ id: 'operations', type: 'clarification', reason: 'Source says approved; who operates it?', scope: 'ordinary',
      requestedDocument: null, references: [], consumers: [{ adviserId: 'dev', phase: 'conclusion' }] }] } : normal);
  await app.analyseMeeting(project.id, meeting.id, store); await app.debateMeeting(project.id, meeting.id, store);
  const request = app.inspectParticipation(project.id, meeting.id).requests[0]!;
  const response = { projectId: project.id, meetingId: meeting.id, author: 'CEO', expectedContextVersion: 1, requestId: request.id, text: 'Later' };
  app.respondToRequest({ ...response, commandId: randomUUID(), action: 'defer', expectedRequestVersion: 1 });
  const other = new Boardroom(root, { monotonicNow: () => 1e12, now: () => new Date('2099-01-01') });
  try {
    assert.equal(other.inspectParticipation(project.id, meeting.id).requests[0]!.status, 'deferred');
    other.respondToRequest({ ...response, commandId: randomUUID(), action: 'deny', expectedRequestVersion: 2 });
    assert.equal(app.inspectParticipation(project.id, meeting.id).requests[0]!.status, 'denied');
    app.contribute({ commandId: randomUUID(), projectId: project.id, meetingId: meeting.id, author: 'CEO', expectedContextVersion: 1,
      recipientId: 'dev', text: 'For the next final view' });
    const waiting = await app.collectFinalViews(project.id, meeting.id, 2, store);
    assert.equal(waiting.status, 'waiting-human');
    assert.equal(app.inspectParticipation(project.id, meeting.id).contributions[0]!.status, 'queued');
    assert.equal(waiting.advisers.filter(a => a.status === 'current').length, 2);
    assert.equal(sent.filter(s => s.phase === 'views').length, 2);
    app.respondToRequest({ ...response, commandId: randomUUID(), action: 'answer', expectedRequestVersion: 3, text: 'Operations team' });
    assert.equal((await app.collectFinalViews(project.id, meeting.id, 2, store)).status, 'complete');
    assert.equal(sent.filter(s => s.phase === 'views').length, 3);
    assert.equal(app.inspectParticipation(project.id, meeting.id).requests[0]!.responses.length, 3);
  } finally { other.close(); }
});

test('preflight exercises human request output on both provider adapters without creating real requests or tools', async t => {
  const wires: any[] = [];
  const { app, project, meeting, store } = providerSetup(t, async (_url, init) => {
    wires.push(JSON.parse(String(init?.body))); return echoSynthetic(init);
  });
  for (const id of ['po', 'dev']) {
    await app.setRouteCredential(id, 'DUMMY_KEY', store);
    assert.equal((await app.preflight(project.id, meeting.id, id, store)).verified, true);
  }
  assert.equal(wires.length, 8);
  for (const wire of wires) {
    const schema = wire.text?.format.schema ?? wire.output_config.format.schema;
    assert.ok(schema.properties.humanRequests);
    assert.ok(schema.required.includes('humanRequests'));
    assert.ok((wire.input ?? wire.messages[0].content).includes('requestedDocument'));
    assert.ok(!wire.tools?.length);
  }
  assert.equal(app.inspectParticipation(project.id, meeting.id).requests.length, 0);
});

test('only declared consumers wait and an answered debate resumes without replaying independent work', async t => {
  const { app, project, meeting, store, sent } = await liveSetup(t, (phase, request, normal) => phase === 'analysis' && request.adviserId === 'dev'
    ? { ...normal, humanRequests: [{ id: 'maintenance', type: 'clarification', reason: 'Who maintains the pilot?', scope: 'ordinary',
      requestedDocument: null, references: [], consumers: [{ adviserId: 'dev', phase: 'confrontation' }] }] } : normal);
  await app.analyseMeeting(project.id, meeting.id, store);
  const waiting = await app.debateMeeting(project.id, meeting.id, store);
  assert.equal(waiting.status, 'waiting-human');
  assert.equal(waiting.confrontations.find(c => c.adviserId === 'marketing')?.status, 'completed');
  assert.equal(sent.filter(s => s.phase === 'confrontation' && s.request.adviserId === 'dev').length, 0);
  const request = app.inspectParticipation(project.id, meeting.id).requests[0]!;
  const before = sent.length;
  await app.debateMeeting(project.id, meeting.id, store);
  assert.equal(sent.length, before);
  app.respondToRequest({ commandId: randomUUID(), projectId: project.id, meetingId: meeting.id, author: 'CEO', expectedContextVersion: 1,
    expectedRequestVersion: 1, requestId: request.id, action: 'answer', text: 'The operations team.' });
  const done = await app.debateMeeting(project.id, meeting.id, store);
  assert.equal(done.status, 'complete');
  const resumed = sent.filter(s => s.phase === 'confrontation' && s.request.adviserId === 'dev');
  assert.equal(resumed[0]!.request.humanResponses[0].text, 'The operations team.');
  assert.equal(resumed[0]!.request.humanResponses[0].requestId, request.id);
  assert.equal(sent.filter(s => s.phase === 'analysis').length, 3);
  assert.equal(sent.filter(s => s.phase === 'proposal').length, 1);
  assert.equal(done.confrontations.filter(c => c.round === 1 && c.adviserId === 'marketing').length, 1);
});
