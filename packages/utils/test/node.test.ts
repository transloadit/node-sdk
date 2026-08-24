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

interface ParsedCandidate {
  url: URL
  width: number
}

function requireSource(source: string | undefined): string {
  if (source == null) {
    throw new Error('Expected image source candidates')
  }
  return source
}

function parseSrcSet(srcSet: string): ParsedCandidate[] {
  return srcSet.split(', ').map((candidate) => {
    const separator = candidate.lastIndexOf(' ')
    const descriptor = candidate.slice(separator + 1)
    if (separator === -1 || !descriptor.endsWith('w')) {
      throw new Error(`Invalid srcset candidate: ${candidate}`)
    }

    return {
      url: new URL(candidate.slice(0, separator)),
      width: Number(descriptor.slice(0, -1)),
    }
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getSignedSmartCdnImageCandidates', () => {
  it('builds deterministic AVIF and WebP srcsets with measured quality defaults', () => {
    vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('The candidate builder must not read the clock')
    })

    const result = getSignedSmartCdnImageCandidates(baseOptions)

    expect(result).toEqual(getSignedSmartCdnImageCandidates(baseOptions))
    expect(result.fallback).toBe(baseOptions.input)
    expect(Object.keys(result.sources)).toEqual(['avif', 'webp'])

    const avifCandidates = parseSrcSet(requireSource(result.sources.avif))
    const webpCandidates = parseSrcSet(requireSource(result.sources.webp))

    expect(avifCandidates.map(({ width }) => width)).toEqual([320, 640])
    expect(webpCandidates.map(({ width }) => width)).toEqual([320, 640])

    for (const { url, width } of avifCandidates) {
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

    for (const { url, width } of webpCandidates) {
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

    expect(result.sources.avif).toBeUndefined()
    expect(Object.keys(result.sources)).toEqual(['webp', 'png'])

    const [webpCandidate] = parseSrcSet(requireSource(result.sources.webp))
    const [pngCandidate] = parseSrcSet(requireSource(result.sources.png))

    expect(webpCandidate?.url.pathname).toBe(
      '/customer-image/https%3A%2F%2Fassets.example%2Fimage.jpg%3Fversion%3D1',
    )
    expect(webpCandidate?.url.searchParams.get('q')).toBe('82')
    expect(pngCandidate?.url.searchParams.get('q')).toBe('90')
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
