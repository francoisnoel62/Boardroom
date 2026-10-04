import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Boardroom } from '../src/application.ts';
import { ExportOperationSchema } from '../src/domain.ts';

test('playback history survives reopen and readers advance one shared position', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom journal é '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let app = new Boardroom(root);
  const project = app.openDemo();
  const first = app.nextRecordedMessage()!;
  const other = new Boardroom(root);
  try { assert.equal(other.nextRecordedMessage()?.role, 'Lead Developer'); }
  finally { other.close(); }
  const history = app.history(project.id);
  assert.deepEqual(history.events.map(event => event.type), ['recorded.message', 'recorded.message']);
  assert.deepEqual(history.events.map(event => event.sequence), [1, 2]);
  assert.equal(history.events[0]?.type === 'recorded.message' && history.events[0].messageId, first.id);
  assert.equal(app.openRecordedExample().position, 2);
  assert.deepEqual(app.history('another-project'), { events: [], operations: [] });
  app.close();
  app = new Boardroom(root);
  try {
    assert.deepEqual(app.history(project.id), history);
    while (app.nextRecordedMessage()) { /* Finish the saved recording. */ }
    assert.equal(app.history(project.id).events.length, 5);
    assert.equal(app.nextRecordedMessage(), null);
    assert.equal(app.history(project.id).events.length, 5);
  } finally { app.close(); }
});

test('history remains consistent while another process completes exports', { timeout: 15000 }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom concurrent history '));
  const app = new Boardroom(join(root, 'data'));
  app.nextRecordedMessage();
  const source = `
    import { Boardroom } from ${JSON.stringify(new URL('../src/application.ts', import.meta.url).href)};
    const app = new Boardroom(process.argv[1]);
    process.send('ready');
    process.once('message', () => {
      for (let index = 0; index < 30; index++) app.exportRecordedExample(process.argv[2]);
      app.close();
      process.send('done');
      process.disconnect();
    });
  `;
  const child = spawn(process.execPath, ['--input-type=module', '-e', source, app.dataDirectory, join(root, 'output')], {
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGKILL');
      await exited;
    }
    app.close();
    rmSync(root, { recursive: true, force: true });
  });
  await Promise.race([
    once(child, 'message'),
    once(child, 'exit').then(() => { throw new Error('Writer exited before becoming ready.'); }),
  ]);
  let done = false;
  child.on('message', () => { done = true; });
  child.on('exit', () => { done = true; });
  child.send('export');
  do {
    const history = app.history('launch-ledger');
    for (const operation of history.operations) {
      assert.ok(history.events.some(event => event.type === 'export.prepared' && event.operationId === operation.id));
      assert.equal(history.events.some(event => event.type === 'export.completed' && event.operationId === operation.id),
        operation.status === 'completed');
    }
    await new Promise<void>(resolve => setImmediate(resolve));
  } while (!done);
  assert.equal(app.history('launch-ledger').operations.length, 30);
});

test('simultaneous first readers cannot reset playback or emit a message twice', { timeout: 15000 }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom first readers '));
  const source = `
    import { Boardroom } from ${JSON.stringify(new URL('../src/application.ts', import.meta.url).href)};
    process.send('spawned');
    process.once('message', () => {
      const app = new Boardroom(process.argv[1]);
      process.send('ready');
      process.once('message', () => {
        process.send(app.nextRecordedMessage());
        app.close();
        process.disconnect();
      });
    });
  `;
  const children = Array.from({ length: 4 }, () => spawn(process.execPath, ['--input-type=module', '-e', source, root], {
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  }));
  const errors = new Map<typeof children[number], string>();
  for (const child of children) child.stderr.on('data', bytes => errors.set(child, (errors.get(child) ?? '') + bytes));
  t.after(async () => {
    await Promise.all(children.map(async child => {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit');
        child.kill('SIGKILL');
        await exited;
      }
    }));
    rmSync(root, { recursive: true, force: true });
  });
  const next = (child: typeof children[number]) => Promise.race([
    once(child, 'message').then(([message]) => message),
    once(child, 'exit').then(([code]) => { throw new Error(`Reader exited before replying (${code}): ${errors.get(child) ?? ''}`); }),
  ]);
  await Promise.all(children.map(child => next(child)));
  const opened = children.map(child => next(child));
  for (const child of children) child.send('open');
  await Promise.all(opened);
  const replies = children.map(child => next(child));
  for (const child of children) child.send('advance');
  const messages = await Promise.all(replies);
  assert.equal(new Set(messages.map(message => message.id)).size, 4);
  const app = new Boardroom(root);
  try {
    assert.equal(app.openRecordedExample().position, 4);
    assert.deepEqual(app.history('launch-ledger').events.map(event =>
      event.type === 'recorded.message' ? event.position : null), [1, 2, 3, 4]);
    assert.equal(app.nextRecordedMessage()?.phase, 'final-views');
  } finally { app.close(); }
});

