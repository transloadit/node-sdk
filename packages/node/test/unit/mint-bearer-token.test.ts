import { afterEach, describe, expect, it, vi } from 'vitest'

import { Transloadit } from '../../src/Transloadit.ts'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Transloadit.mintBearerToken', () => {
  it('does not treat a 127-prefixed domain as a loopback host', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = new Transloadit({
      authKey: 'key',
      authSecret: 'secret',
      endpoint: 'http://127.attacker.com',
    })

    await expect(client.mintBearerToken()).rejects.toThrow(
      'Refusing to send credentials to an insecure bearer token endpoint.',
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a contract token response without scope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ access_token: 'abc', token_type: 'Bearer', expires_in: 21600 }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      ),
    )
    const client = new Transloadit({ authKey: 'key', authSecret: 'secret' })

    await expect(client.mintBearerToken()).rejects.toThrow('Bearer token response omitted scope.')
  })

  it('issues the token with the API2 contract audience default', async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: 'abc',
            token_type: 'Bearer',
            expires_in: 21600,
            scope: 'assemblies:read',
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

    const response = await client.mintBearerToken({ scope: 'assemblies:read' })

    expect(response.access_token).toBe('abc')
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api2.transloadit.com/token')
    expect(init.redirect).toBe('error')
    expect(init.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('key:secret').toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    })
    const params = new URLSearchParams(init.body as string)
    expect(params.get('grant_type')).toBe('client_credentials')
    expect(params.get('aud')).toBe('api2')
    expect(params.get('scope')).toBe('assemblies:read')
  })

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
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api2.transloadit.com/token')

    const params = new URLSearchParams(init.body as string)
    expect(params.get('aud')).toBe('mcp')
    expect(params.get('scope')).toBe('assemblies:write templates:read')
  })
})
