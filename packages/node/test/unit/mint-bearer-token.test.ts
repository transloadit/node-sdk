import { afterEach, describe, expect, it, vi } from 'vitest'

import packageJson from '../../package.json' with { type: 'json' }
import { mintBearerTokenWithCredentials } from '../../src/bearerToken.ts'
import { Transloadit } from '../../src/Transloadit.ts'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Transloadit.mintBearerToken', () => {
  it('requests a narrowed scope when provided', async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: 'abc',
            token_type: 'Bearer',
            expires_in: 21600,
            scope: 'assemblies:write templates:read',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch)

    const client = new Transloadit({
      authKey: 'key',
      authSecret: 'secret',
      endpoint: 'https://api2.transloadit.com',
    })

    const res = await client.mintBearerToken({
      aud: 'mcp',
      scope: ['assemblies:write', 'templates:read'],
    })

    expect(res.access_token).toBe('abc')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api2.transloadit.com/token',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Transloadit-Client': `node-sdk:${packageJson.version}`,
        }),
      }),
    )
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api2.transloadit.com/token')

    const params = new URLSearchParams(init.body as string)
    expect(params.get('aud')).toBe('mcp')
    expect(params.get('scope')).toBe('assemblies:write templates:read')
  })

  it('keeps the configured client identity when minting a token', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () =>
      Response.json({ access_token: 'abc', token_type: 'Bearer', expires_in: 21600 }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const client = new Transloadit({
      authKey: 'key',
      authSecret: 'secret',
      clientName: 'mcp-server:0.6.0',
    })

    await client.mintBearerToken()

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api2.transloadit.com/token',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Transloadit-Client': 'mcp-server:0.6.0' }),
      }),
    )
  })
})

describe('mintBearerTokenWithCredentials', () => {
  it('uses the SDK package version for direct helper calls', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () =>
      Response.json({ access_token: 'abc', token_type: 'Bearer', expires_in: 21600 }),
    )
    vi.stubGlobal('fetch', fetchSpy)

    await mintBearerTokenWithCredentials({ authKey: 'key', authSecret: 'secret' })

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api2.transloadit.com/token',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Transloadit-Client': `node-sdk:${packageJson.version}`,
        }),
      }),
    )
  })
})
