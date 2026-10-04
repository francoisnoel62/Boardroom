import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { providerSetup, streamResponse, openaiEvents } from './support/providers.ts';
import { echoSynthetic } from './support/live.ts';
const schema = z.strictObject({ ok: z.literal(true) });
const call = (adviserId = 'po') => ({ adviserId, phase: 'preflight' as const, contextVersion: 1 as const,
  subjectVersion: 1, pool: 'work' as const, limits: { maxInputTokens: adviserId === 'dev' ? 200000 : 1047576,
    maxOutputTokens: 1000, maxDurationMs: 1000 } });

test('OpenAI streamed structured output travels through durable control with pinned origin, bounds and no tools', async t => {
  const sent: { url: string; body: any; headers: Headers }[] = [];
  const { app, store, project, meeting } = providerSetup(t, async (url, init) => {
    sent.push({ url: String(url), body: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) });
    return streamResponse(openaiEvents('{"ok":true}'));
  });
  await app.setRouteCredential('po', 'SENTINEL_KEY', store);
  const result = await app.callStructured(project.id, meeting.id, call(), { text: 'Return ok.', schema }, store);
  assert.deepEqual(result.value, { ok: true }); assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://api.openai.com/v1/responses');
  assert.equal(sent[0].body.store, false); assert.deepEqual(sent[0].body.tools, []);
  assert.equal(sent[0].body.max_output_tokens, 1000); assert.equal(sent[0].body.service_tier, 'default');
  assert.equal(sent[0].body.text.format.type, 'json_schema');
  assert.equal(app.callLedger(project.id, meeting.id).knownCostMicros, 56);
  assert.equal(JSON.stringify(app.callLedger(project.id, meeting.id)).includes('SENTINEL_KEY'), false);
  assert.equal(app.configuration().routes[0].verification, 'unverified');
});

test('Anthropic requires a matching start and an end_turn receipt; premature message_stop is never accepted', async t => {
  let request: any, malformed = true;
  const { app, store, project, meeting } = providerSetup(t, async (_url, init) => {
    request = JSON.parse(String(init?.body));
    const content = [{ type: 'content_block_delta', delta: { type: 'text_delta', text: '{"ok":true}' } }];
    return streamResponse(malformed ? [...content, { type: 'message_stop' }] : [
      { type: 'message_start', message: { model: 'claude-haiku-4-5-20251001', usage: { input_tokens: 100, cache_read_input_tokens: 20 } } },
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }, ...content,
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 10 } }, { type: 'message_stop' },
    ]);
  });
  await app.setRouteCredential('dev', 'SENTINEL_ANTHROPIC', store);
  const failed = await app.callStructured(project.id, meeting.id, call('dev'), { text: 'Return ok.', schema }, store);
  assert.equal(failed.value, undefined); assert.equal(failed.receipts[0].status, 'uncertain');
  malformed = false;
  const result = await app.callStructured(project.id, meeting.id, call('dev'), { text: 'Return ok.', schema }, store);
  assert.deepEqual(result.value, { ok: true }); assert.equal(result.receipts[0].knownCostMicros, 170);
  assert.equal(request.tools, undefined); assert.deepEqual(request.thinking, { type: 'disabled' });
  assert.equal(request.max_tokens, 1000); assert.equal(request.output_config.format.type, 'json_schema');
});

test('one invalid JSON/reference repair gets a separate reservation and a second invalid output ends visibly', async t => {
  let calls = 0;
  const { app, store, project, meeting } = providerSetup(t, async () => {
    calls++; return streamResponse(openaiEvents(calls === 1 ? '{broken' : '{"ok":true}'));
  });
  await app.setRouteCredential('po', 'KEY', store);
  const repaired = await app.callStructured(project.id, meeting.id, call(), { text: 'Return ok.', schema }, store);
  assert.equal(calls, 2); assert.deepEqual(repaired.value, { ok: true });
  assert.equal(repaired.receipts[0].reason, 'invalid-output'); assert.equal(repaired.receipts[0].knownCostMicros, 56);
  assert.notEqual(repaired.receipts[0].id, repaired.receipts[1].id);
  const invalidReferences = await app.callStructured(project.id, meeting.id, call(), {
    text: 'Return ok.', schema, validate: () => false }, store);
  assert.equal(calls, 4); assert.equal(invalidReferences.value, undefined);
  assert.equal(invalidReferences.receipts.length, 2);
  assert.ok(invalidReferences.receipts.every(receipt => receipt.reason === 'invalid-output'));
});

test('refusal, truncation, tool requests, model substitution and quota never become accepted JSON or trigger retries', async t => {
  let next: Response, requests = 0;
  const { app, store, project, meeting } = providerSetup(t, async () => { requests++; return next; });
  await app.setRouteCredential('po', 'SECRET_IN_ERROR', store);
  for (const [reason, overrides] of [
    ['refusal', { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'SECRET_IN_ERROR' }] }] }],
    ['truncated', { status: 'incomplete' }], ['tool-blocked', { output: [{ type: 'function_call' }] }],
    ['identity-mismatch', { model: 'unexpected' }],
  ] as const) {
    next = streamResponse(openaiEvents('{"ok":true}', overrides));
    const result = await app.callStructured(project.id, meeting.id, call(), { text: 'Return ok.', schema }, store);
    assert.equal(result.value, undefined); assert.equal(result.receipts.length, 1);
    assert.equal(result.receipts[0].reason, reason);
    assert.equal(result.receipts[0].knownCostMicros, ['tool-blocked', 'identity-mismatch'].includes(reason) ? undefined : 56);
  }
  for (const status of [401, 429, 500]) {
    next = new Response('SECRET_IN_ERROR raw upstream body', { status });
    const result = await app.callStructured(project.id, meeting.id, call(), { text: 'Return ok.', schema }, store);
    assert.equal(result.value, undefined); assert.equal(result.receipts[0].knownCostMicros, undefined);
    assert.equal(result.receipts[0].reason, status === 401 ? 'authentication' : status === 429 ? 'quota' : 'provider-error');
  }
  assert.equal(requests, 7); assert.equal(JSON.stringify(app.callLedger(project.id, meeting.id)).includes('SECRET_IN_ERROR'), false);
});

