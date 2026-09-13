import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { signParamsSync } from '@transloadit/utils/node'
import nock from 'nock'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'

const origin = 'http://127.0.0.1:3020'
const originalCwd = process.cwd()
const stdoutListeners = process.stdout.listeners('error')
const stderrListeners = process.stderr.listeners('error')
const declared = {
  ok: 'STORAGE_PUBLIC_PREFIX_DECLARED',
  prefix: 'website/',
  created_at: '2026-09-13T00:00:00Z',
  created: true,
}
let directory: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'storage-public-'))
  process.chdir(directory)
  await writeFile(
    'credentials',
    `TRANSLOADIT_KEY=combined-key\nTRANSLOADIT_SECRET=local-secret\nTRANSLOADIT_WORKSPACE=my-app\nTRANSLOADIT_WORKSPACE_VERIFIED=true\nTRANSLOADIT_ENDPOINT=${origin}\n`,
    { mode: 0o600 },
  )
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', join(directory, 'credentials'))
  for (const name of [
    'TRANSLOADIT_KEY',
    'TRANSLOADIT_SECRET',
    'TRANSLOADIT_AUTH_KEY',
    'TRANSLOADIT_AUTH_SECRET',
    'TRANSLOADIT_AUTH_TOKEN',
    'TRANSLOADIT_WORKSPACE',
    'TRANSLOADIT_ENDPOINT',
  ])
    vi.stubEnv(name, '')
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  vi.spyOn(OutputCtl.prototype, 'print').mockImplementation(() => {})
  vi.spyOn(OutputCtl.prototype, 'error').mockImplementation(() => {})
  vi.spyOn(OutputCtl.prototype, 'notice').mockImplementation(() => {})
  nock.disableNetConnect()
})

afterEach(async () => {
  process.chdir(originalCwd)
  process.exitCode = undefined
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  nock.cleanAll()
  nock.enableNetConnect()
  for (const listener of process.stdout.listeners('error'))
    if (!stdoutListeners.includes(listener)) process.stdout.off('error', listener)
  for (const listener of process.stderr.listeners('error'))
    if (!stderrListeners.includes(listener)) process.stderr.off('error', listener)
  await rm(directory, { recursive: true, force: true })
})

function signedPrefix(body: string): boolean {
  const params = /name="params"\r\n\r\n([^\r\n]+)/.exec(body)?.[1]
  const signature = /name="signature"\r\n\r\n([^\r\n]+)/.exec(body)?.[1]
  expect(params).toBeDefined()
  if (params === undefined) return false
  expect(JSON.parse(params)).toMatchObject({ prefix: 'website/', auth: { key: 'combined-key' } })
  expect(signature).toBe(signParamsSync(params, 'local-secret'))
  return true
}

test('revalidates the saved workspace after a shell endpoint override before publication', async () => {
  await writeFile(
    'transloadit.images.json',
    JSON.stringify({ workspace: 'my-app', public: [], images: {} }),
  )
  vi.stubEnv('TRANSLOADIT_ENDPOINT', 'http://override.invalid')
  const discovery = nock('http://override.invalid')
    .get('/storage/')
    .query(true)
    .reply(
      200,
      '<ListAllMyBucketsResult><Buckets><Bucket><Name>other-app</Name></Bucket></Buckets></ListAllMyBucketsResult>',
    )
  const publication = nock('http://override.invalid')
    .post('/storage/public_prefixes')
    .reply(200, declared)
  await main(['storage', 'publish', 'website/'])
  expect(discovery.isDone()).toBe(true)
  expect(publication.isDone()).toBe(false)
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    'Project uses my-app; the selected credentials belong to other-app. Nothing uploaded.',
  )
})

test('an overriding bearer token receives actionable key-selection advice', async () => {
  vi.stubEnv('TRANSLOADIT_AUTH_TOKEN', 'shell-bearer')
  await main(['storage', 'publish', 'website/'])
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    expect.stringContaining('Unset TRANSLOADIT_AUTH_TOKEN'),
  )
  expect(await readdir(directory)).toEqual(['credentials'])
})

test('private write-env requires the saved login instead of persisting transient shell secrets', async () => {
  await mkdir('app')
  await writeFile('credentials', '')
  vi.stubEnv('TRANSLOADIT_KEY', 'shell-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'shell-secret')
  vi.stubEnv('TRANSLOADIT_ENDPOINT', origin)
  const discovery = nock(origin)
    .get('/storage/')
    .query(true)
    .reply(
      200,
      '<ListAllMyBucketsResult><Buckets><Bucket><Name>my-app</Name></Bucket></Buckets></ListAllMyBucketsResult>',
    )
  await main(['image', 'init', 'website/', '--private', '--write-env'])
  expect(process.exitCode).toBe(1)
  expect(discovery.isDone()).toBe(false)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    'Run transloadit auth login first to save your workspace and Auth Key. Nothing was written.',
  )
  await expect(stat('.env.local')).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readdir(directory)).toEqual(['app', 'credentials'])
})

