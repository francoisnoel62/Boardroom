// Checks the static build itself: links, page metadata and editorial rules.
// Run after `npm run build`.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';
import { markFiles, markSvg } from '../../src/data/brand.ts';

const dist = resolve(import.meta.dirname, '../../dist');

function htmlFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
  });
}

function scripts(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? scripts(path) : path.endsWith('.js') ? [path] : [];
  });
}

const pages = existsSync(dist) ? htmlFiles(dist) : [];
const urlOf = (file: string) => `/${relative(dist, file).replace(/index\.html$/, '').replaceAll('\\', '/')}`;
const ids = (html: string) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
const textOf = (html: string) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');

function resolvesTo(path: string): boolean {
  const target = join(dist, decodeURIComponent(path));
  if (existsSync(target) && statSync(target).isFile()) return true;
  return existsSync(join(target, 'index.html'));
}

test('the site has been built', () => {
  assert.ok(pages.length > 0, 'run npm run build first');
});

test('every internal link, asset and anchor resolves', () => {
  const broken: string[] = [];
  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    for (const [, attribute, value] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
      if (!value || /^(https?:|mailto:|data:|javascript:|\/\/)/.test(value)) continue;
      const [path, anchor] = value.split('#') as [string, string | undefined];
      if (path === '' && anchor !== undefined) {
        if (anchor && !ids(html).has(anchor)) broken.push(`${urlOf(file)} → #${anchor}`);
        continue;
      }
      if (!path.startsWith('/')) continue;
      const clean = path.split('?')[0]!;
      if (!resolvesTo(clean)) broken.push(`${urlOf(file)} → ${attribute}=${value}`);
      else if (anchor) {
        const target = clean.endsWith('.html') ? join(dist, clean) : join(dist, clean, 'index.html');
        if (existsSync(target) && !ids(readFileSync(target, 'utf8')).has(anchor)) broken.push(`${urlOf(file)} → ${value}`);
      }
    }
  }
  assert.deepEqual(broken, []);
});

test('every page declares its language, title and description', () => {
  for (const file of pages.filter(page => !page.endsWith('404.html'))) {
    const html = readFileSync(file, 'utf8');
    assert.match(html, /<html[^>]*\slang="en"/, `${urlOf(file)} lang`);
    assert.match(html, /<title>[^<]{3,}<\/title>/, `${urlOf(file)} title`);
    assert.match(html, /<meta name="description" content="[^"]{20,}"/, `${urlOf(file)} description`);
  }
});

test('marketing pages avoid unverifiable superlatives', () => {
  const banned = /\b(revolutionary|game[- ]changing|10x|best[- ]in[- ]class|guaranteed|unlimited|world[- ]class|cutting[- ]edge|supercharge)\b/i;
  for (const file of pages.filter(page => !urlOf(page).startsWith('/docs/'))) {
    const match = banned.exec(textOf(readFileSync(file, 'utf8')));
    assert.equal(match?.[0], undefined, `${urlOf(file)} uses "${match?.[0]}"`);
  }
});

test('no page loads a third-party script, stylesheet or font', () => {
  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    const external = [...html.matchAll(/<(script|link)[^>]+(src|href)="(https?:)?\/\/[^"]+"[^>]*>/g)]
      .map(match => match[0])
      .filter(tag => !/rel="(canonical|alternate|me)"/.test(tag) && !/rel="sitemap"/.test(tag));
    assert.deepEqual(external, [], urlOf(file));
  }
});

test('no page calls Boardroom open source without its license claim', () => {
  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    if (/open[- ]source/i.test(textOf(html).replace(/<[^>]*>/g, ''))) {
      assert.match(html, /data-claim="open-source-license"/, `${urlOf(file)} mentions open source without the license claim`);
    }
  }
});

test('the installers served by the site are byte-for-byte the repository scripts', () => {
  for (const name of ['install.sh', 'install.ps1']) {
    assert.equal(readFileSync(join(dist, name), 'utf8'), readFileSync(resolve(dist, '../../scripts', name), 'utf8'), name);
  }
});

test('the privacy page names every browser storage key the site uses', () => {
  const privacy = readFileSync(join(dist, 'privacy/index.html'), 'utf8');
  const sources = [...pages, ...scripts(dist)].map(file => readFileSync(file, 'utf8'));
  const keys = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(/(?:local|session)Storage/g)) {
      const around = source.slice(Math.max(0, match.index - 300), match.index + 300);
      for (const [key] of around.matchAll(/\b(?:starlight|sl|boardroom|pagefind)-[\w-]+/g)) keys.add(key);
    }
  }
  // Custom element names sit next to storage calls too; they are not storage keys.
  const all = sources.join('\n');
  for (const key of keys) if (new RegExp(`<${key}[\\s>]|define\\(['"\`]${key}['"\`]`).test(all)) keys.delete(key);
  assert.ok(keys.has('starlight-theme'), 'the theme key is detected');
  for (const key of keys) assert.ok(privacy.includes(key), `/privacy/ does not mention ${key}`);
  assert.equal(/document\.cookie/.test(all), false, 'no script reads or writes cookies');
});

test('the brand downloads are the marks drawn from the published palette', () => {
  for (const mark of markFiles) {
    assert.equal(readFileSync(join(dist, 'brand', mark.file), 'utf8'), markSvg(mark.theme, { background: mark.background }), mark.file);
  }
});
