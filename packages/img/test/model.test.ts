import type {
  SmartCdnImageSignRequest,
  StoragePreviewModelOptions,
  StoragePreviewSource,
} from '../src/index.ts'

import { describe, expect, test } from 'vitest'

import { createTransloaditImageModel } from '../src/index.ts'

const expiresAt = Date.UTC(2030, 0, 1)

function collectSignedRequests(): {
  requests: SmartCdnImageSignRequest[]
  sign: (request: SmartCdnImageSignRequest) => string
} {
  const requests: SmartCdnImageSignRequest[] = []
  return {
    requests,
    sign(request) {
      requests.push(request)
      return `https://cdn.example/${requests.length}`
    },
  }
}

describe('createTransloaditImageModel', () => {
  test('builds URL-image candidates without lying about widths above the source', () => {
    const { requests, sign } = collectSignedRequests()
    const model = createTransloaditImageModel(
      {
        expiresAt,
        fallbackUrl: '/fallback/photo.jpg',
        source: {
          height: 768,
          type: 'url',
          url: 'https://assets.example/photo.jpg',
          width: 1024,
        },
        widths: [2048, 320, 1024, 640, 640],
      },
      sign,
    )

    expect(model).toEqual({
      expiresAt,
      fallbackUrl: '/fallback/photo.jpg',
      sources: [
        {
          candidates: [
            { url: 'https://cdn.example/1', width: 320 },
            { url: 'https://cdn.example/2', width: 640 },
            { url: 'https://cdn.example/3', width: 1024 },
          ],
          format: 'avif',
        },
        {
          candidates: [
            { url: 'https://cdn.example/4', width: 320 },
            { url: 'https://cdn.example/5', width: 640 },
            { url: 'https://cdn.example/6', width: 1024 },
          ],
          format: 'webp',
        },
      ],
    })
    expect(requests).toEqual([
      ...[320, 640, 1024].map((candidateWidth) => ({
        expiresAt,
        input: 'https://assets.example/photo.jpg',
        template: 'builtin/serve-image@0.0.1',
        urlParams: { f: 'avif', q: 45, r: 'fit', w: candidateWidth },
      })),
      ...[320, 640, 1024].map((candidateWidth) => ({
        expiresAt,
        input: 'https://assets.example/photo.jpg',
        template: 'builtin/serve-image@0.0.1',
        urlParams: { f: 'webp', q: 75, r: 'fit', w: candidateWidth },
      })),
    ])
  })

  test('caps URL-image widths before the derived height exceeds the backend limit', () => {
    const { requests, sign } = collectSignedRequests()

    const model = createTransloaditImageModel(
      {
        expiresAt,
        source: {
          height: 10_000,
          type: 'url',
          url: 'https://assets.example/portrait.jpg',
          width: 1_000,
        },
        widths: [1_000],
      },
      sign,
    )

    expect(model.sources[0]?.candidates).toEqual([{ url: 'https://cdn.example/1', width: 800 }])
    expect(requests[0]?.urlParams.w).toBe(800)
  })

  test('does not apply the backend pixel limit to source dimensions', () => {
    const { requests, sign } = collectSignedRequests()

    const model = createTransloaditImageModel(
      {
        expiresAt,
        source: {
          height: 16_000,
          type: 'url',
          url: 'https://assets.example/large-display.jpg',
          width: 24_000,
        },
        widths: [8_000],
      },
      sign,
    )

    expect(model.sources[0]?.candidates).toEqual([{ url: 'https://cdn.example/1', width: 8_000 }])
    expect(requests[0]?.urlParams.w).toBe(8_000)
  })

  test('identifies an invalid candidate width by its option index', () => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          source: {
            height: 768,
            type: 'url',
            url: 'https://assets.example/photo.jpg',
            width: 1_024,
          },
          widths: [320, 0],
        },
        sign,
      ),
    ).toThrow('widths[1] must be an integer from 1 through 8000')
  })

  test('rejects an unknown source discriminator instead of treating it as Storage', () => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          source: {
            path: 'documents/report.pdf',
            // @ts-expect-error Runtime JavaScript can provide an unknown discriminator.
            type: 'unknown',
          },
          widths: [400],
        },
        sign,
      ),
    ).toThrow('Unsupported image source type: unknown')
  })

  test.each([
    'https://user:secret@assets.example/photo.jpg',
    'https://assets.example/photo.jpg?X-Amz-Signature=secret',
    'https://assets.example/photo.jpg#private',
  ])('rejects credential-bearing or ambiguous public URL input: %s', (url) => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          source: { height: 768, type: 'url', url, width: 1024 },
          widths: [320],
        },
        sign,
      ),
    ).toThrow(
      'URL image sources must be public URLs without credentials, query strings, or fragments',
    )
  })

  test('rejects a URL format map without one usable quality', () => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          // @ts-expect-error Runtime callers can still supply an empty object.
          formats: {},
          source: {
            height: 768,
            type: 'url',
            url: 'https://assets.example/photo.jpg',
            width: 1024,
          },
          widths: [320],
        },
        sign,
      ),
    ).toThrow('formats must contain at least one value')
  })

  test('builds format-capability-safe Storage previews and a signed JPEG fallback', () => {
    const { requests, sign } = collectSignedRequests()
    const model = createTransloaditImageModel(
      {
        expiresAt,
        fallbackQuality: 68,
        formats: { webp: 61 },
        height: 300,
        source: { path: 'documents/report.pdf', type: 'storage' },
        width: 400,
        widths: [400, 200],
      },
      sign,
    )

    expect(model).toEqual({
      expiresAt,
      fallbackUrl: 'https://cdn.example/3',
      sources: [
        {
          candidates: [
            { url: 'https://cdn.example/1', width: 200 },
            { url: 'https://cdn.example/2', width: 400 },
          ],
          format: 'webp',
        },
      ],
    })
    expect(requests).toEqual([
      {
        expiresAt,
        input: 'documents/report.pdf',
        template: 'builtin/storage-preview@0.0.1',
        urlParams: { f: 'webp', h: 150, q: 61, r: 'pad', w: 200 },
      },
      {
        expiresAt,
        input: 'documents/report.pdf',
        template: 'builtin/storage-preview@0.0.1',
        urlParams: { f: 'webp', h: 300, q: 61, r: 'pad', w: 400 },
      },
      {
        expiresAt,
        input: 'documents/report.pdf',
        template: 'builtin/storage-preview@0.0.1',
        urlParams: { f: 'jpg', h: 300, q: 68, r: 'pad', w: 400 },
      },
    ])
  })

  test('uses the display width instead of the largest rendition for the JPEG fallback', () => {
    const { requests, sign } = collectSignedRequests()

    createTransloaditImageModel(
      {
        expiresAt,
        formats: { webp: 61 },
        height: 300,
        source: { path: 'documents/report.pdf', type: 'storage' },
        width: 400,
        widths: [200, 800],
      },
      sign,
    )

    expect(requests.at(-1)?.urlParams).toEqual({ f: 'jpg', h: 300, q: 75, r: 'pad', w: 400 })
  })

  test('rejects an invalid Storage fallback quality before signing any candidate', () => {
    const { requests, sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          fallbackQuality: 0,
          height: 300,
          source: { path: 'documents/report.pdf', type: 'storage' },
          width: 400,
          widths: [200, 400],
        },
        sign,
      ),
    ).toThrow('fallbackQuality must be an integer from 1 through 100')
    expect(requests).toEqual([])
  })

  test('uses deterministic Storage format preference and caps tall previews to backend dimensions', () => {
    const { requests, sign } = collectSignedRequests()
    const model = createTransloaditImageModel(
      {
        expiresAt,
        formats: { webp: 70, avif: 40 },
        height: 1200,
        source: { path: 'portraits/report.pdf', type: 'storage' },
        width: 400,
        widths: [8000],
      },
      sign,
    )

    expect(model.sources.map(({ format }) => format)).toEqual(['avif', 'webp'])
    expect(model.sources.flatMap(({ candidates }) => candidates.map(({ width }) => width))).toEqual(
      [2666, 2666],
    )
    expect(requests.slice(0, -1).every(({ urlParams }) => urlParams.h === 7998)).toBe(true)
    expect(requests.at(-1)?.urlParams).toEqual({ f: 'jpg', h: 1200, q: 75, r: 'pad', w: 400 })
  })

  test.each([
    '',
    '/documents/report.pdf',
    ' documents/report.pdf',
  ])('rejects an invalid Storage path: %s', (path) => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          height: 300,
          source: { path, type: 'storage' },
          width: 400,
          widths: [400],
        },
        sign,
      ),
    ).toThrow(
      'Storage image paths must be non-empty relative strings without surrounding whitespace',
    )
  })

  test.each([
    'documents/../private/report.pdf',
    'documents/./report.pdf',
    String.raw`documents\private\report.pdf`,
  ])('rejects an ambiguous Storage path: %s', (path) => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          height: 300,
          source: { path, type: 'storage' },
          width: 400,
          widths: [400],
        },
        sign,
      ),
    ).toThrow('Storage image paths must not contain dot segments or backslashes')
  })

  test.each([
    'documents//report.pdf',
    'documents/report.pdf/',
    'documents/ /report.pdf',
    'documents/\0report.pdf',
    'cafe\u0301/report.pdf',
  ])('rejects a Storage path outside the API2 catalog grammar: %s', (path) => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          height: 300,
          source: { path, type: 'storage' },
          width: 400,
          widths: [400],
        },
        sign,
      ),
    ).toThrow('Storage image paths must use normalized, non-empty path segments')
  })

  test('measures the Storage path limit in UTF-8 bytes', () => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          height: 300,
          source: { path: `${'😀'.repeat(256)}.jpg`, type: 'storage' },
          width: 400,
          widths: [400],
        },
        sign,
      ),
    ).toThrow('Storage image paths must be at most 1024 UTF-8 bytes')
  })

  test('snapshots a Storage path before validating and signing it', () => {
    const { requests, sign } = collectSignedRequests()
    let reads = 0
    const source = {
      get path() {
        reads += 1
        return reads === 1 ? 'documents/report.pdf' : 'private/secret.pdf'
      },
      type: 'storage',
    } satisfies StoragePreviewSource

    createTransloaditImageModel(
      {
        expiresAt,
        height: 300,
        source,
        width: 400,
        widths: [400],
      },
      sign,
    )

    expect(reads).toBe(1)
    expect(requests.every(({ input }) => input === 'documents/report.pdf')).toBe(true)
  })

  test('snapshots validated common values before reading a source accessor', () => {
    const { requests, sign } = collectSignedRequests()
    let sourceWasRead = false
    const options = {
      get expiresAt() {
        return sourceWasRead ? 0 : expiresAt
      },
      get height() {
        return sourceWasRead ? 0 : 300
      },
      get source() {
        sourceWasRead = true
        return { path: 'documents/report.pdf', type: 'storage' } satisfies StoragePreviewSource
      },
      get width() {
        return sourceWasRead ? 0 : 400
      },
      widths: [400],
    } satisfies StoragePreviewModelOptions

    createTransloaditImageModel(options, sign)

    expect(requests).not.toHaveLength(0)
    expect(requests.every((request) => request.expiresAt === expiresAt)).toBe(true)
    expect(requests.every((request) => request.urlParams.h === 300)).toBe(true)
    expect(requests.every((request) => request.urlParams.w === 400)).toBe(true)
  })

  test('treats percent escapes in Storage paths as literal catalog key bytes', () => {
    const { requests, sign } = collectSignedRequests()

    createTransloaditImageModel(
      {
        expiresAt,
        height: 300,
        source: { path: 'documents/%2e%2e/report.pdf', type: 'storage' },
        width: 400,
        widths: [400],
      },
      sign,
    )

    expect(requests.every(({ input }) => input === 'documents/%2e%2e/report.pdf')).toBe(true)
  })

  test('rejects public source URLs above the bounded signing length', () => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          source: {
            height: 600,
            type: 'url',
            url: `https://assets.example/${'a'.repeat(2_049)}`,
            width: 800,
          },
          widths: [400],
        },
        sign,
      ),
    ).toThrow('URL image sources must be at most 2048 UTF-8 bytes')
  })

  test('applies the source URL limit after URL canonicalization', () => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          source: {
            height: 600,
            type: 'url',
            url: `https://assets.example/${'é'.repeat(400)}`,
            width: 800,
          },
          widths: [400],
        },
        sign,
      ),
    ).toThrow('URL image sources must be at most 2048 UTF-8 bytes after canonicalization')
  })

  test('rejects a seconds-based expiry without reading the current clock', () => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt: 1_893_456_000,
          source: {
            height: 600,
            type: 'url',
            url: 'https://assets.example/photo.jpg',
            width: 800,
          },
          widths: [400],
        },
        sign,
      ),
    ).toThrow('expiresAt must be a millisecond timestamp')
  })
})