test('public init commits the whole project catalog without creating an env file', async () => {
  await mkdir('app')
  const api = nock(origin).post('/storage/public_prefixes', signedPrefix).reply(200, declared)
  await main(['image', 'init', 'website', '--public'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual({
    workspace: 'my-app',
    public: ['website/'],
    images: {},
  })
  expect(await readFile('lib/storageImage.ts', 'utf8')).toContain('createStorageImages(catalog)')
  await expect(stat('.env.local')).rejects.toMatchObject({ code: 'ENOENT' })
  expect(JSON.stringify(vi.mocked(OutputCtl.prototype.print).mock.calls)).not.toContain(
    'TRANSLOADIT_WORKSPACE',
  )
})

test('init requires an explicit public or private choice before creating anything', async () => {
  await mkdir('app')
  await main(['image', 'init', 'website/'])
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith('Choose either --public or --private')
  expect(await readdir(directory)).toEqual(['app', 'credentials'])
})

test.each([
  'publish',
  'unpublish',
])('%s refuses a different project workspace before remote writes', async (command) => {
  const catalog = { workspace: 'project-app', public: [], images: {} }
  await writeFile('transloadit.images.json', `${JSON.stringify(catalog)}\n`)
  await main(['storage', command, 'website/'])
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    'Project uses project-app; the selected credentials belong to my-app. Nothing uploaded.',
  )
  expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual(catalog)
})

test('publish and unpublish update the committed policy without losing image receipts', async () => {
  const images = { 'website/hero.jpg': { path: 'website/hero.jpg', width: 100, height: 80 } }
  await writeFile(
    'transloadit.images.json',
    JSON.stringify({ workspace: 'my-app', public: [], images }),
  )
  const api = nock(origin)
    .post('/storage/public_prefixes', signedPrefix)
    .reply(200, declared)
    .delete('/storage/public_prefixes', signedPrefix)
    .reply(200, { ok: 'STORAGE_PUBLIC_PREFIX_REVOKED', prefix: 'website/', deleted: true })
  await main(['storage', 'publish', 'website/'])
  expect(process.exitCode).toBeUndefined()
  expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual({
    workspace: 'my-app',
    public: ['website/'],
    images,
  })
  await main(['storage', 'unpublish', 'website/'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual({
    workspace: 'my-app',
    public: [],
    images,
  })
})

test.each([
  'website',
  'website/',
])('publishes the normalized directory %s with an ordinary signed API request', async (prefix) => {
  const api = nock(origin).post('/storage/public_prefixes', signedPrefix).reply(200, declared)
  await main(['storage', 'publish', prefix])
  expect(
    process.exitCode,
    JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls),
  ).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
    expect.stringContaining('Published website/'),
    declared,
  )
})

test('revokes a prefix while explaining that cached bytes cannot be recalled', async () => {
  const revoked = { ok: 'STORAGE_PUBLIC_PREFIX_REVOKED', prefix: 'website/', deleted: true }
  const api = nock(origin).delete('/storage/public_prefixes', signedPrefix).reply(200, revoked)
  await main(['storage', 'unpublish', 'website/'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
    expect.stringMatching(/cached.*cannot be recalled/),
    revoked,
  )
})

test('lists public prefixes through signed GET, not the S3 controller', async () => {
  const listed = {
    ok: 'STORAGE_PUBLIC_PREFIXES_LISTED',
    public_prefixes: [{ prefix: 'website/', created_at: declared.created_at }],
  }
  const api = nock(origin)
    .get('/storage/public_prefixes')
    .query((query) => {
      if (typeof query.params !== 'string') return false
      expect(query.signature).toBe(signParamsSync(query.params, 'local-secret'))
      return true
    })
    .reply(200, listed)
  await main(['storage', 'publications'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
    expect.stringContaining('website/'),
    listed,
  )
})

test('an invalid signing algorithm uses normal CLI error reporting without a stack or raw input', async () => {
  await writeFile(
    'credentials',
    'TRANSLOADIT_KEY=combined-key\nTRANSLOADIT_SECRET=local-secret\nTRANSLOADIT_SIGNATURE_ALGORITHM=invalid-private-value\n',
  )
  await main(['storage', 'publications', '--json'])
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.error).toHaveBeenCalledExactlyOnceWith(
    'Unsupported TRANSLOADIT_SIGNATURE_ALGORITHM in CLI credentials',
  )
  expect(JSON.stringify(vi.mocked(process.stdout.write).mock.calls)).not.toMatch(
    /TypeError|helpers\.ts|invalid-private-value|local-secret/,
  )
})

test('write-env reports the saved credentials read failure before asking for another login', async () => {
  await mkdir('app')
  const unreadable = join(directory, 'unreadable-credentials')
  await mkdir(unreadable)
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', unreadable)
  await main(['image', 'init', 'website/', '--public', '--write-env'])
  expect(process.exitCode).toBe(1)
  const message = vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join('\n')
  expect(message).toContain(`Failed to read ${unreadable}`)
  expect(message).not.toContain('auth login first')
  expect(await readdir(directory)).toEqual(['app', 'credentials', 'unreadable-credentials'])
})

test('missing Smart CDN enablement links to the workspace key settings without echoing upstream content', async () => {
  const api = nock(origin).post('/storage/public_prefixes', signedPrefix).reply(403, {
    error: 'STORAGE_PUBLIC_PREFIX_NEEDS_SMART_CDN_KEY',
    message: 'unsafe local-secret',
  })
  await main(['storage', 'publish', 'website/'])
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    expect.stringMatching(
      /Enable Smart CDN.*https:\/\/transloadit.com\/c\/my-app\/template-credentials\//,
    ),
  )
  expect(JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls)).not.toContain(
    'local-secret',
  )
})

