import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises'

import { build } from 'esbuild'

const root = new URL('.', import.meta.resolve('pdfjs-dist/package.json'))
const dist = new URL('../dist/', import.meta.url)
const assets = new URL('pdf-assets/', dist)
await mkdir(new URL('wasm/', assets), { recursive: true })

// Both browser realms need the Safari 17.0 additions before PDF.js initializes.
const { outputFiles } = await build({
  absWorkingDir: import.meta.dirname,
  entryPoints: ['./pdfCompatibility.ts'],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'safari17',
  write: false,
})
async function prepareModule(name: string, target: URL, imports = ''): Promise<void> {
  const source = await readFile(new URL(`legacy/build/${name}.min.mjs`, root), 'utf8')
  await writeFile(target, [imports, outputFiles[0].text, source].join('\n'))
}

await Promise.all([
  prepareModule(
    'pdf',
    new URL('pdf.min.mjs', dist),
    "import { fetchPdfResource as fetch } from './pdfNetwork.js'",
  ),
  prepareModule('pdf.worker', new URL('pdf.worker.min.mjs', assets)),
  copyFile(new URL('LICENSE', root), new URL('LICENSE.pdfjs', assets)),
  copyFile(new URL(import.meta.resolve('core-js/LICENSE')), new URL('LICENSE.core-js', assets)),
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
