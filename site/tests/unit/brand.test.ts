import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { descriptions, markSvg, palette, wordCount } from '../../src/data/brand.ts';

const tokens = readFileSync(resolve(import.meta.dirname, '../../src/styles/tokens.css'), 'utf8');
const [darkBlock, lightBlock] = tokens.split(":root[data-theme='light']") as [string, string];
const tokenValue = (block: string, name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(block)?.[1]?.toLowerCase();

test('the press descriptions fit their announced lengths', () => {
  assert.ok(wordCount(descriptions.short) <= 50, `short: ${wordCount(descriptions.short)} words`);
  assert.ok(wordCount(descriptions.short) >= 30, 'short description is too thin to be useful');
  assert.ok(wordCount(descriptions.long) <= 150, `long: ${wordCount(descriptions.long)} words`);
  assert.ok(wordCount(descriptions.long) >= 100, 'long description is too thin to be useful');
  assert.equal(wordCount('Local, open-source decision workspace.'), 4);
});

test('the press descriptions say what is available today and what is planned', () => {
  for (const text of [descriptions.short, descriptions.long]) {
    assert.match(text, /recorded example/i);
    assert.doesNotMatch(text, /\b(revolutionary|best|leading|first)\b/i);
  }
  assert.match(descriptions.long, /planned/i);
});

test('the published palette is the palette the site uses, in both themes', () => {
  for (const color of palette) {
    assert.equal(color.dark, tokenValue(darkBlock, color.token), `${color.token} dark`);
    assert.equal(color.light, tokenValue(lightBlock, color.token), `${color.token} light`);
  }
});

test('the downloadable mark is a self-contained SVG in the palette of its background', () => {
  for (const theme of ['dark', 'light'] as const) {
    const svg = markSvg(theme, { background: true });
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 32 32"/);
    assert.doesNotMatch(svg, /var\(|href=|<script/);
    const accent = palette.find(color => color.token === 'accent')!;
    assert.ok(svg.includes(accent[theme]), `${theme} mark uses its accent`);
    assert.ok(svg.includes(palette.find(color => color.token === 'surface-0')![theme]), `${theme} background`);
  }
  assert.doesNotMatch(markSvg('dark', { background: false }), /<rect width="32"/);
});
