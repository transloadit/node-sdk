import {
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises'
import { homedir, tmpdir, userInfo } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest'

import {
  getConfiguredCredentialsFilePath,
  readCliInput,
  resolveCliConfig,
} from '../../../src/cli/helpers.ts'
import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>()
  return { ...original, open: vi.fn(original.open), rm: vi.fn(original.rm) }
})

vi.mock('../../../src/cli/helpers.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/cli/helpers.ts')>()
  return {
    ...original,
    readCliInput: vi.fn(original.readCliInput),
    resolveCliConfig: vi.fn(original.resolveCliConfig),
  }
})

vi.mock('node:os', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:os')>()
  return { ...original, homedir: vi.fn(original.homedir) }
})

const originalCwd = process.cwd()
const stdoutListeners = process.stdout.listeners('error')
const stderrListeners = process.stderr.listeners('error')
let directory: string

beforeEach(async () => {
  vi.mocked(readCliInput).mockClear()
  directory = await mkdtemp(join(tmpdir(), 'img-onboarding-'))
  process.chdir(directory)
  vi.mocked(homedir).mockReturnValue(join(directory, 'fake-home'))
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', join(directory, 'credentials'))
  for (const name of [
    'TRANSLOADIT_KEY',
    'TRANSLOADIT_SECRET',
    'TRANSLOADIT_AUTH_KEY',
    'TRANSLOADIT_AUTH_SECRET',
    'TRANSLOADIT_AUTH_TOKEN',
  ])
    vi.stubEnv(name, '')
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  vi.spyOn(OutputCtl.prototype, 'error').mockImplementation(() => {})
  vi.spyOn(OutputCtl.prototype, 'notice').mockImplementation(() => {})
  vi.spyOn(OutputCtl.prototype, 'print').mockImplementation(() => {})
  vi.spyOn(Transloadit.prototype, 'listTemplates').mockResolvedValue({ items: [], count: 0 })
  vi.spyOn(Transloadit.prototype, 'listPublicStoragePrefixes').mockResolvedValue({
    ok: 'STORAGE_PUBLIC_PREFIXES_LISTED',
    public_prefixes: [],
  })
  vi.mocked(readCliInput).mockResolvedValue({
    content: 'TRANSLOADIT_KEY=write-key\nTRANSLOADIT_SECRET=hidden-secret\n',
    isStdin: true,
  })
})

afterEach(async () => {
  process.chdir(originalCwd)
  process.exitCode = undefined
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  for (const listener of process.stdout.listeners('error')) {
    if (!stdoutListeners.includes(listener)) process.stdout.off('error', listener)
  }
  for (const listener of process.stderr.listeners('error')) {
    if (!stderrListeners.includes(listener)) process.stderr.off('error', listener)
  }
  await rm(directory, { force: true, recursive: true })
})

test('auth login saves owner-only credentials in the existing lookup without leaking secrets', async () => {
  await main(['auth', 'login', '--stdin'])
  expect(process.exitCode).toBeUndefined()
  expect(Transloadit.prototype.listTemplates).toHaveBeenCalledExactlyOnceWith({ pagesize: 1 })
  expect((await stat('credentials')).mode & 0o777).toBe(0o600)
  expect(resolveCliConfig().credentials).toEqual({
    authKey: 'write-key',
    authSecret: 'hidden-secret',
  })
  expect(await readdir(directory)).toEqual(['credentials'])
  expect(JSON.stringify(vi.mocked(OutputCtl.prototype.print).mock.calls)).not.toContain(
    'hidden-secret',
  )
})

test.each([
  false,
  true,
])('imported credentials require explicit revocation consent (%s)', async (revoke) => {
  const revocation = vi
    .spyOn(Transloadit.prototype, 'revokeOwnAuthKey')
    .mockResolvedValue(undefined)
  // Input cannot relabel an imported application key as a disposable browser-login key.
  vi.mocked(readCliInput).mockResolvedValue({
    content:
      'TRANSLOADIT_KEY=write-key\nTRANSLOADIT_SECRET=hidden-secret\nTRANSLOADIT_LOGIN_METHOD=device\n',
    isStdin: true,
  })
  await main(['auth', 'login', '--stdin'])
  expect(process.exitCode).toBeUndefined()
  await main(['auth', 'logout', ...(revoke ? ['--revoke'] : [])])
  expect(process.exitCode).toBeUndefined()
  expect(revocation).toHaveBeenCalledTimes(revoke ? 1 : 0)
  await expect(stat('credentials')).rejects.toMatchObject({ code: 'ENOENT' })
  expect(OutputCtl.prototype.print).toHaveBeenLastCalledWith(expect.any(String), {
    revoked: revoke,
    removed: true,
  })
})

