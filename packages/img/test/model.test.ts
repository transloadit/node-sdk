import type { SmartCdnImageSignRequest, TransloaditImageModelOptions } from '../src/index.ts'

import { describe, expect, test, vi } from 'vitest'

const storageReference = vi.hoisted(() => ({
  workspace: 'my-app',
  asset_id: 'A'.repeat(22),
  version_id: 'B'.repeat(21) + 'A',
}))

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
  test.each([
    { widths: undefined },
    { widths: [1, 100] },
  ])('explains a subpixel source crop before signing (widths $widths)', ({ widths }) => {
    const { requests, sign } = collectSignedRequests()
    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          src: { ...storageReference, path: 'website/banner.jpg', width: 1000, height: 10 },
          cropAspectRatio: 0.01,
          widths,
        },
        sign,
      ),
    ).toThrow(/source dimensions.*cropAspectRatio.*one pixel/)
    expect(requests).toEqual([])
  })

  test('accepts the one-pixel source crop boundary without upscaling', () => {
    const { requests, sign } = collectSignedRequests()
    createTransloaditImageModel(
      {
        expiresAt,
        src: { ...storageReference, path: 'website/banner.jpg', width: 1000, height: 10 },
        cropAspectRatio: 0.1,
        widths: [1, 100],
      },
      sign,
    )
    expect(requests.map(({ urlParams }) => [urlParams.w, urlParams.h])).toEqual([
      [1, 10],
      [1, 10],
      [1, 10],
    ])
  })

  test.each([
    undefined,
    '#224466',
    '#AABBCCFF',
  ])('preserves alpha per candidate and gives JPEG an opaque background (%s)', (fallbackBackground) => {
    const { requests, sign } = collectSignedRequests()
    createTransloaditImageModel(
      {
        expiresAt,
        src: { ...storageReference, path: 'website/logo.png', width: 64, height: 64 },
        formats: { avif: 45, webp: 75, png: 75 },
        fallbackBackground,
        widths: [32, 64],
      },
      sign,
    )
    expect(requests).toHaveLength(7)
    expect(requests.map(({ template }) => template)).toEqual(
      Array(7).fill('builtin/storage-preview@0.0.3'),
    )
    expect(requests.slice(0, -1).map(({ urlParams }) => urlParams.bg)).toEqual(
      Array(6).fill('#00000000'),
    )
    expect(requests.at(-1)?.urlParams).toMatchObject({
      bg: fallbackBackground ?? '#ffffff',
      f: 'jpg',
    })
  })

  test.each([
    'transparent',
    '#00000000',
    '#22446680',
    '#fff',
    '#ffffff\n',
    'ffffff',
  ])('rejects an invalid or nonopaque JPEG background before signing: %j', (fallbackBackground) => {
    const { requests, sign } = collectSignedRequests()
    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          src: { ...storageReference, path: 'website/logo.png', width: 64, height: 64 },
          fallbackBackground,
        },
        sign,
      ),
    ).toThrow(/fallbackBackground.*opaque/)
    expect(requests).toEqual([])
  })

  test('signs cover crops in the box ratio without upscaling source pixels', () => {
    const { requests, sign } = collectSignedRequests()
    const model = createTransloaditImageModel(
      {
        expiresAt,
        src: { ...storageReference, path: 'website/hero.jpg', width: 2400, height: 1600 },
        cropAspectRatio: 9 / 16,
        widths: [390, 780, 2400],
        fallbackWidth: 390,
      },
      sign,
    )
    expect(model.sources[0]?.candidates.map(({ width }) => width)).toEqual([390, 780, 900])
    expect(requests[0]?.urlParams).toMatchObject({ r: 'fillcrop', w: 390, h: 693 })
    expect(requests.at(-1)?.urlParams).toMatchObject({ r: 'fillcrop', w: 390, h: 693, f: 'jpg' })
  })

  test('caps the default ladder at an explicit maximum without changing source proportions', () => {
    const { requests, sign } = collectSignedRequests()
    const model = createTransloaditImageModel(
      {
        expiresAt,
        src: { ...storageReference, path: 'website/hero.jpg', width: 2400, height: 1600 },
        maximumWidth: 1920,
      },
      sign,
    )
    expect(model.sources[0]?.candidates.at(-1)?.width).toBe(1920)
    expect(requests.at(-1)?.urlParams).toMatchObject({ r: 'pad', w: 1920, h: 1280 })
  })

  test.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])('rejects invalid crop aspect ratio %s before signing', (cropAspectRatio) => {
    const { requests, sign } = collectSignedRequests()
    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          src: { ...storageReference, path: 'website/hero.jpg', width: 2400, height: 1600 },
          cropAspectRatio,
        },
        sign,
      ),
    ).toThrow('cropAspectRatio')
    expect(requests).toEqual([])
  })

  test('caps the JPEG fallback at the largest requested candidate', () => {
    const { requests, sign } = collectSignedRequests()
    createTransloaditImageModel(
      {
        expiresAt,
        src: { ...storageReference, path: 'website/avatar.jpg', width: 400, height: 400 },
        widths: [96, 48],
      },
      sign,
    )
    expect(requests.at(-1)?.urlParams).toMatchObject({ f: 'jpg', w: 96, h: 96 })
  })

  test('uses receipt geometry without forwarding ancillary receipt fields to signing', () => {
    const src = {
      ...storageReference,
      path: 'documents/report.pdf',
      width: 400,
      height: 300,
      authSecret: 'not-a-signing-option',
    }
    const fromReceipt = collectSignedRequests()
    const fromString = collectSignedRequests()
    const options = { expiresAt, widths: [200, 400] }
    expect(createTransloaditImageModel({ ...options, src }, fromReceipt.sign)).toEqual(
      createTransloaditImageModel(
        { ...options, src: { ...storageReference, path: src.path, width: 400, height: 300 } },
        fromString.sign,
      ),
    )
    expect(fromReceipt.requests).toEqual(fromString.requests)
    expect(fromReceipt.requests[0]?.input).toBe(storageReference.asset_id)
    expect(JSON.stringify(fromReceipt.requests)).not.toContain('not-a-signing-option')
  })

  test('builds responsive Storage previews and a signed JPEG fallback', () => {
    const { requests, sign } = collectSignedRequests()
    const model = createTransloaditImageModel(
      {
        expiresAt,
        fallbackQuality: 68,
        formats: { webp: 61 },

        src: { ...storageReference, path: 'documents/report.pdf', width: 400, height: 300 },

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
        input: storageReference.asset_id,
        template: 'builtin/storage-preview@0.0.3',
        urlParams: {
          v: storageReference.version_id,
          bg: '#00000000',
          f: 'webp',
          h: 150,
          q: 61,
          r: 'pad',
          w: 200,
        },
      },
      {
        expiresAt,
        input: storageReference.asset_id,
        template: 'builtin/storage-preview@0.0.3',
        urlParams: {
          v: storageReference.version_id,
          bg: '#00000000',
          f: 'webp',
          h: 300,
          q: 61,
          r: 'pad',
          w: 400,
        },
      },
      {
        expiresAt,
        input: storageReference.asset_id,
        template: 'builtin/storage-preview@0.0.3',
        urlParams: {
          v: storageReference.version_id,
          bg: '#ffffff',
          f: 'jpg',
          h: 300,
          q: 68,
          r: 'pad',
          w: 400,
        },
      },
    ])
  })

  test('supports an explicit workspace Template', () => {
    const { requests, sign } = collectSignedRequests()

    createTransloaditImageModel(
      {
        expiresAt,
        formats: { webp: 75 },
        height: 300,
        src: 'documents/report.pdf',
        template: 'website/storage-preview',
        width: 400,
        widths: [400],
      },
      sign,
    )

    expect(requests.every(({ template }) => template === 'website/storage-preview')).toBe(true)
  })

  test('caps the default ladder at the declared intrinsic width', () => {
    const { sign } = collectSignedRequests()
    const model = createTransloaditImageModel(
      {
        expiresAt,
        formats: { webp: 75 },

        src: { ...storageReference, path: 'documents/report.pdf', width: 400, height: 300 },
      },
      sign,
    )

    expect(model.sources[0]?.candidates.map(({ width }) => width)).toEqual([320, 400])
  })

  test('caps candidates and the JPEG fallback at the intrinsic width', () => {
    const { requests, sign } = collectSignedRequests()

    const model = createTransloaditImageModel(
      {
        expiresAt,
        formats: { webp: 61 },

        src: { ...storageReference, path: 'documents/report.pdf', width: 400, height: 300 },

        widths: [200, 800],
      },
      sign,
    )

    expect(model.sources[0]?.candidates.map(({ width }) => width)).toEqual([200, 400])
    expect(requests.at(-1)?.urlParams).toEqual({
      v: storageReference.version_id,
      bg: '#ffffff',
      f: 'jpg',
      h: 300,
      q: 75,
      r: 'pad',
      w: 400,
    })
  })

  test('rejects an invalid fallback quality before signing any candidate', () => {
    const { requests, sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          fallbackQuality: 0,

          src: { ...storageReference, path: 'documents/report.pdf', width: 400, height: 300 },

          widths: [200, 400],
        },
        sign,
      ),
    ).toThrow('fallbackQuality must be an integer from 1 through 100')
    expect(requests).toEqual([])
  })

  test('uses deterministic format preference and intrinsic dimensions', () => {
    const { requests, sign } = collectSignedRequests()
    const model = createTransloaditImageModel(
      {
        expiresAt,
        formats: { webp: 70, avif: 40 },

        src: { ...storageReference, path: 'portraits/report.pdf', width: 400, height: 1200 },

        widths: [8000],
      },
      sign,
    )

    expect(model.sources.map(({ format }) => format)).toEqual(['avif', 'webp'])
    expect(model.sources.flatMap(({ candidates }) => candidates.map(({ width }) => width))).toEqual(
      [400, 400],
    )
    expect(requests.slice(0, -1).every(({ urlParams }) => urlParams.h === 1200)).toBe(true)
    expect(requests.at(-1)?.urlParams).toEqual({
      v: storageReference.version_id,
      bg: '#ffffff',
      f: 'jpg',
      h: 1200,
      q: 75,
      r: 'pad',
      w: 400,
    })
  })

  test.each([
    '',
    '/documents/report.pdf',
    ' documents/report.pdf',
  ])('rejects an invalid Storage path: %s', (src) => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel({ expiresAt, height: 300, src, width: 400, widths: [400] }, sign),
    ).toThrow(
      'Storage image paths must be non-empty relative strings without surrounding whitespace',
    )
  })

  test.each([
    'documents/../private/report.pdf',
    'documents/./report.pdf',
    String.raw`documents\private\report.pdf`,
    'documents/cover.jpg|private/secret.pdf',
  ])('rejects an ambiguous Storage path: %s', (src) => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel({ expiresAt, height: 300, src, width: 400, widths: [400] }, sign),
    ).toThrow('Storage image paths must not contain delimiters, dot segments, or backslashes')
  })

  test.each([
    'documents//report.pdf',
    'documents/report.pdf/',
    'documents/ /report.pdf',
    'documents/\0report.pdf',
    'cafe\u0301/report.pdf',
  ])('rejects a Storage path outside the API2 catalog grammar: %s', (src) => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel({ expiresAt, height: 300, src, width: 400, widths: [400] }, sign),
    ).toThrow('Storage image paths must use normalized, non-empty path segments')
  })

  test('measures the Storage path limit in UTF-8 bytes', () => {
    const { sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          height: 300,
          src: `${'😀'.repeat(256)}.jpg`,
          width: 400,
          widths: [400],
        },
        sign,
      ),
    ).toThrow('Storage image paths must be at most 1024 UTF-8 bytes')
  })

  test('snapshots caller-owned values before validation and signing', () => {
    const { requests, sign } = collectSignedRequests()
    let srcReads = 0
    const options = {
      expiresAt,
      get src() {
        srcReads += 1
        return {
          ...storageReference,
          path: srcReads === 1 ? 'documents/report.pdf' : 'private/secret.pdf',
          width: 400,
          height: 300,
        }
      },
      widths: [400],
    } satisfies TransloaditImageModelOptions

    createTransloaditImageModel(options, sign)

    expect(srcReads).toBe(1)
    expect(requests.every(({ input }) => input === storageReference.asset_id)).toBe(true)
  })

  test('treats percent escapes as literal catalog key bytes', () => {
    const { requests, sign } = collectSignedRequests()

    createTransloaditImageModel(
      {
        expiresAt,

        src: { ...storageReference, path: 'documents/%2e%2e/report.pdf', width: 400, height: 300 },

        widths: [400],
      },
      sign,
    )

    expect(requests.every(({ input }) => input === storageReference.asset_id)).toBe(true)
  })

  test('rejects a seconds-based expiry before signing', () => {
    const { requests, sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt: 1_893_456_000,

          src: { ...storageReference, path: 'documents/report.pdf', width: 400, height: 300 },

          widths: [400],
        },
        sign,
      ),
    ).toThrow('expiresAt must be a millisecond timestamp')
    expect(requests).toEqual([])
  })
})
