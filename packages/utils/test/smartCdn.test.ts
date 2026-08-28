import { createHmac } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { getSignedSmartCdnUrl, signParams } from '../src/index.ts'
import { getSignedSmartCdnUrl as getSignedSmartCdnUrlSync, signParamsSync } from '../src/node.ts'

const options = {
  authKey: 'test-key',
  authSecret: 'test-secret',
  expiresAt: 1_900_000_000_000,
  input: 'https://assets.example/image.jpg?version=1',
  template: 'builtin/serve-image@0.0.1',
  urlParams: { f: ['avif', 'webp'], fit: true, q: 75, w: 640 },
  workspace: 'test-workspace',
}

// Computed once with the Node signer; guards both signers against drifting together.
const knownAnswer =
  'https://test-workspace.tlcdn.com/builtin%2Fserve-image%400.0.1/' +
  'https%3A%2F%2Fassets.example%2Fimage.jpg%3Fversion%3D1' +
  '?auth_key=test-key&exp=1900000000000&f=avif&f=webp&fit=true&q=75&w=640' +
  '&sig=sha256%3A69e40bc3a447c121a08d059ad9093a39c1beaf5c107a82992d5e78e0d9686f6b'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('getSignedSmartCdnUrl', () => {
  it('matches the known answer in both the WebCrypto and the Node signer', async () => {
    expect(getSignedSmartCdnUrlSync(options)).toBe(knownAnswer)
    await expect(getSignedSmartCdnUrl(options)).resolves.toBe(knownAnswer)
  })

  it('signs the string to sign with HMAC-SHA256 over the sorted query', async () => {
    const stringToSign =
      'test-workspace/builtin%2Fserve-image%400.0.1/' +
      'https%3A%2F%2Fassets.example%2Fimage.jpg%3Fversion%3D1' +
      '?auth_key=test-key&exp=1900000000000&f=avif&f=webp&fit=true&q=75&w=640'
    const expected = createHmac('sha256', options.authSecret).update(stringToSign).digest('hex')

    const url = new URL(await getSignedSmartCdnUrl(options))
    expect(url.searchParams.get('sig')).toBe(`sha256:${expected}`)
  })

  it('defaults the expiry to one hour from now in both signers', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const { expiresAt: _expiresAt, ...withoutExpiry } = options

    const syncUrl = getSignedSmartCdnUrlSync(withoutExpiry)
    const asyncUrl = await getSignedSmartCdnUrl(withoutExpiry)

    expect(new URL(syncUrl).searchParams.get('exp')).toBe(`${1_700_000_000_000 + 60 * 60 * 1000}`)
    expect(asyncUrl).toBe(syncUrl)
  })

  it('rejects incomplete options the same way in both signers', async () => {
    for (const [key, message] of [
      ['workspace', 'workspace is required'],
      ['template', 'template is required'],
      ['input', 'input is required'],
    ] as const) {
      const broken = { ...options, [key]: undefined } as unknown as typeof options
      expect(() => getSignedSmartCdnUrlSync(broken)).toThrow(new TypeError(message))
      await expect(getSignedSmartCdnUrl(broken)).rejects.toThrow(new TypeError(message))
    }
  })

  it('explains that WebCrypto needs a secure origin when crypto.subtle is missing', async () => {
    vi.stubGlobal('crypto', undefined)

    await expect(getSignedSmartCdnUrl(options)).rejects.toThrow(
      'Web Crypto is required to sign Transloadit payloads; browsers only provide crypto.subtle on secure origins (https:// or localhost)',
    )
  })
})

describe('signParams', () => {
  it('produces the same signature as signParamsSync for every supported algorithm', async () => {
    const paramsString = JSON.stringify({ auth: { key: 'test-key' }, steps: {} })

    for (const algorithm of ['sha1', 'sha256', 'sha384', 'sha512'] as const) {
      const expected = signParamsSync(paramsString, options.authSecret, algorithm)
      expect(expected.startsWith(`${algorithm}:`)).toBe(true)
      await expect(signParams(paramsString, options.authSecret, algorithm)).resolves.toBe(expected)
    }
  })
})
