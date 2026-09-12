// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import type { Root } from 'react-dom/client'

import type { TransloaditImageModel } from '../src/index.ts'

import { act, createElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { TransloaditPicture } from '../src/next/index.tsx'

Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  configurable: true,
  value: true,
})

const model: TransloaditImageModel = {
  expiresAt: Date.UTC(2030, 0, 1),
  fallbackUrl: 'https://assets.example/original.jpg',
  sources: [
    {
      candidates: [
        { url: 'https://cdn.example/image-320.avif', width: 320 },
        { url: 'https://cdn.example/image-640.avif', width: 640 },
      ],
      format: 'avif',
    },
    {
      candidates: [
        { url: 'https://cdn.example/image-320.webp', width: 320 },
        { url: 'https://cdn.example/image-640.webp', width: 640 },
      ],
      format: 'webp',
    },
  ],
}

function renderPicture(
  overrides: Partial<{
    alt: unknown
    deferUntilHydrated: boolean
    loading: 'eager' | 'lazy'
    media: string
    mediaPlaceholderSrc: string
    preload: boolean
    sizes: string
    style: unknown
  }> = {},
): Document {
  const markup = renderToStaticMarkup(
    // Intentionally allow invalid JS prop combinations to exercise runtime guards too.
    Reflect.apply(createElement, undefined, [
      TransloaditPicture,
      {
        alt: 'A canal house',
        className: 'photo',
        fetchPriority: 'high',
        height: 300,
        loading: 'lazy',
        model,
        sizes: '(min-width: 800px) 640px, 100vw',
        width: 400,
        ...overrides,
      },
    ]),
  )
  return new DOMParser().parseFromString(markup, 'text/html')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TransloaditPicture', () => {
  test.each([
    'after hydration',
    'before hydration',
  ])('optional fallback handles a failed image %s without replacing SSR markup', async (timing) => {
    const container = document.createElement('div')
    document.body.append(container)
    const props = { alt: 'Photo', height: 300, width: 400, model }
    const picture = (
      <TransloaditPicture {...props} errorFallback={<p role="status">Image unavailable</p>} />
    )
    const original = renderToString(<TransloaditPicture {...props} />)
    const markup = renderToString(picture)
    expect(markup).toBe(original)
    container.innerHTML = markup
    const complete = vi
      .spyOn(HTMLImageElement.prototype, 'complete', 'get')
      .mockReturnValue(timing === 'before hydration')
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0)
    vi.spyOn(HTMLImageElement.prototype, 'currentSrc', 'get').mockReturnValue(model.fallbackUrl)
    let root: Root | undefined
    const recoverableErrors: unknown[] = []
    await act(() => {
      root = hydrateRoot(container, picture, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      })
    })
    if (timing === 'after hydration') {
      await act(() => {
        container.querySelector('img')?.dispatchEvent(new Event('error'))
      })
    }
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Image unavailable')
    expect(container.querySelector('picture')).toBeNull()
    expect(recoverableErrors).toEqual([])
    complete.mockReturnValue(false)
    const replacement = { ...model, fallbackUrl: 'https://assets.example/replacement.jpg' }
    await act(() => {
      root?.render(
        <TransloaditPicture
          {...props}
          errorFallback={<p role="status">Image unavailable</p>}
          model={replacement}
        />,
      )
    })
    expect(container.querySelector('img')?.src).toBe(replacement.fallbackUrl)
    expect(container.querySelector('[role="status"]')).toBeNull()
    act(() => root?.unmount())
    container.remove()
  })

  test.each([
    { description: 'A canal house' },
    undefined,
    123,
  ])('rejects a non-string alt from JavaScript: %j', (alt) => {
    expect(() => renderPicture({ alt })).toThrow('Image alt must be a string')
  })

  test.each(['A canal house', ''])('preserves the supplied alt text: %j', (alt) => {
    expect(renderPicture({ alt }).querySelector('img')?.getAttribute('alt')).toBe(alt)
  })

  test('retains asynchronous decoding when a wrapper forwards undefined', () => {
    const markup = renderToStaticMarkup(
      <TransloaditPicture
        alt="Wrapped"
        decoding={undefined}
        height={300}
        model={model}
        width={400}
      />,
    )
    const document = new DOMParser().parseFromString(markup, 'text/html')
    expect(document.querySelector('img')?.getAttribute('decoding')).toBe('async')
  })

  test.each([
    'color:red',
    ['color:red'],
    123,
  ])('rejects a non-object style from JavaScript: %j', (style) => {
    expect(() => renderPicture({ style })).toThrow('Image style must be an object')
  })

  test('preserves serializable image attributes without exposing renderer or signing inputs', () => {
    const markup = renderToStaticMarkup(
      Reflect.apply(TransloaditPicture, undefined, [
        {
          alt: 'A canal house',
          'aria-describedby': 'photo-caption',
          authSecret: 'must-stay-private',
          crossOrigin: 'anonymous',
          'data-photo': 'canal',
          'data-nonserializable': { privateValue: 'must-stay-private' },
          decoding: 'sync',
          height: 300,
          id: 'canal-photo',
          model,
          onLoad: () => undefined,
          referrerPolicy: 'no-referrer',
          role: 'img',
          src: '/untrusted-original.jpg',
          srcSet: '/untrusted-candidate.jpg 320w',
          title: 'Amsterdam',
          urlParams: { sig: 'must-stay-private' },
          width: 400,
        },
      ]),
    )
    const document = new DOMParser().parseFromString(markup, 'text/html')
    const image = document.getElementById('canal-photo')

    expect(image?.getAttribute('aria-describedby')).toBe('photo-caption')
    expect(image?.getAttribute('title')).toBe('Amsterdam')
    expect(image?.getAttribute('role')).toBe('img')
    expect(image?.getAttribute('data-photo')).toBe('canal')
    expect(image?.getAttribute('decoding')).toBe('sync')
    expect(image?.getAttribute('crossorigin')).toBe('anonymous')
    expect(image?.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(image?.getAttribute('src')).toBe(model.fallbackUrl)
    expect(image?.hasAttribute('srcset')).toBe(false)
    expect(markup).not.toContain('must-stay-private')
    expect(markup).not.toContain('untrusted')
    expect(image?.hasAttribute('model')).toBe(false)
    expect(image?.hasAttribute('onload')).toBe(false)
    expect(image?.hasAttribute('data-nonserializable')).toBe(false)
  })

  test('defaults lazy sizing to the CSS box with a viewport fallback', () => {
    const document = renderPicture({ sizes: undefined })
    expect([...document.querySelectorAll('source')].map((source) => source.sizes)).toEqual([
      'auto, 100vw',
      'auto, 100vw',
    ])
    expect(document.querySelector('img')?.getAttribute('sizes')).toBe('auto')
  })

  test.each([
    'auto',
    'auto, 100vw',
    'AUTO, 400px',
  ])('activates lazy automatic sizing for %s', (sizes) => {
    const document = renderPicture({ sizes })
    expect([...document.querySelectorAll('source')].map((source) => source.sizes)).toEqual([
      sizes,
      sizes,
    ])
    expect(document.querySelector('img')?.getAttribute('sizes')).toBe('auto')
    expect(document.querySelector('img')?.getAttribute('loading')).toBe('lazy')
  })

  test.each([
    'auto',
    'auto, 100vw',
    'AUTO, 400px',
  ])('rejects eager automatic sizing for %s', (sizes) => {
    expect(() => renderPicture({ loading: 'eager', sizes })).toThrow(
      'Automatic image sizes require lazy loading',
    )
    expect(() => renderPicture({ loading: undefined, preload: true, sizes })).toThrow(
      'Automatic image sizes require lazy loading',
    )
  })

  test('renders native picture sources and the supplied fallback', () => {
    const document = renderPicture()
    const sources = [...document.querySelectorAll('source')]
    const image = document.querySelector('img')

    expect(sources.map((source) => source.type)).toEqual(['image/avif', 'image/webp'])
    expect(sources[0]?.sizes).toBe('(min-width: 800px) 640px, 100vw')
    expect(sources[0]?.srcset).toBe(
      'https://cdn.example/image-320.avif 320w, https://cdn.example/image-640.avif 640w',
    )
    expect(image?.getAttribute('alt')).toBe('A canal house')
    expect(image?.getAttribute('class')).toBe('photo')
    expect(image?.getAttribute('decoding')).toBe('async')
    expect(image?.getAttribute('fetchpriority')).toBe('high')
    expect(image?.getAttribute('height')).toBe('300')
    expect(image?.getAttribute('loading')).toBe('lazy')
    expect(image?.getAttribute('src')).toBe(model.fallbackUrl)
    expect(image?.getAttribute('width')).toBe('400')
  })

  test('escapes candidate URL tokens before appending width descriptors', () => {
    const document = new DOMParser().parseFromString(
      renderToStaticMarkup(
        <TransloaditPicture
          alt="A canal house"
          height={300}
          model={{
            ...model,
            sources: [
              {
                candidates: [{ url: 'https://cdn.example/my photo,', width: 320 }],
                format: 'webp',
              },
            ],
          }}
          sizes="400px"
          width={400}
        />,
      ),
      'text/html',
    )

    expect(document.querySelector('source')?.getAttribute('srcset')).toBe(
      'https://cdn.example/my%20photo%2C 320w',
    )
  })

  test('preloads only the preferred source', () => {
    const document = renderPicture({
      loading: 'eager',
      preload: true,
    })
    const preload = document.querySelector('link[rel="preload"]')
    const sources = [...document.querySelectorAll<HTMLSourceElement>('picture source')]
    const image = document.querySelector('img')

    expect(preload?.getAttribute('as')).toBe('image')
    expect(preload?.getAttribute('imagesizes')).toBe('(min-width: 800px) 640px, 100vw')
    expect(preload?.getAttribute('imagesrcset')).toBe(sources[0]?.getAttribute('srcset'))
    expect(preload?.getAttribute('type')).toBe('image/avif')
    expect(sources).toHaveLength(2)
    expect(image?.getAttribute('src')).toBe(model.fallbackUrl)
  })

  test('uses the same request policy on the preload and the image', () => {
    const document = new DOMParser().parseFromString(
      renderToStaticMarkup(
        <TransloaditPicture
          alt="A canal house"
          crossOrigin="use-credentials"
          height={300}
          model={model}
          preload
          referrerPolicy="no-referrer"
          width={400}
        />,
      ),
      'text/html',
    )
    const preload = document.querySelector('link[rel="preload"]')
    const image = document.querySelector('img')

    expect(preload?.getAttribute('crossorigin')).toBe('use-credentials')
    expect(preload?.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(preload?.getAttribute('imagesizes')).toBe('100vw')
    expect(image?.getAttribute('crossorigin')).toBe('use-credentials')
    expect(image?.getAttribute('referrerpolicy')).toBe('no-referrer')
  })

  test('rejects a media-gated preload instead of letting React deduplicate it incorrectly', () => {
    expect(() =>
      renderPicture({ loading: 'eager', media: '(min-width: 768px)', preload: true }),
    ).toThrow('A media-gated Transloadit image cannot be preloaded')
  })

  test('escapes whitespace in a media-gated fallback srcset URL', () => {
    const document = new DOMParser().parseFromString(
      renderToStaticMarkup(
        <TransloaditPicture
          alt="A canal house"
          height={300}
          media="(min-width: 768px)"
          model={{ ...model, fallbackUrl: '/images/my photo.jpg' }}
          sizes="400px"
          width={400}
        />,
      ),
      'text/html',
    )

    expect(document.querySelectorAll('source').item(2).getAttribute('srcset')).toBe(
      '/images/my%20photo.jpg',
    )
  })

  test('encodes trailing commas in a media-gated fallback srcset URL', () => {
    const document = new DOMParser().parseFromString(
      renderToStaticMarkup(
        <TransloaditPicture
          alt="A canal house"
          height={300}
          media="(min-width: 768px)"
          model={{ ...model, fallbackUrl: '/images/photo,,' }}
          sizes="400px"
          width={400}
        />,
      ),
      'text/html',
    )

    expect(document.querySelectorAll('source').item(2).getAttribute('srcset')).toBe(
      '/images/photo%2C%2C',
    )
  })

  test('encodes leading commas in a media-gated fallback srcset URL', () => {
    const document = new DOMParser().parseFromString(
      renderToStaticMarkup(
        <TransloaditPicture
          alt="A canal house"
          height={300}
          media="(min-width: 768px)"
          model={{ ...model, fallbackUrl: ',,/images/photo.jpg' }}
          sizes="400px"
          width={400}
        />,
      ),
      'text/html',
    )

    expect(document.querySelectorAll('source').item(2).getAttribute('srcset')).toBe(
      '%2C%2C/images/photo.jpg',
    )
  })

  test('preserves the payload delimiter in a media-gated data URL fallback', () => {
    const fallbackUrl = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
    const document = new DOMParser().parseFromString(
      renderToStaticMarkup(
        <TransloaditPicture
          alt="A canal house"
          height={300}
          media="(min-width: 768px)"
          model={{ ...model, fallbackUrl }}
          sizes="400px"
          width={400}
        />,
      ),
      'text/html',
    )

    expect(document.querySelectorAll('source').item(2).getAttribute('srcset')).toBe(fallbackUrl)
  })

  test('uses a neutral inline fallback while a media condition is unmatched', () => {
    const document = renderPicture({ media: '(min-width: 768px)' })

    expect(document.querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/gif;base64,/)
  })

  test('accepts a CSP-compatible media placeholder', () => {
    const document = renderPicture({
      media: '(min-width: 768px)',
      mediaPlaceholderSrc: '/images/transparent.gif',
    })

    expect(document.querySelector('img')?.getAttribute('src')).toBe('/images/transparent.gif')
  })

  test('makes preload eager by default and rejects an explicitly lazy preload', () => {
    const preloaded = renderPicture({ loading: undefined, preload: true })

    expect(preloaded.querySelector('img')?.getAttribute('loading')).toBe('eager')
    expect(() => renderPicture({ loading: 'lazy', preload: true })).toThrow(
      'A preloaded Transloadit image cannot use lazy loading',
    )
  })

  test('keeps deferred candidate elements out of server markup', () => {
    const document = renderPicture({ deferUntilHydrated: true })

    expect(document.querySelector('noscript img')?.getAttribute('src')).toBe(model.fallbackUrl)
    expect(document.querySelectorAll('source')).toHaveLength(0)
  })

  test('rejects a renderer model with an empty candidate set', () => {
    expect(() =>
      renderToStaticMarkup(
        <TransloaditPicture
          alt="Broken model"
          height={300}
          model={{ ...model, sources: [{ candidates: [], format: 'avif' }] }}
          sizes="400px"
          width={400}
        />,
      ),
    ).toThrow('Cannot render an empty Transloadit image source')
  })

  const deferredLoadingCases: Array<{ loading: 'eager' | 'lazy'; preload: boolean }> = [
    { loading: 'eager', preload: false },
    { loading: 'lazy', preload: true },
  ]

  test.each(deferredLoadingCases)('rejects deferring an $loading image with preload=$preload', ({
    loading,
    preload,
  }) => {
    expect(() => renderPicture({ deferUntilHydrated: true, loading, preload })).toThrow(
      'An eager or preloaded Transloadit image cannot be deferred until hydration',
    )
  })

  test('hydrates one deferred picture without a recoverable error', async () => {
    function DeferredPicture(): ReactNode {
      return (
        <TransloaditPicture
          alt="A canal house"
          deferUntilHydrated
          height={300}
          model={model}
          sizes="400px"
          width={400}
        />
      )
    }

    const container = document.createElement('div')
    const recoverableErrors: unknown[] = []
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    container.innerHTML = renderToString(<DeferredPicture />)
    document.body.append(container)
    let root: Root | undefined

    expect(container.querySelector('noscript')).not.toBeNull()
    expect(container.querySelector('picture')).toBeNull()

    await act(async () => {
      root = hydrateRoot(container, <DeferredPicture />, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      })
      await Promise.resolve()
    })

    expect(container.querySelector('noscript')).toBeNull()
    expect(container.querySelector('picture')).not.toBeNull()
    expect(recoverableErrors).toEqual([])
    expect(consoleError).not.toHaveBeenCalled()

    act(() => root?.unmount())
    container.remove()
  })
})
