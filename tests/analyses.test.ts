import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Boardroom } from '../src/application.ts';
import { providerSetup, streamResponse, openaiEvents } from './support/providers.ts';

function response(model: string, body: unknown) {
  const text = JSON.stringify(body);
  return streamResponse(model.startsWith('claude') ? [
    { type: 'message_start', message: { model, usage: { input_tokens: 100 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', delta: { type: 'text_delta', text } },
    { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 10 } }, { type: 'message_stop' },
  ] : openaiEvents(text, { model }));
}
export { response };

test('insufficient batch budget refuses all three before HTTP and exposes each missing adviser', async t => {
  let frame: any, calls = 0;
  const { app, project, meeting, store } = providerSetup(t, async (_url, init) => {
    calls++; return response(JSON.parse(String(init?.body)).model, frame);
  });
  const bounded = app.prepareTeamMeeting({ projectId: project.id, teamId: 'team', question: 'Budget?', durationTargetSeconds: 600,
    costCeiling: { currency: 'USD', amount: 4.1 }, passages: meeting.context.passages.map(({ evidenceId, firstLine, lastLine }) => ({ evidenceId, firstLine, lastLine })) });
  // The funded minimum for this team (see reserves.test.ts) fits the ceiling and the framing call, but not the first analysis batch.
  app.configureExecution(project.id, bounded.id, { revisionMicros: 851168, conclusionMicros: 2744084, revisionMs: 120000, conclusionMs: 90000 });
  frame = { decisionQuestion: 'Budget?', summary: 'Frame', initialProposal: null, assumptions: [], references: bounded.context.passages };
  for (const id of ['po', 'dev', 'marketing']) await app.setRouteCredential(id, 'KEY', store);
  await app.startMeeting(project.id, bounded.id, store); await app.approveFraming(project.id, bounded.id, 1);
  const result = await app.analyseMeeting(project.id, bounded.id, store);
  assert.equal(result.status, 'incomplete'); assert.equal(calls, 1); assert.equal(result.analyses.length, 0);
  assert.deepEqual(result.outcomes.map(o => [o.adviserId, o.status]), [['po', 'failed'], ['dev', 'failed'], ['marketing', 'failed']]);
  assert.equal(app.callLedger(project.id, bounded.id).calls.length, 1);
  assert.equal(app.callLedger(project.id, bounded.id).heldReserveMicros, 3595252);
});

test('three independent analyses share frozen facts and persist each completion before the slow adviser', async t => {
  let frame: any, references: any, release!: () => void, ready!: () => void;
  const waiting = new Promise<void>(resolve => { ready = resolve; });
  const slow = new Promise<void>(resolve => { release = resolve; });
  const sent: any[] = [];
  const { app, store, project, meeting, root } = providerSetup(t, async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    const prompt = request.input ?? request.messages[0].content;
    if (!prompt.includes('independent initial analysis')) return response(request.model, frame);
    sent.push(JSON.parse(prompt.slice(prompt.indexOf('\n') + 1)));
    if (request.model.startsWith('claude')) { ready(); await slow; }
    return response(request.model, { assertions: [{ id: 'capacity', kind: 'fact', text: `SENTINEL_${request.model}`,
      references }], risks: ['Capacity'], assumptions: ['Demand'], recommendations: ['Pilot'] });
  });
  references = meeting.context.passages;
  frame = { decisionQuestion: 'Pilot?', summary: 'Approved common frame', initialProposal: null, assumptions: [], references };
  for (const id of ['po', 'dev', 'marketing']) await app.setRouteCredential(id, 'KEY_SENTINEL', store);
  await app.startMeeting(project.id, meeting.id, store); await app.approveFraming(project.id, meeting.id, 1);
  const run = app.analyseMeeting(project.id, meeting.id, store);
  await waiting;
  const reopened = new Boardroom(root);
  try {
  for (let i = 0; i < 100 && (await reopened.inspectAnalyses(project.id, meeting.id)).analyses.length !== 2; i++) await new Promise(r => setTimeout(r, 10));
  assert.equal((await reopened.inspectAnalyses(project.id, meeting.id)).analyses.length, 2);
  release();
  const result = await run;
  assert.equal(result.status, 'complete'); assert.equal(result.analyses.length, 3);
  assert.equal(new Set(result.analyses.map((a: any) => a.factsSha256)).size, 1);
  assert.equal(sent.length, 3);
  for (const input of sent) {
    assert.equal(JSON.stringify(input).includes('SENTINEL_'), false);
    assert.equal(JSON.stringify(input).includes('PRIVATE_UNSELECTED'), false);
    assert.equal(input.framing.summary, 'Approved common frame');
    assert.equal(input.passages[0].text, 'Two engineers.');
  }
  assert.deepEqual(sent.map(input => input.factsSha256), result.analyses.map((a: any) => a.factsSha256));
  assert.deepEqual((await reopened.inspectAnalyses(project.id, meeting.id)).analyses, result.analyses);
  await assert.rejects(app.analyseMeeting(project.id, meeting.id, store), /already attempted/);
  assert.equal(app.callLedger(project.id, meeting.id).calls.filter(c => c.phase === 'analysis').length, 3);
  } finally { reopened.close(); release(); await run; }
});

test('two valid analyses survive malformed foreign evidence, and a corrected frame makes them historical', async t => {
  let frame: any, references: any, attempts = 0;
  const { app, project, meeting, store } = providerSetup(t, async (_url, init) => {
    const request = JSON.parse(String(init?.body)), prompt = request.input ?? request.messages[0].content;
    if (!prompt.includes('independent initial analysis')) return response(request.model, frame);
    if (request.model.startsWith('claude')) attempts++;
    return response(request.model, { assertions: [{ id: 'capacity', kind: 'fact', text: 'Two engineers',
      references: request.model.startsWith('claude') ? references.map((r: any) => ({ ...r, firstLine: 2, lastLine: 2 })) : references }],
      risks: [], assumptions: [], recommendations: ['Pilot'] });
  });
  references = meeting.context.passages;
  frame = { decisionQuestion: 'Pilot?', summary: 'Small', initialProposal: null, assumptions: [], references };
  for (const id of ['po', 'dev', 'marketing']) await app.setRouteCredential(id, 'KEY', store);
  await assert.rejects(app.analyseMeeting(project.id, meeting.id, store), /approved framing/);
  await app.startMeeting(project.id, meeting.id, store); await app.approveFraming(project.id, meeting.id, 1);
  const result = await app.analyseMeeting(project.id, meeting.id, store);
  assert.equal(result.status, 'incomplete'); assert.equal(result.analyses.length, 2); assert.equal(attempts, 2);
  assert.equal(result.outcomes.find(o => o.adviserId === 'dev')?.status, 'failed');
  const calls = app.callLedger(project.id, meeting.id).calls.filter(c => c.adviserId === 'dev');
  assert.deepEqual(calls.map(c => c.reason), ['invalid-output', 'invalid-output']);
  await app.correctFraming(project.id, meeting.id, 1, { ...frame, summary: 'New direction' });
  const changed = await app.inspectAnalyses(project.id, meeting.id);
  assert.equal(changed.analyses.length, 2); assert.equal(changed.current.length, 0);
  await assert.rejects(app.analyseMeeting(project.id, meeting.id, store), /approved framing/);
});
