import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openTerminal } from './support/terminal.ts';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

test('terminal validation refuses piped input without creating project data', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom terminal refusal '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const data = join(root, 'data');
  const result = spawnSync(process.execPath, [cli, 'terminal-check', '--data-dir', data], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires an interactive terminal/);
  assert.equal(existsSync(data), false);
});

test('pasted terminal controls remain harmless text and do not cancel the probe', { timeout: 20000 }, async (t) => {
  const terminal = openTerminal(t, [cli, 'terminal-check']);
  await terminal.waitFor(/Stream tick: [1-9]/);
  terminal.write('\x1b[200~café \x1b[31mred\x1b[0m\x03\x1b[201~');
  await terminal.waitFor(/Draft: café \[31mred\[0m/);
  terminal.write('\r');
  await terminal.waitFor(/Accepted: "café \[31mred\[0m"/);
  terminal.write('\x1b');
  assert.equal((await terminal.finish()).exitCode, 130);
});

test('resizing narrower and wider preserves an editable Unicode draft during streaming', { timeout: 20000 }, async (t) => {
  const terminal = openTerminal(t, [cli, 'terminal-check']);
  await terminal.waitFor(/Window: 100x30/);
  terminal.write('capacité 😀');
  await terminal.waitFor(/Draft: capacité 😀/);
  terminal.resize(44, 18);
  await terminal.waitFor(/Window: 44x18/);
  await terminal.waitFor(/Draft: capacité 😀/);
  terminal.resize(110, 34);
  await terminal.waitFor(/Window: 110x34/);
  terminal.write('\r');
  await terminal.waitFor(/Accepted: "capacité 😀"/);
  terminal.write('\x1b');
  assert.equal((await terminal.finish()).exitCode, 130);
});

test('a bracketed multiline paste stays one draft until Enter and paste mode is restored on exit', { timeout: 20000 }, async (t) => {
  const terminal = openTerminal(t, [cli, 'terminal-check']);
  await terminal.waitFor(/Stream tick: [1-9]/);
  terminal.write('\x1b[200~Capacity:\r\ncafé pilot\x1b[201~');
  const draft = await terminal.waitFor(/Draft: Capacity:\ncafé pilot/);
  assert.match(draft, /Accepted: ""/);
  terminal.write('\r');
  await terminal.waitFor(/Accepted: "Capacity:\\ncafé pilot"/);
  terminal.write('\x1b');
  assert.equal((await terminal.finish()).exitCode, 130);
  assert.match(terminal.raw(), /\x1b\[\?2004h/);
  assert.match(terminal.raw(), /\x1b\[\?2004l/);
});

test('Unicode input and backspace preserve whole graphemes during streaming', { timeout: 20000 }, async (t) => {
  const terminal = openTerminal(t, [cli, 'terminal-check']);
  await terminal.waitFor(/Stream tick: [1-9]/);
  terminal.write('café 😀e\u0301');
  await terminal.waitFor(/Draft: café 😀é/);
  terminal.write('\x7f');
  await terminal.waitFor(/^Draft: café 😀$/m);
  terminal.write('\r');
  await terminal.waitFor(/Accepted: "café 😀"/);
  terminal.write('\x1b');
  assert.equal((await terminal.finish()).exitCode, 130);
});

test('Escape and Ctrl+C cancel the stream, restore the cursor and exit without project writes', { timeout: 30000 }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom terminal cancel '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const key of ['\x1b', '\x03']) {
    const data = join(root, key === '\x1b' ? 'escape' : 'ctrl-c');
    const terminal = openTerminal(t, [cli, 'terminal-check', '--data-dir', data]);
    await terminal.waitFor(/Stream tick: [1-9]/);
    terminal.write(key);
    assert.equal((await terminal.finish()).exitCode, 130);
    await terminal.waitFor(/Stream cancelled/);
    assert.match(terminal.raw(), /\x1b\[\?25h/);
    assert.equal(existsSync(data), false);
  }
});

test('typing during a fictional stream stays responsive in a real TTY even with CI set', { timeout: 20000 }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom live terminal '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const terminal = openTerminal(t, [cli, 'terminal-check', '--data-dir', join(root, 'data')], { env: { CI: 'true' } });
  await terminal.waitFor(/Technical validation — fictional stream/);
  await terminal.waitFor(/Stream tick: [1-9]/);
  terminal.write('pilot');
  const typed = await terminal.waitFor(/Draft: pilot/);
  const tickAtInput = Number(typed.match(/Stream tick: (\d+)/)?.[1]);
  await terminal.waitFor(text => Number(text.match(/Stream tick: (\d+)/)?.[1]) > tickAtInput
    && text.includes('Draft: pilot'));
  terminal.write('\r');
  await terminal.waitFor(/Accepted: "pilot"/);
});