test('legacy credentials without login provenance are forgotten without revoking a shared key', async () => {
  await writeFile('credentials', 'TRANSLOADIT_KEY=legacy-key\nTRANSLOADIT_SECRET=legacy-secret\n')
  const revocation = vi
    .spyOn(Transloadit.prototype, 'revokeOwnAuthKey')
    .mockResolvedValue(undefined)
  await main(['auth', 'logout'])
  expect(process.exitCode).toBeUndefined()
  expect(revocation).not.toHaveBeenCalled()
  await expect(stat('credentials')).rejects.toMatchObject({ code: 'ENOENT' })
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(expect.stringContaining('not revoked'), {
    revoked: false,
    removed: true,
  })
})

test.each([
  'TRANSLOADIT_AUTH_TOKEN=legacy-token\n',
  'TRANSLOADIT_KEY=legacy-key\nTRANSLOADIT_SECRET=legacy-secret\nTRANSLOADIT_SIGNATURE_ALGORITHM=unsupported\n',
])('local-only logout can remove unusable legacy credentials: %j', async (contents) => {
  await writeFile('credentials', contents)
  const revocation = vi.spyOn(Transloadit.prototype, 'revokeOwnAuthKey')
  await main(['auth', 'logout'])
  expect(process.exitCode).toBeUndefined()
  expect(revocation).not.toHaveBeenCalled()
  await expect(stat('credentials')).rejects.toMatchObject({ code: 'ENOENT' })
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(expect.any(String), {
    revoked: false,
    removed: true,
  })
})

test('explicit revocation still requires usable signing credentials and preserves an invalid file', async () => {
  const contents =
    'TRANSLOADIT_KEY=legacy-key\nTRANSLOADIT_SECRET=legacy-secret\nTRANSLOADIT_SIGNATURE_ALGORITHM=unsupported\n'
  await writeFile('credentials', contents)
  const revocation = vi.spyOn(Transloadit.prototype, 'revokeOwnAuthKey')
  await main(['auth', 'logout', '--revoke'])
  expect(process.exitCode).toBe(1)
  expect(revocation).not.toHaveBeenCalled()
  expect(await readFile('credentials', 'utf8')).toBe(contents)
})

test('auth login rejects failed verification without saving credentials or echoing upstream errors', async () => {
  vi.mocked(Transloadit.prototype.listTemplates).mockRejectedValue(
    new Error('remote hidden-secret'),
  )
  await main(['auth', 'login', '--stdin'])
  expect(process.exitCode).toBe(1)
  expect(await readdir(directory)).toEqual([])
  const message = vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join('\n')
  expect(message).toContain('https://transloadit.com/c/<workspace>/template-credentials/')
  expect(message).toContain('verify')
  expect(message).toContain('TRANSLOADIT_SIGNATURE_ALGORITHM=sha256')
  expect(message).not.toContain('hidden-secret')
})

test('auth login help documents the stdin algorithm needed for a combined Smart CDN key', async () => {
  await main(['auth', 'login', '--help'])
  expect(process.exitCode).toBeUndefined()
  const help = vi
    .mocked(process.stdout.write)
    .mock.calls.map(([chunk]) => String(chunk))
    .join('')
  expect(help).toContain('TRANSLOADIT_SIGNATURE_ALGORITHM=sha256')
})

test.each([
  ['--help'],
  ['-h'],
  [],
])('auth help %j lists each command once without treating aliases as ambiguous matches', async (...args) => {
  await main(['auth', ...args])
  expect(process.exitCode).toBeUndefined()
  const help = vi
    .mocked(process.stdout.write)
    .mock.calls.map(([chunk]) => String(chunk))
    .join('')
  const commands = [
    ...help.matchAll(/transloadit auth (signature|smart-cdn|token|login|logout|status)\b/g),
  ].map((match) => match[1])
  expect(commands.toSorted()).toEqual([
    'login',
    'logout',
    'signature',
    'smart-cdn',
    'status',
    'token',
  ])
  expect(help).not.toContain('Multiple commands match')
})

test.each([
  ['auth', 'sig'],
  ['sig'],
  ['auth', 'smart_cdn'],
  ['smart_sig'],
])('auth alias %j still exposes command-specific help', async (...args) => {
  await main([...args, '--help'])
  expect(process.exitCode).toBeUndefined()
  const help = vi
    .mocked(process.stdout.write)
    .mock.calls.map(([chunk]) => String(chunk))
    .join('')
  expect(help).toContain('Generate')
  expect(help).toContain('Options')
  expect(help).not.toContain('Authentication commands')
})

test('auth login verifies only against the explicit endpoint and saves that binding', async () => {
  await writeFile('.env', 'TRANSLOADIT_ENDPOINT=https://untrusted.invalid\n')
  await main(['auth', 'login', '--stdin', '--endpoint', 'http://127.0.0.1:3020'])
  expect(process.exitCode).toBeUndefined()
  expect(resolveCliConfig().credentialsEndpoint).toBe('http://127.0.0.1:3020')
})

