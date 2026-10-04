import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { extractDocCommands, toInvocation } from '../../scripts/doc-commands.mjs';

const docs = resolve(import.meta.dirname, '../../src/content/docs');
const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : path.endsWith('.mdx') ? [path] : [];
});

test('only commands in blocks marked doc-test are extracted, placeholders excluded', () => {
  const mdx = [
    '```sh doc-test', 'node dist/cli.js demo --data-dir .boardroom/example', '', '```',
    '```sh', 'node dist/cli.js terminal-check', '```',
    '   ```sh doc-test', '   ./boardroom export --output ./exports', '   node dist/cli.js evidence --id <id> --page 2', '   ```',
  ].join('\n');
  assert.deepEqual(extractDocCommands(mdx), [
    'node dist/cli.js demo --data-dir .boardroom/example',
    './boardroom export --output ./exports',
  ]);
});

test('commands run through the checkout or the packaged launcher of the current platform', () => {
  assert.deepEqual(toInvocation('node dist/cli.js demo --next', { platform: 'linux', node: '/usr/bin/node' }),
    { kind: 'checkout', file: '/usr/bin/node', args: ['dist/cli.js', 'demo', '--next'] });
  assert.deepEqual(toInvocation('./boardroom doctor --json', { platform: 'darwin', node: 'node' }),
    { kind: 'candidate', file: './boardroom', args: ['doctor', '--json'] });
  assert.deepEqual(toInvocation('./boardroom doctor --json', { platform: 'win32', node: 'node.exe' }),
    { kind: 'candidate', file: '.\\boardroom.cmd', args: ['doctor', '--json'] });
  assert.throws(() => toInvocation('rm -rf /', { platform: 'linux', node: 'node' }), /Unsupported documented command/);
});

test('the documentation marks runnable commands for both the checkout and the candidate', () => {
  const commands = files(docs).flatMap(file => extractDocCommands(readFileSync(file, 'utf8')));
  assert.ok(commands.filter(command => command.startsWith('node dist/cli.js')).length >= 10);
  assert.ok(commands.some(command => command.startsWith('./boardroom')));
  for (const command of commands) toInvocation(command, { platform: 'linux', node: 'node' });
});

test('documented candidate commands run from a copied package with accents and spaces', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'boardroom-doc-candidate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, 'checkout'), candidate = join(root, 'paquet François avec espaces');
  const documents = join(repo, 'site/src/content/docs');
  mkdirSync(documents, { recursive: true });
  mkdirSync(join(candidate, 'assets'), { recursive: true });
  writeFileSync(join(candidate, 'assets/evidence.txt'), 'fictional evidence');
  writeFileSync(join(documents, 'example.mdx'), '```sh doc-test\n./boardroom --help\n```\n');
  const windows = process.platform === 'win32';
  const launcher = join(candidate, windows ? 'boardroom.cmd' : 'boardroom');
  writeFileSync(launcher, windows
    ? '@echo off\r\nif not exist "%~dp0assets\\evidence.txt" exit /b 9\r\necho candidate-ok\r\n'
    : '#!/bin/sh\nROOT=$(CDPATH= cd -- "${0%/*}" && pwd)\ntest -f "$ROOT/assets/evidence.txt" || exit 9\necho candidate-ok\n');
  chmodSync(launcher, 0o755);
  const result = spawnSync(process.execPath, [resolve(import.meta.dirname, '../../scripts/doc-commands.mjs'), '--repo', repo, '--candidate', candidate],
    { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr + result.stdout);
  assert.match(result.stdout, /1 documented commands, 0 failed/);
  assert.equal(readFileSync(join(candidate, 'assets/evidence.txt'), 'utf8'), 'fictional evidence');
});