test('connection verification is earned by explicit metered preflight and invalidated by credential replacement', async t => {
  const { app, store, project, meeting } = providerSetup(t, async (_url, init) => echoSynthetic(init));
  await app.setRouteCredential('po', 'KEY_ONE', store);
  assert.equal(app.getRoute('po').verification, 'unverified');
  const tested = await app.preflight(project.id, meeting.id, 'po', store);
  assert.equal(tested.verified, true); assert.equal(app.getRoute('po').verification, 'verified');
  await app.setRouteCredential('po', 'KEY_TWO', store);
  assert.equal(app.getRoute('po').verification, 'unverified');
});

test('missing usage keeps the entire bound; missing credentials or understated bounds fail before HTTP', async t => {
  let requests = 0;
  const { app, store, project, meeting } = providerSetup(t, async () => {
    requests++; return streamResponse(openaiEvents('{"ok":true}', { usage: undefined }));
  });
  await assert.rejects(app.callStructured(project.id, meeting.id, call(), { text: 'Return ok.', schema }, store), /Credential unavailable/);
  assert.equal(requests, 0); assert.equal(app.callLedger(project.id, meeting.id).calls.length, 0);
  await app.setRouteCredential('po', 'KEY', store);
  await assert.rejects(app.callStructured(project.id, meeting.id, { ...call(), limits: { ...call().limits, maxInputTokens: 1000 } },
    { text: 'Return ok.', schema }, store), /full-context/);
  const result = await app.callStructured(project.id, meeting.id, call(), { text: 'Return ok.', schema }, store);
  assert.deepEqual(result.value, { ok: true }); assert.equal(result.receipts[0].knownCostMicros, undefined);
  assert.equal(app.callLedger(project.id, meeting.id).committedMicros, result.receipts[0].reservedMicros);
});

test('HTTP cancellation and a stream ending without its final receipt retain uncertain billing', async t => {
  let signal: AbortSignal | undefined, cancelled = false, stall = true;
  const { app, store, project, meeting } = providerSetup(t, async (_url, init) => {
    signal = init?.signal as AbortSignal;
    if (!stall) return streamResponse([{ type: 'response.output_text.delta', delta: '{"ok":true}' }]);
    return new Response(new ReadableStream({ start(controller) {
      signal!.addEventListener('abort', () => { cancelled = true; controller.error(new Error('SECRET_RAW_ABORT')); });
    } }), { headers: { 'Content-Type': 'text/event-stream' } });
  });
  await app.setRouteCredential('po', 'KEY', store);
  const timed = await app.callStructured(project.id, meeting.id, { ...call(), limits: { ...call().limits, maxDurationMs: 30 } },
    { text: 'Return ok.', schema }, store);
  assert.equal(cancelled, true); assert.equal(signal?.aborted, true);
  assert.equal(timed.receipts[0].reason, 'timeout'); assert.equal(timed.receipts[0].knownCostMicros, undefined);
  stall = false;
  const cut = await app.callStructured(project.id, meeting.id, call(), { text: 'Return ok.', schema }, store);
  assert.equal(cut.value, undefined); assert.equal(cut.receipts[0].status, 'uncertain');
  assert.equal(JSON.stringify(app.callLedger(project.id, meeting.id)).includes('SECRET_RAW_ABORT'), false);
});

test('unfunded correction leaves the first invalid receipt inspectable without a second request', async t => {
  let requests = 0;
  const { app, store, project, evidence } = providerSetup(t, async () => {
    requests++; return streamResponse(openaiEvents('{broken', { usage: undefined }));
  });
  const meeting = app.prepareTeamMeeting({ projectId: project.id, teamId: 'team', question: 'Small budget?',
    durationTargetSeconds: 60, costCeiling: { amount: 0.5, currency: 'USD' },
    passages: [{ evidenceId: evidence.id, firstLine: 1, lastLine: 1 }] });
  app.configureExecution(project.id, meeting.id, { revisionMicros: 0, conclusionMicros: 0, revisionMs: 0, conclusionMs: 0 });
  await app.setRouteCredential('po', 'KEY', store);
  await assert.rejects(app.callStructured(project.id, meeting.id, call(), { text: 'Return ok.', schema }, store), /insufficient budget/);
  assert.equal(requests, 1); const ledger = app.callLedger(project.id, meeting.id);
  assert.equal(ledger.calls.length, 1); assert.equal(ledger.calls[0].reason, 'invalid-output');
  assert.equal(ledger.committedMicros, ledger.calls[0].reservedMicros);
});

