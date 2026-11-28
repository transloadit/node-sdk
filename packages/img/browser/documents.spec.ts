import type { Server } from 'node:http'

import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { basename } from 'node:path'

import { test as base, expect } from '@playwright/test'
import { build } from 'esbuild'

// Paint solid colors so the test can distinguish rasterized pages from blank or stale canvases.
function slideDeck(): Buffer {
  const scan = '36FFFF001001>'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    ...[5, 6].map(
      (stream) =>
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << /XObject << /Scan 7 0 R >> >> /Contents ${stream} 0 R >>`,
    ),
    ...['1 0 0 rg 0 0 200 100 re f\n', 'q 200 0 0 100 0 0 cm /Scan Do Q\n'].map((content) => {
      return `<< /Length ${content.length} >>\nstream\n${content}endstream`
    }),
    // An 8×8 Group 4 fax strip containing a black half and a white half.
    `<< /Type /XObject /Subtype /Image /Width 8 /Height 8 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter [/ASCIIHexDecode /CCITTFaxDecode] /DecodeParms [null << /K -1 /Columns 8 /Rows 8 >>] /Length ${scan.length} >>\nstream\n${scan}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (const [i, object] of objects.entries()) {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`
  }
  const xref = pdf.length
  pdf += 'xref\n0 8\n0000000000 65535 f \n'
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  return Buffer.from(`${pdf}trailer\n<< /Root 1 0 R /Size 8 >>\nstartxref\n${xref}\n%%EOF\n`)
}

async function listen(server: Server): Promise<string> {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test server port')
  return `http://127.0.0.1:${address.port}`
}

const test = base.extend({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright discovers fixture dependencies from the destructured parameter.
  baseURL: async ({}, use) => {
    await using files = createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      if (req.url === '/report') {
        res.writeHead(200, { 'Content-Type': 'application/pdf' }).end(slideDeck())
      } else if (req.url === '/notes') {
        res
          .writeHead(200, { 'Content-Type': 'text/markdown; charset=windows-1252' })
          .end(
            Buffer.concat([
              Buffer.from([0xe9]),
              Buffer.alloc(2 * 1024 * 1024, 65),
              Buffer.from('OMITTED'),
            ]),
          )
      } else res.writeHead(404).end()
    })
    const fileOrigin = await listen(files)
    const { outputFiles } = await build({
      entryPoints: [new URL('./fixture.tsx', import.meta.url).pathname],
      outdir: 'browser-build',
      bundle: true,
      splitting: true,
      format: 'esm',
      write: false,
      minify: true,
      jsx: 'automatic',
      define: { fileOrigin: JSON.stringify(fileOrigin) },
    })
    const assets = new Map(
      outputFiles.map((file) => [basename(file.path), Buffer.from(file.contents)]),
    )
    assets.set(
      'assets/transloadit-viewer/pdf.worker.min.mjs',
      await readFile(new URL(import.meta.resolve('@transloadit/viewer/pdf.worker.mjs'))),
    )
    assets.set(
      'assets/transloadit-viewer/wasm/jbig2_nowasm_fallback.js',
      await readFile(
        new URL(
          './wasm/jbig2_nowasm_fallback.js',
          import.meta.resolve('@transloadit/viewer/pdf.worker.mjs'),
        ),
      ),
    )
    await using app = createServer((req, res) => {
      if (req.url?.split('?')[0] === '/') {
        res
          .writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Security-Policy': `default-src 'none'; script-src 'self'; worker-src 'self'; connect-src ${fileOrigin}; style-src 'self'; base-uri 'none'`,
          })
          .end(
            '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script>',
          )
        return
      }
      const path = req.url?.slice(1) ?? ''
      const bytes = assets.get(path)
      if (!bytes) {
        res.writeHead(404).end()
        return
      }
      res
        .writeHead(200, {
          'Content-Security-Policy': "default-src 'none'; script-src 'self'; connect-src 'self'",
          'Content-Type': path.endsWith('.css') ? 'text/css' : 'application/javascript',
        })
        .end(bytes)
    })
    await use(await listen(app))
  },
})

test('mobile-sized PDF pages render in a same-origin worker and oversized notes show their prefix', async ({
  page,
  baseURL,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  const worker = page.waitForEvent('worker')
  await page.goto('/')
  const first = page.getByRole('img', { name: 'PDF page 1' })
  await expect(first).toBeVisible()
  expect((await worker).url()).toBe(`${baseURL}/assets/transloadit-viewer/pdf.worker.min.mjs`)
  function pixel(element: Element, fraction: number): number[] {
    if (!(element instanceof HTMLCanvasElement)) throw new Error('Expected PDF page canvas')
    const ctx = element.getContext('2d')
    if (!ctx) throw new Error('Missing canvas context')
    return [...ctx.getImageData(Math.floor(element.width * fraction), 5, 1, 1).data]
  }
  expect(await first.evaluate(pixel, 0.25)).toEqual([255, 0, 0, 255])
  const reader = page.getByRole('region', { name: 'Lecture slides' })
  await reader.focus()
  await reader.press('ArrowRight')
  const second = page.getByRole('img', { name: 'PDF page 2' })
  await expect(second).toBeVisible()
  expect([await second.evaluate(pixel, 0.25), await second.evaluate(pixel, 0.75)].sort()).toEqual([
    [0, 0, 0, 255],
    [255, 255, 255, 255],
  ])
  await expect(reader.getByRole('img')).toHaveCount(1)
  await expect(reader).toBeFocused()
  await expect(reader.getByRole('link', { name: 'Open original PDF' })).toBeVisible()
  await expect(page.getByLabel('PDF loads')).toHaveText('1')
  await page.setViewportSize({ width: 320, height: 600 })
  await expect
    .poll(() =>
      second.evaluate((el) =>
        el instanceof HTMLCanvasElement ? el.width / window.devicePixelRatio : 0,
      ),
    )
    .toBeCloseTo(304, 0)
  await page.getByRole('button', { name: 'Open notes' }).click()
  const notes = page.getByRole('article', { name: 'Notes' })
  await expect(notes.getByText('Preview truncated to the first 2 MiB.')).toBeVisible()
  await expect(notes.getByText(/Showing Markdown as plain text/)).toBeVisible()
  await notes.evaluate((el) => el.style.setProperty('--tl-viewer-padding', '11px'))
  await expect(notes).toHaveCSS('padding-left', '11px')
  const literal = await notes.locator('pre').textContent()
  expect(literal?.length).toBe(2 * 1024 * 1024)
  expect(literal?.at(0)).toBe('é')
  expect(errors).toEqual([])
})

test('recovers from a missing worker on the same document', async ({ page }) => {
  await page.goto('/?missingWorker')
  await page.getByRole('button', { name: 'Retry PDF' }).click()
  await expect(page.getByRole('img', { name: 'PDF page 1' })).toBeVisible()
  await expect(page.getByLabel('PDF loads')).toHaveText('1')
})
