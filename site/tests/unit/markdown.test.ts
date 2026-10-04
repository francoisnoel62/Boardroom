import assert from 'node:assert/strict';
import test from 'node:test';
import { markdownPath, toMarkdownPage } from '../../src/data/markdown.ts';

test('every documentation page has a predictable Markdown address', () => {
  assert.equal(markdownPath('docs'), '/docs/index.md');
  assert.equal(markdownPath('docs/guides/export'), '/docs/guides/export.md');
});

test('a page becomes plain Markdown: title, summary, status, body without imports', () => {
  const page = toMarkdownPage(
    { title: 'Export', description: 'Write a new plan.', status: 'planned', plan: '02' },
    "import { Aside } from '@astrojs/starlight/components';\nimport Claim from '../Claim.astro';\n\nRun this.\n\n<Claim id=\"x\" />\n",
    { Claim: attributes => `**Claim ${attributes.id}**` },
  );
  assert.equal(page, '# Export\n\n> Write a new plan.\n\nStatus: Planned · Plan 02\n\nRun this.\n\n**Claim x**\n');
});

test('an unknown self-closing component is removed rather than left as markup', () => {
  assert.equal(
    toMarkdownPage({ title: 'T', description: 'D', status: 'available' }, 'Before\n\n<Unknown />\n\nAfter\n', {}),
    '# T\n\n> D\n\nStatus: Available\n\nBefore\n\nAfter\n',
  );
});

test('wrapping components keep their content; an aside keeps its title', () => {
  const body = '<Aside type="caution" title="No release yet">\n  Build from source.\n</Aside>\n\n<Steps>\n\n1. Clone.\n\n</Steps>\n';
  assert.equal(
    toMarkdownPage({ title: 'T', status: 'available' }, body, {}),
    '# T\n\nStatus: Available\n\n**No release yet**\n  Build from source.\n\n1. Clone.\n',
  );
});
