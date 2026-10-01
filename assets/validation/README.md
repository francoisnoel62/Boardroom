# Fictional extraction fixtures

These files were authored for BOARDROOM with no external document content.

- `launch.pdf`: a minimal, valid two-page PDF using the built-in Helvetica font. Page 1 says `Capacity: two engineers.`; page 2 says `Launch scope: one integration.`
- `empty.pdf`: one valid blank physical page. It exercises the no-text/possible-scan warning; it does not certify OCR, which is unavailable.
- `launch.docx`: a minimal OOXML ZIP with three paragraphs: `Launch plan`, `Budget: €500 for the café pilot.`, and `Uncertainty: willingness to pay.` It exercises Unicode and saved extracted-block references.

The fixtures are used by integration/E2E tests and the separate `doctor` probe. They are included in the candidate so extraction is checked against the actual distributed PDF.js worker/font assets and Mammoth dependency. Git attributes preserve the original PDF/DOCX bytes across platforms.

The tests also supply malformed in-memory bytes and temporary modified originals. Passing these fixtures does not qualify every PDF font, complex DOCX layout, embedded object, encrypted document, or large-document workload.
