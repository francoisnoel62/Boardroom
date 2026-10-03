import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The published installers run against a local release directory built here, with an archive
// laid out like a real package and a launcher that resolves its own directory like the real one.
const windows = process.platform === 'win32';
const platform = windows ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
const version = '0.0.0-test';
const asset = `boardroom-${version}-${platform}-${process.arch}.tar.gz`;
// Windows' own bsdtar: Git's GNU tar would read "D:\\..." as a remote host.
const tarBin = windows ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
const script = (name: string) => fileURLToPath(new URL(`../scripts/${name}`, import.meta.url));

function fakeRelease(root: string, { corrupt = false, withAsset = true } = {}) {
  const staging = join(root, 'staging', `boardroom-${version}`);
  mkdirSync(staging, { recursive: true });
  writeFileSync(join(staging, 'payload.txt'), 'installed payload\n');
  if (windows) {
    writeFileSync(join(staging, 'boardroom.cmd'), '@echo off\r\ntype "%~dp0payload.txt"\r\necho args: %*\r\n');
  } else {
    writeFileSync(join(staging, 'boardroom'), '#!/bin/sh\nROOT=$(CDPATH= cd -- "${0%/*}" && pwd)\ncat "$ROOT/payload.txt"\necho "args: $*"\n');
    chmodSync(join(staging, 'boardroom'), 0o755);
  }
  const release = join(root, 'release');
  mkdirSync(release);
  const archive = join(release, asset);
  const tar = spawnSync(tarBin, ['-czf', archive, '-C', join(root, 'staging'), `boardroom-${version}`]);
  assert.equal(tar.status, 0, String(tar.stderr));
  const digest = corrupt ? '0'.repeat(64) : createHash('sha256').update(readFileSync(archive)).digest('hex');
  const other = `boardroom-${version}-freebsd-x64.tar.gz`;
  writeFileSync(join(release, 'SHA256SUMS'), `${withAsset ? `${digest}  ${asset}\n` : ''}${'1'.repeat(64)}  ${other}\n`);
  return pathToFileURL(release).href;
}

function install(root: string, base: string, extra: Record<string, string> = {}) {
  const env = {
    ...process.env,
    BOARDROOM_DOWNLOAD_BASE: base,
    BOARDROOM_VERSION: version,
    BOARDROOM_INSTALL_DIR: join(root, 'install dir é'),
    BOARDROOM_BIN_DIR: join(root, 'bin'),
    BOARDROOM_NO_MODIFY_PATH: '1',
    ...extra,
  };
  return windows
    ? spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script('install.ps1')], { env, encoding: 'utf8' })
    : spawnSync('sh', [script('install.sh')], { env, encoding: 'utf8' });
}

function runInstalled(root: string) {
  return windows
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', `"${join(root, 'bin', 'boardroom.cmd')}" --help`], { encoding: 'utf8', windowsVerbatimArguments: true })
    : spawnSync(join(root, 'bin', 'boardroom'), ['--help'], { encoding: 'utf8' });
}

test('the installer verifies a release and puts a working boardroom command on the path', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'boardroom installer '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = install(root, fakeRelease(root));
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /Checksum verified/);
  assert.ok(existsSync(join(root, 'install dir é', 'versions', version)));
  const run = runInstalled(root);
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /installed payload/);
  assert.match(run.stdout, /args: --help/);
});

test('a checksum mismatch installs nothing', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'boardroom installer '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = install(root, fakeRelease(root, { corrupt: true }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /checksum/i);
  assert.equal(existsSync(join(root, 'install dir é', 'versions', version)), false);
  assert.equal(existsSync(join(root, 'bin')), false);
});

test('a release without a package for this platform is refused with an explanation', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'boardroom installer '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = install(root, fakeRelease(root, { withAsset: false }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(`No package for ${platform}-${process.arch}`));
});

test('a platform that is not qualified is refused before any download', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'boardroom installer '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = install(root, 'file:///nonexistent', { BOARDROOM_PLATFORM: 'freebsd', BOARDROOM_ARCH: 'x64' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /freebsd-x64 is not a qualified platform/);
});
