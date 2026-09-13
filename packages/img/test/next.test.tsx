// @vitest-environment happy-dom

import type { ReactNode } from 'react'
import type { Root } from 'react-dom/client'

import type { TransloaditImageModel } from '../src/index.ts'

import { act, Children, createElement, isValidElement } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { TransloaditPicture } from '../src/next/index.tsx'
import { StorageImageErrorBoundary } from '../src/next/StorageImageErrorBoundary.tsx'

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
    loading: 'eager' | 'lazy'
    priority: boolean
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
    ['/images/my photo.jpg', '/images/my%20photo.jpg'],
    ['/images/photo,,', '/images/photo%2C%2C'],
    [',,/images/photo.jpg', '%2C%2C/images/photo.jpg'],
    ['data:image/gif;base64,AAAA', 'data:image/gif;base64,AAAA'],
  ])('escapes an art-direction JPEG fallback %s without changing its URL semantics', (fallbackUrl, expected) => {
    const markup = renderToStaticMarkup(
      <TransloaditPicture
        alt=""
        height={300}
        width={400}
        model={{
          ...model,
          artDirection: [{ media: '(max-width: 639px)', model: { ...model, fallbackUrl } }],
        }}
      />,
    )
    const parsed = new DOMParser().parseFromString(markup, 'text/html')
    expect(parsed.querySelector('source[type="image/jpeg"]')?.getAttribute('srcset')).toBe(expected)
  })
  test('a session-dependent retry key recovers the same failed URL without an automatic retry loop', async () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false)
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const props = {
      alt: 'Private photo',
      height: 300,
      width: 400,
      model,
      errorFallback: <p role="status">Sign in</p>,
    }
    try {
      await act(() => root.render(<TransloaditPicture {...props} retryKey="anonymous" />))
      await act(() => container.querySelector('img')?.dispatchEvent(new Event('error')))
      expect(container.querySelector('[role="status"]')?.textContent).toBe('Sign in')
      await act(() => root.render(<TransloaditPicture {...props} retryKey="anonymous" />))
      expect(container.querySelector('[role="status"]')?.textContent).toBe('Sign in')
      await act(() => root.render(<TransloaditPicture {...props} retryKey="session-1" />))
      expect(container.querySelector('img')?.getAttribute('src')).toBe(model.fallbackUrl)
      expect(container.querySelector('[role="status"]')).toBeNull()
    } finally {
      await act(() => root.unmount())
      container.remove()
    }
  })

  test('keeps the Flight error-boundary key compact instead of repeating every signed candidate', () => {
    const picture = TransloaditPicture({
      alt: 'Photo',
      height: 300,
      width: 400,
      model: { ...model, artDirection: [{ media: '(max-width: 639px)', model }] },
      errorFallback: <p role="status">Image unavailable</p>,
    })
    if (!isValidElement<{ children: ReactNode }>(picture))
      throw new Error('Expected a picture fragment')
    const boundary = Children.toArray(picture.props.children).find(
      (child) => isValidElement(child) && child.type === StorageImageErrorBoundary,
    )
    if (!isValidElement(boundary)) throw new Error('Expected the image-load boundary')
    expect(boundary.key).toBeTypeOf('string')
    expect(boundary.key?.length).toBeLessThanOrEqual(66)
    expect(boundary.key).not.toContain('https://')
  })

  test.each([
    { timing: 'after hydration', artDirection: false, changeCandidates: false },
    { timing: 'before hydration', artDirection: false, changeCandidates: false },
    { timing: 'after hydration', artDirection: true, changeCandidates: false },
    { timing: 'before hydration', artDirection: true, changeCandidates: false },
    { timing: 'after hydration', artDirection: false, changeCandidates: true },
    { timing: 'after hydration', artDirection: true, changeCandidates: true },
  ])('optional fallback handles a failed image $timing (art direction: $artDirection) without replacing SSR markup', async ({
    timing,
    artDirection,
    changeCandidates,
  }) => {
    const container = document.createElement('div')
    document.body.append(container)
    const props = {
      alt: 'Photo',
      height: 300,
      width: 400,
      priority: artDirection,
      model: artDirection
        ? { ...model, artDirection: [{ media: '(max-width: 639px)', model }] }
        : model,
    }
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
    const changedModel = { ...model, sources: model.sources.slice(1) }
    const replacement = changeCandidates
      ? artDirection
        ? { ...model, artDirection: [{ media: '(max-width: 639px)', model: changedModel }] }
        : changedModel
      : { ...model, fallbackUrl: 'https://assets.example/replacement.jpg' }
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
    expect(() => renderPicture({ loading: undefined, priority: true, sizes })).toThrow(
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
      priority: true,
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
          priority
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

  test('makes preload eager by default and rejects an explicitly lazy preload', () => {
    const preloaded = renderPicture({ loading: undefined, priority: true })

    expect(preloaded.querySelector('img')?.getAttribute('loading')).toBe('eager')
    expect(() => renderPicture({ loading: 'lazy', priority: true })).toThrow(
      'A priority Transloadit image cannot use lazy loading',
    )
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
})
