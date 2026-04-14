import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runSig } from '../../../src/cli/commands/auth.ts'
import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

const originalCwd = process.cwd()

const resetExitCode = () => {
  process.exitCode = undefined
}

function createCliFixture(): {
  cleanup: () => void
  credentialsFilePath: string
  cwd: string
  home: string
  root: string
} {
  const root = mkdtempSync(path.join(tmpdir(), 'transloadit-cli-auth-'))
  const home = path.join(root, 'home')
  const cwd = path.join(root, 'workspace')
  const credentialsDir = path.join(home, '.transloadit')
  const credentialsFilePath = path.join(credentialsDir, 'credentials')

  mkdirSync(credentialsDir, { recursive: true })
  mkdirSync(cwd, { recursive: true })

  return {
    root,
    home,
    cwd,
    credentialsFilePath,
    cleanup: () => {
      rmSync(root, { recursive: true, force: true })
    },
  }
}

afterEach(() => {
  process.chdir(originalCwd)
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  resetExitCode()
})

describe('cli credential resolution', () => {
  it('uses ~/.transloadit/credentials when shell env and .env are absent', async () => {
    const fixture = createCliFixture()
    writeFileSync(
      fixture.credentialsFilePath,
      ['TRANSLOADIT_KEY=home-key', 'TRANSLOADIT_SECRET=home-secret'].join('\n'),
    )

    vi.stubEnv('HOME', fixture.home)
    process.chdir(fixture.cwd)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await runSig({
        providedInput: JSON.stringify({ auth: { expires: '2025-01-03T00:00:00.000Z' } }),
      })

      expect(stderrSpy).not.toHaveBeenCalled()
      const output = JSON.parse(`${stdoutSpy.mock.calls[0]?.[0]}`.trim())
      const params = JSON.parse(output.params as string)
      expect(params.auth?.key).toBe('home-key')
      expect(process.exitCode).toBeUndefined()
    } finally {
      fixture.cleanup()
    }
  })

  it('prefers the current working directory .env over ~/.transloadit/credentials', async () => {
    const fixture = createCliFixture()
    writeFileSync(
      fixture.credentialsFilePath,
      ['TRANSLOADIT_KEY=home-key', 'TRANSLOADIT_SECRET=home-secret'].join('\n'),
    )
    writeFileSync(
      path.join(fixture.cwd, '.env'),
      ['TRANSLOADIT_KEY=dotenv-key', 'TRANSLOADIT_SECRET=dotenv-secret'].join('\n'),
    )

    vi.stubEnv('HOME', fixture.home)
    process.chdir(fixture.cwd)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await runSig({
        providedInput: JSON.stringify({ auth: { expires: '2025-01-03T00:00:00.000Z' } }),
      })

      const output = JSON.parse(`${stdoutSpy.mock.calls[0]?.[0]}`.trim())
      const params = JSON.parse(output.params as string)
      expect(params.auth?.key).toBe('dotenv-key')
    } finally {
      fixture.cleanup()
    }
  })

  it('supports TRANSLOADIT_CREDENTIALS_FILE as an override', async () => {
    const fixture = createCliFixture()
    const explicitFilePath = path.join(fixture.root, 'custom.env')
    writeFileSync(
      explicitFilePath,
      ['TRANSLOADIT_KEY=custom-key', 'TRANSLOADIT_SECRET=custom-secret'].join('\n'),
    )

    vi.stubEnv('HOME', fixture.home)
    vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', explicitFilePath)
    process.chdir(fixture.cwd)

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await runSig({
        providedInput: JSON.stringify({ auth: { expires: '2025-01-03T00:00:00.000Z' } }),
      })

      const output = JSON.parse(`${stdoutSpy.mock.calls[0]?.[0]}`.trim())
      const params = JSON.parse(output.params as string)
      expect(params.auth?.key).toBe('custom-key')
    } finally {
      fixture.cleanup()
    }
  })

  it('uses TRANSLOADIT_AUTH_TOKEN from ~/.transloadit/credentials for authenticated commands', async () => {
    const fixture = createCliFixture()
    writeFileSync(
      fixture.credentialsFilePath,
      ['TRANSLOADIT_AUTH_TOKEN=home-token', 'TRANSLOADIT_ENDPOINT=https://api2.example.test'].join(
        '\n',
      ),
    )

    vi.stubEnv('HOME', fixture.home)
    process.chdir(fixture.cwd)

    const listSpy = vi
      .spyOn(Transloadit.prototype, 'listTemplates')
      .mockImplementation(function () {
        expect(Reflect.get(this, '_authToken')).toBe('home-token')
        expect(Reflect.get(this, '_authKey')).toBe('')
        expect(Reflect.get(this, '_endpoint')).toBe('https://api2.example.test')
        return Promise.resolve({ items: [], count: 0 })
      })

    vi.spyOn(OutputCtl.prototype, 'print').mockImplementation(() => {})
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    try {
      await main(['templates', 'list'])

      expect(listSpy).toHaveBeenCalled()
      expect(process.exitCode).toBeUndefined()
    } finally {
      fixture.cleanup()
    }
  })

  it('uses TRANSLOADIT_ENDPOINT from ~/.transloadit/credentials when minting tokens', async () => {
    const fixture = createCliFixture()
    writeFileSync(
      fixture.credentialsFilePath,
      [
        'TRANSLOADIT_KEY=home-key',
        'TRANSLOADIT_SECRET=home-secret',
        'TRANSLOADIT_ENDPOINT=https://api2.example.test',
      ].join('\n'),
    )

    vi.stubEnv('HOME', fixture.home)
    process.chdir(fixture.cwd)

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

    try {
      await main(['auth', 'token'])

      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://api2.example.test/token')
      expect(process.exitCode).toBeUndefined()
    } finally {
      fixture.cleanup()
    }
  })
})
