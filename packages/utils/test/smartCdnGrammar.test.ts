import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  getSignedSmartCdnUrl,
  getSmartCdnUrl,
  parseSmartCdnUrl,
  stripSmartCdnAuth,
} from '../src/index.ts'
import {
  getSignedSmartCdnUrl as getSignedSmartCdnUrlSync,
  getSmartCdnUrl as getSmartCdnUrlNode,
  parseSmartCdnUrl as parseSmartCdnUrlNode,
  stripSmartCdnAuth as stripSmartCdnAuthNode,
} from '../src/node.ts'

const signed = {
  authKey: 'test-key',
  authSecret: 'test-secret',
  expiresAt: 1_900_000_000_000,
  input: 'https://assets.example/image.jpg?version=1',
  template: 'builtin/serve-image@0.0.1',
  urlParams: { f: ['avif', 'webp'], fit: true, q: 75, w: 640 },
  workspace: 'test-workspace',
}

// The 4.6.0 known answer; the grammar must keep producing and parsing exactly this.
const knownAnswer =
  'https://test-workspace.tlcdn.com/builtin%2Fserve-image%400.0.1/' +
  'https%3A%2F%2Fassets.example%2Fimage.jpg%3Fversion%3D1' +
  '?auth_key=test-key&exp=1900000000000&f=avif&f=webp&fit=true&q=75&w=640' +
  '&sig=sha256%3A69e40bc3a447c121a08d059ad9093a39c1beaf5c107a82992d5e78e0d9686f6b'

const storage = {
  workspace: 'my-workspace',
  template: 'builtin/storage-serve@0.0.1',
  input: 'photos/sunset 2.jpg',
}

const devBaseUrl = 'https://api2-devdock.transloadit.dev/file/{workspace}'

describe('getSmartCdnUrl (unsigned)', () => {
  it('builds the sorted, encoded URL without any signature parameters', () => {
    const { authKey: _k, authSecret: _s, expiresAt: _e, ...unsigned } = signed
    const url = getSmartCdnUrl(unsigned)
    expect(url).toBe(
      'https://test-workspace.tlcdn.com/builtin%2Fserve-image%400.0.1/' +
        'https%3A%2F%2Fassets.example%2Fimage.jpg%3Fversion%3D1' +
        '?f=avif&f=webp&fit=true&q=75&w=640',
    )
    expect(getSmartCdnUrlNode(unsigned)).toBe(url)
    expect(url).toBe(stripSmartCdnAuth(knownAnswer))
  })

  it('omits the query string when there are no parameters', () => {
    expect(getSmartCdnUrl(storage)).toBe(
      'https://my-workspace.tlcdn.com/builtin%2Fstorage-serve%400.0.1/photos%2Fsunset%202.jpg',
    )
  })

  it('substitutes {workspace} in a trusted baseUrl and tolerates a trailing slash', () => {
    expect(getSmartCdnUrl({ ...storage, baseUrl: `${devBaseUrl}/` })).toBe(
      'https://api2-devdock.transloadit.dev/file/my-workspace/builtin%2Fstorage-serve%400.0.1/photos%2Fsunset%202.jpg',
    )
    expect(getSmartCdnUrl({ ...storage, baseUrl: 'https://cdn.example/x' })).toBe(
      'https://cdn.example/x/builtin%2Fstorage-serve%400.0.1/photos%2Fsunset%202.jpg',
    )
  })

  it('validates its input the same way as the signers', () => {
    expect(() => getSmartCdnUrl({ ...storage, workspace: '' })).toThrow(
      new TypeError('workspace is required'),
    )
    expect(() => getSmartCdnUrl({ ...storage, baseUrl: 'not a url' })).toThrow(
      new TypeError("baseUrl must be an absolute URL, got 'not a url'"),
    )
    expect(() => getSmartCdnUrl({ ...storage, baseUrl: 'https://cdn.example/?x=1' })).toThrow(
      'baseUrl must not contain a query string or fragment',
    )
    expect(
      new URL(
        getSmartCdnUrl({ ...storage, urlParams: { hsh: 'saved-template-hash' } }),
      ).searchParams.get('hsh'),
    ).toBe('saved-template-hash')
  })

  it('omits reserved authentication fields and remains parseable', () => {
    const url = getSmartCdnUrl({
      ...storage,
      urlParams: {
        auth_key: 'caller-controlled',
        exp: 1,
        hsh: 'saved-template-hash',
        sig: 'caller-controlled',
      },
    })

    expect(parseSmartCdnUrl(url).urlParams).toEqual({ hsh: 'saved-template-hash' })
    expect(new URL(url).searchParams.has('auth_key')).toBe(false)
    expect(new URL(url).searchParams.has('exp')).toBe(false)
    expect(new URL(url).searchParams.has('sig')).toBe(false)
  })
})