test('project dotenv cannot redirect newly entered credentials into the application', async () => {
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', '')
  await writeFile('.env', 'TRANSLOADIT_CREDENTIALS_FILE=public/credentials.txt\n')
  await main(['auth', 'login', '--stdin'])
  expect(process.exitCode).toBeUndefined()
  expect(await readFile('fake-home/.transloadit/credentials', 'utf8')).toContain('write-key')
  await expect(stat('public/credentials.txt')).rejects.toMatchObject({ code: 'ENOENT' })
})

test('project HOME cannot redirect newly entered credentials when the shell has no HOME', async () => {
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', '')
  vi.stubEnv('HOME', undefined)
  const originalHome = join(directory, 'fake-home')
  // Model os.homedir's POSIX HOME lookup without ever touching a real home directory.
  vi.mocked(homedir).mockImplementation(() => process.env.HOME ?? originalHome)
  await writeFile('.env', `HOME=${join(directory, 'public')}\n`)
  await main(['auth', 'login', '--stdin'])
  expect(process.exitCode).toBeUndefined()
  expect(await readFile('fake-home/.transloadit/credentials', 'utf8')).toContain('write-key')
  await expect(stat('public/.transloadit/credentials')).rejects.toMatchObject({ code: 'ENOENT' })
})

test('project HOME cannot turn a repository credential file into a verified saved login', async () => {
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', '')
  vi.stubEnv('HOME', undefined)
  const originalHome = join(directory, 'fake-home')
  vi.mocked(homedir).mockImplementation(() => process.env.HOME ?? originalHome)
  await mkdir('public/.transloadit', { recursive: true })
  await writeFile('.env', `HOME=${join(directory, 'public')}\n`)
  await writeFile(
    'public/.transloadit/credentials',
    'TRANSLOADIT_KEY=repo-key\nTRANSLOADIT_SECRET=repo-secret\nTRANSLOADIT_WORKSPACE=my-app\nTRANSLOADIT_WORKSPACE_VERIFIED=true\n',
  )
  await main(['auth', 'status'])
  expect(process.exitCode).toBe(1)
  expect(resolveCliConfig()).toMatchObject({
    authSource: 'project-selected credentials file',
    authWorkspaceVerified: false,
    credentialsWorkspaceVerified: false,
  })
})

test('the generated empty page and init instruction name the initialized directory', async () => {
  await mkdir('app')
  await writeFile(
    'credentials',
    'TRANSLOADIT_KEY=write-key\nTRANSLOADIT_SECRET=hidden-secret\nTRANSLOADIT_WORKSPACE=my-app\nTRANSLOADIT_WORKSPACE_VERIFIED=true\n',
  )
  await main(['image', 'init', 'uploads/', '--private', '--example'])
  expect(process.exitCode).toBeUndefined()
  expect(await readFile('app/storage-image-example/page.tsx', 'utf8')).toContain(
    'npx transloadit storage store ./hero.jpg uploads/hero.jpg',
  )
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
    expect.stringContaining('Add an image under uploads/ with storage store'),
    expect.any(Object),
  )
})

test.each([
  '',
  ' ',
  './public',
])('HOME=%j cannot make the default credential path repository-relative', (home) => {
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', '')
  vi.mocked(homedir).mockReturnValue(home)
  // Only resolve the path; never read or write the real account's credentials in this test.
  expect(getConfiguredCredentialsFilePath('shell')).toBe(
    join(userInfo().homedir, '.transloadit', 'credentials'),
  )
})

test.each(['.env', '.env.local'])('auth login never replaces app env file %s', async (file) => {
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', join(directory, file))
  await writeFile(file, 'APP_SETTING=preserved\n')
  await main(['auth', 'login', '--stdin', '--replace'])
  expect(process.exitCode).toBe(1)
  expect(await readFile(file, 'utf8')).toBe('APP_SETTING=preserved\n')
  expect(readCliInput).not.toHaveBeenCalled()
})

test.each([
  'opaque;secret/*:value',
  'with # punctuation',
  'quote"value',
  "quote'value",
  'literal\\nvalue',
])('auth login preserves opaque secret %j through the existing credential lookup', async (secret) => {
  vi.mocked(readCliInput).mockResolvedValue({
    content: `TRANSLOADIT_KEY=write-key\nTRANSLOADIT_SECRET='${secret}'\n`,
    isStdin: true,
  })
  await main(['auth', 'login', '--stdin'])
  expect(process.exitCode).toBeUndefined()
  expect(resolveCliConfig().credentials?.authSecret).toBe(secret)
})

test('auth login does not overwrite existing credentials without explicit replacement', async () => {
  await writeFile('credentials', 'previous\n')
  await main(['auth', 'login', '--stdin'])
  expect(process.exitCode).toBe(1)
  expect(await readFile('credentials', 'utf8')).toBe('previous\n')
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('--replace'))
})

