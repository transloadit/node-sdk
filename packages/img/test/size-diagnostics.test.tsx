// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, test, vi } from 'vitest'

import { ImageSizeDiagnostics } from '../src/next/ImageSizeDiagnostics.tsx'

afterEach(() => vi.restoreAllMocks())

test.each([
  'picture',
  'jpeg',
])('development warns about an oversized %s candidate without logging its private URL', async (source) => {
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
    vi.spyOn(image, 'naturalWidth', 'get').mockReturnValue(1200)
    vi.spyOn(image, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 300, 200))
    image.dispatchEvent(new Event('load'))
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      '[StorageImage] The selected 1200px candidate is more than twice its 300px rendered width. Set sizes to match the image’s CSS width.',
    )
    image.dispatchEvent(new Event('load'))
    expect(warning).toHaveBeenCalledTimes(1)
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  }
})
