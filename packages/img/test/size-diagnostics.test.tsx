// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, test, vi } from 'vitest'

import { ImageSizeDiagnostics } from '../src/next/ImageSizeDiagnostics.tsx'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test.each([
  0, 1,
])('does not warn about a temporary %ipx box before layout settles', async (width) => {
  vi.useFakeTimers()
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const container = document.createElement('div')
  const root = createRoot(container)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  try {
    await act(async () =>
      root.render(
        <ImageSizeDiagnostics>
          <picture>
            <source srcSet="https://cdn.example/hero 960w" />
            <img alt="Canal house" />
          </picture>
        </ImageSizeDiagnostics>,
      ),
    )
    const image = container.querySelector('img')
    if (image === null) throw new Error('Expected the scaffold image')
    vi.spyOn(image, 'currentSrc', 'get').mockReturnValue('https://cdn.example/hero')
    vi.spyOn(image, 'naturalWidth', 'get').mockReturnValue(960)
    vi.spyOn(image, 'complete', 'get').mockReturnValue(true)
    const geometry = vi
      .spyOn(image, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 0, width, 1))
    image.dispatchEvent(new Event('load'))
    await act(() => vi.advanceTimersByTimeAsync(20))
    expect(warning).not.toHaveBeenCalled()
    geometry.mockReturnValue(new DOMRect(0, 0, 960, 640))
    window.dispatchEvent(new Event('resize'))
    await act(() => vi.advanceTimersByTimeAsync(20))
    expect(warning).not.toHaveBeenCalled()
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  }
})

test.each([
  'picture',
  'jpeg',
])('development warns about an oversized %s candidate without logging its private URL', async (source) => {
  vi.useFakeTimers()
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const container = document.createElement('div')
  const root = createRoot(container)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  try {
    await act(async () =>
      root.render(
        <ImageSizeDiagnostics>
          <picture>
            <source srcSet="https://cdn.example/image?secret=private 1200w" />
            <img alt="Hero" />
          </picture>
        </ImageSizeDiagnostics>,
      ),
    )
    const image = container.querySelector('img')
    if (image === null) throw new Error('Expected a rendered image')
    vi.spyOn(image, 'currentSrc', 'get').mockReturnValue(
      source === 'picture'
        ? 'https://cdn.example/image?secret=private'
        : 'https://cdn.example/fallback.jpg?secret=private',
    )
    const naturalWidth = vi.spyOn(image, 'naturalWidth', 'get').mockReturnValue(0)
    const complete = vi.spyOn(image, 'complete', 'get').mockReturnValue(false)
    vi.spyOn(image, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 300, 200))
    window.dispatchEvent(new Event('resize'))
    await act(() => vi.advanceTimersByTimeAsync(20))
    expect(warning).not.toHaveBeenCalled()
    naturalWidth.mockReturnValue(1200)
    complete.mockReturnValue(true)
    image.dispatchEvent(new Event('load'))
    await act(() => vi.advanceTimersByTimeAsync(20))
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      '[StorageImage] The selected 1200px candidate is more than twice its 300px rendered width. Set sizes to match the image’s CSS width.',
    )
    image.dispatchEvent(new Event('load'))
    await act(() => vi.advanceTimersByTimeAsync(20))
    expect(warning).toHaveBeenCalledTimes(1)
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  }
})
