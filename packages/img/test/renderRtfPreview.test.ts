// @vitest-environment happy-dom
import { expect, test } from 'vitest'

import { renderRtfPreview } from '../src/renderRtfPreview.ts'

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
