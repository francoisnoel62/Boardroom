#!/usr/bin/env node
// Runs the commands the documentation presents as runnable, against a source checkout and,
// optionally, a packaged candidate. Only fenced blocks whose info string contains `doc-test`
// are executed; lines with <placeholders> are skipped.
//
//   node site/scripts/doc-commands.mjs --repo . [--candidate release/candidate]
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Returns the command lines of every `doc-test` fenced block, in document order. */
export function extractDocCommands(mdx) {
  const commands = [];
  let inBlock = false;
  for (const raw of mdx.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      inBlock = !inBlock && /\bdoc-test\b/.test(line.slice(3));
      continue;
    }
    if (inBlock && line && !line.startsWith('#') && !line.includes('<')) commands.push(line);
  }
  return commands;
}

/** Maps a documented command to the executable that runs it on this platform. */
export function toInvocation(command, { platform, node }) {
  const [program, ...args] = command.split(/\s+/);
  if (program === 'node' && args[0] === 'dist/cli.js') return { kind: 'checkout', file: node, args };
  if (program === './boardroom') {
    return { kind: 'candidate', file: platform === 'win32' ? '.\\boardroom.cmd' : './boardroom', args };
  }
  throw new Error(`Unsupported documented command: ${command}`);
}

function mdxFiles(directory) {
  return readdirSync(directory).sort().flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? mdxFiles(path) : path.endsWith('.mdx') ? [path] : [];
  });
}

// Node 24.12's recursive cpSync can crash natively on Windows Unicode paths.
// Use the same directory/file copy strategy as the candidate packager.
function copyCandidate(source, target) {
  if (statSync(source).isDirectory()) {
    mkdirSync(target);
    for (const name of readdirSync(source)) copyCandidate(join(source, name), join(target, name));
  } else copyFileSync(source, target);
}

function main() {
  const argv = process.argv.slice(2);
  const option = name => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : undefined; };
  const repo = resolve(option('--repo') ?? '.');
  const source = option('--candidate') ? resolve(option('--candidate')) : undefined;
  const docs = join(repo, 'site', 'src', 'content', 'docs');
  if (source && !existsSync(source)) throw new Error(`No packaged candidate at ${source}. Run npm run package first.`);

  // Packaged commands without --data-dir use the default data location: point it at a scratch home.
  // They run in a copy of the candidate, so documented outputs never end up inside the package.
  const home = mkdtempSync(join(tmpdir(), 'boardroom-doc-commands-'));
  const candidate = source ? join(home, 'candidate') : undefined;
  const env = { ...process.env, HOME: home, USERPROFILE: home, XDG_DATA_HOME: join(home, 'data'), LOCALAPPDATA: join(home, 'local') };
  let ran = 0;
  let failed = 0;
  try {
    if (source && candidate) copyCandidate(source, candidate);
    for (const file of mdxFiles(docs)) {
      for (const command of extractDocCommands(readFileSync(file, 'utf8'))) {
        const invocation = toInvocation(command, { platform: process.platform, node: process.execPath });
        if (invocation.kind === 'candidate' && !candidate) continue;
        const result = spawnSync(invocation.file, invocation.args, {
          cwd: invocation.kind === 'candidate' ? candidate : repo,
          env,
          encoding: 'utf8',
          // Windows only runs .cmd launchers through a shell.
          shell: invocation.file.endsWith('.cmd'),
          timeout: 120_000,
        });
        ran += 1;
        const where = file.slice(docs.length + 1);
        if (result.status === 0) {
          console.log(`ok   ${where}: ${command}`);
        } else {
          failed += 1;
          console.error(`FAIL ${where}: ${command} (exit ${result.status ?? result.signal})\n${result.stderr || result.stdout}`);
        }
      }
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
  console.log(`${ran} documented commands, ${failed} failed.`);
  if (failed > 0 || ran === 0) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
