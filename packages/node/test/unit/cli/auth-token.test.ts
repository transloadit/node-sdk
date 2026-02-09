import { afterEach, describe, expect, it, vi } from 'vitest'
import { main } from '../../../src/cli.ts'

const resetExitCode = () => {
  process.exitCode = undefined
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  resetExitCode()
})

describe('cli auth token', () => {
  it('prints the token JSON to stdout and nothing else', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: 'abc',
            token_type: 'Bearer',
            expires_in: 21600,
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
    )
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch)

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
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ access_token: 'abc', token_type: 'Bearer', expires_in: 1 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch)

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token', '--endpoint', 'https://api2.transloadit.com'])

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('https://api2.transloadit.com/token')
    expect(init.method).toBe('POST')
    expect(init.redirect).toBe('error')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    )
    expect((init.headers as Record<string, string>).Accept).toBe('application/json')

    const auth = (init.headers as Record<string, string>).Authorization
    expect(auth).toMatch(/^Basic /)

    expect(init.body).toBe('grant_type=client_credentials&aud=mcp')
  })

  it('normalizes endpoints that already include /token', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ access_token: 'abc', token_type: 'Bearer', expires_in: 1 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch)

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['auth', 'token', '--endpoint', 'https://api2.transloadit.com/token'])

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api2.transloadit.com/token')
  })

  it('writes errors to stderr and exits 1 on API errors', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: 'TOKEN_INVALID_AUDIENCE', message: 'Invalid audience' }),
          {
            status: 400,
            headers: { 'content-type': 'application/json' },
          },
        ),
    )
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch)

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
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

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

  it('fails with a friendly error if endpoint is invalid', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

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

  it('fails when credentials are missing', async () => {
    const originalKey = process.env.TRANSLOADIT_KEY
    const originalSecret = process.env.TRANSLOADIT_SECRET
    const originalAuthKey = process.env.TRANSLOADIT_AUTH_KEY
    const originalAuthSecret = process.env.TRANSLOADIT_AUTH_SECRET
    delete process.env.TRANSLOADIT_KEY
    delete process.env.TRANSLOADIT_SECRET
    delete process.env.TRANSLOADIT_AUTH_KEY
    delete process.env.TRANSLOADIT_AUTH_SECRET

    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await main(['auth', 'token'])

      expect(stderrSpy).toHaveBeenCalled()
      const stderrText = stderrSpy.mock.calls.map((call) => call.map(String).join(' ')).join('\n')
      expect(stderrText).toContain('Missing credentials')
      expect(process.exitCode).toBe(1)
    } finally {
      if (originalKey != null) process.env.TRANSLOADIT_KEY = originalKey
      else delete process.env.TRANSLOADIT_KEY
      if (originalSecret != null) process.env.TRANSLOADIT_SECRET = originalSecret
      else delete process.env.TRANSLOADIT_SECRET
      if (originalAuthKey != null) process.env.TRANSLOADIT_AUTH_KEY = originalAuthKey
      else delete process.env.TRANSLOADIT_AUTH_KEY
      if (originalAuthSecret != null) process.env.TRANSLOADIT_AUTH_SECRET = originalAuthSecret
      else delete process.env.TRANSLOADIT_AUTH_SECRET
    }
  })
})
