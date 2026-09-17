import { expect, test } from 'vitest'

import { getSmartCdnImageCandidates, parseSmartCdnUrl } from '../src/node.ts'

test.each([
  { sourceDimensions: undefined, widths: [400], expected: [[400, 4096]] },
  {
    sourceDimensions: { width: 6000, height: 6000 },
    widths: [6000, 4096],
    expected: [[4096, 4096]],
  },
  { sourceDimensions: { width: 6000, height: 12000 }, widths: [6000], expected: [[2048, 4096]] },
])('public candidates keep truthful descriptors within both dimension limits: $expected', ({
  sourceDimensions,
  widths,
  expected,
}) => {
  const result = getSmartCdnImageCandidates({
    workspace: 'my-app',
    template: 'builtin/public-preview@0.0.1',
    input: 'website/hero.jpg',
    sourceDimensions,
    widths,
    formats: { webp: 85 },
    fallbackUrl: '/fallback.jpg',
  })
  expect(
    result.sources[0]?.candidates.map(({ url, width }) => {
      const query = new URL(url).searchParams
      expect(Number(query.get('w'))).toBe(width)
      return [width, Number(query.get('h'))]
    }),
  ).toEqual(expected)
})

test('the exact public Built-in rejects unsupported quality without restricting customer Templates', () => {
  const options = {
    workspace: 'my-app',
    input: 'website/hero.jpg',
    widths: [6000],
    formats: { webp: 100 },
    fallbackUrl: '/fallback.jpg',
  }
  expect(() =>
    getSmartCdnImageCandidates({ ...options, template: 'builtin/public-preview@0.0.1' }),
  ).toThrow('quality must be an integer from 1 through 85')
  const custom = getSmartCdnImageCandidates({ ...options, template: 'customer-preview' })
  expect(custom.sources[0]?.quality).toBe(100)
  expect(new URL(custom.sources[0]?.candidates[0]?.url ?? '').searchParams.get('h')).toBe('8000')
  expect(custom.sources[0]?.candidates[0]?.width).toBe(6000)
})

test('unsigned candidates share width/format policy but need no credential, expiry or clock', () => {
  const result = getSmartCdnImageCandidates({
    workspace: 'my-app',
    template: 'builtin/public-preview@0.0.1',
    input: 'website/hero.jpg',
    widths: [800, 400, 800],
    sourceDimensions: { width: 600, height: 400 },
    formats: { webp: 61 },
    fallbackUrl: '/fallback.jpg',
    urlParams: { v: 'd41d8cd98f00b204', auth_key: 'ignored', sig: 'ignored', exp: 'ignored' },
  })
  expect(result.fallbackUrl).toBe('/fallback.jpg')
  expect(result.sources[0]?.candidates.map(({ width }) => width)).toEqual([400, 600])
  for (const { url } of result.sources[0]?.candidates ?? []) {
    const parsed = parseSmartCdnUrl(url)
    expect(parsed.auth).toBeUndefined()
    expect(parsed.urlParams).toMatchObject({ f: 'webp', q: '61', v: 'd41d8cd98f00b204' })
    expect(url).not.toMatch(/sig=|auth_key=|exp=/)
  }
})

test('unsigned candidates preserve trusted baseUrl and cannot override validated transform dimensions', () => {
  const result = getSmartCdnImageCandidates({
    workspace: 'my-app',
    template: 'public-preview',
    input: 'website/hero.jpg',
    widths: [400],
    fallbackUrl: '/fallback.jpg',
    baseUrl: 'http://localhost:3020/file/{workspace}',
    urlParams: { w: 9999 },
  })
  expect(new URL(result.sources[0]?.candidates[0]?.url ?? '').hostname).toBe('localhost')
  expect(new URL(result.sources[0]?.candidates[0]?.url ?? '').searchParams.get('w')).toBe('400')
})

test('unsigned Storage previews do not inherit the Built-in 300px default height', () => {
  const result = getSmartCdnImageCandidates({
    workspace: 'my-app',
    template: 'builtin/public-preview@0.0.1',
    input: 'website/hero.jpg',
    sourceDimensions: { width: 2400, height: 1600 },
    widths: [960, 1920],
    formats: { webp: 75 },
    fallbackUrl: '/fallback.jpg',
    urlParams: { h: 300 },
  })
  const candidates = result.sources[0]?.candidates
  expect(candidates).toHaveLength(2)
  for (const candidate of candidates ?? []) {
    const query = new URL(candidate.url).searchParams
    const scale = Math.min(Number(query.get('w')) / 2400, Number(query.get('h') ?? 300) / 1600)
    expect(Math.round(2400 * scale)).toBe(candidate.width)
  }
})

test('fit rounds its height upward so a panorama is not narrower than its width descriptor', () => {
  const result = getSmartCdnImageCandidates({
    workspace: 'my-app',
    template: 'builtin/public-preview@0.0.1',
    input: 'website/panorama.jpg',
    sourceDimensions: { width: 2400, height: 10 },
    widths: [1000],
    formats: { webp: 75 },
    fallbackUrl: '/fallback.jpg',
  })
  const candidate = result.sources[0]?.candidates[0]
  expect(candidate).toBeDefined()
  if (candidate === undefined) throw new Error('Expected the panorama candidate')
  const query = new URL(candidate.url).searchParams
  const scale = Math.min(Number(query.get('w')) / 2400, Number(query.get('h')) / 10)
  expect(Math.round(2400 * scale)).toBe(candidate.width)
})