describe('getSignedSmartCdnUrl with baseUrl', () => {
  it('keeps the signature identical because the host is not signed', async () => {
    const tlcdn = new URL(knownAnswer)
    const dev = new URL(await getSignedSmartCdnUrl({ ...signed, baseUrl: devBaseUrl }))
    expect(dev.origin + dev.pathname).toBe(
      'https://api2-devdock.transloadit.dev/file/test-workspace/builtin%2Fserve-image%400.0.1/' +
        'https%3A%2F%2Fassets.example%2Fimage.jpg%3Fversion%3D1',
    )
    expect(dev.search).toBe(tlcdn.search)
    expect(getSignedSmartCdnUrlSync({ ...signed, baseUrl: devBaseUrl })).toBe(dev.toString())
  })

  it('still matches the known answer without a baseUrl', async () => {
    await expect(getSignedSmartCdnUrl(signed)).resolves.toBe(knownAnswer)
  })

  it('overwrites caller-provided signature parameters for backward compatibility', async () => {
    const compatible = {
      ...signed,
      urlParams: {
        ...signed.urlParams,
        auth_key: 'caller-controlled',
        exp: 1,
        sig: 'caller-controlled',
      },
    }

    await expect(getSignedSmartCdnUrl(compatible)).resolves.toBe(knownAnswer)
    expect(getSignedSmartCdnUrlSync(compatible)).toBe(knownAnswer)
  })

  it('preserves signed template-cache metadata and parses it as a normal field', async () => {
    const withTemplateHash = {
      ...signed,
      urlParams: { ...signed.urlParams, hsh: 'saved-template-hash' },
    }
    const url = await getSignedSmartCdnUrl(withTemplateHash)

    expect(getSignedSmartCdnUrlSync(withTemplateHash)).toBe(url)
    expect(new URL(url).searchParams.get('hsh')).toBe('saved-template-hash')
    expect(parseSmartCdnUrl(url).urlParams.hsh).toBe('saved-template-hash')
  })
})

describe('stripSmartCdnAuth', () => {
  it('removes auth_key, exp, sig and hsh and leaves every other byte alone', () => {
    const url =
      'https://ws.tlcdn.com/t/a%2Fb%20c?auth_key=k&w=100&exp=1&f=avif&f=webp&sig=sha256%3Aabc&hsh=zz&q=a+b'
    expect(stripSmartCdnAuth(url)).toBe(
      'https://ws.tlcdn.com/t/a%2Fb%20c?w=100&f=avif&f=webp&q=a+b',
    )
    expect(stripSmartCdnAuthNode(url)).toBe(stripSmartCdnAuth(url))
  })

  it('is idempotent, drops an emptied query, keeps fragments and URLs without a query', () => {
    const stripped = stripSmartCdnAuth(knownAnswer)
    expect(stripSmartCdnAuth(stripped)).toBe(stripped)
    expect(stripSmartCdnAuth('https://ws.tlcdn.com/t/i?auth_key=k&exp=1&sig=s')).toBe(
      'https://ws.tlcdn.com/t/i',
    )
    expect(stripSmartCdnAuth('https://ws.tlcdn.com/t/i?sig=s&w=1#frag')).toBe(
      'https://ws.tlcdn.com/t/i?w=1#frag',
    )
    expect(stripSmartCdnAuth('https://ws.tlcdn.com/t/i')).toBe('https://ws.tlcdn.com/t/i')
  })
})

