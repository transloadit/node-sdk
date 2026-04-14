import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lint as lintAssemblies } from '../../../src/cli/commands/assemblies.ts'
import { runSig, runSmartSig } from '../../../src/cli/commands/auth.ts'
import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main, shouldRunCli } from '../../../src/cli.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

const originalCwd = process.cwd()

const resetExitCode = () => {
  process.exitCode = undefined
}

function createIsolatedCliFixture(): {
  cleanup: () => void
  credentialsFilePath: string
  cwd: string
} {
  const root = mkdtempSync(path.join(tmpdir(), 'transloadit-cli-credentials-'))
  const cwd = path.join(root, 'workspace')
  const credentialsFilePath = path.join(root, 'credentials')

  mkdirSync(cwd, { recursive: true })
  writeFileSync(credentialsFilePath, '')

  return {
    cwd,
    credentialsFilePath,
    cleanup: () => {
      rmSync(root, { recursive: true, force: true })
    },
  }
}

function clearAmbientTransloaditEnv(): void {
  vi.stubEnv('TRANSLOADIT_KEY', '')
  vi.stubEnv('TRANSLOADIT_SECRET', '')
  vi.stubEnv('TRANSLOADIT_AUTH_KEY', '')
  vi.stubEnv('TRANSLOADIT_AUTH_SECRET', '')
  vi.stubEnv('TRANSLOADIT_AUTH_TOKEN', '')
  vi.stubEnv('TRANSLOADIT_ENDPOINT', '')
}

afterEach(() => {
  process.chdir(originalCwd)
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  resetExitCode()
})

describe('cli smart_sig', () => {
  it('recognizes symlinked invocation paths', () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'transloadit-cli-'))
    const symlinkTarget = fileURLToPath(new URL('../../../src/cli.ts', import.meta.url))
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

    await runSmartSig({ providedInput: JSON.stringify(params) })

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
      expire_at_ms: 1732550672867,
      url_params: {
        width: 100,
        skip: null,
        nested: { invalid: true },
        mixed: ['one', null, 2],
      },
    }

    await runSmartSig({ providedInput: JSON.stringify(params) })

    const output = `${stdoutSpy.mock.calls[0]?.[0]}`.trim()
    const client = new Transloadit({ authKey: 'key', authSecret: 'secret' })
    const expected = client.getSignedSmartCDNUrl({
      workspace: 'workspace',
      template: 'template',
      input: 'file.jpg',
      expiresAt: 1732550672867,
      urlParams: {
        width: 100,
        mixed: ['one', 2],
      },
    })
    expect(output).toBe(expected)
  })

  it('fails when credentials are missing', async () => {
    const fixture = createIsolatedCliFixture()
    clearAmbientTransloaditEnv()
    vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', fixture.credentialsFilePath)
    process.chdir(fixture.cwd)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await runSmartSig({
        providedInput: JSON.stringify({
          workspace: 'workspace',
          template: 'template',
          input: 'file.jpg',
        }),
      })

      expect(stdoutSpy).not.toHaveBeenCalled()
      expect(stderrSpy).toHaveBeenCalled()
      const message = `${stderrSpy.mock.calls[0]?.[0]}`
      expect(message).toContain('Missing credentials.')
      expect(message).toContain('1. Shell env:')
      expect(message).toContain('2. Current directory .env:')
      expect(message).toContain(`3. Credentials file: ${fixture.credentialsFilePath}`)
      expect(process.exitCode).toBe(1)
    } finally {
      fixture.cleanup()
    }
  })

  it('fails when stdin is empty', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await runSmartSig({ providedInput: '   ' })

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

    await runSmartSig({ providedInput: 'this is not json' })

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

    await runSmartSig({ providedInput: '[]' })

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

    await runSmartSig({ providedInput: '{}' })

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

    await runSmartSig({
      providedInput: JSON.stringify({
        workspace: 'workspace',
        template: 'template',
        input: 'file.jpg',
        expire_at_ms: 'not-a-number',
      }),
    })

    expect(stderrSpy).toHaveBeenCalledWith('Invalid params: expire_at_ms must be a number.')
    expect(process.exitCode).toBe(1)
  })
})