test('a concurrent stdin login preserves the winner without suggesting revocation of the supplied key', async () => {
  const winner = 'TRANSLOADIT_KEY=winner-key\nTRANSLOADIT_SECRET=winner-secret\n'
  vi.mocked(Transloadit.prototype.listTemplates).mockImplementationOnce(async () => {
    await writeFile('credentials', winner)
    return { items: [], count: 0 }
  })
  await main(['auth', 'login', '--stdin'])
  expect(process.exitCode).toBe(1)
  expect(await readFile('credentials', 'utf8')).toBe(winner)
  const message = vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join('\n')
  expect(message).toContain('verified Auth Key was not saved')
  expect(message).toContain('TRANSLOADIT_CREDENTIALS_FILE')
  expect(message).toContain('No new Auth Key was created')
  expect(message).not.toMatch(/revoke|winner-key|winner-secret|hidden-secret|write-key/)
})

test('auth login identifies the saved file and offers a separate login without reading input or overwriting', async () => {
  const contents =
    'TRANSLOADIT_KEY=existing-key\nTRANSLOADIT_SECRET=existing-secret\nTRANSLOADIT_WORKSPACE=existing-workspace\nTRANSLOADIT_AUTH_KEY_DESCRIPTION="Transloadit CLI on old-laptop"\n'
  await writeFile('credentials', contents)
  await utimes('credentials', new Date('2026-04-14T12:00:00Z'), new Date('2026-04-14T12:00:00Z'))
  await main(['auth', 'login', '--stdin'])
  expect(process.exitCode).toBe(1)
  const message = vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join('\n')
  expect(message).toContain(join(directory, 'credentials'))
  expect(message).toContain('existing-workspace')
  expect(message).toContain('Transloadit CLI on old-laptop')
  expect(message).toContain('2026-04-14T12:00:00.000Z')
  expect(message).toContain('TRANSLOADIT_CREDENTIALS_FILE')
  expect(message).toContain('--replace')
  expect(message).not.toMatch(/existing-key|existing-secret/)
  expect(readCliInput).not.toHaveBeenCalled()
  expect(Transloadit.prototype.listTemplates).not.toHaveBeenCalled()
  expect(await readFile('credentials', 'utf8')).toBe(contents)
})

test('existing-login metadata is optional and cannot inject terminal controls into the error', async () => {
  await writeFile(
    'credentials',
    'TRANSLOADIT_SECRET=never-print-me\nTRANSLOADIT_AUTH_KEY_DESCRIPTION="old\u001b[2Jlogin"\n',
  )
  await main(['auth', 'login', '--stdin'])
  const message = vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join('\n')
  expect(message).toContain('Workspace: not recorded')
  expect(message).toContain('Description: "old\\u001b[2Jlogin"')
  expect(message).toContain('TRANSLOADIT_CREDENTIALS_FILE')
  expect(message).not.toContain('\u001b')
  expect(message).not.toContain('never-print-me')
})

test('auth login rejects malformed input without echoing it or saving a file', async () => {
  vi.mocked(readCliInput).mockResolvedValue({
    content: 'TRANSLOADIT_KEY=hidden-secret\n',
    isStdin: true,
  })
  await main(['auth', 'login', '--stdin'])
  expect(process.exitCode).toBe(1)
  expect(await readdir(directory)).toEqual([])
  expect(JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls)).not.toContain(
    'hidden-secret',
  )
})

