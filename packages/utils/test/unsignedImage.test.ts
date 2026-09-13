import { expect, test } from 'vitest'

import { getSmartCdnImageCandidates, parseSmartCdnUrl } from '../src/node.ts'

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
