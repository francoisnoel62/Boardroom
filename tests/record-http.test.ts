import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// The recorder is the campaign's own tool: loaded with --import from outside the candidate, it keeps what the
// application sends to providers (bodies only) so the independence of the initial analyses can be inspected.
test('the qualification recorder keeps request bodies, passes requests through and never keeps credentials', async t => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom record ')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const received: { auth: string | undefined; body: string }[] = [];
  const server = createServer((request, response) => {
    let body = ''; request.on('data', chunk => { body += chunk; });
    request.on('end', () => { received.push({ auth: request.headers.authorization, body }); response.end('ok'); });
  }).listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => { server.close(); });
  const port = (server.address() as { port: number }).port, log = join(root, 'requests.jsonl');
  const program = `const r = await fetch('http://127.0.0.1:${port}/v1/responses', { method: 'POST', headers: { Authorization: 'Bearer SECRET_TOKEN_SENTINEL' }, body: JSON.stringify({ input: 'selected passage' }) }); console.log(await r.text());`;
  // Asynchronous: the server above lives in this process and must keep answering while the child runs.
  const child = spawn(process.execPath, ['--import', './qualification/record-http.mjs', '--input-type=module', '-e', program],
    { env: { ...process.env, BOARDROOM_QUALIFICATION_RECORD: log } });
  let stdout = '', stderr = ''; child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const [code] = await once(child, 'exit');
  assert.equal(code, 0, stderr); assert.equal(stdout.trim(), 'ok');
  assert.equal(received.length, 1); assert.equal(received[0]!.auth, 'Bearer SECRET_TOKEN_SENTINEL', 'the request itself is untouched');
  const kept = readFileSync(log, 'utf8'); const [line] = kept.trim().split('\n');
  assert.deepEqual(JSON.parse(line!).body, { input: 'selected passage' });
  assert.equal(JSON.parse(line!).url, `http://127.0.0.1:${port}/v1/responses`);
  assert.equal(kept.includes('SECRET_TOKEN_SENTINEL'), false); assert.equal(kept.toLowerCase().includes('authorization'), false);
  const refused = spawnSync(process.execPath, ['--import', './qualification/record-http.mjs', '-e', '0'], { encoding: 'utf8', env: { ...process.env, BOARDROOM_QUALIFICATION_RECORD: '' } });
  assert.notEqual(refused.status, 0); assert.match(refused.stderr, /BOARDROOM_QUALIFICATION_RECORD/);
});
