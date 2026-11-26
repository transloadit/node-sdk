// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"navigation":{"disableChildFrameNavigation":true}}}

import type { ReactNode } from 'react'
import type { Root } from 'react-dom/client'

import { act, createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { MAX_DOCUMENT_PREVIEW_BYTES } from '../src/document.ts'
import { Viewer } from '../src/viewer.tsx'

let root: Root
let container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function show(content: ReactNode): Promise<void> {
  await act(() => root.render(content))
}

test('renders Markdown with inert HTML, image alt text and external links only', async () => {
  await show(
    <Viewer
      kind="document"
      format="markdown"
      bytes={
        new TextEncoder().encode(
          '# Notes\n\n**Ready**\n\n<script>bad()</script>\n\n![Pixel](https://tracker.invalid/pixel)\n\n[Unsafe](javascript:bad) [Relative](/logout) [Docs](https://example.com)',
        ).buffer
      }
      title="Project notes"
      className="document"
      richClassName="markdown"
    />,
  )
  await vi.waitFor(() => expect(container.querySelector('h1')?.textContent).toBe('Notes'))
  expect(container.querySelector('strong')?.textContent).toBe('Ready')
  expect(container.querySelector('article')?.className).toBe('document')
  expect(container.querySelector('article > div')?.className).toBe('markdown')
  expect(container.textContent).toContain('Pixel')
  expect(container.querySelectorAll('script, img')).toHaveLength(0)
  expect(container.querySelectorAll('a')).toHaveLength(1)
  expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com')
  expect(container.querySelector('a')?.getAttribute('referrerpolicy')).toBe('no-referrer')
})

test('keeps plain text literal and reports oversized input through the caller fallback', async () => {
  await show(
    <Viewer
      kind="document"
      format="text"
      bytes={new TextEncoder().encode('<h1>Literal</h1>').buffer}
      title="Notes"
      className="document"
      textClassName="literal"
    />,
  )
  await vi.waitFor(() =>
    expect(container.querySelector('pre')?.textContent).toBe('<h1>Literal</h1>'),
  )
  expect(container.querySelector('h1')).toBeNull()
  expect(container.querySelector('article')?.className).toBe('document')
  expect(container.querySelector('pre')?.className).toBe('literal')
  await show(
    <Viewer
      kind="document"
      format="text"
      bytes={new ArrayBuffer(MAX_DOCUMENT_PREVIEW_BYTES + 1)}
      title="Notes"
      errorFallback={<p role="alert">Too large</p>}
    />,
  )
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Too large')
})

test('renders RTF locally into an inert sandboxed frame and rejects malformed RTF', async () => {
  await show(
    <Viewer
      kind="document"
      format="rtf"
      bytes={new TextEncoder().encode(String.raw`{\rtf1\ansi A letter\par\b Important\b0}`).buffer}
      title="Letter"
      className="document"
      richClassName="markdown"
    />,
  )
  await vi.waitFor(() => expect(container.querySelector('iframe')?.srcdoc).toContain('Important'))
  expect(container.querySelector('iframe')?.getAttribute('sandbox')).toBe('')
  expect(container.querySelector('iframe')?.className).toBe('document')
  expect(container.querySelector('iframe')?.srcdoc).toContain("default-src 'none'")
  const onError = vi.fn()
  await show(
    <Viewer
      kind="document"
      format="rtf"
      bytes={new TextEncoder().encode('<script>bad()</script>').buffer}
      title="Letter"
      onError={onError}
      errorFallback={<p role="alert">Unavailable</p>}
    />,
  )
  await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce())
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Unavailable')
})

test('forwards the exact authorized PDF URL without a third-party viewer service', async () => {
  const src = 'https://workspace.tlcdn.com/pdf?sig=private&v=exact'
  await show(<Viewer kind="pdf" src={src} title="Report" />)
  expect(container.querySelector('iframe')?.getAttribute('src')).toBe(src)
  expect(container.querySelector('iframe')?.getAttribute('title')).toBe('Report')
  expect(container.querySelector('iframe')?.getAttribute('referrerpolicy')).toBe('no-referrer')
})

test.each([
  'https://app.invalid/untrusted.html',
  '/untrusted.html',
  'blob:https://app.invalid/id',
  'data:text/html,bad',
  'javascript:bad',
])('rejects unsafe PDF location %s', async (src) => {
  vi.stubGlobal('location', new URL('https://app.invalid/'))
  await show(<Viewer kind="pdf" src={src} title="Report" errorFallback={<p>Unavailable</p>} />)
  expect(container.querySelector('iframe')).toBeNull()
  expect(container.textContent).toBe('Unavailable')
})