describe('image init', () => {
  beforeEach(() => {
    const credentials = { authKey: 'combined-key', authSecret: 'render-secret' }
    vi.mocked(resolveCliConfig).mockReturnValue({
      auth: credentials,
      credentials,
      credentialsWorkspace: 'my-app',
      authWorkspace: 'my-app',
      authWorkspaceVerified: true,
    })
    vi.spyOn(Transloadit.prototype, 'publishStoragePrefix').mockResolvedValue({
      ok: 'STORAGE_PUBLIC_PREFIX_DECLARED',
      prefix: 'website/',
      created: true,
      created_at: '2026-09-13',
    })
  })

  test('private init scaffolds only the conventional authorizer and package route, not a factory', async () => {
    await mkdir('app')
    await main(['image', 'init', 'uploads/', '--private'])
    expect(process.exitCode).toBeUndefined()
    expect(await readFile('transloadit.authorize.ts', 'utf8')).toContain('export const authorize')
    expect(JSON.stringify(vi.mocked(OutputCtl.prototype.print).mock.calls)).toMatch(
      /Smart CDN.*smart_cdn:sign.*assemblies:write is also accepted/,
    )
    expect(await readFile('app/api/storage-images/route.ts', 'utf8')).toBe(
      "export { GET, HEAD } from '@transloadit/img/next/route'\n",
    )
    await expect(stat('lib/storageImage.ts')).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(stat('app/storage-image-example/page.tsx')).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  test('example scaffolding uses an existing catalog without login or implicit publication', async () => {
    await mkdir('app')
    const catalog = { workspace: 'my-app', public: ['website/'], images: {} }
    await writeFile('transloadit.images.json', JSON.stringify(catalog))
    vi.mocked(resolveCliConfig).mockReturnValue({})
    await main(['image', 'init', 'website/', '--example'])
    expect(process.exitCode).toBeUndefined()
    expect(await readFile('app/storage-image-example/page.tsx', 'utf8')).toContain(
      "from '@transloadit/img/next'",
    )
    await expect(stat('lib/storageImage.ts')).rejects.toMatchObject({ code: 'ENOENT' })
    expect(JSON.stringify(vi.mocked(OutputCtl.prototype.print).mock.calls)).toContain(
      'withTransloaditImages',
    )
    expect(Transloadit.prototype.publishStoragePrefix).not.toHaveBeenCalled()
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual(catalog)
  })

  test('a custom-catalog example keeps application factories intact and names the plugin option', async () => {
    await mkdir('app')
    await mkdir('lib')
    await writeFile('lib/storageImage.ts', 'application-owned code\n')
    await writeFile(
      'photos.json',
      JSON.stringify({ workspace: 'my-app', public: ['website/'], images: {} }),
    )
    await main(['image', 'init', 'website/', '--example', '--receipts', 'photos.json'])
    expect(process.exitCode).toBeUndefined()
    expect(await readFile('lib/storageImage.ts', 'utf8')).toBe('application-owned code\n')
    expect(await readFile('app/storage-image-example/page.tsx', 'utf8')).toContain(
      "from '../../photos.json'",
    )
    const output = vi
      .mocked(OutputCtl.prototype.print)
      .mock.calls.map(([message]) => message)
      .join('\n')
    expect(output).toContain('withTransloaditImages')
    expect(output).toContain('{ catalog: "photos.json" }')
  })

  test.each([
    '--example',
    '--public',
    '--private',
  ])('init %s rejects an external catalog before any scaffold or publication', async (mode) => {
    await mkdir('app')
    await writeFile('photos.json', JSON.stringify({ workspace: 'my-app', public: [], images: {} }))
    const original = await readFile('photos.json', 'utf8')
    await mkdir('site/app', { recursive: true })
    const previousDirectory = process.cwd()
    process.chdir('site')
    try {
      await main(['image', 'init', 'website/', mode, '--receipts', '../photos.json'])
      expect(process.exitCode).toBe(1)
      expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
        expect.stringMatching(/outside this Next.js app.*explicit.*createStorageImages/),
      )
      expect(Transloadit.prototype.publishStoragePrefix).not.toHaveBeenCalled()
      expect(await readdir('.')).toEqual(['app'])
      expect(await readdir('app')).toEqual([])
      expect(await readFile('../photos.json', 'utf8')).toBe(original)
    } finally {
      process.chdir(previousDirectory)
    }
  })

  test.each([
    '--example',
    '--private',
  ])('credential-free %s preserves production delivery despite a saved development login', async (mode) => {
    await mkdir('app')
    const catalog = { workspace: 'my-app', public: ['website/'], images: {} }
    await writeFile('transloadit.images.json', JSON.stringify(catalog))
    const saved = resolveCliConfig('login')
    vi.mocked(resolveCliConfig).mockReturnValue({
      ...saved,
      workspace: 'other-app',
      endpoint: 'http://127.0.0.1:3020',
    })
    await main(['image', 'init', 'website/', mode])
    expect(process.exitCode).toBeUndefined()
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual(catalog)
    if (mode === '--example') {
      expect(await readFile('app/storage-image-example/page.tsx', 'utf8')).not.toContain(
        '127.0.0.1',
      )
    }
  })

  test.each([
    '--example',
    '--private',
  ])('credential-free %s validates an explicit workspace expectation before writing', async (mode) => {
    await mkdir('app')
    const catalog = JSON.stringify({ workspace: 'my-app', public: ['website/'], images: {} })
    await writeFile('transloadit.images.json', catalog)
    await main(['image', 'init', 'website/', mode, '--workspace', 'other-app'])
    expect(process.exitCode).toBe(1)
    expect(await readFile('transloadit.images.json', 'utf8')).toBe(catalog)
    expect(await readdir('app')).toEqual([])
    await expect(stat('transloadit.authorize.ts')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  test('an explicit production endpoint clears catalog transport without a factory override', async () => {
    await mkdir('app')
    await writeFile(
      'transloadit.images.json',
      JSON.stringify({
        workspace: 'my-app',
        public: ['website/'],
        images: {},
        delivery: {
          baseUrl: 'http://127.0.0.1:3020/file/{workspace}',
          urlParams: { cdn: 'required' },
        },
      }),
    )
    await main([
      'image',
      'init',
      'website/',
      '--example',
      '--endpoint',
      'https://api2.transloadit.com',
    ])
    expect(process.exitCode).toBeUndefined()
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8')).delivery).toBeUndefined()
    expect(await readFile('app/storage-image-example/page.tsx', 'utf8')).not.toContain('baseUrl:')
  })

  test.each([
    { flags: ['--public'], loginEndpoint: 'http://127.0.0.1:3020', catalogEndpoint: undefined },
    {
      flags: ['--private', '--write-env'],
      loginEndpoint: 'http://127.0.0.1:3020',
      catalogEndpoint: undefined,
    },
    { flags: ['--public'], loginEndpoint: undefined, catalogEndpoint: 'http://127.0.0.1:3020' },
    {
      flags: ['--private', '--write-env'],
      loginEndpoint: undefined,
      catalogEndpoint: 'http://127.0.0.1:3020',
    },
  ])('refuses a credential/catalog endpoint mismatch before any write: %j', async ({
    flags,
    loginEndpoint,
    catalogEndpoint,
  }) => {
    await mkdir('app')
    const catalog = JSON.stringify({
      workspace: 'my-app',
      public: [],
      images: {},
      delivery:
        catalogEndpoint === undefined
          ? undefined
          : {
              baseUrl: `${catalogEndpoint}/file/{workspace}`,
              urlParams: { cdn: 'required' },
            },
    })
    await writeFile('transloadit.images.json', catalog)
    vi.mocked(resolveCliConfig).mockReturnValue({
      ...resolveCliConfig('login'),
      endpoint: loginEndpoint,
    })
    await main(['image', 'init', 'website/', ...flags])
    expect(process.exitCode).toBe(1)
    expect(Transloadit.prototype.publishStoragePrefix).not.toHaveBeenCalled()
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringMatching(/endpoint.*catalog.*Nothing was written/),
    )
    expect(await readFile('transloadit.images.json', 'utf8')).toBe(catalog)
    expect(await readdir(directory)).toEqual(['app', 'transloadit.images.json'])
    expect(await readdir('app')).toEqual([])
  })

  test('an explicit endpoint deliberately moves publication and catalog delivery together', async () => {
    await mkdir('app')
    await writeFile(
      'transloadit.images.json',
      JSON.stringify({ workspace: 'my-app', public: [], images: {} }),
    )
    const endpoint = 'http://127.0.0.1:3020'
    vi.mocked(resolveCliConfig).mockReturnValue({ ...resolveCliConfig('login'), endpoint })
    await main(['image', 'init', 'website/', '--public', '--endpoint', endpoint])
    expect(process.exitCode).toBeUndefined()
    expect(Transloadit.prototype.publishStoragePrefix).toHaveBeenCalledOnce()
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toMatchObject({
      public: ['website/'],
      delivery: { baseUrl: `${endpoint}/file/{workspace}`, urlParams: { cdn: 'required' } },
    })
  })

  test('matching catalog and login origins allow private credential scaffolding', async () => {
    await mkdir('app')
    const endpoint = 'http://127.0.0.1:3020'
    const catalog = {
      workspace: 'my-app',
      public: [],
      images: {},
      delivery: { baseUrl: `${endpoint}/file/{workspace}`, urlParams: { cdn: 'required' } },
    }
    await writeFile('transloadit.images.json', JSON.stringify(catalog))
    vi.mocked(resolveCliConfig).mockReturnValue({ ...resolveCliConfig('login'), endpoint })
    await main(['image', 'init', 'uploads/', '--private', '--write-env'])
    expect(
      process.exitCode,
      JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls),
    ).toBeUndefined()
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual(catalog)
    expect((await stat('.env.local')).mode & 0o777).toBe(0o600)
    expect(Transloadit.prototype.publishStoragePrefix).not.toHaveBeenCalled()
  })

  test.each([
    '--public',
    '--private',
  ])('init carries a saved non-production endpoint for %s', async (mode) => {
    await mkdir('app')
    const saved = resolveCliConfig('login')
    vi.mocked(resolveCliConfig).mockReturnValue({ ...saved, endpoint: 'http://127.0.0.1:3020' })
    await main(['image', 'init', 'website/', mode])
    expect(process.exitCode).toBeUndefined()
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8')).delivery).toEqual({
      baseUrl: 'http://127.0.0.1:3020/file/{workspace}',
      urlParams: { cdn: 'required' },
    })
    expect(JSON.stringify(vi.mocked(OutputCtl.prototype.print).mock.calls)).toContain(
      'Delivery uses the non-production API',
    )
  })

  test('a rollback failure keeps the original error and public-prefix warning and continues cleanup', async () => {
    await mkdir('app')
    const original = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
    vi.mocked(open).mockImplementation((path, ...options) => {
      if (path === 'app/storage-image-example/page.tsx')
        return Promise.reject(new Error('Cannot write example page'))
      return original.open(path, ...options)
    })
    vi.mocked(rm).mockImplementation((path, ...options) => {
      if (path === 'transloadit.images.json')
        return Promise.reject(new Error('Cannot remove partial catalog'))
      return original.rm(path, ...options)
    })
    onTestFinished(() => {
      vi.mocked(open).mockReset()
      vi.mocked(rm).mockReset()
    })
    await main(['image', 'init', 'website/', '--public'])
    expect(process.exitCode).toBe(1)
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringMatching(/Cannot write example page.*remains public/),
    )
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('transloadit.images.json'),
    )
    await expect(stat('lib/storageImage.ts')).rejects.toMatchObject({ code: 'ENOENT' })
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8')).public).toEqual([
      'website/',
    ])
  })

  test.each([
    'app',
    'src/app',
  ])('image init uses the package component for %s without a generated factory or env', async (app) => {
    await mkdir(app, { recursive: true })
    await main(['image', 'init', 'website/', '--public'])
    expect(process.exitCode).toBeUndefined()
    const root = app === 'app' ? '' : 'src/'
    await expect(stat(`${root}lib/storageImage.ts`)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual({
      workspace: 'my-app',
      public: ['website/'],
      images: {},
    })
    const page = await readFile(`${app}/storage-image-example/page.tsx`, 'utf8')
    expect(page).toContain("from '@transloadit/img/next'")
    expect(page).toContain('keyof typeof catalog.images')
    expect(page).toContain('<StorageImage')
    expect(page).toContain('errorFallback=')
    expect(page).toContain('role="status"')
    expect(page).toContain('This image could not be loaded.')
    expect(page).toContain('alt={alt}')
    expect(page).toContain(
      'Replace the filename-derived alt with a description, or an empty string if decorative',
    )
    expect(page).toContain('preload')
    expect(page).not.toContain('priority')
    expect(page).toContain('storage store')
    const printed = JSON.stringify(vi.mocked(OutputCtl.prototype.print).mock.calls)
    expect(printed).not.toContain('TRANSLOADIT_WORKSPACE=')
    expect(printed).not.toContain('TRANSLOADIT_KEY=')
    expect(printed).not.toContain('TRANSLOADIT_SECRET=')
    expect(printed).not.toContain('TRANSLOADIT_SMART_CDN_SECRET=')
    expect(await readdir(directory)).not.toContain('.env.local')
  })

  test('public init needs no env even with the old --write-env option', async () => {
    await mkdir('app')
    await main(['image', 'init', 'website/', '--public', '--write-env'])
    expect(process.exitCode).toBeUndefined()
    await expect(stat('.env.local')).rejects.toMatchObject({ code: 'ENOENT' })
    expect(readCliInput).not.toHaveBeenCalled()
    expect(JSON.stringify(vi.mocked(OutputCtl.prototype.print).mock.calls)).not.toContain(
      'render-secret',
    )
  })

  test('private init keeps keys in env and workspace in the catalog', async () => {
    await mkdir('app')
    await main(['image', 'init', 'accounts/', '--write-env', '--private'])
    expect(process.exitCode).toBeUndefined()
    expect(await readFile('.env.local', 'utf8')).toBe(
      'TRANSLOADIT_KEY="combined-key"\nTRANSLOADIT_SECRET="render-secret"\n',
    )
  })

  test('private init preserves existing public directories without creating a second factory policy', async () => {
    await mkdir('app')
    const catalog = { workspace: 'my-app', public: ['website/'], images: {} }
    await writeFile('transloadit.images.json', JSON.stringify(catalog))
    await main(['image', 'init', 'uploads/', '--private'])
    expect(process.exitCode).toBeUndefined()
    expect(await readFile('transloadit.authorize.ts', 'utf8')).toContain('authorize')
    await expect(stat('lib/storageImage.ts')).rejects.toMatchObject({ code: 'ENOENT' })
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual(catalog)
  })

  test('the generated example selects a receipt under the initialized directory', async () => {
    await mkdir('app')
    await writeFile(
      'transloadit.images.json',
      JSON.stringify({
        workspace: 'my-app',
        public: [],
        images: {
          'accounts/avatar.jpg': { path: 'accounts/avatar.jpg', width: 200, height: 200 },
          'website/hero.jpg': { path: 'website/hero.jpg', width: 800, height: 600 },
        },
      }),
    )
    await main(['image', 'init', 'website/', '--public'])
    expect(process.exitCode).toBeUndefined()
    expect(await readFile('app/storage-image-example/page.tsx', 'utf8')).toContain(
      "Object.keys(catalog.images).find((path) => path.startsWith('website/'))",
    )
  })

  test('init normalizes a directory without its trailing slash', async () => {
    await mkdir('app')
    await main(['image', 'init', 'website', '--public'])
    expect(process.exitCode).toBeUndefined()
    expect(Transloadit.prototype.publishStoragePrefix).toHaveBeenCalledExactlyOnceWith('website/', {
      signal: expect.any(AbortSignal),
    })
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8')).public).toEqual([
      'website/',
    ])
  })

  test('init never overwrites an existing rendering env file, even with --write-env', async () => {
    await mkdir('app')
    await writeFile('.env.local', 'APP_SETTING=preserved\n')
    await main(['image', 'init', 'website/', '--private', '--write-env'])
    expect(process.exitCode).toBe(1)
    expect(await readFile('.env.local', 'utf8')).toBe('APP_SETTING=preserved\n')
    await expect(stat('lib/storageImage.ts')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  test('generated source files use normal permissions while rendering secrets remain owner-only', async () => {
    await mkdir('app')
    await main(['image', 'init', 'website/', '--private', '--write-env'])
    expect(process.exitCode).toBeUndefined()
    expect((await stat('transloadit.authorize.ts')).mode & 0o777).toBe(0o666 & ~process.umask())
    expect((await stat('app/api/storage-images/route.ts')).mode & 0o777).toBe(
      0o666 & ~process.umask(),
    )
    expect((await stat('.env.local')).mode & 0o777).toBe(0o600)
  })

  test('public and private scaffold declarations cannot be combined', async () => {
    await mkdir('app')
    await main(['image', 'init', 'website/', '--public', '--private'])
    expect(process.exitCode).toBe(1)
    await expect(stat('lib/storageImage.ts')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  test('private init creates GET and HEAD with a fail-closed authorization placeholder', async () => {
    await mkdir('app')
    await main(['image', 'init', '--private', 'accounts/'])
    expect(process.exitCode).toBeUndefined()
    expect(await readFile('transloadit.authorize.ts', 'utf8')).toContain('= () => false')
    expect(await readFile('app/api/storage-images/route.ts', 'utf8')).toContain(
      "export { GET, HEAD } from '@transloadit/img/next/route'",
    )
    expect(JSON.stringify(vi.mocked(OutputCtl.prototype.print).mock.calls)).toContain(
      'authorization',
    )
  })

  test('init refuses to replace application code and leaves no partial scaffold', async () => {
    await mkdir('app/api/storage-images', { recursive: true })
    await writeFile('app/api/storage-images/route.ts', 'existing\n')
    await main(['image', 'init', '--private', 'accounts/'])
    expect(process.exitCode).toBe(1)
    expect(await readFile('app/api/storage-images/route.ts', 'utf8')).toBe('existing\n')
    await expect(stat('lib/storageImage.ts')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  test.each([
    '../',
    '/website/',
    'a//',
    'a/../',
    ' website/',
    'website/ ',
    'website/\u0001/',
    'cafe\u0301/',
    `${'a'.repeat(1024)}/`,
    '',
  ])('init rejects unsafe or implicit root prefix %j before writing', async (prefix) => {
    await mkdir('app')
    await main(['image', 'init', prefix, '--public'])
    expect(process.exitCode).toBe(1)
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      'Provide one safe relative directory prefix ending in /, for example website/',
    )
    expect(await readdir(directory)).toEqual(['app'])
  })

  test('init preserves an existing catalog and refuses to overwrite the example page', async () => {
    await mkdir('app/storage-image-example', { recursive: true })
    const catalog =
      '{"workspace":"my-app","public":[],"images":{"website/hero.jpg":{"path":"website/hero.jpg","width":800,"height":600}}}\n'
    await writeFile('transloadit.images.json', catalog)
    await writeFile('app/storage-image-example/page.tsx', 'existing\n')
    await main(['image', 'init', 'website/', '--public'])
    expect(process.exitCode).toBe(1)
    expect(await readFile('transloadit.images.json', 'utf8')).toBe(catalog)
    expect(await readFile('app/storage-image-example/page.tsx', 'utf8')).toBe('existing\n')
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Move or rename it before rerunning image init'),
    )
    await expect(stat('lib/storageImage.ts')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  test.each([
    false,
    true,
  ])('init keeps the selected catalog portable without replacing its data (absolute: %s)', async (absolute) => {
    await mkdir('src/app', { recursive: true })
    await mkdir('catalog')
    const catalog =
      '{"workspace":"my-app","public":[],"images":{"website/hero.jpg":{"path":"website/hero.jpg","width":800,"height":600}}}\n'
    await writeFile('catalog/images.json', catalog)
    await main([
      'image',
      'init',
      'website/',
      '--public',
      '--receipts',
      absolute ? join(process.cwd(), 'catalog/images.json') : 'catalog/images.json',
    ])
    expect(process.exitCode).toBeUndefined()
    expect(JSON.parse(await readFile('catalog/images.json', 'utf8'))).toEqual({
      ...JSON.parse(catalog),
      public: ['website/'],
    })
    expect(await readFile('src/app/storage-image-example/page.tsx', 'utf8')).toContain(
      '../../../catalog/images.json',
    )
    expect(await readFile('src/app/storage-image-example/page.tsx', 'utf8')).toContain(
      '--receipts=catalog/images.json',
    )
    expect(await readFile('src/app/storage-image-example/page.tsx', 'utf8')).not.toContain(
      process.cwd(),
    )
  })

  test('init rejects the removed --next flag before writing', async () => {
    await mkdir('app')
    await main(['image', 'init', 'website/', '--next'])
    expect(process.exitCode).toBe(1)
    expect(await readdir(directory)).toEqual(['app'])
  })
})
