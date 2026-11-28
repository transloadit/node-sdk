import { copyFile, cp, mkdir } from 'node:fs/promises'

const root = new URL('.', import.meta.resolve('pdfjs-dist/package.json'))
const dist = new URL('../dist/', import.meta.url)
const assets = new URL('pdf-assets/', dist)
await mkdir(new URL('wasm/', assets), { recursive: true })

// Ship the browser build so the Node-only engine and native canvas dependency do not apply to SDK consumers.
await Promise.all([
  copyFile(new URL('legacy/build/pdf.min.mjs', root), new URL('pdf.min.mjs', dist)),
  copyFile(new URL('legacy/build/pdf.worker.min.mjs', root), new URL('pdf.worker.min.mjs', assets)),
  copyFile(new URL('LICENSE', root), new URL('LICENSE.pdfjs', assets)),
  cp(new URL('cmaps/', root), new URL('cmaps/', assets), { recursive: true }),
  cp(new URL('standard_fonts/', root), new URL('standard_fonts/', assets), { recursive: true }),
  ...[
    'jbig2_nowasm_fallback.js',
    'openjpeg_nowasm_fallback.js',
    'LICENSE_JBIG2',
    'LICENSE_PDFJS_JBIG2',
    'LICENSE_OPENJPEG',
    'LICENSE_PDFJS_OPENJPEG',
  ].map((name) => copyFile(new URL(`wasm/${name}`, root), new URL(`wasm/${name}`, assets))),
])
