import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { supportedModel } from '../src/providers/catalog.ts';
import { providerSetup, streamResponse, openaiEvents } from './support/providers.ts';

// The catalog's dated rates are only usable inside [asOf, validUntil]. The service receives the UTC date it
// should judge them against, so these cases never depend on the day the suite happens to run.
const { asOf, validUntil } = supportedModel('openai', 'gpt-4.1-mini-2025-04-14').pricing;
const shift = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00.000Z`) + days * 86400000).toISOString().slice(0, 10);
const noon = (day: string) => () => new Date(`${day}T12:00:00.000Z`);
const schema = z.strictObject({ ok: z.literal(true) });
const call = { adviserId: 'po', phase: 'preflight' as const, contextVersion: 1 as const, subjectVersion: 1, pool: 'work' as const,
  limits: { maxInputTokens: 1047576, maxOutputTokens: 1000, maxDurationMs: 1000 } };

async function attempt(t: Parameters<typeof providerSetup>[0], day: string) {
  let requests = 0;
  const { app, store, project, meeting } = providerSetup(t, async () => { requests++; return streamResponse(openaiEvents('{"ok":true}')); },
    undefined, noon(day));
  await app.setRouteCredential('po', 'DUMMY_KEY', store);
  const outcome = await app.callStructured(project.id, meeting.id, call, { text: 'Return ok.', schema }, store).then(
    result => ({ allowed: true as const, result }), error => ({ allowed: false as const, message: String(error.message) }));
  return { outcome, requests, ledger: app.callLedger(project.id, meeting.id) };
}

const admitted = (day: string) => async (t: Parameters<typeof providerSetup>[0]) => {
  const { outcome, requests, ledger } = await attempt(t, day);
  assert.equal(outcome.allowed, true); assert.equal(requests, 1); assert.equal(ledger.calls.length, 1);
};
const refused = (day: string) => async (t: Parameters<typeof providerSetup>[0]) => {
  const { outcome, requests, ledger } = await attempt(t, day);
  assert.equal(outcome.allowed, false);
  if (!outcome.allowed) assert.match(outcome.message, /pricing bound is not current/);
  assert.equal(requests, 0, 'no request may leave when the rates are outside their validity');
  assert.equal(ledger.calls.length, 0, 'a refused call leaves no reservation');
};

test('dated rates are judged against the injected UTC date: the day before the rates take effect', refused(shift(asOf, -1)));
test('dated rates are judged against the injected UTC date: the first day the rates are valid', admitted(asOf));
test('dated rates are judged against the injected UTC date: the last day the rates are valid', admitted(validUntil));
test('dated rates are judged against the injected UTC date: the day after the rates expire', refused(shift(validUntil, 1)));

test('rates that expire between two calls stop the second one before any request leaves', async t => {
  let requests = 0, today = asOf;
  const { app, store, project, meeting } = providerSetup(t, async () => { requests++; return streamResponse(openaiEvents('{"ok":true}')); },
    undefined, () => new Date(`${today}T12:00:00.000Z`));
  await app.setRouteCredential('po', 'DUMMY_KEY', store);
  const first = await app.callStructured(project.id, meeting.id, call, { text: 'Return ok.', schema }, store);
  assert.deepEqual(first.value, { ok: true });
  today = shift(validUntil, 1);
  await assert.rejects(app.callStructured(project.id, meeting.id, call, { text: 'Return ok.', schema }, store), /not current/);
  assert.equal(requests, 1);
});
