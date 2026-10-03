import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import type { TestContext } from 'node:test';
import pty from 'node-pty';
import headless from '@xterm/headless';

/** Real OS PTY plus a VT screen; assertions observe the rendered CLI, not Ink internals. */
export function openTerminal(t: TestContext, args: string[], options: {
  executable?: string; cwd?: string; env?: NodeJS.ProcessEnv; cols?: number; rows?: number;
} = {}) {
  const cols = options.cols ?? 100, rows = options.rows ?? 30;
  const screen = new headless.Terminal({ cols, rows, allowProposedApi: true });
  const started = performance.now();
  const recording: [number, string, string][] = [];
  const process = pty.spawn(options.executable ?? globalThis.process.execPath, args, {
    name: 'xterm-256color', cols, rows,
    useConpty: true,
    useConptyDll: false,
    cwd: options.cwd ?? globalThis.process.cwd(),
    env: { ...globalThis.process.env, CI: 'false', TERM: 'xterm-256color', ...options.env },
  });
  let exited: { exitCode: number; signal?: number } | undefined;
  let raw = '';
  const responseListener = screen.onData(data => process.write(data));
  const dataListener = process.onData(data => {
    raw += data; recording.push([(performance.now() - started) / 1000, 'o', data]); screen.write(data);
  });
  const exit = new Promise<{ exitCode: number; signal?: number }>(resolve => {
    process.onExit(result => { exited = result; resolve(result); });
  });
  // An empty write does not schedule a callback in xterm; NUL flushes without changing cells.
  const flush = () => new Promise<void>(resolve => screen.write('\0', resolve));
  const text = () => Array.from({ length: screen.buffer.active.length }, (_, index) =>
    screen.buffer.active.getLine(index)?.translateToString(true) ?? '').join('\n');
  t.after(async () => {
    // Windows also needs to release its connection worker after the child exits.
    if (!exited || globalThis.process.platform === 'win32') process.kill();
    if (!exited) {
      await Promise.race([exit, delay(2000, undefined, { ref: false })]);
    }
    dataListener.dispose();
    responseListener.dispose();
    screen.dispose();
  });
  return {
    write: (input: string) => process.write(input),
    resize: (cols: number, rows: number) => { screen.resize(cols, rows); process.resize(cols, rows); },
    raw: () => raw,
    snapshot: text,
    recording: () => recording,
    async waitFor(pattern: RegExp | ((text: string) => boolean)) {
      const deadline = Date.now() + 10000;
      do {
        await flush();
        const current = text();
        if (typeof pattern === 'function' ? pattern(current) : pattern.test(current)) return current;
        if (exited) assert.fail(`Terminal exited (${exited.exitCode}) before ${pattern}:\n${current}`);
        await delay(20);
      } while (Date.now() < deadline);
      assert.fail(`Terminal did not display ${pattern}:\n${text()}\nVT tail: ${JSON.stringify(raw.slice(-500))}`);
    },
    async finish() {
      const result = await Promise.race([exit, delay(10000, undefined, { ref: false })]);
      assert.ok(result, 'Terminal did not exit.');
      await flush();
      return result;
    },
  };
}
