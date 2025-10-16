import { mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { main, runSmartSig, shouldRunCli } from '../../src/cli.ts'
import { Transloadit } from '../../src/Transloadit.ts'

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

  it('outputs Smart CDN URL built from stdin params', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const params = {
      workspace: 'workspace',
      template: 'template',
      input: 'file.jpg',
      expire_at_ms: 1732550672867,
      url_params: {
        width: 100,
        enabled: true,
        tag: 'demo',
        colors: ['red', 'blue'],
      },
    }

    await runSmartSig(JSON.stringify(params))

    expect(stderrSpy).not.toHaveBeenCalled()
    expect(stdoutSpy).toHaveBeenCalledTimes(1)
    const output = `${stdoutSpy.mock.calls[0]?.[0]}`.trim()

    const client = new Transloadit({ authKey: 'key', authSecret: 'secret' })
    const expected = client.getSignedSmartCDNUrl({
      workspace: 'workspace',
      template: 'template',
      input: 'file.jpg',
      expiresAt: 1732550672867,
      urlParams: {
        width: 100,
        enabled: true,
        tag: 'demo',
        colors: ['red', 'blue'],
      },
    })
    expect(output).toBe(expected)
    expect(process.exitCode).toBeUndefined()
  })

  it('filters unsupported url_params entries', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const params = {
      workspace: 'workspace',
      template: 'template',
      input: 'file.jpg',
      url_params: {
        width: 100,
        skip: null,
        nested: { invalid: true },
        mixed: ['one', null, 2],
      },
    }

    await runSmartSig(JSON.stringify(params))

    const output = `${stdoutSpy.mock.calls[0]?.[0]}`.trim()
    const client = new Transloadit({ authKey: 'key', authSecret: 'secret' })
    const expected = client.getSignedSmartCDNUrl({
      workspace: 'workspace',
      template: 'template',
      input: 'file.jpg',
      urlParams: {
        width: 100,
        mixed: ['one', 2],
      },
    })
    expect(output).toBe(expected)
  })

  it('fails when credentials are missing', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await runSmartSig(
      JSON.stringify({ workspace: 'workspace', template: 'template', input: 'file.jpg' }),
    )

    expect(stdoutSpy).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalledWith(
      'Missing credentials. Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET environment variables.',
    )
    expect(process.exitCode).toBe(1)
  })

  it('fails when stdin is empty', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await runSmartSig('   ')

    expect(stdoutSpy).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalledWith(
      'Missing params provided via stdin. Expected a JSON object with workspace, template, input, and optional Smart CDN parameters.',
    )
    expect(process.exitCode).toBe(1)
  })

  it('fails when stdin is not valid JSON', async () => {
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

  it('fails when required fields are missing', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await runSmartSig('{}')

    expect(stderrSpy).toHaveBeenCalled()
    const message = `${stderrSpy.mock.calls[0]?.[0]}`
    expect(message).toContain('workspace:')
    expect(message).toContain('template:')
    expect(message).toContain('input:')
    expect(process.exitCode).toBe(1)
  })

  it('fails when expire_at_ms is not numeric', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await runSmartSig(
      JSON.stringify({
        workspace: 'workspace',
        template: 'template',
        input: 'file.jpg',
        expire_at_ms: 'not-a-number',
      }),
    )

    expect(stderrSpy).toHaveBeenCalledWith('Invalid params: expire_at_ms must be a number.')
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
