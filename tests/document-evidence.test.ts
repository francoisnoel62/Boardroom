import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Boardroom } from '../src/application.ts';

test('saved document citations keep exact PDF pages and DOCX blocks after originals change and the service reopens', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom documents é '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const pdf = join(root, 'launch.pdf');
  const docx = join(root, 'plan café.docx');
  copyFileSync(new URL('../assets/validation/launch.pdf', import.meta.url), pdf);
  copyFileSync(new URL('../assets/validation/launch.docx', import.meta.url), docx);
  const pdfHash = createHash('sha256').update(readFileSync(pdf)).digest('hex');
  let app = new Boardroom(join(root, 'data'));
  const project = app.openDemo();
  const pdfResult = await app.captureDocument(project.id, pdf, { authorized: true });
  const docxResult = await app.captureDocument(project.id, docx, { authorized: true });
  assert.equal(pdfResult.evidence.sha256, pdfHash);
  assert.equal(pdfResult.extraction.status, 'complete');
  assert.deepEqual(await app.captureDocument(project.id, pdf, { authorized: true }), pdfResult);
  writeFileSync(pdf, 'A changed original');
  writeFileSync(docx, 'A changed original');
  app.close();
  app = new Boardroom(join(root, 'data'));
  try {
    const pdfCitation = app.resolveDocumentCitation(project.id, pdfResult.evidence.id, { kind: 'pdf-page', page: 2 });
    assert.equal(pdfCitation.text, 'Launch scope: one integration.');
    assert.equal(pdfCitation.sha256, pdfHash);
    assert.equal(pdfCitation.location, `${pdf}#page=2`);
    assert.equal(pdfCitation.originalChanged, true);
    const docxCitation = app.resolveDocumentCitation(project.id, docxResult.evidence.id, { kind: 'docx-block', block: 2 });
    assert.equal(docxCitation.text, 'Budget: €500 for the café pilot.');
    assert.equal(docxCitation.location, `${docx}#block=2`);
    assert.equal(docxCitation.originalChanged, true);
  } finally { app.close(); }
});

test('simultaneous captures of identical document bytes reuse one durable evidence revision', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom concurrent documents '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'launch.pdf');
  copyFileSync(new URL('../assets/validation/launch.pdf', import.meta.url), source);
  const app = new Boardroom(join(root, 'data'));
  try {
    const project = app.openDemo();
    const [first, second] = await Promise.all([
      app.captureDocument(project.id, source, { authorized: true }),
      app.captureDocument(project.id, source, { authorized: true }),
    ]);
    assert.equal(first.evidence.id, second.evidence.id);
    assert.equal(first.evidence.revision, 1);
  } finally { app.close(); }
});

test('document citations cannot cross projects or be presented as source-text line references', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom document scope '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'launch.pdf');
  copyFileSync(new URL('../assets/validation/launch.pdf', import.meta.url), source);
  const app = new Boardroom(join(root, 'data'));
  try {
    const project = app.openDemo();
    await assert.rejects(app.captureDocument(project.id, source, { authorized: false }), /authorization/);
    await assert.rejects(app.captureDocument('other-project', source, { authorized: true }), /Project unavailable/);
    const result = await app.captureDocument(project.id, source, { authorized: true });
    assert.throws(() => app.resolveDocumentCitation('other-project', result.evidence.id, { kind: 'pdf-page', page: 1 }), /outside this project/);
    assert.throws(() => app.resolveDocumentCitation(project.id, result.evidence.id, { kind: 'docx-block', block: 1 }), /No extracted text/);
    assert.throws(() => app.resolveCitation(project.id, result.evidence.id, 1, 1), /document locator/);
  } finally { app.close(); }
});
