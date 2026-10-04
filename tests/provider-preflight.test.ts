import assert from 'node:assert/strict';
import { test } from 'node:test';
import { providerSetup } from './support/providers.ts';
import { echoSynthetic } from './support/live.ts';

const readWire = (init: RequestInit | undefined) => {
  const wire = JSON.parse(String(init?.body)), prompt: string = wire.input ?? wire.messages[0].content;
  return { wire, prompt, schema: wire.text?.format.schema ?? wire.output_config.format.schema };
};

test('preflight sends each schema the route will receive, with synthetic data only, before the route is verified', async t => {
  const seen: { model: string; prompt: string; schema: any }[] = [];
  const { app, store, project, meeting } = providerSetup(t, async (_url, init) => {
    const { wire, prompt, schema } = readWire(init);
    seen.push({ model: wire.model, prompt, schema });
    return echoSynthetic(init);
  });
  for (const id of ['po', 'dev', 'marketing']) await app.setRouteCredential(id, 'DUMMY_KEY', store);
  const author = await app.preflight(project.id, meeting.id, 'po', store);
  assert.equal(author.verified, true);
  assert.deepEqual(author.checks.map(check => check.name), ['framing', 'analysis', 'proposal', 'revision', 'final-view']);
  const developer = await app.preflight(project.id, meeting.id, 'dev', store);
  assert.equal(developer.verified, true);
  assert.deepEqual(developer.checks.map(check => check.name), ['analysis', 'confrontation', 'final-view']);
  assert.equal(seen.length, 8);
  for (const request of seen) {
    assert.match(request.prompt, /Synthetic connectivity and schema check/);
    for (const userData of ['First?', 'Two engineers', 'PRIVATE_UNSELECTED', 'Four weeks']) assert.equal(request.prompt.includes(userData), false, 'preflight never carries the meeting question or sources');
  }
  const anthropic = seen.filter(request => request.model.startsWith('claude'));
  assert.equal(anthropic.length, 3);
  assert.equal(JSON.stringify(anthropic.map(request => request.schema)).includes('exclusiveMinimum'), false);
  const routes = app.configuration().routes;
  assert.equal(routes.find(route => route.id === 'po')?.verification, 'verified');
  assert.equal(routes.find(route => route.id === 'dev')?.verification, 'verified');
  assert.equal(routes.find(route => route.id === 'marketing')?.verification, 'unverified');
});

test('a provider that rejects one phase schema leaves the route unverified, with a safe diagnostic and no echoed body', async t => {
  let requests = 0;
  const { app, store, project, meeting } = providerSetup(t, async (_url, init) => {
    requests++;
    const { schema } = readWire(init);
    if (schema.properties.assertions) return new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error',
      message: 'SECRET_BODY_ECHO exclusiveMinimum is not supported' } }), { status: 400, headers: { 'content-type': 'application/json', 'request-id': 'req_01ABCdef' } });
    return echoSynthetic(init);
  });
  await app.setRouteCredential('dev', 'DUMMY_KEY', store);
  const result = await app.preflight(project.id, meeting.id, 'dev', store);
  assert.equal(result.verified, false);
  assert.deepEqual(result.checks.map(check => [check.name, check.ok]), [['analysis', false]]);
  assert.equal(requests, 1, 'a failed check stops the campaign; nothing is retried');
  assert.equal(result.receipts.at(-1)?.reason, 'provider-error');
  assert.deepEqual(result.receipts.at(-1)?.diagnostic, { httpStatus: 400, requestId: 'req_01ABCdef', errorType: 'invalid_request_error' });
  assert.equal(JSON.stringify(app.callLedger(project.id, meeting.id)).includes('SECRET_BODY_ECHO'), false);
  assert.equal(app.configuration().routes.find(route => route.id === 'dev')?.verification, 'unverified');
});
