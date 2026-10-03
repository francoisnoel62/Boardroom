import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Boardroom } from '../src/application.ts';
import { HostSecretStore, SessionSecretStore } from '../src/secrets.ts';

const sentinel = 'SENTINEL-secret-must-not-escape-4c39';
const input = { id: 'private-route', providerId: 'provider-a', modelId: 'model-a',
  capabilities: { streaming: true, structuredOutput: 'json' as const, tools: false,
    cancellation: 'best-effort' as const, usage: 'tokens' as const }, limitations: ['Not verified.'] };

test('credentials stay at the secret boundary and unavailable vault errors never echo their bodies', async t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom secret boundary '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = new Boardroom(root);
  const secrets = new Map<string, string>();
  const store = { async set(ref: string, secret: string) { secrets.set(ref, secret); },
    async get(ref: string) { return secrets.get(ref); }, async delete(ref: string) { secrets.delete(ref); } };
  try {
    const route = app.configureRoute(input);
    await app.setRouteCredential(route.id, sentinel, store);
    assert.equal(secrets.get(route.credentialRef), sentinel);
    assert.deepEqual(await app.routeCredentialStatus(route.id, store), { status: 'available', source: 'injected' });
    const unavailable = { ...store, async set() { throw new Error(`Host vault failed: ${sentinel}`); },
      async get() { throw new Error(sentinel); } };
    await assert.rejects(app.setRouteCredential(route.id, sentinel, unavailable), error => {
      assert.match(String(error), /Protected credential store unavailable/);
      assert.ok(!String(error).includes(sentinel)); return true;
    });
    assert.deepEqual(await app.routeCredentialStatus(route.id, unavailable), { status: 'unavailable', source: 'injected' });
    assert.ok(!JSON.stringify(app.configuration()).includes(sentinel));
    app.close();
    for (const file of readdirSync(root)) assert.ok(!readFileSync(join(root, file)).includes(Buffer.from(sentinel)));
  } finally { app.close(); }
});

test('the real host vault round-trips a dummy token across store instances or reports unavailability', async t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom host vault '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = new Boardroom(root);
  const store = new HostSecretStore();
  try {
    const route = app.configureRoute(input);
    const before = await app.routeCredentialStatus(route.id, store);
    if (before.status === 'unavailable') {
      assert.notEqual(process.env.BOARDROOM_REQUIRE_HOST_VAULT, 'true', 'Required host vault is unavailable.');
      t.diagnostic(`Host vault unavailable on ${process.platform}; no fallback. Explicit session injection remains available.`);
      const session = new SessionSecretStore();
      await app.setRouteCredential(route.id, sentinel, session);
      assert.equal((await app.routeCredentialStatus(route.id, session)).status, 'available');
      session.clear(); assert.equal((await app.routeCredentialStatus(route.id, session)).status, 'missing');
      return;
    }
    await app.setRouteCredential(route.id, sentinel, store);
    assert.equal(await new HostSecretStore().get(route.credentialRef), sentinel);
    await app.deleteRouteCredential(route.id, store);
    assert.equal((await app.routeCredentialStatus(route.id, store)).status, 'missing');
    t.diagnostic(`Host vault set/reopen/read/delete verified on ${process.platform}.`);
  } finally {
    // UUID owned only by this test; never enumerate or alter existing credentials.
    try { await app.deleteRouteCredential(input.id, store); } catch { /* Unavailable host remains explicit above. */ }
    app.close();
  }
});
