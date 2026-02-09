import { afterEach, describe, expect, it, vi } from 'vitest'
import { runToken } from '../../../src/cli/commands/auth.ts'

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

    await runToken({ endpoint: 'https://api2.transloadit.com', aud: 'mcp' })

    expect(stderrSpy).not.toHaveBeenCalled()
    expect(stdoutSpy).toHaveBeenCalledTimes(1)
    expect(`${stdoutSpy.mock.calls[0]?.[0]}`).toBe(
      '{"access_token":"abc","token_type":"Bearer","expires_in":21600}\n',
    )
    expect(process.exitCode).toBeUndefined()
  })

  it('defaults aud to mcp and sends form-encoded payload', async () => {
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

    await runToken({ endpoint: 'https://api2.transloadit.com' })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('https://api2.transloadit.com/token')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    )
    expect((init.headers as Record<string, string>).Accept).toBe('application/json')

    const auth = (init.headers as Record<string, string>).Authorization
    expect(auth).toMatch(/^Basic /)

    expect(init.body).toBe('grant_type=client_credentials&aud=mcp')
  })

  it('writes errors to stderr and sets exit code 1 on API errors', async () => {
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

    await runToken({ endpoint: 'https://api2.transloadit.com', aud: 'nope' })

    expect(stdoutSpy).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalled()
    expect(`${stderrSpy.mock.calls[0]?.[0]}`).toContain('TOKEN_INVALID_AUDIENCE')
    expect(process.exitCode).toBe(1)
  })
})
