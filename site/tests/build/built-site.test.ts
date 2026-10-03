// Checks the static build itself: links, page metadata and editorial rules.
// Run after `npm run build`.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const dist = resolve(import.meta.dirname, '../../dist');

function htmlFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
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