test('an export execution handle cannot repeat a completed or failed attempt', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom single export attempt '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = new Boardroom(join(root, 'data'));
  try {
    const prepared = app.prepareRecordedExport(join(root, 'output'));
    const result = prepared.execute();
    const successful = app.history('launch-ledger');
    assert.throws(() => prepared.execute(), /already attempted/);
    assert.deepEqual(app.history('launch-ledger'), successful);
    assert.match(readFileSync(result.memo, 'utf8'), /Human decision: pending/);
    const original = join(root, 'original.md');
    writeFileSync(original, 'Original');
    const refused = app.prepareRecordedExport(original);
    assert.throws(() => refused.execute(), /failed/);
    const failed = app.history('launch-ledger');
    assert.throws(() => refused.execute(), /already attempted/);
    assert.deepEqual(app.history('launch-ledger'), failed);
  } finally { app.close(); }
});

test('killing a process after export intent keeps an unconfirmed operation without replaying it', { timeout: 15000 }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom interrupted é '));
  const data = join(root, 'data');
  const source = `
    import { Boardroom } from ${JSON.stringify(new URL('../src/application.ts', import.meta.url).href)};
    const app = new Boardroom(process.argv[1]);
    const prepared = app.prepareRecordedExport(process.argv[2]);
    process.send(prepared.operation);
    setInterval(() => {}, 1000);
  `;
  const child = spawn(process.execPath, ['--input-type=module', '-e', source, data, join(root, 'output')], {
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  let errors = '';
  child.stderr!.on('data', chunk => { errors += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGKILL');
      await exited;
    }
    rmSync(root, { recursive: true, force: true });
  });
  const operation = ExportOperationSchema.parse(await Promise.race([
    once(child, 'message').then(([message]) => message),
    once(child, 'exit').then(() => { throw new Error(`Export child exited before its intent: ${errors}`); }),
  ]));
  const exited = once(child, 'exit');
  child.kill('SIGKILL');
  await exited;
  const app = new Boardroom(data);
  try {
    const history = app.history('launch-ledger');
    assert.deepEqual(history.operations, [operation]);
    assert.equal(operation.status, 'unconfirmed');
    assert.deepEqual(operation.receipts, []);
    assert.deepEqual(history.events.map(event => event.type), ['export.prepared']);
    assert.equal(existsSync(operation.directory), false);
    app.nextRecordedMessage();
    assert.equal(app.history('launch-ledger').operations[0]?.status, 'unconfirmed');
    assert.equal(existsSync(operation.directory), false);
  } finally { app.close(); }
});

test('a refused output leaves a durable failure receipt and preserves the existing file', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom refused export '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const output = join(root, 'original.md');
  writeFileSync(output, 'Keep this original.');
  let app = new Boardroom(join(root, 'data'));
  assert.throws(() => app.exportRecordedExample(output));
  const history = app.history('launch-ledger');
  assert.equal(history.operations[0]?.status, 'failed');
  assert.match(history.operations[0]?.errorCode ?? '', /^E(EXIST|NOTDIR)$/);
  assert.deepEqual(history.operations[0]?.receipts, []);
  assert.deepEqual(history.events.map(event => event.type), ['export.prepared', 'export.started', 'export.failed']);
  assert.equal(readFileSync(output, 'utf8'), 'Keep this original.');
  app.close();
  app = new Boardroom(join(root, 'data'));
  try {
    assert.deepEqual(app.history('launch-ledger'), history);
    app.exportRecordedExample(join(root, 'valid-output'));
    assert.deepEqual(app.history('launch-ledger').operations.map(item => item.status), ['failed', 'completed']);
  } finally { app.close(); }
});

test('exports keep stable operation IDs, ordered events and content receipts after reopen', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom receipts '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let app = new Boardroom(join(root, 'data'));
  const first = app.exportRecordedExample(join(root, 'output'));
  const second = app.exportRecordedExample(join(root, 'output'));
  assert.notEqual(first.operationId, second.operationId);
  assert.equal(typeof first.operationId, 'string');
  const history = app.history('launch-ledger');
  assert.deepEqual(history.events.map(event => event.type), [
    'export.prepared', 'export.started', 'export.completed',
    'export.prepared', 'export.started', 'export.completed',
  ]);
  assert.deepEqual(history.events.map(event => event.sequence), [1, 2, 3, 4, 5, 6]);
  assert.equal(history.operations.length, 2);
  const operation = history.operations.find(item => item.id === first.operationId)!;
  assert.equal(operation.status, 'completed');
  assert.equal(operation.directory, first.directory);
  assert.deepEqual(operation.receipts.map(item => item.path), [first.plan, first.memo]);
  for (const receipt of operation.receipts) {
    assert.equal(receipt.sha256, createHash('sha256').update(readFileSync(receipt.path)).digest('hex'));
  }
  app.close();
  app = new Boardroom(join(root, 'data'));
  try { assert.deepEqual(app.history('launch-ledger'), history); }
  finally { app.close(); }
});