describe('cli sig', () => {
  it('overwrites auth key with env credentials', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const expires = '2025-01-03T00:00:00.000Z'
    await runSig({ providedInput: JSON.stringify({ auth: { key: 'other', expires } }) })

    expect(stderrSpy).not.toHaveBeenCalled()
    const output = JSON.parse(`${stdoutSpy.mock.calls[0]?.[0]}`.trim())
    const params = JSON.parse(output.params as string)
    expect(params.auth?.key).toBe('key')
    expect(params.auth?.expires).toBe(expires)
    expect(output.signature).toMatch(/^sha384:/)
  })

  it('supports algorithm override', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await runSig({
      providedInput: JSON.stringify({ auth: { expires: '2025-01-02T00:00:00.000Z' } }),
      algorithm: 'sha256',
    })

    const output = JSON.parse(`${stdoutSpy.mock.calls[0]?.[0]}`.trim())
    const client = new Transloadit({ authKey: 'key', authSecret: 'secret' })
    const expected = client.calcSignature(
      { auth: { expires: '2025-01-02T00:00:00.000Z' } },
      'sha256',
    )
    expect(output).toEqual(expected)
  })

  it('allows empty params object', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await runSig({ providedInput: '   ' })

    const output = JSON.parse(`${stdoutSpy.mock.calls[0]?.[0]}`.trim())
    const params = JSON.parse(output.params as string)
    expect(params.auth?.key).toBe('key')
    expect(params.auth?.expires).toBeTypeOf('string')
  })

  it('fails when credentials are missing', async () => {
    const fixture = createIsolatedCliFixture()
    clearAmbientTransloaditEnv()
    vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', fixture.credentialsFilePath)
    process.chdir(fixture.cwd)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await runSig({ providedInput: '{}' })

      expect(stdoutSpy).not.toHaveBeenCalled()
      expect(stderrSpy).toHaveBeenCalled()
      const message = `${stderrSpy.mock.calls[0]?.[0]}`
      expect(message).toContain('Missing credentials.')
      expect(message).toContain('1. Shell env:')
      expect(message).toContain('2. Current directory .env:')
      expect(message).toContain(`3. Credentials file: ${fixture.credentialsFilePath}`)
      expect(process.exitCode).toBe(1)
    } finally {
      fixture.cleanup()
    }
  })

  it('fails when stdin is not valid JSON', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await runSig({ providedInput: 'not json' })

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

    await runSig({ providedInput: '[]' })

    expect(stdoutSpy).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalledWith(
      'Invalid params provided via stdin. Expected a JSON object.',
    )
    expect(process.exitCode).toBe(1)
  })
})

describe('cli assemblies lint', () => {
  it('prints fixed JSON to stdout when reading from stdin', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const output = new OutputCtl()
    const exitCode = await lintAssemblies(output, null, {
      steps: '-',
      fix: true,
      providedInput: '{}',
      json: false,
    })

    expect(exitCode).toBe(0)
    expect(stdoutSpy).toHaveBeenCalledTimes(1)
    const written = `${stdoutSpy.mock.calls[0]?.[0]}`.trim()
    expect(JSON.parse(written)).toEqual({
      ':original': {
        robot: '/upload/handle',
      },
    })
  })
})

describe('cli help', () => {
  it('prints usage when --help is provided', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    await main(['--help'])

    expect(stdoutSpy).toHaveBeenCalled()
    const message = stdoutSpy.mock.calls.map((call) => `${call[0]}`).join('')
    expect(message).toContain('Transloadit CLI')
  })

  it('prints usage when --help is provided even if the current directory .env is unreadable', async () => {
    const fixture = createIsolatedCliFixture()
    mkdirSync(path.join(fixture.cwd, '.env'))
    process.chdir(fixture.cwd)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await main(['--help'])

      const message = stdoutSpy.mock.calls.map((call) => `${call[0]}`).join('')
      expect(stderrSpy).not.toHaveBeenCalled()
      expect(message).toContain('Transloadit CLI')
    } finally {
      fixture.cleanup()
    }
  })
})

describe('cli docs robots', () => {
  it('lists robots as JSON', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['docs', 'robots', 'list', '--search', 'import', '--limit', '2', '-j'])

    expect(logSpy).toHaveBeenCalled()
    const output = `${logSpy.mock.calls[0]?.[0]}`.trim()
    const payload = JSON.parse(output) as { robots?: unknown }
    expect(Array.isArray(payload.robots)).toBe(true)
  })

  it('gets full docs for multiple robots', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await main(['docs', 'robots', 'get', '/http/import,/image/resize', '-j'])

    expect(logSpy).toHaveBeenCalled()
    const output = `${logSpy.mock.calls[0]?.[0]}`.trim()
    const payload = JSON.parse(output) as { robots?: unknown; notFound?: unknown }
    expect(Array.isArray(payload.robots)).toBe(true)
    expect(Array.isArray(payload.notFound)).toBe(true)
  })
})
