---
'@transloadit/viewer': minor
---

Add an opt-in PDF.js reader with a same-origin worker, on-demand ranges, renewable grants, a selectable text layer, page jumps, zoom and fit controls. The original-file action is opt-in. Add `useDocumentPreview` for bounded text reads, cancellation, retry and automatic opening. Add Markdown typography and configurable RTF colors.

In frame mode, Viewer now normalizes `src` against the document base URI and writes the absolute URL to the iframe. The frame requires a verified PDF endpoint and accepts a verified `mime`. Its `onLoad` receives the native React iframe event and `onError` receives a preview reason. `viewerKind` excludes SVG and recognizes octet-stream PDF filenames only in PDF.js mode.

`documentPreviewKind` now also classifies CSV, TSV, JSON, log and YAML files as text. Applications that sign URLs based on this classifier may authorize additional previews. Oversized text and Markdown display their first 2 MiB with a notice. The strict `readDocumentPreview` API keeps its previous size and HTTP error behavior. The exported `DocumentPreviewError.reason` type includes the new preview reasons.
