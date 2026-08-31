// @vitest-environment happy-dom

import type { ReactNode } from 'react'

import type { StoragePreviewSource } from '../src/index.ts'

import { getSignedSmartCdnImageCandidates, parseSmartCdnUrl } from '@transloadit/utils/node'
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { connection } = vi.hoisted(() => ({ connection: vi.fn(async () => undefined) }))

vi.mock('next/server.js', () => ({ connection }))
vi.mock('server-only', () => ({}))

import { createTransloaditImage } from '../src/next/server.tsx'

const configuration = {
  allowedSourceOrigins: ['https://assets.example'],
  authKey: 'auth-key',
  authSecret: 'never-render-this-secret',
  storage: { allowedPathPrefixes: ['documents/'] },
  workspace: 'my-app',
}

async function renderAsync(node: ReactNode): Promise<string> {
  const stream = await renderToReadableStream(node)
  await stream.allReady
  return new Response(stream).text()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime('2029-01-01T12:02:00.000Z')
  connection.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createTransloaditImage', () => {
  test('renders a static public URL image without opting the route into request rendering', async () => {
    const TransloaditImage = createTransloaditImage(configuration)
    const node = await TransloaditImage({
      alt: 'A public image',
      expiresAt: Date.UTC(2030, 0, 1),
      fallbackSrc: '/fallback/photo.jpg',
      height: 768,
      sizes: '640px',
      source: {
        height: 768,
        type: 'url',
        url: 'https://assets.example/photo.jpg',
        width: 1024,
      },
      width: 1024,
      widths: [320, 640],
    })
    const markup = renderToStaticMarkup(node)
    const document = new DOMParser().parseFromString(markup, 'text/html')
    const sourceUrl = new URL(document.querySelector('source')?.srcset.split(' ')[0] ?? '')

    expect(connection).not.toHaveBeenCalled()
    expect(sourceUrl.pathname).toContain('/builtin%2Fserve-image%400.0.1/')
    expect(sourceUrl.searchParams.get('auth_key')).toBe('auth-key')
    expect(sourceUrl.searchParams.get('exp')).toBe(String(Date.UTC(2030, 0, 1)))
    expect(sourceUrl.searchParams.get('f')).toBe('avif')
    expect(document.querySelector('img')?.getAttribute('src')).toBe('/fallback/photo.jpg')
    expect(markup).not.toContain(configuration.authSecret)
  })

  test('rejects a coercible public source URL without invoking its string conversion', () => {
    const TransloaditImage = createTransloaditImage(configuration)
    const stringConversion = vi.fn(() => 'https://assets.example/photo.jpg')

    expect(() =>
      TransloaditImage({
        alt: 'A public image',
        expiresAt: Date.UTC(2030, 0, 1),
        height: 768,
        sizes: '640px',
        source: {
          height: 768,
          type: 'url',
          // @ts-expect-error The runtime boundary must reject coercible non-string input.
          url: { toString: stringConversion },
          width: 1024,
        },
        width: 1024,
        widths: [640],
      }),
    ).toThrow('URL image sources must be one absolute HTTP or HTTPS URL')
    expect(stringConversion).not.toHaveBeenCalled()
  })

  test('rejects an oversized source before attempting URL parsing', () => {
    const TransloaditImage = createTransloaditImage(configuration)

    expect(() =>
      TransloaditImage({
        alt: 'A public image',
        expiresAt: Date.UTC(2030, 0, 1),
        height: 768,
        sizes: '640px',
        source: { height: 768, type: 'url', url: 'x'.repeat(2049), width: 1024 },
        width: 1024,
        widths: [640],
      }),
    ).toThrow('URL image sources must be at most 2048 UTF-8 bytes')
  })

  test('preserves byte-for-byte URL candidates from the dogfooded utility contract', async () => {
    const expiresAt = Date.UTC(2030, 0, 1)
    const input = 'https://assets.example/photo.jpg'
    const widths = [320, 640]
    const legacy = getSignedSmartCdnImageCandidates({
      ...configuration,
      expiresAt,
      formats: { webp: 61 },
      input,
      widths,
    })
    const TransloaditImage = createTransloaditImage(configuration)
    const node = await TransloaditImage({
      alt: 'A public image',
      expiresAt,
      formats: { webp: 61 },
      height: 768,
      sizes: '640px',
      source: { height: 768, type: 'url', url: input, width: 1024 },
      width: 1024,
      widths,
    })
    const document = new DOMParser().parseFromString(renderToStaticMarkup(node), 'text/html')
    const expectedSourceSet = legacy.sources[0]?.candidates
      .map(({ url, width }) => `${url} ${width}w`)
      .join(', ')

    expect(document.querySelector('source')?.srcset).toBe(expectedSourceSet)
  })

  test('request-renders Storage previews with stable bounded expiry and format quality', async () => {
    const TransloaditImage = createTransloaditImage(configuration)
    const render = async (): Promise<Document> => {
      const node = await TransloaditImage({
        alt: 'Preview of report.pdf',
        formats: { webp: 61 },
        height: 300,
        sizes: '400px',
        source: { path: 'documents/report.pdf', type: 'storage' },
        width: 400,
        widths: [200, 400],
      })
      const markup = await renderAsync(node)
      expect(markup).not.toContain(configuration.authSecret)
      return new DOMParser().parseFromString(markup, 'text/html')
    }

    const firstDocument = await render()
    const firstSource = new URL(firstDocument.querySelector('source')?.srcset.split(' ')[0] ?? '')
    const firstFallback = new URL(firstDocument.querySelector('img')?.src ?? '')

    expect(connection).toHaveBeenCalledOnce()
    expect(firstSource.pathname).toContain('/builtin%2Fstorage-preview%400.0.1/')
    expect(firstSource.searchParams.get('f')).toBe('webp')
    expect(firstSource.searchParams.get('h')).toBe('150')
    expect(firstSource.searchParams.get('q')).toBe('61')
    expect(firstFallback.searchParams.get('f')).toBe('jpg')
    expect(firstDocument.querySelector('img')?.getAttribute('loading')).toBe('eager')
    expect(firstSource.searchParams.get('exp')).toBe(String(Date.parse('2029-01-01T13:05:00.000Z')))

    vi.setSystemTime('2029-01-01T12:04:59.999Z')
    const sameWindow = await render()
    expect(sameWindow.querySelector('source')?.srcset).toBe(
      firstDocument.querySelector('source')?.srcset,
    )

    vi.setSystemTime('2029-01-01T12:05:00.000Z')
    const nextWindow = await render()
    expect(nextWindow.querySelector('source')?.srcset).not.toBe(
      firstDocument.querySelector('source')?.srcset,
    )
  })

  test('denies Storage signing until the factory explicitly allows a path prefix', () => {
    const TransloaditImage = createTransloaditImage({
      ...configuration,
      storage: { allowedPathPrefixes: [] },
    })
    expect(() =>
      TransloaditImage({
        alt: 'Preview of report.pdf',
        height: 300,
        sizes: '400px',
        source: { path: 'documents/report.pdf', type: 'storage' },
        width: 400,
        widths: [400],
      }),
    ).toThrow('Storage image path is outside the configured allowed prefixes')
    expect(connection).not.toHaveBeenCalled()
  })

  test('matches allowed Storage prefixes only at an explicit directory boundary', () => {
    const TransloaditImage = createTransloaditImage(configuration)

    expect(() =>
      TransloaditImage({
        alt: 'Preview of report.pdf',
        height: 300,
        sizes: '400px',
        source: { path: 'documents-private/report.pdf', type: 'storage' },
        width: 400,
        widths: [400],
      }),
    ).toThrow('Storage image path is outside the configured allowed prefixes')
    expect(connection).not.toHaveBeenCalled()
  })

  test('keeps the authorized Storage path immutable across the request-rendering boundary', async () => {
    const TransloaditImage = createTransloaditImage(configuration)
    let reads = 0
    const source = {
      get path() {
        reads += 1
        return reads === 1 ? 'documents/report.pdf' : 'private/secret.pdf'
      },
      type: 'storage',
    } satisfies StoragePreviewSource
    const node = TransloaditImage({
      alt: 'Preview of report.pdf',
      height: 300,
      sizes: '400px',
      source,
      width: 400,
      widths: [400],
    })
    const document = new DOMParser().parseFromString(await renderAsync(node), 'text/html')
    const candidate = document.querySelector('source')?.srcset.split(' ')[0]

    expect(reads).toBe(1)
    expect(parseSmartCdnUrl(candidate ?? '').input).toBe('documents/report.pdf')
  })

  test('snapshots Storage geometry before the request-rendering boundary', async () => {
    const TransloaditImage = createTransloaditImage(configuration)
    let height = 300
    let width = 400
    let widths = [400]
    connection.mockImplementationOnce(() => {
      height = 0
      width = 0
      widths = [0]
      return Promise.resolve(undefined)
    })
    const node = TransloaditImage({
      alt: 'Preview of report.pdf',
      get height() {
        return height
      },
      sizes: '400px',
      source: { path: 'documents/report.pdf', type: 'storage' },
      get width() {
        return width
      },
      get widths() {
        return widths
      },
    })
    const document = new DOMParser().parseFromString(await renderAsync(node), 'text/html')
    const candidate = new URL(document.querySelector('source')?.srcset.split(' ')[0] ?? '')

    expect(candidate.searchParams.get('h')).toBe('300')
    expect(candidate.searchParams.get('w')).toBe('400')
  })

  test('keeps a deferred Storage preview lazy instead of combining incompatible defaults', async () => {
    const TransloaditImage = createTransloaditImage(configuration)
    const node = TransloaditImage({
      alt: 'Deferred report preview',
      deferUntilHydrated: true,
      height: 300,
      sizes: '400px',
      source: { path: 'documents/report.pdf', type: 'storage' },
      width: 400,
      widths: [400],
    })

    await expect(renderAsync(node)).resolves.toContain('<noscript>')
  })

  test('rejects media-gated Storage previews whose unused signatures could expire', () => {
    const TransloaditImage = createTransloaditImage(configuration)

    expect(() =>
      Reflect.apply(TransloaditImage, undefined, [
        {
          alt: 'Preview of report.pdf',
          height: 300,
          media: '(min-width: 768px)',
          sizes: '400px',
          source: { path: 'documents/report.pdf', type: 'storage' },
          width: 400,
          widths: [400],
        },
      ]),
    ).toThrow('Storage image previews cannot use media because their signed URLs can expire')
    expect(connection).not.toHaveBeenCalled()
  })

  test('rejects source-incompatible fallback props at the runtime boundary', () => {
    const TransloaditImage = createTransloaditImage(configuration)

    expect(() =>
      Reflect.apply(TransloaditImage, undefined, [
        {
          alt: 'Public image',
          expiresAt: Date.UTC(2030, 0, 1),
          fallbackQuality: 70,
          height: 300,
          sizes: '400px',
          source: {
            height: 600,
            type: 'url',
            url: 'https://assets.example/photo.jpg',
            width: 800,
          },
          width: 400,
          widths: [400],
        },
      ]),
    ).toThrow('fallbackQuality is only supported for Storage image sources')
    expect(() =>
      Reflect.apply(TransloaditImage, undefined, [
        {
          alt: 'Preview of report.pdf',
          fallbackSrc: '/fallback.jpg',
          height: 300,
          sizes: '400px',
          source: { path: 'documents/report.pdf', type: 'storage' },
          width: 400,
          widths: [400],
        },
      ]),
    ).toThrow('fallbackSrc is only supported for public URL image sources')
    expect(connection).not.toHaveBeenCalled()
  })

  test('allows an explicit empty Storage prefix to cover the whole workspace', async () => {
    const TransloaditImage = createTransloaditImage({
      ...configuration,
      storage: { allowedPathPrefixes: [''] },
    })
    const node = TransloaditImage({
      alt: 'Preview of report.pdf',
      height: 300,
      sizes: '400px',
      source: { path: 'private/report.pdf', type: 'storage' },
      width: 400,
      widths: [400],
    })

    await expect(renderAsync(node)).resolves.toContain('builtin%2Fstorage-preview%400.0.1')
  })

  test('snapshots each allowed Storage prefix while validating it', () => {
    let reads = 0
    const allowedPathPrefixes = ['documents/']
    Object.defineProperty(allowedPathPrefixes, 0, {
      get() {
        reads += 1
        return reads === 1 ? 'documents/' : ''
      },
    })
    const TransloaditImage = createTransloaditImage({
      ...configuration,
      storage: { allowedPathPrefixes },
    })

    expect(() =>
      TransloaditImage({
        alt: 'Private preview',
        height: 300,
        sizes: '400px',
        source: { path: 'private/report.pdf', type: 'storage' },
        width: 400,
        widths: [400],
      }),
    ).toThrow('Storage image path is outside the configured allowed prefixes')
    expect(reads).toBe(1)
  })

  test('ignores a per-source Template injection for a private Storage object', async () => {
    const TransloaditImage = createTransloaditImage(configuration)
    // @ts-expect-error Runtime JavaScript can still inject an untrusted per-source Template.
    const node = await TransloaditImage({
      alt: 'Preview of report.pdf',
      height: 300,
      sizes: '400px',
      source: {
        path: 'documents/report.pdf',
        template: 'builtin/storage-serve@0.0.1',
        type: 'storage',
      },
      width: 400,
      widths: [400],
    })
    const document = new DOMParser().parseFromString(await renderAsync(node), 'text/html')
    const sourceUrl = new URL(document.querySelector('source')?.srcset.split(' ')[0] ?? '')

    expect(sourceUrl.pathname).toContain('/builtin%2Fstorage-preview%400.0.1/')
  })

  test('rejects an unknown source discriminator before selecting expiry policy', () => {
    const TransloaditImage = createTransloaditImage(configuration)

    expect(() =>
      TransloaditImage({
        alt: 'Unknown source',
        expiresAt: Date.UTC(2030, 0, 1),
        height: 300,
        sizes: '400px',
        source: {
          path: 'documents/report.pdf',
          // @ts-expect-error Runtime JavaScript can provide an unknown discriminator.
          type: 'unknown',
        },
        width: 400,
        widths: [400],
      }),
    ).toThrow('Unsupported image source type: unknown')
    expect(connection).not.toHaveBeenCalled()
  })

  test('refuses to sign a URL source outside the configured origin allowlist', () => {
    const TransloaditImage = createTransloaditImage({
      ...configuration,
      allowedSourceOrigins: ['https://assets.example'],
    })

    expect(() =>
      TransloaditImage({
        alt: 'Untrusted remote source',
        expiresAt: Date.UTC(2030, 0, 1),
        height: 300,
        sizes: '400px',
        source: {
          height: 600,
          type: 'url',
          url: 'https://attacker.example/image.jpg',
          width: 800,
        },
        width: 400,
        widths: [400],
      }),
    ).toThrow('URL image source origin is not allowed: https://attacker.example')
  })

  test('signs the same canonical URL whose host passed the allowlist', async () => {
    const TransloaditImage = createTransloaditImage(configuration)
    const node = await TransloaditImage({
      alt: 'Ambiguous URL syntax',
      expiresAt: Date.UTC(2030, 0, 1),
      height: 300,
      sizes: '400px',
      source: {
        height: 600,
        type: 'url',
        url: String.raw`https://assets.example\@127.0.0.1/image.jpg`,
        width: 800,
      },
      width: 400,
      widths: [400],
    })
    const document = new DOMParser().parseFromString(renderToStaticMarkup(node), 'text/html')
    const candidate = document.querySelector('source')?.srcset.split(' ')[0]

    expect(parseSmartCdnUrl(candidate ?? '').input).toBe(
      'https://assets.example/@127.0.0.1/image.jpg',
    )
  })

  test('keeps static URL rendering independent from the current clock', async () => {
    const TransloaditImage = createTransloaditImage(configuration)
    const now = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Static URL rendering read the current clock')
    })

    const node = await TransloaditImage({
      alt: 'Static',
      expiresAt: Date.UTC(2030, 0, 1),
      height: 768,
      sizes: '640px',
      source: {
        height: 768,
        type: 'url',
        url: 'https://assets.example/photo.jpg',
        width: 1024,
      },
      width: 1024,
      widths: [640],
    })

    expect(renderToStaticMarkup(node)).toContain('<picture>')
    expect(now).not.toHaveBeenCalled()
  })

  test('rejects an unhandled URL-image aspect-ratio mismatch', () => {
    const TransloaditImage = createTransloaditImage(configuration)

    expect(() =>
      TransloaditImage({
        alt: 'Stretched',
        expiresAt: Date.UTC(2030, 0, 1),
        height: 300,
        sizes: '400px',
        source: {
          height: 900,
          type: 'url',
          url: 'https://assets.example/photo.jpg',
          width: 1600,
        },
        width: 400,
        widths: [400],
      }),
    ).toThrow('objectFit must be set when display and source aspect ratios differ')
  })

  test('renders an explicitly covered URL-image aspect-ratio mismatch', async () => {
    const TransloaditImage = createTransloaditImage(configuration)
    const node = await TransloaditImage({
      alt: 'Cropped without stretching',
      expiresAt: Date.UTC(2030, 0, 1),
      height: 300,
      objectFit: 'cover',
      sizes: '400px',
      source: {
        height: 900,
        type: 'url',
        url: 'https://assets.example/photo.jpg',
        width: 1600,
      },
      width: 400,
      widths: [400],
    })
    const document = new DOMParser().parseFromString(renderToStaticMarkup(node), 'text/html')

    expect(document.querySelector('img')?.style.objectFit).toBe('cover')
  })

  test('tolerates a sub-pixel URL-image aspect-ratio rounding difference', () => {
    const TransloaditImage = createTransloaditImage(configuration)
    const node = TransloaditImage({
      alt: 'Rounded source dimensions',
      expiresAt: Date.UTC(2030, 0, 1),
      height: 600,
      sizes: '800px',
      source: {
        height: 1_200,
        type: 'url',
        url: 'https://assets.example/photo.jpg',
        width: 1_601,
      },
      width: 800,
      widths: [800],
    })

    expect(renderToStaticMarkup(node)).toContain('<picture>')
  })

  test('snapshots a URL source before dispatching to image policy', () => {
    const TransloaditImage = createTransloaditImage(configuration)
    let typeReads = 0
    const source = {
      height: 600,
      path: 'private/secret.pdf',
      get type(): 'storage' | 'url' {
        typeReads += 1
        return typeReads < 3 ? 'url' : 'storage'
      },
      url: 'https://assets.example/photo.jpg',
      width: 800,
    }

    // @ts-expect-error Runtime callers can provide accessors with unstable discriminators.
    const node = TransloaditImage({
      alt: 'Snapshotted source',
      expiresAt: Date.UTC(2030, 0, 1),
      height: 300,
      sizes: '400px',
      source,
      width: 400,
      widths: [400],
    })
    const document = new DOMParser().parseFromString(renderToStaticMarkup(node), 'text/html')
    const candidate = document.querySelector('source')?.srcset.split(' ')[0]

    expect(typeReads).toBe(1)
    expect(parseSmartCdnUrl(candidate ?? '').template).toBe('builtin/serve-image@0.0.1')
  })

  test('refuses a Storage expiry policy that could exceed 48 hours', () => {
    expect(() =>
      createTransloaditImage({
        ...configuration,
        storage: {
          expiresInMs: 48 * 60 * 60 * 1000,
          rotationIntervalMs: 5 * 60 * 1000,
        },
      }),
    ).toThrow('Storage image expiry plus its rotation interval must not exceed 48 hours')
  })

  test.each([
    '/documents/',
    'documents',
    'documents/../',
  ])('refuses an ambiguous allowed Storage prefix: %s', (prefix) => {
    expect(() =>
      createTransloaditImage({
        ...configuration,
        storage: { allowedPathPrefixes: [prefix] },
      }),
    ).toThrow(
      'storage.allowedPathPrefixes[0] must be empty or one safe relative prefix ending in /',
    )
  })

  test.each([
    'auth_key',
    'exp',
    'f',
    'h',
    'q',
    'r',
    'sig',
    'w',
  ])('reserves image-policy parameter %s from global URL parameters', (parameter) => {
    expect(() =>
      createTransloaditImage({
        ...configuration,
        urlParams: { [parameter]: 'caller-controlled' },
      }),
    ).toThrow(`urlParams must not override image policy parameter: ${parameter}`)
  })

  test('refuses incomplete or whitespace-padded credentials', () => {
    expect(() => createTransloaditImage({ ...configuration, authKey: '' })).toThrow(
      'authKey must be a non-empty string without surrounding whitespace',
    )
    expect(() => createTransloaditImage({ ...configuration, authSecret: ' secret ' })).toThrow(
      'authSecret must be a non-empty string without surrounding whitespace',
    )
    expect(() => createTransloaditImage({ ...configuration, allowedSourceOrigins: ['*'] })).toThrow(
      'allowedSourceOrigins[0] must be one exact HTTP or HTTPS origin',
    )
  })

  test.each([
    'assets.example',
    'https://user:secret@assets.example',
    'https://assets.example/path',
  ])('refuses an invalid source origin: %s', (origin) => {
    expect(() =>
      createTransloaditImage({ ...configuration, allowedSourceOrigins: [origin] }),
    ).toThrow('allowedSourceOrigins[0] must be one exact HTTP or HTTPS origin')
  })

  test('allows a source on the exact configured non-default port', () => {
    const TransloaditImage = createTransloaditImage({
      ...configuration,
      allowedSourceOrigins: ['https://assets.example:8443'],
    })
    const node = TransloaditImage({
      alt: 'Image on a non-default port',
      expiresAt: Date.UTC(2030, 0, 1),
      height: 300,
      sizes: '400px',
      source: {
        height: 600,
        type: 'url',
        url: 'https://assets.example:8443/image.jpg',
        width: 800,
      },
      width: 400,
      widths: [400],
    })

    expect(renderToStaticMarkup(node)).toContain('assets.example%3A8443')
  })

  test('does not let an HTTPS origin implicitly authorize an HTTP source', () => {
    const TransloaditImage = createTransloaditImage(configuration)

    expect(() =>
      TransloaditImage({
        alt: 'Insecure source',
        expiresAt: Date.UTC(2030, 0, 1),
        height: 300,
        sizes: '400px',
        source: {
          height: 600,
          type: 'url',
          url: 'http://assets.example/image.jpg',
          width: 800,
        },
        width: 400,
        widths: [400],
      }),
    ).toThrow('URL image source origin is not allowed: http://assets.example')
  })
})
