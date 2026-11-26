// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'

import { renderRtfPreview } from '../src/renderRtfPreview.ts'

afterEach(() => vi.restoreAllMocks())

test('preserves RTF text and formatting inside a document with no active content or imports', async () => {
  const bytes = new TextEncoder().encode(
    String.raw`{\rtf1\ansi A letter\par\b Important\b0\par {\field{\*\fldinst HYPERLINK "https://tracking.invalid"}{\fldrslt Unsafe link}}}`,
  ).buffer
  const html = await renderRtfPreview(bytes)
  const frame = new DOMParser().parseFromString(html, 'text/html')
  expect(frame.body.textContent).toContain('A letter')
  expect(frame.body.textContent).toContain('Important')
  expect(frame.body.textContent).toContain('Unsafe link')
  expect(
    frame.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content'),
  ).toContain("default-src 'none'")
  expect(
    frame.querySelectorAll('a, img, script, object, iframe, form, [href], [src], [onload]'),
  ).toHaveLength(0)
  expect(frame.body.innerHTML).toContain('font-weight: bold')
})

test('rejects malformed RTF instead of treating arbitrary bytes as HTML', async () => {
  await expect(
    renderRtfPreview(new TextEncoder().encode('<script>alert(1)</script>').buffer),
  ).rejects.toThrow()
})

test('ignores external IMPORT fields while preserving the rest of the document', async () => {
  const fetchMock = vi.fn<typeof fetch>()
  vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)
  const bytes = new TextEncoder().encode(
    String.raw`{\rtf1\ansi Before {\field{\*\fldinst IMPORT "https://tracking.invalid/logo.wmf"}{\fldrslt Logo}} After}`,
  ).buffer
  const html = await renderRtfPreview(bytes)
  const frame = new DOMParser().parseFromString(html, 'text/html')
  expect(frame.body.textContent).toContain('Before')
  expect(frame.body.textContent).toContain('After')
  expect(frame.querySelectorAll('img, [src], [href]')).toHaveLength(0)
  expect(fetchMock).not.toHaveBeenCalled()
})
