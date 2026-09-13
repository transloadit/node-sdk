import { mkdir, mkdtemp, open, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest'

import { readCliInput, resolveCliConfig } from '../../../src/cli/helpers.ts'
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
  ])('image init creates a direct factory for %s and prints only rendering env names', async (app) => {
    await mkdir(app, { recursive: true })
    await main(['image', 'init', 'website/', '--public'])
    expect(process.exitCode).toBeUndefined()
    const root = app === 'app' ? '' : 'src/'
    const factory = await readFile(`${root}lib/storageImage.ts`, 'utf8')
    expect(factory).toContain('createStorageImages')
    expect(factory).not.toContain('allowedPathPrefixes')
    expect(factory).toContain('createStorageImages(catalog)')
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual({
      workspace: 'my-app',
      public: ['website/'],
      images: {},
    })
    const page = await readFile(`${app}/storage-image-example/page.tsx`, 'utf8')
    expect(page).toContain("from '../../lib/storageImage'")
    expect(page).toContain('Object.values(images)')
    expect(page).toContain('<StorageImage')
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

  test('init normalizes a directory without its trailing slash', async () => {
    await mkdir('app')
    await main(['image', 'init', 'website', '--public'])
    expect(process.exitCode).toBeUndefined()
    expect(Transloadit.prototype.publishStoragePrefix).toHaveBeenCalledExactlyOnceWith('website/')
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
    expect((await stat('lib/storageImage.ts')).mode & 0o777).toBe(0o666 & ~process.umask())
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
    expect(await readFile('lib/storageImage.ts', 'utf8')).toContain('authorize: () => false')
    expect(await readFile('app/api/storage-images/route.ts', 'utf8')).toContain(
      'storageRoute as GET, storageRoute as HEAD',
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
    await expect(stat('lib/storageImage.ts')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  test('init accepts an existing catalog without replacing its data', async () => {
    await mkdir('src/app', { recursive: true })
    await mkdir('catalog')
    const catalog =
      '{"workspace":"my-app","public":[],"images":{"website/hero.jpg":{"path":"website/hero.jpg","width":800,"height":600}}}\n'
    await writeFile('catalog/images.json', catalog)
    await main(['image', 'init', 'website/', '--public', '--receipts', 'catalog/images.json'])
    expect(process.exitCode).toBeUndefined()
    expect(JSON.parse(await readFile('catalog/images.json', 'utf8'))).toEqual({
      ...JSON.parse(catalog),
      public: ['website/'],
    })
    expect(await readFile('src/app/storage-image-example/page.tsx', 'utf8')).toContain(
      '../../../catalog/images.json',
    )
  })

  test('init rejects the removed --next flag before writing', async () => {
    await mkdir('app')
    await main(['image', 'init', 'website/', '--next'])
    expect(process.exitCode).toBe(1)
    expect(await readdir(directory)).toEqual(['app'])
  })
})
