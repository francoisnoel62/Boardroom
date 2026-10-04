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
  // The help grows with the CLI, so the count is not pinned: parseHelp throws on any line it cannot read, which keeps the parse lossless.
  assert.ok(help.usage.length >= 13);
  assert.deepEqual(help.usage.find(entry => entry.command === 'demo'), { command: 'demo', synopsis: 'boardroom demo [--next]', description: 'Read or resume the recorded example' });
  assert.deepEqual(help.options, ['--data-dir <directory>', '--terminal (Ink rendering)', '--json', '--help']);
});

test('commands in the help and commands the CLI accepts are the same set', () => {
  const documented = new Set(parseHelp(cli).usage.map(entry => entry.command));
  assert.deepEqual([...handledCommands(cli).accepted].sort(), [...documented].sort());
});

test('CLI help produces the same reference from LF and Windows CRLF checkouts', () => {
  const lf = cli.replaceAll('\r\n', '\n');
  assert.deepEqual(parseHelp(lf.replaceAll('\n', '\r\n')), parseHelp(lf));
});

test('a command accepted without its own handler is reported, not documented as working', () => {
  assert.deepEqual(handledCommands(cli).withoutHandler, ['status']);
});

test('handlers written as groups or by prefix are recognised, and an accepted command with none is reported', () => {
  const source = "if (!['a', 'b', 'c', 'credential-x', 'status'].includes(command)) throw 1;\nif (command === 'a') {}\nelse if (['b', 'c'].includes(command)) {}\nelse if (command.startsWith('credential-')) {}\n";
  assert.deepEqual(handledCommands(source).withoutHandler, ['status']);
});

test('a list that only validates arguments is not a handler', () => {
  const source = "if (!['a', 'b', 'status'].includes(command)) throw 1;\nif (['b'].includes(command) && !values.id) throw 2;\nif (command === 'a') {}\n";
  assert.deepEqual(handledCommands(source).withoutHandler, ['b', 'status']);
});

test('a first grouped dispatch branch is a handler just like an else-if branch', () => {
  const source = "if (!['answer', 'deny', 'status'].includes(command)) throw 1;\nif (['answer', 'deny'].includes(command)) {}\n";
  assert.deepEqual(handledCommands(source).withoutHandler, ['status']);
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
