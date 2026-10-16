// @vitest-environment happy-dom
import type { Root } from 'react-dom/client'

import { act } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { ImagePrefetch, ImagePreview } from '../src/preview.tsx'

const src = {
  workspace: 'wedding',
  asset_id: 'A'.repeat(22),
  version_id: 'B'.repeat(21) + 'A',
  path: 'photo.jpg',
  width: 1200,
  height: 800,
  thumbhash: 'IvkFHYx/iHiHh3h3d3h4d494+IiI',
}
let root: Root
let container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  // This DOM does not fetch picture sources; loading is controlled by each test.
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false)
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
function image(): HTMLImageElement {
  const element = container.querySelector('picture img')
  if (!(element instanceof HTMLImageElement)) throw new Error('Missing responsive image')
  return element
}

test('renders an immediate blur and loading feedback, clears both on load, resets on navigation', async () => {
  const loaded = vi.fn()
  const preview = (version = src.version_id) => (
    <ImagePreview
      src={{ ...src, version_id: version }}
      alt="Wedding"
      loadingFallback={<span role="status">Loading photo</span>}
      errorFallback={<p role="alert">Unavailable</p>}
      onReady={loaded}
    />
  )
  await act(() => root.render(preview()))
  expect(container.querySelector('[role=status]')?.textContent).toBe('Loading photo')
  expect(container.querySelector('img[aria-hidden]')?.getAttribute('src')).toMatch(
    /^data:image\/png/,
  )
  expect(image().style.objectFit).toBe('contain')
  await act(() => image().dispatchEvent(new Event('load')))
  expect(loaded).toHaveBeenCalledOnce()
  expect(container.querySelector('[role=status]')).toBeNull()
  expect(container.querySelector('img[aria-hidden]')).toBeNull()
  await act(() => root.render(preview('C'.repeat(21) + 'A')))
  expect(container.querySelector('[role=status]')).not.toBeNull()
  await act(() => image().dispatchEvent(new Event('error')))
  expect(container.querySelector('[role=alert]')?.textContent).toBe('Unavailable')
  expect(container.querySelector('[role=status]')).toBeNull()
  expect(container.querySelector('picture')).toBeNull()
})

test('prefetches only one image at low priority using the same authorized responsive candidates', async () => {
  await act(() => root.render(<ImagePrefetch src={src} sizes="100vw" />))
  expect(container.querySelectorAll('img')).toHaveLength(1)
  expect(image().getAttribute('fetchpriority')).toBe('low')
  expect(image().loading).toBe('eager')
  const candidates = [...container.querySelectorAll('source')].map((node) =>
    node.getAttribute('srcset'),
  )
  expect(candidates[0]).toContain('/api/transloadit/media?')
  await act(() =>
    root.render(
      <ImagePreview
        src={src}
        alt="Wedding"
        sizes="100vw"
        loadingFallback={null}
        errorFallback={null}
      />,
    ),
  )
  expect(
    [...container.querySelectorAll('source')].map((node) => node.getAttribute('srcset')),
  ).toEqual(candidates)
})

test.each([
  { saveData: true, effectiveType: '4g' },
  { saveData: false, effectiveType: 'slow-2g' },
  { saveData: false, effectiveType: '2g' },
  { saveData: false, effectiveType: '3g' },
])('does not prefetch on a constrained connection: %j', async (connection) => {
  vi.stubGlobal('navigator', { connection })
  await act(() => root.render(<ImagePrefetch src={src} />))
  expect(container.querySelector('img')).toBeNull()
})

test.each([
  undefined,
  {},
  { saveData: false, effectiveType: '4g' },
])('allows one prefetch with an unconstrained or unavailable connection estimate: %j', async (connection) => {
  vi.stubGlobal('navigator', { connection })
  await act(() => root.render(<ImagePrefetch src={src} />))
  expect(container.querySelectorAll('img')).toHaveLength(1)
  expect(image().getAttribute('fetchpriority')).toBe('low')
})

test.each([
  true,
  false,
])('hydrates without server prefetch markup, with Save-Data=%s', async (saveData) => {
  vi.stubGlobal('navigator', { connection: { saveData, effectiveType: '4g' } })
  const preview = <ImagePrefetch src={src} />
  const html = renderToString(preview)
  expect(html).toBe('')
  await act(() => root.unmount())
  container.innerHTML = html
  const recoverableErrors: unknown[] = []
  await act(() => {
    root = hydrateRoot(container, preview, {
      onRecoverableError: (error) => recoverableErrors.push(error),
    })
  })
  expect(container.querySelectorAll('img')).toHaveLength(saveData ? 0 : 1)
  expect(recoverableErrors).toEqual([])
})

