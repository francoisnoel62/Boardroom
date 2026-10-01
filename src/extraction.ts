import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const DocumentLocatorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('pdf-page'), page: z.number().int().positive() }),
  z.object({ kind: z.literal('docx-block'), block: z.number().int().positive() }),
]);

export const ExtractionSchema = z.object({
  schemaVersion: z.literal(1), format: z.enum(['pdf', 'docx']),
  status: z.enum(['complete', 'partial', 'failed']),
  chunks: z.array(z.object({ locator: DocumentLocatorSchema, text: z.string() })),
  warnings: z.array(z.string()),
});

export type DocumentLocator = z.infer<typeof DocumentLocatorSchema>;
export type Extraction = z.infer<typeof ExtractionSchema>;

export async function extractDocument(content: Buffer, format: 'pdf' | 'docx'): Promise<Extraction> {
  if (format === 'docx') {
    try {
      const { default: mammoth } = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: content });
      const chunks = result.value.split(/\n{2,}/).map(text => text.trim()).filter(Boolean)
        .map((text, index) => ({ locator: { kind: 'docx-block' as const, block: index + 1 }, text }));
      return {
        schemaVersion: 1, format, status: chunks.length && !result.messages.length ? 'complete' : 'partial', chunks,
        warnings: ['Text extraction preserves saved blocks, not Word pages, layout, images, or formatting.',
          ...(!chunks.length ? ['DOCX has no extractable text; embedded images are not read and OCR is unavailable.'] : []),
          ...result.messages.map(message => message.message)],
      };
    } catch {
      return { schemaVersion: 1, format, status: 'failed', chunks: [], warnings: ['DOCX is malformed, encrypted, or unsupported; no text was extracted.'] };
    }
  }
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const assetPath = (name: string) => fileURLToPath(new URL(`../node_modules/pdfjs-dist/${name}/`, import.meta.url)).replaceAll('\\', '/');
  const task = getDocument({
    data: new Uint8Array(content),
    verbosity: 0,
    useWorkerFetch: false, useSystemFonts: false, disableFontFace: true,
    standardFontDataUrl: assetPath('standard_fonts'), cMapUrl: assetPath('cmaps'),
    cMapPacked: true, wasmUrl: assetPath('wasm'),
  });
  try {
    const document = await task.promise;
    const chunks: Extraction['chunks'] = [];
    const warnings: string[] = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      try {
        const text = await page.getTextContent();
        const chunk = {
          locator: { kind: 'pdf-page', page: number },
          text: text.items.filter(item => 'str' in item).map(item => item.str).join(' ').trim(),
        } as const;
        chunks.push(chunk);
        if (!chunk.text) warnings.push(`PDF page ${number} has no extractable text; it may be blank or scanned. OCR is unavailable.`);
      } catch {
        warnings.push(`PDF page ${number} could not be extracted; the saved extraction is partial.`);
      } finally { page.cleanup(); }
    }
    return { schemaVersion: 1, format, status: warnings.length ? 'partial' : 'complete', chunks, warnings };
  } catch {
    return { schemaVersion: 1, format, status: 'failed', chunks: [], warnings: ['PDF is malformed, encrypted, or unsupported; no text was extracted.'] };
  } finally { await task.destroy(); }
}