test.each([
  '',
  '/',
  '/website/',
  '../',
  'a//b/',
  `${'a'.repeat(512)}/`,
])('rejects unsafe public prefix %j before making a request', async (prefix) => {
  await main(['storage', 'publish', prefix])
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringMatching(/prefix|directory/))
})

test('init publishes first and reuses the saved login without any terminal input', async () => {
  await mkdir('app')
  const api = nock(origin).post('/storage/public_prefixes', signedPrefix).reply(200, declared)
  await main(['image', 'init', 'website/', '--public', '--write-env'])
  expect(
    process.exitCode,
    JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls),
  ).toBeUndefined()
  expect(api.isDone()).toBe(true)
  await expect(stat('.env.local')).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile('lib/storageImage.ts', 'utf8')).toContain('createStorageImages(catalog)')
  expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual({
    workspace: 'my-app',
    public: ['website/'],
    images: {},
  })
  expect(JSON.stringify(vi.mocked(OutputCtl.prototype.print).mock.calls)).not.toContain(
    'local-secret',
  )
})

test('public prefix limits count UTF-8 bytes before making a request', async () => {
  await main(['storage', 'publish', 'é'.repeat(256)])
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    'A public prefix must be at most 512 UTF-8 bytes',
  )
})

test('a public prefix at exactly 512 UTF-8 bytes is accepted', async () => {
  const prefix = `${'é'.repeat(255)}a/`
  const api = nock(origin)
    .post('/storage/public_prefixes')
    .reply(200, { ...declared, prefix })
  await main(['storage', 'publish', prefix])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
})

test('public init leaves existing env untouched and checks code conflicts before publishing', async () => {
  await mkdir('app')
  await mkdir('lib')
  await writeFile('lib/storageImage.ts', 'existing code\n')
  await writeFile('.env.local', 'existing\n')
  await main(['image', 'init', 'website/', '--public', '--write-env'])
  expect(process.exitCode).toBe(1)
  expect(await readFile('.env.local', 'utf8')).toBe('existing\n')
  expect(await readdir(directory)).toEqual(['.env.local', 'app', 'credentials', 'lib'])
})

test('write-env and publication use the saved login together despite stale project or shell credentials', async () => {
  await mkdir('app')
  await writeFile(
    '.env',
    'TRANSLOADIT_KEY=project-key\nTRANSLOADIT_SECRET=project-secret\nTRANSLOADIT_ENDPOINT=http://127.0.0.1:9\n',
  )
  vi.stubEnv('TRANSLOADIT_KEY', 'shell-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'shell-secret')
  const api = nock(origin).post('/storage/public_prefixes', signedPrefix).reply(200, declared)
  await main(['image', 'init', 'website/', '--public', '--write-env'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  await expect(stat('.env.local')).rejects.toMatchObject({ code: 'ENOENT' })
  const catalog = await readFile('transloadit.images.json', 'utf8')
  expect(JSON.parse(catalog).workspace).toBe('my-app')
  expect(catalog).not.toMatch(/project-|shell-|local-secret/)
})

test('a refused public declaration leaves no misleading factory or env file', async () => {
  await mkdir('app')
  const api = nock(origin)
    .post('/storage/public_prefixes', signedPrefix)
    .reply(403, { error: 'STORAGE_PUBLIC_PREFIX_NEEDS_SMART_CDN_KEY' })
  await main(['image', 'init', 'website/', '--public', '--write-env'])
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(await readdir(directory)).toEqual(['app', 'credentials'])
})
