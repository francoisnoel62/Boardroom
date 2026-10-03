import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { touchesSite } from '../../scripts/vercel-ignore.mjs';

const site = resolve(import.meta.dirname, '../..');
const repo = resolve(site, '..');

function sources(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sources(path) : /\.(astro|ts|mjs|mdx|css)$/.test(name) ? [path] : [];
  });
}

test('a change to the application alone does not deploy the site', () => {
  assert.equal(touchesSite(['src/meeting.ts', 'tests/support/terminal.ts', 'boardroom-plans/02-PREMIERE-DECISION-REELLE.md', 'README.md']), false);
  assert.equal(touchesSite([]), false);
});

test('a change to the site, its configuration or a file it reads deploys it', () => {
  for (const file of ['site/src/pages/index.astro', 'vercel.json', 'src/cli.ts', 'src/domain.ts', 'assets/demo/meeting.json', 'docs/media/terminal-screen.txt', 'tests/journal.test.ts', '.github/workflows/ci.yml', 'scripts/install.sh']) {
    assert.equal(touchesSite(['README.md', file]), true, file);
  }
});

test('every repository file the site reads at build time counts as a site change', () => {
  const missing: string[] = [];
  for (const file of sources(join(site, 'src')).concat(join(site, 'astro.config.mjs'))) {
    for (const [, path] of readFileSync(file, 'utf8').matchAll(/['"`]((?:\.\.\/)+[^'"`?*]+?)(?:\?[a-z]+)?['"`]/g)) {
      const target = relative(repo, resolve(dirname(file), path!)).replaceAll('\\', '/');
      if (target.startsWith('..') || target.startsWith('site/')) continue;
      const sample = target.endsWith('/') ? `${target}example.test.ts` : target;
      if (!touchesSite([sample])) missing.push(`${relative(site, file)} reads ${target}`);
    }
  }
  assert.deepEqual(missing, []);
});