test('allows an explicitly trusted same-origin PDF route', async () => {
  await show(<Viewer kind="pdf" src="/trusted-pdf" title="Report" allowSameOrigin />)
  expect(container.querySelector('iframe')?.getAttribute('src')).toBe('/trusted-pdf')
})

test('reports an oversized document once per bytes identity', async () => {
  const onError = vi.fn()
  const bytes = new ArrayBuffer(MAX_DOCUMENT_PREVIEW_BYTES + 1)
  await show(<Viewer kind="document" format="text" bytes={bytes} title="Notes" onError={onError} />)
  await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce())
  await show(
    <Viewer kind="document" format="text" bytes={bytes} title="Updated" onError={onError} />,
  )
  expect(onError).toHaveBeenCalledOnce()
})

test('drops invalid image placeholders and defaults to lazy async decoding', async () => {
  await show(<Viewer kind="image" src="https://cdn.invalid/a" alt="Portrait" blurDataURL="bad" />)
  const image = container.querySelector('img')
  expect(image?.loading).toBe('lazy')
  expect(image?.decoding).toBe('async')
  expect(image?.style.backgroundImage).toBe('')
})

test('matches a cover image placeholder to the actual image fit', async () => {
  await show(
    <Viewer
      kind="image"
      src="https://cdn.invalid/a"
      alt="Portrait"
      objectFit="cover"
      blurDataURL="data:image/png;base64,AAAA"
    />,
  )
  const image = container.querySelector('img')
  expect(image?.style.backgroundSize).toBe('cover')
  expect(image?.style.objectFit).toBe('cover')
})

test('forwards native media refs and leaves media unloaded until the application starts it', async () => {
  const video = createRef<HTMLVideoElement>()
  const audio = createRef<HTMLAudioElement>()
  await show(
    <>
      <Viewer kind="video" ref={video} aria-label="Movie" />
      <Viewer kind="audio" ref={audio} aria-label="Recording" />
    </>,
  )
  expect(video.current?.getAttribute('src')).toBeNull()
  expect(video.current?.preload).toBe('none')
  expect(audio.current?.getAttribute('src')).toBeNull()
  expect(audio.current?.preload).toBe('none')
})

test('removes a direct image placeholder after loading and resets it for another source', async () => {
  const onLoad = vi.fn()
  await show(
    <Viewer
      kind="image"
      src="https://cdn.invalid/first"
      alt="Portrait"
      blurDataURL="data:image/png;base64,AAAA"
      onLoad={onLoad}
    />,
  )
  const image = container.querySelector('img')
  if (!image) throw new Error('Missing image')
  expect(image.style.backgroundImage).toContain('data:image/png;base64,AAAA')
  await act(() => {
    image.dispatchEvent(new Event('load'))
  })
  expect(image.style.backgroundImage).toBe('')
  expect(onLoad).toHaveBeenCalledOnce()
  await show(
    <Viewer
      kind="image"
      src="https://cdn.invalid/second"
      alt="Portrait"
      blurDataURL="data:image/png;base64,AAAA"
    />,
  )
  expect(container.querySelector('img')?.style.backgroundImage).toContain(
    'data:image/png;base64,AAAA',
  )
})

test('contains deeply nested Markdown failures without unmounting the host', async () => {
  const bytes = new TextEncoder().encode(`${'> '.repeat(5000)}Nested`).buffer
  const onError = vi.fn()
  function content(documentBytes: ArrayBuffer): ReactNode {
    return (
      <>
        <p>Host content</p>
        <Viewer
          kind="document"
          format="markdown"
          bytes={documentBytes}
          title="Notes"
          onError={onError}
          errorFallback={<p role="alert">Unavailable</p>}
        />
      </>
    )
  }
  await show(content(bytes))
  await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce())
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Unavailable')
  expect(container.textContent).toContain('Host content')
  await show(content(bytes))
  expect(onError).toHaveBeenCalledOnce()
  await show(content(new TextEncoder().encode('# Recovered').buffer))
  expect(container.querySelector('h1')?.textContent).toBe('Recovered')
  expect(onError).toHaveBeenCalledOnce()
})

test('clears a placeholder when the image loaded before hydration attached its handler', async () => {
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(640)
  await show(
    <Viewer
      kind="image"
      src="https://cdn.invalid/cached"
      alt="Portrait"
      blurDataURL="data:image/png;base64,AAAA"
    />,
  )
  expect(container.querySelector('img')?.style.backgroundImage).toBe('')
})
