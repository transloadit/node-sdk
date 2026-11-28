import { copyFile } from 'node:fs/promises'

// The worker must match the parser version, including after a dependency upgrade.
await copyFile(
  new URL(import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs')),
  new URL('../dist/pdf.worker.min.mjs', import.meta.url),
)
