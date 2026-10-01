import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('PDF extraction keeps separate text chunks with physical page references', async () => {
  const { extractDocument } = await import('../src/extraction.ts');
  const result = await extractDocument(readFileSync(new URL('../assets/validation/launch.pdf', import.meta.url)), 'pdf');
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.chunks, [
    { locator: { kind: 'pdf-page', page: 1 }, text: 'Capacity: two engineers.' },
    { locator: { kind: 'pdf-page', page: 2 }, text: 'Launch scope: one integration.' },
  ]);
});

test('empty or malformed documents return visible limitations instead of successful empty content', async () => {
  const { extractDocument } = await import('../src/extraction.ts');
  const empty = await extractDocument(readFileSync(new URL('../assets/validation/empty.pdf', import.meta.url)), 'pdf');
  assert.equal(empty.status, 'partial');
  assert.match(empty.warnings.join(' '), /page 1.*no extractable text.*OCR/i);
  const badPdf = await extractDocument(Buffer.from('not a PDF'), 'pdf');
  const badDocx = await extractDocument(Buffer.from('not a ZIP archive'), 'docx');
  for (const result of [badPdf, badDocx]) {
    assert.equal(result.status, 'failed');
    assert.deepEqual(result.chunks, []);
    assert.match(result.warnings.join(' '), /malformed|unsupported|encrypted/i);
  }
});

test('DOCX extraction preserves Unicode and saved block references without inventing Word pages', async () => {
  const { extractDocument } = await import('../src/extraction.ts');
  const result = await extractDocument(readFileSync(new URL('../assets/validation/launch.docx', import.meta.url)), 'docx');
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.chunks, [
    { locator: { kind: 'docx-block', block: 1 }, text: 'Launch plan' },
    { locator: { kind: 'docx-block', block: 2 }, text: 'Budget: €500 for the café pilot.' },
    { locator: { kind: 'docx-block', block: 3 }, text: 'Uncertainty: willingness to pay.' },
  ]);
  assert.match(result.warnings.join(' '), /layout/i);
});
