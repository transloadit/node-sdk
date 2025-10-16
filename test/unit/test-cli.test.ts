import { mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { main, runSmartSig, shouldRunCli } from '../../src/cli.ts'
import { Transloadit } from '../../src/Transloadit.ts'

const mockedExpiresDate = '2025-01-01T00:00:00.000Z'
const mockExpires = () =>
  vi
    .spyOn(Transloadit.prototype as unknown as { _getExpiresDate: () => string }, '_getExpiresDate')
    .mockReturnValue(mockedExpiresDate)

const resetExitCode = () => {
  process.exitCode = undefined
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  resetExitCode()
})

describe('cli smart_sig', () => {
  it('recognizes symlinked invocation paths', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'transloadit-cli-'))
    const symlinkTarget = fileURLToPath(new URL('../../src/cli.ts', import.meta.url))
    const symlinkPath = path.join(tmpDir, 'transloadit')

    symlinkSync(symlinkTarget, symlinkPath)
    try {
      expect(shouldRunCli(symlinkPath)).toBe(true)
    } finally {
      rmSync(symlinkPath)
      rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('overwrites auth key with env credentials', async () => {
    mockExpires()
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const expires = '2025-01-03T00:00:00.000Z'
    await runSmartSig(JSON.stringify({ auth: { key: 'other', expires } }))

    expect(stderrSpy).not.toHaveBeenCalled()
    expect(stdoutSpy).toHaveBeenCalledTimes(1)
    const output = JSON.parse(`${stdoutSpy.mock.calls[0]?.[0]}`.trim())
    const params = JSON.parse(output.params)

    expect(params.auth?.key).toBe('key')
    expect(params.auth?.expires).toBe(expires)
  })

  it('prints signature JSON built from stdin params', async () => {
    mockExpires()
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const params = { auth: { expires: '2025-01-02T00:00:00.000Z' } }
    await runSmartSig(JSON.stringify(params))

    expect(stderrSpy).not.toHaveBeenCalled()
    expect(stdoutSpy).toHaveBeenCalledTimes(1)
    const output = stdoutSpy.mock.calls[0]?.[0]
    const parsed = JSON.parse(`${output}`.trim())

    const client = new Transloadit({ authKey: 'key', authSecret: 'secret' })
    const expected = client.calcSignature({ auth: { expires: '2025-01-02T00:00:00.000Z' } })
    expect(parsed).toEqual(expected)
    expect(process.exitCode).toBeUndefined()
  })

  it('fails when credentials are missing', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await runSmartSig('{}')

    expect(stdoutSpy).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalledWith(
      'Missing credentials. Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET environment variables.',
    )
    expect(process.exitCode).toBe(1)
  })

  it('fails when stdin is not valid JSON', async () => {
    mockExpires()
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await runSmartSig('this is not json')

    expect(stdoutSpy).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalled()
    expect(stderrSpy.mock.calls[0]?.[0]).toContain('Failed to parse JSON from stdin')
    expect(process.exitCode).toBe(1)
  })

  it('fails when params are not an object', async () => {
    mockExpires()
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await runSmartSig('[]')

    expect(stdoutSpy).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalledWith(
      'Invalid params provided via stdin. Expected a JSON object.',
    )
    expect(process.exitCode).toBe(1)
  })

  it('prints usage when no command is provided', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await main([])

    expect(stderrSpy).not.toHaveBeenCalled()
    expect(stdoutSpy).toHaveBeenCalled()
    const message = `${stdoutSpy.mock.calls[0]?.[0]}`
    expect(message).toContain('Usage:')
    expect(message).toContain('npx transloadit smart_sig')
    expect(process.exitCode).toBe(1)
  })
})
