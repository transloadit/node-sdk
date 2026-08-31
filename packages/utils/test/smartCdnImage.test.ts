import type { SmartCdnImageSignRequest } from '../src/smartCdnImage.ts'

import { describe, expect, test, vi } from 'vitest'

import {
  createSmartCdnImageCandidates,
  resolveSmartCdnImageFormats,
  resolveSmartCdnImageWidths,
} from '../src/smartCdnImage.ts'

describe('createSmartCdnImageCandidates', () => {
  test('shares normalized format and width policy with framework packages', () => {
    expect(resolveSmartCdnImageFormats({ webp: 61, avif: 43 })).toEqual([
      { format: 'avif', quality: 43 },
      { format: 'webp', quality: 61 },
    ])
    expect(resolveSmartCdnImageWidths([800, 400, 800], 600)).toEqual([400, 600])
  })

  test('ignores inherited format qualities', () => {
    Object.defineProperty(Object.prototype, 'png', { configurable: true, value: 90 })

    try {
      expect(resolveSmartCdnImageFormats({ webp: 75 })).toEqual([{ format: 'webp', quality: 75 }])
      expect(() => resolveSmartCdnImageFormats({})).toThrow(
        'formats must contain at least one value',
      )
    } finally {
      Reflect.deleteProperty(Object.prototype, 'png')
    }
  })

  test('builds signer-agnostic candidates and caps width by both source dimensions', () => {
    const requests: SmartCdnImageSignRequest[] = []
    const result = createSmartCdnImageCandidates(
      {
        expiresAt: 1_900_000_000_000,
        formats: { webp: 75 },
        input: 'https://assets.example/portrait.jpg',
        sourceDimensions: { height: 10_000, width: 1_000 },
        widths: [1_000, 400],
      },
      (request) => {
        requests.push(request)
        return `https://cdn.example/${requests.length}`
      },
    )

    expect(result.sources[0]?.candidates).toEqual([
      { url: 'https://cdn.example/1', width: 400 },
      { url: 'https://cdn.example/2', width: 800 },
    ])
    expect(requests).toEqual([
      {
        expiresAt: 1_900_000_000_000,
        input: 'https://assets.example/portrait.jpg',
        template: 'builtin/serve-image@0.0.1',
        urlParams: { f: 'webp', q: 75, r: 'fit', w: 400 },
      },
      {
        expiresAt: 1_900_000_000_000,
        input: 'https://assets.example/portrait.jpg',
        template: 'builtin/serve-image@0.0.1',
        urlParams: { f: 'webp', q: 75, r: 'fit', w: 800 },
      },
    ])
  })

  test('signs with the validated policy snapshot when option accessors later change', () => {
    let expiresAtReads = 0
    let inputReads = 0
    const requests: SmartCdnImageSignRequest[] = []
    const result = createSmartCdnImageCandidates(
      {
        get expiresAt() {
          expiresAtReads += 1
          return expiresAtReads === 1 ? 1_900_000_000_000 : 0
        },
        formats: { webp: 75 },
        get input() {
          inputReads += 1
          return inputReads === 1 ? 'https://assets.example/photo.jpg' : 'file:///etc/passwd'
        },
        widths: [400],
      },
      (request) => {
        requests.push(request)
        return 'https://cdn.example/image'
      },
    )

    expect(requests).toEqual([
      {
        expiresAt: 1_900_000_000_000,
        input: 'https://assets.example/photo.jpg',
        template: 'builtin/serve-image@0.0.1',
        urlParams: { f: 'webp', q: 75, r: 'fit', w: 400 },
      },
    ])
    expect(result.fallbackUrl).toBe('https://assets.example/photo.jpg')
    expect(expiresAtReads).toBe(1)
    expect(inputReads).toBe(1)
  })

  test('rejects a seconds-based expiry before signing', () => {
    const sign = vi.fn(() => 'https://cdn.example/image')

    expect(() =>
      createSmartCdnImageCandidates(
        {
          expiresAt: 1_893_456_000,
          input: 'https://assets.example/photo.jpg',
          widths: [400],
        },
        sign,
      ),
    ).toThrow('expiresAt must be a millisecond timestamp')
    expect(sign).not.toHaveBeenCalled()
  })
})
