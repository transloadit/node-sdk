import { afterEach, describe, expect, it, vi } from 'vitest'
import { main } from '../../../src/cli.ts'

const resetExitCode = () => {
  process.exitCode = undefined
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  resetExitCode()
})

describe('cli auth token', () => {
  const stubCreds = (): void => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')
  }

  const stubFetchJson = (payload: unknown, status = 200): ReturnType<typeof vi.fn> => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch)
    return fetchSpy
  }

  const parseFormBody = (body: unknown): URLSearchParams => {
    expect(typeof body).toBe('string')
    return new URLSearchParams(body as string)
  }

  it('prints the token JSON to stdout and nothing else', async () => {
    stubCreds()

    stubFetchJson({
      access_token: 'abc',
      token_type: 'Bearer',
      expires_in: 21600,
    })

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token', '--aud', 'mcp', '--endpoint', 'https://api2.transloadit.com'])

    expect(stderrSpy).not.toHaveBeenCalled()
    expect(stdoutSpy).toHaveBeenCalledTimes(1)
    expect(`${stdoutSpy.mock.calls[0]?.[0]}`).toBe(
      '{"access_token":"abc","token_type":"Bearer","expires_in":21600}\n',
    )
    expect(process.exitCode).toBeUndefined()
  })

  it('defaults aud to mcp and sends form-encoded payload (no redirects)', async () => {
    stubCreds()

    const fetchSpy = stubFetchJson({ access_token: 'abc', token_type: 'Bearer', expires_in: 1 })

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token', '--endpoint', 'https://api2.transloadit.com'])

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('https://api2.transloadit.com/token')
    expect(init.method).toBe('POST')
    expect(init.redirect).toBe('error')
    expect(init.signal).toBeDefined()
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    )
    expect((init.headers as Record<string, string>).Accept).toBe('application/json')

    const auth = (init.headers as Record<string, string>).Authorization
    expect(auth).toMatch(/^Basic /)

    const params = parseFormBody(init.body)
    expect(params.get('grant_type')).toBe('client_credentials')
    expect(params.get('aud')).toBe('mcp')
    expect(params.get('scope')).toBeNull()
  })

  it('treats whitespace-only --aud as mcp', async () => {
    stubCreds()

    const fetchSpy = stubFetchJson({ access_token: 'abc', token_type: 'Bearer', expires_in: 1 })

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token', '--aud', '   ', '--endpoint', 'https://api2.transloadit.com'])

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    const params = parseFormBody(init.body)
    expect(params.get('aud')).toBe('mcp')
  })

  it('sends scope when provided (comma-separated)', async () => {
    stubCreds()

    const fetchSpy = stubFetchJson({ access_token: 'abc', token_type: 'Bearer', expires_in: 1 })

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await main([
      'auth',
      'token',
      '--endpoint',
      'https://api2.transloadit.com',
      '--scope',
      'assemblies:write,templates:read',
    ])

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    const params = parseFormBody(init.body)
    expect(params.get('scope')).toBe('assemblies:write templates:read')
  })

  it('normalizes endpoints that already include /token', async () => {
    stubCreds()

    const fetchSpy = stubFetchJson({ access_token: 'abc', token_type: 'Bearer', expires_in: 1 })

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token', '--endpoint', 'https://api2.transloadit.com/token'])

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api2.transloadit.com/token')
  })

  it('writes errors to stderr and exits 1 on API errors', async () => {
    stubCreds()

    stubFetchJson({ error: 'TOKEN_INVALID_AUDIENCE', message: 'Invalid audience' }, 400)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token', '--aud', 'nope', '--endpoint', 'https://api2.transloadit.com'])

    expect(stdoutSpy).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalled()
    const stderrText = stderrSpy.mock.calls.map((call) => call.map(String).join(' ')).join('\n')
    expect(stderrText).toContain('TOKEN_INVALID_AUDIENCE')
    expect(process.exitCode).toBe(1)
  })

  it('refuses to send credentials to non-https endpoints (except localhost)', async () => {
    stubCreds()

    const fetchSpy = vi.fn(async () => new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token', '--endpoint', 'http://example.com'])

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(stdoutSpy).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalled()
    const stderrText = stderrSpy.mock.calls.map((call) => call.map(String).join(' ')).join('\n')
    expect(stderrText).toContain('Refusing to send credentials')
    expect(process.exitCode).toBe(1)
  })

  it('allows http://localhost for local development', async () => {
    stubCreds()

    const fetchSpy = stubFetchJson({ access_token: 'abc', token_type: 'Bearer', expires_in: 1 })

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token', '--endpoint', 'http://localhost:3000'])

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:3000/token')
    expect(process.exitCode).toBeUndefined()
  })

  it('allows http://127.0.0.0/8 for local development', async () => {
    stubCreds()

    const fetchSpy = stubFetchJson({ access_token: 'abc', token_type: 'Bearer', expires_in: 1 })

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token', '--endpoint', 'http://127.0.0.2:3000'])

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://127.0.0.2:3000/token')
    expect(process.exitCode).toBeUndefined()
  })

  it('uses TRANSLOADIT_ENDPOINT when --endpoint is not provided', async () => {
    stubCreds()
    vi.stubEnv('TRANSLOADIT_ENDPOINT', 'https://api2.transloadit.com')

    const fetchSpy = stubFetchJson({ access_token: 'abc', token_type: 'Bearer', expires_in: 1 })

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token'])

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api2.transloadit.com/token')
  })

  it('fails with a friendly error if endpoint is invalid', async () => {
    stubCreds()

    const fetchSpy = vi.fn(async () => new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch)

    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token', '--endpoint', 'not-a-url'])

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalled()
    const stderrText = stderrSpy.mock.calls.map((call) => call.map(String).join(' ')).join('\n')
    expect(stderrText).toContain('Invalid endpoint URL')
    expect(process.exitCode).toBe(1)
  })

  it('exits 1 if the success response is missing access_token', async () => {
    stubCreds()

    const fetchSpy = stubFetchJson({}, 200)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token', '--endpoint', 'https://api2.transloadit.com'])

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(stdoutSpy).not.toHaveBeenCalled()
    const stderrText = stderrSpy.mock.calls.map((call) => call.map(String).join(' ')).join('\n')
    expect(stderrText).toContain('access_token')
    expect(process.exitCode).toBe(1)
  })

  it('fails when credentials are missing', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', '')
    vi.stubEnv('TRANSLOADIT_SECRET', '')
    vi.stubEnv('TRANSLOADIT_AUTH_KEY', '')
    vi.stubEnv('TRANSLOADIT_AUTH_SECRET', '')

    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token'])

    expect(stderrSpy).toHaveBeenCalled()
    const stderrText = stderrSpy.mock.calls.map((call) => call.map(String).join(' ')).join('\n')
    expect(stderrText).toContain('Missing credentials')
    expect(process.exitCode).toBe(1)
  })
})
