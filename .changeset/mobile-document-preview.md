---
'@transloadit/viewer': minor
---

Add an opt-in, single-page PDF.js reader for mobile and desktop with a same-origin worker, keyboard navigation, and fit-to-width rendering. Add `viewerKind`, `useDocumentPreview`, typed document error callbacks, an optional stylesheet, and RTF color schemes. Text and Markdown previews honor the MIME charset and display notices for truncation and literal Markdown.

In this alpha, `documentPreviewKind` recognizes additional file extensions including generic-MIME PDFs. Detection still requires the application to verify a PDF before embedding it. Oversized text/Markdown passed to Viewer now shows the first 2 MiB instead of calling `onError`. The original strict `readDocumentPreview` keeps its runtime return value and error behavior. The exported `DocumentPreviewError.reason` type additionally includes the new preview reasons.
