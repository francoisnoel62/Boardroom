import { copyFileSync, statSync, readdirSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// Builds only for the executing host: native dependencies and Node must share its ABI.
const projectRoot = fileURLToPath(new URL('..', import.meta.url));

function copy(source, target) {
  if (statSync(source).isDirectory()) {
    mkdirSync(target);
    for (const name of readdirSync(source)) copy(join(source, name), join(target, name));
  } else { copyFileSync(source, target); }
}
try {
  const { values } = parseArgs({ options: { output: { type: 'string' } } });
  if (process.version !== 'v24.12.0') throw new Error('Candidate packaging requires the qualified Node v24.12.0 runtime.');
  const output = resolve(values.output ?? join(projectRoot, 'release', `boardroom-${process.platform}-${process.arch}-${randomUUID()}`));
  const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
  const nodeLicense = join(projectRoot, 'assets', 'runtime', `node-${process.version}-LICENSE.txt`);
  readFileSync(nodeLicense);
  readFileSync(join(projectRoot, 'dist', 'cli.js'));
  mkdirSync(dirname(output), { recursive: true });
  mkdirSync(output); // Never replace an existing candidate or user directory.
  for (const entry of ['dist', 'assets', 'node_modules', 'package.json', 'package-lock.json', 'README.md', 'LICENSE', 'NOTICE', 'docs', 'boardroom-plans', 'qualification']) {
    copy(join(projectRoot, entry), join(output, entry));
  }
  copyFileSync(join(projectRoot, 'tests', 'support', 'terminal.ts'), join(output, 'qualification', 'terminal.ts'));
  mkdirSync(join(output, 'runtime'));
  const executable = process.platform === 'win32' ? 'node.exe' : 'node';
  copyFileSync(process.execPath, join(output, 'runtime', executable));
  copyFileSync(nodeLicense, join(output, 'runtime', 'LICENSE.txt'));
  if (process.platform === 'win32') {
    writeFileSync(join(output, 'boardroom.cmd'), '@echo off\r\n"%~dp0runtime\\node.exe" "%~dp0dist\\cli.js" %*\r\nexit /b %errorlevel%\r\n');
  } else {
    writeFileSync(join(output, 'boardroom'), '#!/bin/sh\nROOT=$(CDPATH= cd -- "${0%/*}" && pwd)\nexec "$ROOT/runtime/node" "$ROOT/dist/cli.js" "$@"\n');
    chmodSync(join(output, 'boardroom'), 0o755);
    chmodSync(join(output, 'runtime', executable), 0o755);
  }
  writeFileSync(join(output, 'manifest.json'), JSON.stringify({
    schemaVersion: 1, version: pkg.version, platform: process.platform, architecture: process.arch,
    runtime: process.version, nativeAbi: process.versions.modules,
    runtimeSha256: createHash('sha256').update(readFileSync(process.execPath)).digest('hex'),
    dependencies: pkg.dependencies, status: 'local development candidate; release gates pending',
  }, null, 2) + '\n');
  console.log(output);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Packaging failed.');
  process.exitCode = 1;
}
