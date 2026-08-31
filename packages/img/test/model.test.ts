import type { SmartCdnImageSignRequest, TransloaditImageModelOptions } from '../src/index.ts'

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
  test('builds responsive Storage previews and a signed JPEG fallback', () => {
    const { requests, sign } = collectSignedRequests()
    const model = createTransloaditImageModel(
      {
        expiresAt,
        fallbackQuality: 68,
        formats: { webp: 61 },
        height: 300,
        src: 'documents/report.pdf',
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
        height: 300,
        src: 'documents/report.pdf',
        width: 400,
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
        height: 300,
        src: 'documents/report.pdf',
        width: 400,
        widths: [200, 800],
      },
      sign,
    )

    expect(model.sources[0]?.candidates.map(({ width }) => width)).toEqual([200, 400])
    expect(requests.at(-1)?.urlParams).toEqual({ f: 'jpg', h: 300, q: 75, r: 'pad', w: 400 })
  })

  test('rejects an invalid fallback quality before signing any candidate', () => {
    const { requests, sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt,
          fallbackQuality: 0,
          height: 300,
          src: 'documents/report.pdf',
          width: 400,
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
        height: 1200,
        src: 'portraits/report.pdf',
        width: 400,
        widths: [8000],
      },
      sign,
    )

    expect(model.sources.map(({ format }) => format)).toEqual(['avif', 'webp'])
    expect(model.sources.flatMap(({ candidates }) => candidates.map(({ width }) => width))).toEqual(
      [400, 400],
    )
    expect(requests.slice(0, -1).every(({ urlParams }) => urlParams.h === 1200)).toBe(true)
    expect(requests.at(-1)?.urlParams).toEqual({ f: 'jpg', h: 1200, q: 75, r: 'pad', w: 400 })
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
      height: 300,
      get src() {
        srcReads += 1
        return srcReads === 1 ? 'documents/report.pdf' : 'private/secret.pdf'
      },
      width: 400,
      widths: [400],
    } satisfies TransloaditImageModelOptions

    createTransloaditImageModel(options, sign)

    expect(srcReads).toBe(1)
    expect(requests.every(({ input }) => input === 'documents/report.pdf')).toBe(true)
  })

  test('treats percent escapes as literal catalog key bytes', () => {
    const { requests, sign } = collectSignedRequests()

    createTransloaditImageModel(
      {
        expiresAt,
        height: 300,
        src: 'documents/%2e%2e/report.pdf',
        width: 400,
        widths: [400],
      },
      sign,
    )

    expect(requests.every(({ input }) => input === 'documents/%2e%2e/report.pdf')).toBe(true)
  })

  test('rejects a seconds-based expiry before signing', () => {
    const { requests, sign } = collectSignedRequests()

    expect(() =>
      createTransloaditImageModel(
        {
          expiresAt: 1_893_456_000,
          height: 300,
          src: 'documents/report.pdf',
          width: 400,
          widths: [400],
        },
        sign,
      ),
    ).toThrow('expiresAt must be a millisecond timestamp')
    expect(requests).toEqual([])
  })
})