test('recognizes an image that finished before hydration and notifies once', async () => {
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1200)
  const ready = vi.fn()
  await act(() =>
    root.render(
      <ImagePreview
        src={src}
        alt="Wedding"
        onReady={ready}
        loadingFallback={<span role="status">Loading photo</span>}
        errorFallback={<p role="alert">Unavailable</p>}
      />,
    ),
  )
  expect(container.querySelector('[role=status]')).toBeNull()
  expect(container.querySelector('img[aria-hidden]')).toBeNull()
  await act(() => image().dispatchEvent(new Event('load')))
  expect(ready).toHaveBeenCalledOnce()
})

test('an error illustration cannot be mistaken for the primary image after a parent render', async () => {
  const ready = vi.fn()
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockImplementation(function (
    this: HTMLImageElement,
  ) {
    return this.alt === 'Unavailable illustration'
  })
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(100)
  const preview = () => (
    <ImagePreview
      src={src}
      alt="Wedding"
      onReady={() => ready()}
      loadingFallback={<span role="status">Loading photo</span>}
      errorFallback={
        <picture>
          <img src="/error.png" alt="Unavailable illustration" />
        </picture>
      }
    />
  )
  await act(() => root.render(preview()))
  await act(() => image().dispatchEvent(new Event('error')))
  await act(() => root.render(preview()))
  expect(ready).not.toHaveBeenCalled()
  expect(image().alt).toBe('Unavailable illustration')
})

test('changing rendition policy recovers a failed preview through new authorized candidates', async () => {
  const preview = (width: number) => (
    <ImagePreview
      src={src}
      policy={{ widths: [width], maximumWidth: width }}
      alt="Wedding"
      loadingFallback={<span role="status">Loading photo</span>}
      errorFallback={<p role="alert">Unavailable</p>}
    />
  )
  await act(() => root.render(preview(320)))
  await act(() => image().dispatchEvent(new Event('error')))
  expect(container.querySelector('[role=alert]')).not.toBeNull()
  await act(() => root.render(preview(640)))
  expect(container.querySelector('[role=status]')).not.toBeNull()
  expect(image().src).toContain('w=640')
})

test('plain loading feedback is overlaid inside the frame instead of adding a clipped second row', async () => {
  await act(() =>
    root.render(
      <ImagePreview
        src={src}
        alt="Wedding"
        loadingFallback={<span role="status">Loading photo</span>}
        errorFallback={null}
      />,
    ),
  )
  // The overlay positioning is this component's layout contract, independent of consumer CSS.
  const overlay = container.querySelector('[role=status]')?.parentElement
  expect(overlay?.style.position).toBe('absolute')
  expect(overlay?.style.inset).toBe('0')
})

test('an explicit retry key recovers the same failed version without changing its URL', async () => {
  const preview = (retryKey: number) => (
    <ImagePreview
      src={src}
      alt="Wedding"
      retryKey={retryKey}
      loadingFallback={<span role="status">Loading photo</span>}
      errorFallback={<p role="alert">Unavailable</p>}
    />
  )
  await act(() => root.render(preview(0)))
  const href = image().src
  await act(() => image().dispatchEvent(new Event('error')))
  await act(() => root.render(preview(1)))
  expect(container.querySelector('[role=status]')).not.toBeNull()
  expect(image().src).toBe(href)
})

test('receipt metadata can add or remove a loading blur without remounting the primary image', async () => {
  const preview = (thumbhash: string | undefined) => (
    <ImagePreview
      src={{ ...src, thumbhash }}
      alt="Wedding"
      loadingFallback={<span role="status">Loading photo</span>}
      errorFallback={null}
    />
  )
  await act(() => root.render(preview(undefined)))
  const primary = image()
  expect(container.querySelector('img[aria-hidden]')).toBeNull()
  await act(() => root.render(preview(src.thumbhash)))
  expect(container.querySelector('img[aria-hidden]')).not.toBeNull()
  expect(image()).toBe(primary)
  await act(() => root.render(preview(undefined)))
  expect(container.querySelector('img[aria-hidden]')).toBeNull()
  expect(image()).toBe(primary)
})

test('canonical alpha metadata suppresses the blur even if the hash has no alpha bit', async () => {
  await act(() =>
    root.render(
      <ImagePreview
        src={{ ...src, has_alpha: true }}
        alt="Wedding"
        loadingFallback={null}
        errorFallback={null}
      />,
    ),
  )
  expect(container.querySelector('img[aria-hidden]')).toBeNull()
})
