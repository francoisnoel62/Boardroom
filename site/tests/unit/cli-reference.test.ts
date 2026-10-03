import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { documentedExitCodes, exitCodesIn, handledCommands, parseHelp, schemaRows } from '../../src/data/cli.ts';

const repo = resolve(import.meta.dirname, '../../..');
const cli = readFileSync(resolve(repo, 'src/cli.ts'), 'utf8');
const terminal = readFileSync(resolve(repo, 'src/terminal-validation.tsx'), 'utf8');

test('the reference is read from the help text the CLI prints', () => {
  const help = parseHelp(cli);
  assert.equal(help.title, 'BOARDROOM — local decision workspace');
  assert.equal(help.usage.length, 13);
  assert.deepEqual(help.usage[0], { command: 'demo', synopsis: 'boardroom demo [--next]', description: 'Read or resume the recorded example' });
  assert.deepEqual(help.options, ['--data-dir <directory>', '--terminal (Ink rendering)', '--json', '--help']);
});

test('commands in the help and commands the CLI accepts are the same set', () => {
  const documented = new Set(parseHelp(cli).usage.map(entry => entry.command));
  assert.deepEqual([...handledCommands(cli).accepted].sort(), [...documented].sort());
});

test('a command accepted without its own handler is reported, not documented as working', () => {
  assert.deepEqual(handledCommands(cli).withoutHandler, ['status']);
});

test('documented exit codes are exactly the codes set in the source', () => {
  assert.deepEqual(exitCodesIn([cli, terminal]), [1, 2, 130]);
  assert.deepEqual(documentedExitCodes.map(entry => entry.code), [0, ...exitCodesIn([cli, terminal])]);
});

test('a JSON schema becomes readable rows, including nested and enumerated fields', () => {
  const rows = schemaRows({
    type: 'object',
    required: ['mode', 'views'],
    properties: {
      mode: { const: 'recorded' },
      views: { type: 'array', items: { type: 'object', required: ['stance'], properties: { stance: { enum: ['APPROVED', 'REJECTED'] } } } },
      note: { type: 'string' },
    },
  });
  assert.deepEqual(rows, [
    { path: 'mode', type: '"recorded"', required: true },
    { path: 'views', type: 'array', required: true },
    { path: 'views[].stance', type: '"APPROVED" | "REJECTED"', required: true },
    { path: 'note', type: 'string', required: false },
  ]);
});
