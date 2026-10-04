import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('direct service and graph entry points neutralize inherited cloud tracing before checkpoint work', t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom inherited tracing '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const script = `import {Boardroom} from './src/application.ts';
    import {StorageProbe} from './src/technical-validation.ts';
    const app = new Boardroom(process.env.TEST_DATA);
    const probe = new StorageProbe(process.env.TEST_DATA);
    try { await probe.runCheckpoint(); console.log(JSON.stringify({
      smith: process.env.LANGSMITH_TRACING, chain: process.env.LANGCHAIN_TRACING,
      chainV2: process.env.LANGCHAIN_TRACING_V2, otel: process.env.OTEL_SDK_DISABLED,
      capabilities: app.capabilities() })); } finally {probe.close(); app.close();}`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 15000,
    env: { ...process.env, TEST_DATA: root, LANGSMITH_TRACING: 'true', LANGCHAIN_TRACING: 'true',
      LANGCHAIN_TRACING_V2: 'true', OTEL_SDK_DISABLED: 'false', LANGSMITH_API_KEY: 'privacy-sentinel',
      LANGSMITH_ENDPOINT: 'http://127.0.0.1:1', LANGCHAIN_ENDPOINT: 'http://127.0.0.1:1' } });
  assert.equal(result.status, 0, result.stderr);
  const status = JSON.parse(result.stdout);
  assert.equal(status.smith, 'false'); assert.equal(status.chain, 'false');
  assert.equal(status.chainV2, 'false'); assert.equal(status.otel, 'true');
  assert.ok(!result.stdout.includes('privacy-sentinel')); assert.ok(!result.stderr.includes('privacy-sentinel'));
});