describe('parseSmartCdnUrl', () => {
  it('ignores signature fields inherited from Object.prototype', () => {
    Object.defineProperties(Object.prototype, {
      auth_key: { configurable: true, value: 'polluted-key' },
      exp: { configurable: true, value: '1900000000000' },
      sig: { configurable: true, value: 'sha256:polluted' },
    })

    try {
      expect(parseSmartCdnUrl(getSmartCdnUrl(storage)).auth).toBeUndefined()
    } finally {
      Reflect.deleteProperty(Object.prototype, 'auth_key')
      Reflect.deleteProperty(Object.prototype, 'exp')
      Reflect.deleteProperty(Object.prototype, 'sig')
    }
  })

  it('inverts the signed known answer', () => {
    const parsed = parseSmartCdnUrl(knownAnswer)
    expect(parsed).toEqual({
      workspace: 'test-workspace',
      template: 'builtin/serve-image@0.0.1',
      input: 'https://assets.example/image.jpg?version=1',
      urlParams: { f: ['avif', 'webp'], fit: 'true', q: '75', w: '640' },
      auth: {
        key: 'test-key',
        expiresAt: 1_900_000_000_000,
        signature: 'sha256:69e40bc3a447c121a08d059ad9093a39c1beaf5c107a82992d5e78e0d9686f6b',
      },
    })
    expect(parseSmartCdnUrlNode(knownAnswer)).toEqual(parsed)
  })

  it('round-trips through both builders and both signers', async () => {
    const unsignedUrl = getSmartCdnUrl({ ...storage, urlParams: { w: 10, f: ['avif', 'webp'] } })
    const parsedUnsigned = parseSmartCdnUrl(unsignedUrl)
    expect(parsedUnsigned.auth).toBeUndefined()
    expect(getSmartCdnUrl(parsedUnsigned)).toBe(unsignedUrl)

    const parsedSigned = parseSmartCdnUrl(knownAnswer)
    const rebuild = {
      ...parsedSigned,
      authKey: parsedSigned.auth?.key ?? '',
      expiresAt: parsedSigned.auth?.expiresAt,
      authSecret: signed.authSecret,
    }
    await expect(getSignedSmartCdnUrl(rebuild)).resolves.toBe(knownAnswer)
    expect(getSignedSmartCdnUrlSync(rebuild)).toBe(knownAnswer)
  })

  it('decodes path segments exactly once', () => {
    const url = getSmartCdnUrl({ ...storage, input: 'a%2Fb' })
    expect(url).toContain('/a%252Fb')
    expect(parseSmartCdnUrl(url).input).toBe('a%2Fb')
    expect(parseSmartCdnUrl(getSmartCdnUrl(storage)).input).toBe('photos/sunset 2.jpg')
    // A literal slash in the path joins into the input, like the Console's parser did.
    expect(parseSmartCdnUrl('https://ws.tlcdn.com/tpl/photos/sunset.jpg').input).toBe(
      'photos/sunset.jpg',
    )
    expect(parseSmartCdnUrl('https://ws.tlcdn.com/tpl/').input).toBe('')
  })

  it('handles non-ASCII, @ in template names and lower-cases the workspace host', () => {
    const opts = {
      workspace: 'My-Workspace',
      template: 'builtin/serve-image@0.0.1',
      input: 'ümlaut/€.png',
    }
    const parsed = parseSmartCdnUrl(getSmartCdnUrl(opts))
    expect(parsed).toMatchObject({
      workspace: 'my-workspace',
      template: opts.template,
      input: opts.input,
    })
  })

  it('decodes query values by URLSearchParams rules, not twice', () => {
    const parsed = parseSmartCdnUrl('https://ws.tlcdn.com/t/i?q=a%2Bb&r=x+y&s=%2525')
    expect(parsed.urlParams).toEqual({ q: 'a+b', r: 'x y', s: '%25' })
  })

  it('accepts the api2 URL Transform format through a baseUrl with {workspace}', async () => {
    const url = await getSignedSmartCdnUrl({
      ...signed,
      ...storage,
      urlParams: { cdn: 'required' },
      baseUrl: devBaseUrl,
    })
    expect(url.startsWith('https://api2-devdock.transloadit.dev/file/my-workspace/')).toBe(true)
    const parsed = parseSmartCdnUrl(url, { baseUrl: devBaseUrl })
    expect(parsed).toMatchObject({
      ...storage,
      urlParams: { cdn: 'required' },
      auth: { key: 'test-key', expiresAt: signed.expiresAt },
      baseUrl: 'https://api2-devdock.transloadit.dev/file/my-workspace',
    })
    expect(
      getSignedSmartCdnUrlSync({
        ...parsed,
        authKey: 'test-key',
        authSecret: signed.authSecret,
        expiresAt: signed.expiresAt,
      }),
    ).toBe(url)
    expect(() => parseSmartCdnUrl(url)).toThrow(/unexpected origin/)
  })

  it('needs a workspace next to a baseUrl without {workspace}', () => {
    const url = getSmartCdnUrl({ ...storage, baseUrl: 'https://cdn.example/x' })
    expect(
      parseSmartCdnUrl(url, { baseUrl: 'https://cdn.example/x/', workspace: 'my-workspace' }),
    ).toMatchObject({ ...storage, baseUrl: 'https://cdn.example/x' })
    expect(() => parseSmartCdnUrl(url, { baseUrl: 'https://cdn.example/x' })).toThrow(
      /workspace cannot be determined/,
    )
  })

  it('rejects anything that is not a Smart CDN URL', () => {
    expect(() => parseSmartCdnUrl('not a url')).toThrow(/not an absolute URL/)
    expect(() => parseSmartCdnUrl('https://evil.example/t/i')).toThrow(/unexpected origin/)
    expect(() => parseSmartCdnUrl('https://ws.tlcdn.com.evil.example/t/i')).toThrow(
      /unexpected origin/,
    )
    expect(() => parseSmartCdnUrl('http://ws.tlcdn.com/t/i')).toThrow(/unexpected origin/)
    expect(() => parseSmartCdnUrl('https://ws.tlcdn.com/tpl')).toThrow(/missing the input segment/)
    expect(() => parseSmartCdnUrl('https://ws.tlcdn.com//i')).toThrow(
      /missing the template segment/,
    )
    expect(() => parseSmartCdnUrl('https://ws.tlcdn.com/t/%E0%A4%A')).toThrow(
      /malformed percent-encoding/,
    )
    expect(() => parseSmartCdnUrl('https://ws.tlcdn.com/t/i?auth_key=k&sig=s')).toThrow(
      /incomplete signature parameters/,
    )
    expect(() => parseSmartCdnUrl('https://ws.tlcdn.com/t/i?auth_key=k&exp=soon&sig=s')).toThrow(
      /is not a timestamp/,
    )
  })

  it('agrees with an independently computed signature for a parsed URL', () => {
    const parsed = parseSmartCdnUrl(knownAnswer)
    const stringToSign =
      'test-workspace/builtin%2Fserve-image%400.0.1/' +
      'https%3A%2F%2Fassets.example%2Fimage.jpg%3Fversion%3D1' +
      '?auth_key=test-key&exp=1900000000000&f=avif&f=webp&fit=true&q=75&w=640'
    const expected = createHmac('sha256', signed.authSecret).update(stringToSign).digest('hex')
    expect(parsed.auth?.signature).toBe(`sha256:${expected}`)
  })
})
