import { afterEach, describe, expect, it, vi } from 'vitest'
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
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api2.transloadit.com/token')

    const params = new URLSearchParams(init.body as string)
    expect(params.get('aud')).toBe('mcp')
    expect(params.get('scope')).toBe('assemblies:write templates:read')
  })
})
