import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Boardroom } from '../src/application.ts';
import { HostSecretStore } from '../src/secrets.ts';
import { openTerminal } from './support/terminal.ts';

test('credential input masks a token on a real PTY and restores input on cancellation', { timeout: 20000 }, async t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom masked credential '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = new Boardroom(root);
  const route = app.configureRoute({ id: 'masked', providerId: 'a', modelId: 'a1', capabilities: {
    streaming: true, structuredOutput: 'json', tools: false, cancellation: 'best-effort', usage: 'tokens',
  }, limitations: ['Unverified.'] });
  const sentinel = 'PTY-sentinel-private-39de';
  try {
    const cancelled = openTerminal(t, ['dist/cli.js', 'credential-set', '--route', route.id, '--data-dir', root]);
    await cancelled.waitFor(/Credential \(masked/);
    cancelled.write(sentinel); await cancelled.waitFor(/\*{10}/); cancelled.write('\x03');
    assert.equal((await cancelled.finish()).exitCode, 1);
    assert.ok(!cancelled.raw().includes(sentinel)); assert.match(cancelled.raw(), /cancelled/);
    const terminal = openTerminal(t, ['dist/cli.js', 'credential-set', '--route', route.id, '--data-dir', root]);
    await terminal.waitFor(/Credential \(masked/);
    terminal.write(sentinel + 'x'); await terminal.waitFor(/\*{10}/); terminal.write('\x7f\r');
    const result = await terminal.finish();
    assert.ok(!terminal.raw().includes(sentinel));
    if (result.exitCode === 0) {
      assert.equal(await new HostSecretStore().get(route.credentialRef), sentinel);
    } else {
      assert.notEqual(process.env.BOARDROOM_REQUIRE_HOST_VAULT, 'true');
      assert.match(terminal.raw(), /Protected credential store unavailable/);
    }
  } finally {
    await app.deleteRouteCredential(route.id, new HostSecretStore()).catch(() => {});
    app.close();
  }
});
