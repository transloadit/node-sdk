import { afterEach, describe, expect, it, vi } from 'vitest'

import { getSignedSmartCdnImageCandidates } from '../src/node.ts'

const baseOptions = {
  authKey: 'test-key',
  authSecret: 'test-secret',
  expiresAt: 1_900_000_000_000,
  input: 'https://assets.example/image.jpg?version=1',
  widths: [640, 320, 640],
  workspace: 'test-workspace',
}

function requireSource(
  sources: ReturnType<typeof getSignedSmartCdnImageCandidates>['sources'],
  format: 'avif' | 'png' | 'webp',
): (typeof sources)[number] {
  const source = sources.find((candidateSource) => candidateSource.format === format)
  if (source === undefined) {
    throw new Error('Expected image source candidates')
  }
  return source
}

function requireFirstCandidate(
  source: ReturnType<typeof requireSource>,
): (typeof source.candidates)[number] {
  const candidate = source.candidates[0]
  if (candidate === undefined) {
    throw new Error('Expected at least one image candidate')
  }
  return candidate
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getSignedSmartCdnImageCandidates', () => {
  it('builds deterministic structured AVIF and WebP candidates with measured defaults', () => {
    vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('The candidate builder must not read the clock')
    })

    const result = getSignedSmartCdnImageCandidates(baseOptions)

    expect(result).toEqual(getSignedSmartCdnImageCandidates(baseOptions))
    expect(result.fallbackUrl).toBe(baseOptions.input)
    expect(result.sources.map(({ format }) => format)).toEqual(['avif', 'webp'])

    const avifSource = requireSource(result.sources, 'avif')
    const webpSource = requireSource(result.sources, 'webp')

    expect(avifSource.quality).toBe(45)
    expect(webpSource.quality).toBe(75)
    expect(avifSource.candidates.map(({ width }) => width)).toEqual([320, 640])
    expect(webpSource.candidates.map(({ width }) => width)).toEqual([320, 640])

    for (const { url: rawUrl, width } of avifSource.candidates) {
      const url = new URL(rawUrl)
      expect(url.pathname).toBe(
        '/builtin%2Fserve-image%400.0.1/' +
          'https%3A%2F%2Fassets.example%2Fimage.jpg%3Fversion%3D1',
      )
      expect(url.searchParams.get('auth_key')).toBe(baseOptions.authKey)
      expect(url.searchParams.get('exp')).toBe(`${baseOptions.expiresAt}`)
      expect(url.searchParams.get('f')).toBe('avif')
      expect(url.searchParams.get('q')).toBe('45')
      expect(url.searchParams.get('r')).toBe('fit')
      expect(url.searchParams.get('w')).toBe(`${width}`)
      expect(url.searchParams.get('sig')).toMatch(/^sha256:[a-f0-9]{64}$/)
    }

    for (const { url: rawUrl, width } of webpSource.candidates) {
      const url = new URL(rawUrl)
      expect(url.searchParams.get('f')).toBe('webp')
      expect(url.searchParams.get('q')).toBe('75')
      expect(url.searchParams.get('w')).toBe(`${width}`)
    }
  })

  it('supports a compatible Template override and explicit formats', () => {
    const result = getSignedSmartCdnImageCandidates({
      ...baseOptions,
      formats: { png: 90, webp: 82 },
      template: 'customer-image',
      widths: [480],
    })

    expect(result.sources.map(({ format }) => format)).toEqual(['webp', 'png'])

    const webpCandidate = requireFirstCandidate(requireSource(result.sources, 'webp'))
    const pngCandidate = requireFirstCandidate(requireSource(result.sources, 'png'))

    expect(new URL(webpCandidate.url).pathname).toBe(
      '/customer-image/https%3A%2F%2Fassets.example%2Fimage.jpg%3Fversion%3D1',
    )
    expect(new URL(webpCandidate.url).searchParams.get('q')).toBe('82')
    expect(new URL(pngCandidate.url).searchParams.get('q')).toBe('90')
  })

  it('rejects values that the Built-in cannot execute safely', () => {
    expect(() => getSignedSmartCdnImageCandidates({ ...baseOptions, widths: [] })).toThrow(
      'widths must contain at least one value',
    )
    expect(() => getSignedSmartCdnImageCandidates({ ...baseOptions, widths: [0] })).toThrow(
      'width must be an integer from 1 through 8000',
    )
    expect(() => getSignedSmartCdnImageCandidates({ ...baseOptions, widths: [8001] })).toThrow(
      'width must be an integer from 1 through 8000',
    )
    expect(() => getSignedSmartCdnImageCandidates({ ...baseOptions, widths: [1.5] })).toThrow(
      'width must be an integer from 1 through 8000',
    )
    expect(() =>
      getSignedSmartCdnImageCandidates({ ...baseOptions, formats: { avif: 0 } }),
    ).toThrow('quality must be an integer from 1 through 100')
    expect(() =>
      getSignedSmartCdnImageCandidates({ ...baseOptions, formats: { webp: 101 } }),
    ).toThrow('quality must be an integer from 1 through 100')
    expect(() => getSignedSmartCdnImageCandidates({ ...baseOptions, formats: {} })).toThrow(
      'formats must contain at least one value',
    )
    expect(() =>
      getSignedSmartCdnImageCandidates({
        ...baseOptions,
        // @ts-expect-error The runtime boundary must reject unsupported JavaScript input.
        formats: { jpeg: 75 },
      }),
    ).toThrow('Unsupported Smart CDN image format: jpeg')
    expect(() => getSignedSmartCdnImageCandidates({ ...baseOptions, expiresAt: 0 })).toThrow(
      'expiresAt must be a positive safe integer',
    )
    expect(() =>
      getSignedSmartCdnImageCandidates({ ...baseOptions, expiresAt: Number.MAX_VALUE }),
    ).toThrow('expiresAt must be a positive safe integer')
    expect(() => getSignedSmartCdnImageCandidates({ ...baseOptions, input: 'not-a-url' })).toThrow(
      'input must be an HTTP or HTTPS URL',
    )
    expect(() =>
      getSignedSmartCdnImageCandidates({
        ...baseOptions,
        // @ts-expect-error The runtime boundary must not coerce URL objects.
        input: new URL('https://assets.example/image.jpg'),
      }),
    ).toThrow('input must be a single HTTP or HTTPS URL string')
    expect(() =>
      getSignedSmartCdnImageCandidates({
        ...baseOptions,
        input: ' https://assets.example/image.jpg',
      }),
    ).toThrow('input must be a single HTTP or HTTPS URL string')
    expect(() =>
      getSignedSmartCdnImageCandidates({
        ...baseOptions,
        input: 'https://assets.example/one.jpg|https://assets.example/two.jpg',
      }),
    ).toThrow('input must be a single HTTP or HTTPS URL string')
    expect(() =>
      getSignedSmartCdnImageCandidates({ ...baseOptions, input: 'ftp://assets.example/image.jpg' }),
    ).toThrow('input must be an HTTP or HTTPS URL')
    expect(() => getSignedSmartCdnImageCandidates({ ...baseOptions, authKey: '' })).toThrow(
      'authKey is required',
    )
    expect(() => getSignedSmartCdnImageCandidates({ ...baseOptions, authSecret: '' })).toThrow(
      'authSecret is required',
    )
    expect(() =>
      getSignedSmartCdnImageCandidates({
        ...baseOptions,
        // @ts-expect-error The runtime boundary must reject unsupported JavaScript input.
        authKey: null,
      }),
    ).toThrow('authKey is required')
    expect(() =>
      getSignedSmartCdnImageCandidates({
        ...baseOptions,
        // @ts-expect-error The runtime boundary must reject unsupported JavaScript input.
        widths: undefined,
      }),
    ).toThrow('widths must contain at least one value')
    expect(() =>
      getSignedSmartCdnImageCandidates({
        ...baseOptions,
        widths: Array.from({ length: 33 }, (_, index) => index + 1),
      }),
    ).toThrow('widths must contain at most 32 values')
  })
})
