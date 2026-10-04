import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// Field notes are engineering articles: every one must be built on documents of the repository.
const repo = resolve(import.meta.dirname, '../../..');
const notes = resolve(import.meta.dirname, '../../src/content/notes');
const files = existsSync(notes) ? readdirSync(notes).filter(name => name.endsWith('.md')) : [];

function sourcesOf(markdown: string): string[] {
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(markdown)?.[1] ?? '';
  const block = /^sources:\n((?:\s+- .+\n?)+)/m.exec(frontmatter)?.[1] ?? '';
  return [...block.matchAll(/- (.+)/g)].map(match => match[1]!.trim());
}

test('two field notes are published', () => {
  assert.equal(files.length, 2);
});

test('every field note cites at least two documents that exist in the repository', () => {
  for (const file of files) {
    const sources = sourcesOf(readFileSync(resolve(notes, file), 'utf8'));
    assert.ok(sources.length >= 2, `${file} cites ${sources.length} sources`);
    for (const path of sources) assert.ok(existsSync(resolve(repo, path)), `${file}: missing ${path}`);
  }
});
