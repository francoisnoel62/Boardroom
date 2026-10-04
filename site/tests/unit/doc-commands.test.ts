import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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
