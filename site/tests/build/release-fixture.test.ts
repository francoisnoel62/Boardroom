// Builds the site against a fixture release into a separate directory and checks what a
// published release would look like. Run after `npm run build` (it does not touch dist/).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';

const site = resolve(import.meta.dirname, '../..');
const out = join(site, 'dist-release-fixture');

test('with a published release, /download offers verified packages and pinned installers', (t) => {
  t.after(() => rmSync(out, { recursive: true, force: true }));
  const build = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['astro', 'build'], {
    cwd: site,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', SITE_OUT_DIR: out, BOARDROOM_RELEASES_FIXTURE: join(site, 'tests/fixtures/releases.json') },
  });
  assert.equal(build.status, 0, build.stderr + build.stdout);

  const download = readFileSync(join(out, 'download/index.html'), 'utf8');
  assert.match(download, /data-release-state="published"/);
  assert.match(download, /0\.1\.0-dev\.1/);
  assert.doesNotMatch(download, /0\.2\.0/, 'drafts are never offered');
  for (const target of ['linux-x64', 'macos-arm64', 'windows-x64']) {
    assert.match(download, new RegExp(`href="https://github.com/francoisnoel62/Boardroom/releases/download/v0.1.0-dev.1/boardroom-0.1.0-dev.1-${target}.tar.gz"`));
  }
  assert.match(download, /releases\/download\/v0\.1\.0-dev\.1\/SHA256SUMS/);
  assert.match(download, /raw\.githubusercontent\.com\/francoisnoel62\/Boardroom\/v0\.1\.0-dev\.1\/scripts\/install\.sh/);
  assert.match(download, /raw\.githubusercontent\.com\/francoisnoel62\/Boardroom\/v0\.1\.0-dev\.1\/scripts\/install\.ps1/);
  assert.match(download, /gh attestation verify/);
  assert.match(download, /Developer preview/);

  const home = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(home, /<a[^>]+href="\/download\/"[^>]*>Download<\/a>/, 'the header offers Download once a release exists');
  assert.match(home, /Latest release: 0\.1\.0-dev\.1\./, 'the footer follows the release state');
  assert.doesNotMatch(home, /No release has been published yet/);
});
