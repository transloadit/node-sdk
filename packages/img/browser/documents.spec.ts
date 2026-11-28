import type { Server } from 'node:http'

import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { basename } from 'node:path'

import { test as base, expect } from '@playwright/test'
import { build } from 'esbuild'

// Paint solid colors so the test can distinguish rasterized pages from blank or stale canvases.
function slideDeck(sparse = false): Buffer {
  const scan = '36FFFF001001>'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    sparse
      ? '<< /Type /Pages /Kids [3 0 R 4 0 R 9 0 R 10 0 R 11 0 R] /Count 5 >>'
      : '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << /Font << /F1 8 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << /XObject << /Scan 7 0 R >> >> /Contents 6 0 R >>',
    ...[
      '1 0 0 rg 0 0 200 100 re f BT /F1 12 Tf 10 10 Td (Lecture notes) Tj ET\n',
      'q 200 0 0 100 0 0 cm /Scan Do Q\n',
    ].map((content) => {
      return `<< /Length ${content.length} >>\nstream\n${content}endstream`
    }),
    // An 8×8 Group 4 fax strip containing a black half and a white half.
    `<< /Type /XObject /Subtype /Image /Width 8 /Height 8 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter [/ASCIIHexDecode /CCITTFaxDecode] /DecodeParms [null << /K -1 /Columns 8 /Rows 8 >>] /Length ${scan.length} >>\nstream\n${scan}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  if (sparse) {
    // Page five uses the header's text stream. Page two's scan requires a later range.
    objects.push(objects[2], objects[2], objects[2])
  }
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (const [i, object] of objects.entries()) {
    // Keep page two outside the header and trailer chunks until the reader navigates.
    if (sparse && (i === 5 || i === 7)) pdf += `%padding\n${'%pad\n'.repeat(65536)}`
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`
  }
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  return Buffer.from(
    `${pdf}trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xref}\n%%EOF\n`,
  )
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
    const deck = slideDeck(true)
    let expired = false
    let resume: () => void = () => {}
    const resumed = new Promise<void>((resolve) => {
      resume = resolve
    })
    await using files = createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      if (req.url === '/expire') {
        expired = true
        res.writeHead(204).end()
      } else if (req.url === '/resume') {
        resume()
        res.writeHead(204).end()
      } else if (req.url === '/frame') {
        res.writeHead(200, { 'Content-Type': 'text/html' }).end('<p>Frame loaded</p>')
      } else if (req.url === '/stalled') {
        res.writeHead(200, { 'Content-Type': 'application/pdf' })
        res.write('%PDF-1.4\n')
      } else if (req.url?.startsWith('/ranges/')) {
        if (req.url === '/ranges/fresh') await resumed
        res.setHeader(
          'Access-Control-Expose-Headers',
          'Accept-Ranges, Content-Range, Content-Length',
        )
        res.setHeader('Accept-Ranges', 'bytes')
        res.setHeader('Content-Type', 'application/octet-stream')
        if (expired && req.url === '/ranges/old') {
          res.writeHead(403).end()
          return
        }
        const range = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range ?? '')
        if (!range) {
          res.writeHead(200, { 'Content-Length': deck.length })
          res.flushHeaders()
          return
        }
        const start = Number(range[1])
        const end = Number(range[2])
        res
          .writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${deck.length}`,
            'Content-Length': end - start + 1,
          })
          .end(deck.subarray(start, end + 1))
      } else if (req.url === '/report') {
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
    assets.set(
      'assets/transloadit-viewer/standard_fonts/LiberationSans-Regular.ttf',
      await readFile(
        new URL(
          './standard_fonts/LiberationSans-Regular.ttf',
          import.meta.resolve('@transloadit/viewer/pdf.worker.mjs'),
        ),
      ),
    )
    await using app = createServer((req, res) => {
      if (req.url?.split('?')[0] === '/') {
        res
          .writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Security-Policy': `default-src 'none'; script-src 'self'; worker-src 'self'; connect-src ${fileOrigin}; font-src 'self'; style-src 'self'; frame-src ${fileOrigin}; base-uri 'none'`,
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
          'Content-Type': path.endsWith('.css')
            ? 'text/css'
            : path.endsWith('.ttf')
              ? 'font/ttf'
              : 'application/javascript',
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
  await expect(reader.getByRole('link', { name: 'Open original PDF' })).toHaveCount(0)
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
  await expect(page.getByText('network', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Retry PDF' }).click()
  await expect(page.getByRole('img', { name: 'PDF page 1' })).toBeVisible()
  await expect(page.getByLabel('PDF loads')).toHaveText('1')
})

test('opens by range, then renews the denied range when jumping to another page', async ({
  page,
  request,
}) => {
  const ranges: { url: string; range?: string; status: number }[] = []
  page.on('response', (response) => {
    if (response.url().includes('/ranges/'))
      ranges.push({
        url: response.url(),
        range: response.request().headers().range,
        status: response.status(),
      })
  })
  await page.goto('/?ranges')
  await expect(page.getByText('Lecture notes', { exact: true })).toBeVisible()
  const firstRange = ranges.find((entry) => entry.status === 206)
  expect(firstRange?.range).toMatch(/^bytes=/)
  if (!firstRange) throw new Error('Missing first range')
  expect((await request.get(new URL('/expire', firstRange.url).href)).status()).toBe(204)
  const input = page.getByRole('spinbutton', { name: 'Page number' })
  const renewed = page.waitForRequest('**/ranges/fresh')
  await input.fill('2')
  await input.press('Enter')
  await renewed
  await expect(page.getByRole('img', { name: 'PDF page 1' })).toBeVisible()
  expect((await request.get(new URL('/resume', firstRange.url).href)).status()).toBe(204)
  await expect(page.getByRole('img', { name: 'PDF page 2' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Page 2 of 5' })).toBeVisible()
  const denied = ranges.find((entry) => entry.status === 403)
  expect(denied?.range).toMatch(/^bytes=/)
  expect(ranges).toContainEqual({
    url: new URL('/ranges/fresh', firstRange.url).href,
    range: denied?.range,
    status: 206,
  })
  await expect(page.getByLabel('PDF loads')).toHaveText('1')
  await page.getByRole('region', { name: 'Lecture slides' }).press('PageUp')
  await expect(page.getByRole('img', { name: 'PDF page 1' })).toBeVisible()
  await expect(input).toHaveValue('1')
})

test('times out a stalled PDF response body', async ({ page }) => {
  await page.goto('/?stalled')
  await expect(page.getByText('network', { exact: true })).toBeVisible()
})

test('zooms selectable text with the canvas and fits the available page height', async ({
  page,
}) => {
  await page.goto('/')
  const reader = page.getByRole('region', { name: 'Lecture slides' })
  await reader.evaluate((el) => el.style.setProperty('--tl-viewer-pdf-height', '120px'))
  const text = reader.getByText('Lecture notes', { exact: true })
  await expect(text).toBeVisible()
  const selected = await text.evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    return selection?.toString()
  })
  expect(selected).toBe('Lecture notes')
  await expect(reader.getByRole('button', { name: 'Fit width', pressed: true })).toBeVisible()
  await reader.getByRole('button', { name: 'Fit page' }).click()
  await expect(reader.getByRole('button', { name: 'Fit page', pressed: true })).toBeVisible()
  const canvas = reader.getByRole('img', { name: 'PDF page 1' })
  await expect(canvas).toHaveCSS('height', '120px')
  await reader.getByRole('button', { name: 'Zoom in' }).click()
  await expect(canvas).toHaveCSS('height', '150px')
  await reader.getByRole('button', { name: 'Zoom out' }).click()
  await expect(canvas).toHaveCSS('height', '120px')
  await reader.evaluate((el) => el.style.setProperty('--tl-viewer-pdf-height', '0px'))
  await expect(canvas).toHaveCSS('height', '120px')
  await reader.evaluate((el) => el.style.setProperty('--tl-viewer-pdf-height', '160px'))
  await expect(canvas).toHaveCSS('height', '160px')
  await reader.getByRole('button', { name: 'Fit width' }).click()
  await expect.poll(() => canvas.evaluate((el) => el.clientHeight)).toBeGreaterThan(120)
  const zoomIn = reader.getByRole('button', { name: 'Zoom in' })
  const zoomOut = reader.getByRole('button', { name: 'Zoom out' })
  await zoomIn.click({ clickCount: 7 })
  await expect(zoomIn).toBeDisabled()
  await reader.getByRole('button', { name: 'Fit width' }).click()
  await zoomOut.click({ clickCount: 7 })
  await expect(zoomOut).toBeDisabled()
})

test('rotates the grant on page five and uses it for the next range', async ({ page }) => {
  await page.goto('/?ranges')
  const input = page.getByRole('spinbutton', { name: 'Page number' })
  await input.fill('5')
  await input.press('Enter')
  const fifth = page.getByRole('img', { name: 'PDF page 5' })
  await expect(fifth).toBeVisible()
  await page.getByRole('button', { name: 'Extend expiry' }).click()
  await expect(fifth).toBeVisible()
  await page.getByRole('button', { name: 'Rotate URL' }).click()
  await expect(fifth).toBeVisible()
  await expect(input).toHaveValue('5')
  const range = page.waitForRequest(
    (request) => request.url().includes('/ranges/') && !!request.headers().range,
  )
  await input.fill('2')
  await input.press('Enter')
  expect(new URL((await range).url()).pathname).toBe('/ranges/rotated')
  await expect(page.getByRole('img', { name: 'PDF page 2' })).toBeVisible()
  await expect(page.getByLabel('PDF loads')).toHaveText('1')
  await expect(page.getByLabel('Grant renewals')).toHaveText('0')
  await page.getByRole('button', { name: 'Switch version' }).click()
  await expect(page.getByRole('img', { name: 'PDF page 1' })).toBeVisible()
  await expect(page.getByLabel('PDF loads')).toHaveText('2')
})

test('opens a portal PDF from a lazy grant with Safari 17.0 APIs', async ({ page }) => {
  function safari17(): void {
    Reflect.deleteProperty(URL, 'parse')
    Reflect.deleteProperty(AbortSignal, 'any')
    Reflect.deleteProperty(Promise, 'withResolvers')
    Reflect.deleteProperty(ArrayBuffer.prototype, 'transferToFixedLength')
    Reflect.deleteProperty(Response.prototype, 'bytes')
    Reflect.deleteProperty(Blob.prototype, 'bytes')
  }
  await page.addInitScript(safari17)
  // Page init scripts don't run in module workers.
  await page.route('**/pdf.worker.min.mjs', async (route) => {
    const response = await route.fetch()
    await route.fulfill({ response, body: `(${safari17.toString()})();\n${await response.text()}` })
  })
  await page.goto('/?lazy')
  await expect(page.getByText('Lecture notes', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Grant renewals')).toHaveText('1')
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByRole('img', { name: 'PDF page 2' })).toBeVisible()
})

test('built-in Retry returns keyboard focus to the reader', async ({ page }) => {
  await page.route(
    '**/report',
    (route) => route.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' } }),
    { times: 1 },
  )
  await page.goto('/?defaultError')
  const retry = page.getByRole('button', { name: 'Retry PDF' })
  await retry.focus()
  await retry.press('Enter')
  await expect(page.getByRole('img', { name: 'PDF page 1' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Lecture slides' })).toBeFocused()
})

test('native frame times out, retries and clears its loading indicator', async ({ page }) => {
  let unblock = () => {}
  const hold = new Promise<void>((resolve) => {
    unblock = resolve
  })
  await page.route(
    '**/frame',
    async (route) => {
      await hold
      await route.abort()
    },
    { times: 1 },
  )
  await page.goto('/?frame', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('status')).toHaveText('Loading PDF…')
  const retry = page.getByRole('button', { name: 'Retry PDF' })
  await expect(retry).toBeVisible()
  unblock()
  await retry.press('Enter')
  await expect(page.frameLocator('iframe').getByText('Frame loaded')).toHaveCount(1)
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByTitle('Native slides')).toBeFocused()
})

test('horizontal swipes turn pages in both directions', async ({ page }) => {
  await page.goto('/')
  const first = page.getByRole('img', { name: 'PDF page 1' })
  const second = page.getByRole('img', { name: 'PDF page 2' })
  await expect(first).toBeVisible()
  await first.dispatchEvent('touchstart', {
    touches: [{ identifier: 1, clientX: 240, clientY: 80 }],
  })
  await first.dispatchEvent('touchend', {
    touches: [],
    changedTouches: [{ identifier: 1, clientX: 70, clientY: 84 }],
  })
  await expect(second).toBeVisible()
  await second.dispatchEvent('touchstart', {
    touches: [{ identifier: 1, clientX: 70, clientY: 84 }],
  })
  await second.dispatchEvent('touchend', {
    touches: [],
    changedTouches: [{ identifier: 1, clientX: 240, clientY: 80 }],
  })
  await expect(first).toBeVisible()
})
