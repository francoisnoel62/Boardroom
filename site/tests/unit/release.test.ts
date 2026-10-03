import assert from 'node:assert/strict';
import test from 'node:test';
import { detectPlatform, parseAssetName, releaseState } from '../../src/data/release.ts';

const published = {
  tag_name: 'v0.1.0',
  name: 'BOARDROOM 0.1.0 — developer preview',
  draft: false,
  prerelease: true,
  published_at: '2026-11-02T10:00:00Z',
  html_url: 'https://github.com/francoisnoel62/Boardroom/releases/tag/v0.1.0',
  assets: [
    { name: 'boardroom-0.1.0-linux-x64.tar.gz', size: 41_000_000, browser_download_url: 'https://example.test/linux' },
    { name: 'boardroom-0.1.0-macos-arm64.tar.gz', size: 40_000_000, browser_download_url: 'https://example.test/macos' },
    { name: 'boardroom-0.1.0-windows-x64.tar.gz', size: 43_000_000, browser_download_url: 'https://example.test/windows' },
    { name: 'SHA256SUMS', size: 300, browser_download_url: 'https://example.test/sums' },
    { name: 'notes.txt', size: 10, browser_download_url: 'https://example.test/notes' },
  ],
};

test('package names follow the release contract', () => {
  assert.deepEqual(parseAssetName('boardroom-0.1.0-dev.1-macos-arm64.tar.gz'), { version: '0.1.0-dev.1', platform: 'macos', arch: 'arm64' });
  assert.equal(parseAssetName('boardroom-0.1.0-freebsd-x64.tar.gz'), undefined);
  assert.equal(parseAssetName('SHA256SUMS'), undefined);
});

test('no published release is a state of its own, not an error', () => {
  assert.deepEqual(releaseState([]), { state: 'none' });
});

test('drafts are never offered; the newest published release is', () => {
  const draft = { ...published, tag_name: 'v0.2.0', draft: true };
  const state = releaseState([draft, published]);
  assert.equal(state.state, 'published');
  assert.equal(state.state === 'published' && state.release.version, '0.1.0');
});

test('a published release lists its packages and checksums', () => {
  const state = releaseState([published]);
  assert.ok(state.state === 'published');
  assert.equal(state.release.tag, 'v0.1.0');
  assert.equal(state.release.prerelease, true);
  assert.equal(state.release.checksumsUrl, 'https://example.test/sums');
  assert.deepEqual(state.release.packages.map(item => `${item.platform}-${item.arch}`), ['linux-x64', 'macos-arm64', 'windows-x64']);
  assert.equal(state.release.packages[1]?.sizeLabel, '40 MB');
});

test('a release without checksums is not offered for download', () => {
  const state = releaseState([{ ...published, assets: published.assets.filter(item => item.name !== 'SHA256SUMS') }]);
  assert.deepEqual(state, { state: 'unknown', reason: 'Release v0.1.0 has no SHA256SUMS file.' });
});

test('an unreadable API answer is reported as unknown', () => {
  assert.deepEqual(releaseState({ message: 'API rate limit exceeded' }), { state: 'unknown', reason: 'API rate limit exceeded' });
});

test('the visitor platform is detected from client hints first, then the user agent', () => {
  assert.equal(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', undefined), 'windows');
  assert.equal(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)', 'macOS'), 'macos');
  assert.equal(detectPlatform('Mozilla/5.0 (X11; Linux x86_64)', undefined), 'linux');
  assert.equal(detectPlatform('Mozilla/5.0 (Linux; Android 15; Pixel 7)', 'Android'), undefined);
  assert.equal(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', undefined), undefined);
});
