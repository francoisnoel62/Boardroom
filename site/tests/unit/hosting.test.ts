import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// Vercel builds from the repository root: the configuration must build the site package, not the application.
const config = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../vercel.json'), 'utf8'));

test('Vercel builds and serves the site package', () => {
  assert.equal(config.installCommand, 'npm ci --prefix site');
  assert.equal(config.buildCommand, 'npm run build --prefix site');
  assert.equal(config.outputDirectory, 'site/dist');
  assert.equal(config.framework, null);
});

test('URLs keep the trailing slash the site is built with', () => {
  assert.equal(config.trailingSlash, true);
});

test('hashed assets are cached for good and every page sends basic security headers', () => {
  const rule = (source: string) => config.headers.find((item: { source: string }) => item.source === source)?.headers ?? [];
  const value = (source: string, key: string) => rule(source).find((header: { key: string }) => header.key === key)?.value;
  assert.equal(value('/_astro/(.*)', 'Cache-Control'), 'public, max-age=31536000, immutable');
  assert.equal(value('/(.*)', 'X-Content-Type-Options'), 'nosniff');
  assert.equal(value('/(.*)', 'Referrer-Policy'), 'strict-origin-when-cross-origin');
});
