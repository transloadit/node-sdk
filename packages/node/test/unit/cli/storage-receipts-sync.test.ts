import {
  chmod,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import nock from 'nock'
import { afterEach, beforeEach, expect, onTestFinished, test, vi } from 'vitest'

import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { updateStorageReceipts } from '../../../src/cli/storageReceipts.ts'
import { main } from '../../../src/cli.ts'
import { storagePage, storedAsset } from './storage-fixtures.ts'

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>()
  return { ...original, rename: vi.fn(original.rename) }
})

const originalCwd = process.cwd()
const stdoutListeners = process.stdout.listeners('error')
const stderrListeners = process.stderr.listeners('error')
const asset = storedAsset()
const recovered = { ...asset, apiOrigin: 'http://storage.invalid' }
const policy = {
  ok: 'STORAGE_PUBLIC_PREFIXES_LISTED',
  public_prefixes: [{ prefix: 'website/', created_at: '2026-09-14T00:00:00Z' }],
}
let directory: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'storage-receipts-sync-'))
  process.chdir(directory)
  await writeFile(
    'credentials',
    'TRANSLOADIT_KEY=local-key\nTRANSLOADIT_SECRET=local-secret\nTRANSLOADIT_ENDPOINT=http://storage.invalid\n',
  )
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', join(directory, 'credentials'))
  for (const name of [
    'TRANSLOADIT_KEY',
    'TRANSLOADIT_SECRET',
    'TRANSLOADIT_AUTH_KEY',
    'TRANSLOADIT_AUTH_SECRET',
    'TRANSLOADIT_AUTH_TOKEN',
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
  await rm(directory, { force: true, recursive: true })
})

function runSync(extra: string[] = []): Promise<void> {
  return main(['storage', 'receipts', 'sync', 'website/', '--receipts', 'images.json', ...extra])
}

test('an auxiliary recovery catalog cannot replace the active catalog declarations', async () => {
  await updateStorageReceipts('images.json', async () => ({
    workspace: asset.workspace,
    public: [],
    images: { [asset.path]: recovered },
  }))
  const original = await readFile('transloadit-images.d.ts', 'utf8')
  const update = vi.fn(async () => ({ workspace: asset.workspace, public: [], images: {} }))
  await expect(updateStorageReceipts('recovery.json', update)).rejects.toThrow(
    /declarations.*images.json|images.json.*declarations/,
  )
  expect(update).not.toHaveBeenCalled()
  expect(await readFile('transloadit-images.d.ts', 'utf8')).toBe(original)
  await expect(stat('recovery.json')).rejects.toMatchObject({ code: 'ENOENT' })
})

test('an update preserves application metadata and the JSON schema link', async () => {
  const catalog = {
    workspace: asset.workspace,
    public: [],
    images: {},
    $schema: 'https://example.test/catalog.schema.json',
    application: { album: 'wedding' },
    delivery: { baseUrl: 'https://example.test', applicationNote: 'keep' },
  }
  await writeFile('images.json', JSON.stringify(catalog))
  await updateStorageReceipts('images.json', async (previous) => previous)
  expect(JSON.parse(await readFile('images.json', 'utf8'))).toEqual(catalog)
})

function storageApi(origin = 'http://storage.invalid'): nock.Scope {
  nock(origin)
    .get('/storage/public_prefixes')
    .query((query) => {
      if (typeof query.params !== 'string') return false
      expect(JSON.parse(query.params)).toMatchObject({ auth: { key: 'local-key' } })
      return true
    })
    .optionally()
    .reply(200, policy)
  return nock(origin)
    .get('/dam/assets')
    .query((query) => {
      if (typeof query.params !== 'string') return false
      expect(JSON.parse(query.params)).toMatchObject({ auth: { key: 'local-key' }, limit: 1 })
      return true
    })
    .reply(200, storagePage())
}

function listed(assets = [asset]): nock.Scope {
  return storageApi()
    .get('/dam/assets')
    .query((query) => JSON.parse(String(query.params)).prefix === 'website/')
    .reply(200, storagePage(assets))
}

function catalogJson(images: Record<string, unknown>): string {
  const boundImages = Object.fromEntries(
    Object.entries(images).map(([path, value]) => [
      path,
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? { apiOrigin: recovered.apiOrigin, ...value }
        : value,
    ]),
  )
  return `${JSON.stringify({ workspace: 'my-app', public: [], images: boundImages })}\n`
}

test('a fresh sync recovers pinned references and the declared delivery policy', async () => {
  listed()
  await runSync()
  expect(
    process.exitCode,
    JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls),
  ).toBeUndefined()
  expect(JSON.parse(await readFile('images.json', 'utf8'))).toEqual({
    workspace: 'my-app',
    apiOrigin: 'http://storage.invalid',
    public: ['website/'],
    images: { [asset.path]: recovered },
    delivery: {
      baseUrl: 'http://storage.invalid/file/{workspace}',
      urlParams: { cdn: 'required' },
    },
  })
  const types = await readFile('transloadit-images.d.ts', 'utf8')
  expect(types).toContain(asset.asset_id)
  expect(types).toContain(asset.version_id)
})

test.each([
  'same version',
  'new version',
  'new asset',
])('local placeholders survive only the same retained version: %s', async (kind) => {
  const thumbhash = '1QcSHQRnh493V4dIh4eXh1h4kJUI'
  await writeFile(
    'images.json',
    catalogJson({
      [asset.path]: { ...asset, thumbhash, hasAlpha: true, source: 'local-photo.png' },
    }),
  )
  const current = {
    ...asset,
    ...(kind === 'new version' ? { version_id: 'C'.repeat(21) + 'A' } : {}),
    ...(kind === 'new asset' ? { asset_id: 'D'.repeat(21) + 'A' } : {}),
  }
  // Matching bytes alone do not prove that this is still the same logical asset/version.
  listed([current])
  await runSync()
  expect(process.exitCode).toBeUndefined()
  const image = JSON.parse(await readFile('images.json', 'utf8')).images[asset.path]
  if (kind === 'same version')
    expect(image).toEqual({
      ...current,
      apiOrigin: recovered.apiOrigin,
      thumbhash,
      hasAlpha: true,
      source: 'local-photo.png',
    })
  else expect(image).toEqual({ ...current, apiOrigin: recovered.apiOrigin })
})

test.each([
  true,
  false,
])('unreadable policy preserves the catalog (existing: %s)', async (existing) => {
  const previous = catalogJson({ 'older.jpg': { retained: true } })
  if (existing) await writeFile('images.json', previous)
  nock('http://storage.invalid')
    .get('/storage/public_prefixes')
    .query(true)
    .reply(403, { error: 'INSUFFICIENT_AUTH_SCOPE', message: 'remote-secret-must-not-leak' })
  listed()
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    expect.stringContaining('Recovery incomplete: could not read the server public prefixes'),
  )
  expect(JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls)).not.toContain(
    'remote-secret',
  )
  if (existing) expect(await readFile('images.json', 'utf8')).toBe(previous)
  else await expect(readFile('images.json')).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readdir(directory)).not.toContain('images.json.lock')
})

test('replaces stale local policy with the server declarations, including a private workspace', async () => {
  await writeFile(
    'images.json',
    JSON.stringify({
      workspace: 'my-app',
      apiOrigin: 'http://storage.invalid',
      public: ['website/'],
      images: {},
    }),
  )
  nock('http://storage.invalid')
    .get('/storage/public_prefixes')
    .query(true)
    .reply(200, { ...policy, public_prefixes: [] })
  listed()
  await runSync()
  expect(process.exitCode).toBeUndefined()
  expect(JSON.parse(await readFile('images.json', 'utf8')).public).toEqual([])
  expect(OutputCtl.prototype.notice).toHaveBeenCalledWith(
    expect.stringContaining('No public prefixes are declared on the server'),
  )
  expect(OutputCtl.prototype.notice).toHaveBeenCalledWith(
    expect.stringMatching(/storage publish.*authorize/),
  )
})

test.each([
  'discovery',
  'listing',
  'body',
  'policy',
])('Ctrl-C cancels a stalled %s and releases the catalog lock', async (stage) => {
  nock.enableNetConnect('127.0.0.1')
  const listeners = process.listeners('SIGINT')
  const registrations = vi.spyOn(process, 'once')
  let stalled = false
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const params = JSON.parse(url.searchParams.get('params') ?? '{}')
    response.setHeader('Content-Type', 'application/json')
    if (stage !== 'discovery' && params.limit === 1)
      return void response.end(JSON.stringify(storagePage()))
    if (stage === 'policy' && url.pathname === '/dam/assets')
      return void response.end(JSON.stringify(storagePage([asset])))
    if (stage === 'body') response.write('{"ok":')
    stalled = true
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Expected a local port')
  const previous = catalogJson({
    'other.jpg': { retained: true, apiOrigin: `http://127.0.0.1:${address.port}` },
  })
  await writeFile('images.json', previous)
  const pending = runSync(['--endpoint', `http://127.0.0.1:${address.port}`])
  try {
    await expect.poll(() => stalled).toBe(true)
    const cancel = registrations.mock.calls.find(([event]) => event === 'SIGINT')?.[1]
    expect(cancel).toBeTypeOf('function')
    process.emit('SIGINT')
    expect(await Promise.race([pending.then(() => 'finished'), delay(3000, 'stalled')])).toBe(
      'finished',
    )
    expect(process.exitCode).toBe(1)
    expect(await readFile('images.json', 'utf8')).toBe(previous)
    expect(await readdir(directory)).toEqual(['credentials', 'images.json'])
    expect(process.listeners('SIGINT')).toEqual(expect.arrayContaining(listeners))
    expect(process.listeners('SIGINT')).not.toContain(cancel)
    expect(process.listeners('SIGTERM')).not.toContain(cancel)
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('canceled'))
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await pending
  }
})

test('defaults the rendering catalog to transloadit.images.json', async () => {
  const api = listed()
  await main(['storage', 'receipts', 'sync', 'website/'])
  expect(process.exitCode).toBeUndefined()
  expect(JSON.parse(await readFile('transloadit.images.json', 'utf8')).images[asset.path]).toEqual(
    recovered,
  )
  expect(api.isDone()).toBe(true)
})

test.each([
  { command: ['ls'] },
  { command: ['receipts', 'sync'] },
])('storage $command refuses a different key workspace before listing objects', async ({
  command,
}) => {
  await writeFile(
    'transloadit.images.json',
    JSON.stringify({ workspace: 'project-app', public: [], images: {} }),
  )
  const discovery = storageApi()
  await main(['storage', ...command, 'website/'])
  expect(discovery.isDone()).toBe(true)
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    'Project uses project-app; the selected credentials belong to my-app. Nothing uploaded.',
  )
  expect(OutputCtl.prototype.print).not.toHaveBeenCalled()
})

test('an explicit other workspace never retains upload evidence or claims to update the project catalog', async () => {
  const previous = JSON.stringify({
    workspace: 'other-app',
    public: ['website/'],
    images: { [asset.path]: { ...asset, workspace: 'other-app', source: 'private-photo.jpg' } },
  })
  await writeFile('images.json', previous)
  const api = listed()
  await runSync(['--workspace', 'my-app'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(await readFile('images.json', 'utf8')).toBe(previous)
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
    expect.stringContaining('Catalog unchanged'),
    { [asset.path]: recovered },
  )
})

test('rebuilds a pinned rendering catalog from bounded pages without per-file HEAD or image GETs', async () => {
  const second = storedAsset({
    asset_id: 'C'.repeat(21) + 'A',
    path: 'website/b.jpg',
    width: 1200,
    height: 900,
    size: 456,
    md5hash: undefined,
  })
  const api = storageApi()
    .get('/dam/assets')
    .query((query) => JSON.parse(String(query.params)).cursor === undefined)
    .reply(200, storagePage([asset], { next_cursor: asset.path }))
    .get('/dam/assets')
    .query((query) => JSON.parse(String(query.params)).cursor === asset.path)
    .reply(200, storagePage([second]))
  await runSync()
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  const expected = {
    [asset.path]: recovered,
    [second.path]: { ...second, apiOrigin: recovered.apiOrigin },
  }
  expect(JSON.parse(await readFile('images.json', 'utf8')).images).toEqual(expected)
  expect(await readFile('images.json', 'utf8')).toMatch(/\n$/)
  expect(await readdir(directory)).toEqual([
    'credentials',
    'images.json',
    'transloadit-images.d.ts',
  ])
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
    expect.stringContaining('Synced 2'),
    expected,
  )
})

test.each([
  0o022, 0o077,
])('creates a catalog using umask %i without changing credentials', async (mask) => {
  const setMask = process.umask
  const previousMask = setMask(mask)
  onTestFinished(() => {
    setMask(previousMask)
  })
  const maskRead = vi.spyOn(process, 'umask')
  await chmod('credentials', 0o600)
  const api = listed()
  await runSync()
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect((await stat('images.json')).mode & 0o777).toBe(0o666 & ~mask)
  expect((await stat('credentials')).mode & 0o777).toBe(0o600)
  expect(maskRead).not.toHaveBeenCalled()
})

test.each([
  'ls-discovery',
  'ls-body',
  'sync-discovery',
  'sync-list',
  'sync-body',
])('aborts stalled %s without replacing the catalog or holding its lock', async (operation) => {
  nock.enableNetConnect('127.0.0.1')
  const deadline = AbortSignal.timeout
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((timeout) =>
    deadline(timeout === 60_000 ? 500 : timeout),
  )
  let stalledRequests = 0
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const params = JSON.parse(url.searchParams.get('params') ?? '{}')
    response.setHeader('Content-Type', 'application/json')
    if (!operation.endsWith('-discovery') && params.limit === 1)
      return void response.end(JSON.stringify(storagePage()))
    if (operation.endsWith('-body')) response.write('{"ok":')
    stalledRequests += 1
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Expected a local port')
  const previous = catalogJson({
    'other.jpg': { owner: 'app', apiOrigin: `http://127.0.0.1:${address.port}` },
  })
  await writeFile('images.json', previous)
  const options = ['--endpoint', `http://127.0.0.1:${address.port}`]
  const command = operation.startsWith('ls')
    ? main(['storage', 'ls', 'website/', ...options])
    : runSync(options)
  try {
    expect(await Promise.race([command.then(() => 'finished'), delay(3000, 'stalled')])).toBe(
      'finished',
    )
    expect(process.exitCode).toBe(1)
    expect(stalledRequests).toBe(1)
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('timed out or lost its connection'),
    )
    expect(OutputCtl.prototype.print).not.toHaveBeenCalled()
    expect(await readFile('images.json', 'utf8')).toBe(previous)
    expect(await readdir(directory)).toEqual(['credentials', 'images.json'])
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await command
  }
})

test.each([
  undefined,
  'http://override.invalid',
])('keeps endpoint and credentials together with explicit override %j', async (endpoint) => {
  await writeFile(
    '.env',
    'TRANSLOADIT_AUTH_TOKEN=unrelated\nTRANSLOADIT_ENDPOINT=http://token.invalid\n',
  )
  const api = storageApi(endpoint).get('/dam/assets').query(true).reply(200, storagePage())
  await runSync(endpoint === undefined ? [] : ['--endpoint', endpoint])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(JSON.parse(await readFile('images.json', 'utf8')).images).toEqual({})
})

test('canonical version geometry and MIME replace stale local metadata without losing local evidence', async () => {
  await writeFile(
    'images.json',
    catalogJson({
      [asset.path]: { ...asset, width: 600, height: 800, mime: 'image/png', source: 'photo.jpg' },
    }),
  )
  listed()
  await runSync()
  expect(process.exitCode).toBeUndefined()
  expect(JSON.parse(await readFile('images.json', 'utf8')).images[asset.path]).toEqual({
    ...recovered,
    source: 'photo.jpg',
  })
})

test('refreshes matched entries without stale upload fields and preserves unmatched records verbatim', async () => {
  const previous = {
    ['__proto__']: { path: '__proto__' },
    'other/a.jpg': { owner: 'app' },
    'website/deleted.jpg': { kept: true },
    [asset.path]: { asset_id: 'old', size: 999, md5hash: 'stale' },
  }
  await writeFile('images.json', catalogJson(previous))
  await chmod('images.json', 0o640)
  listed()
  await runSync()
  expect(process.exitCode).toBeUndefined()
  expect(JSON.parse(await readFile('images.json', 'utf8')).images).toEqual({
    ...JSON.parse(catalogJson(previous)).images,
    [asset.path]: recovered,
  })
  expect((await stat('images.json')).mode & 0o777).toBe(0o640)
})

test.each([
  undefined,
  'a'.repeat(32),
])('retains only the canonical optional MD5, never a fabricated ETag: %s', async (md5hash) => {
  listed([{ ...asset, md5hash }])
  await runSync()
  expect(process.exitCode).toBeUndefined()
  expect(JSON.parse(await readFile('images.json', 'utf8')).images[asset.path]).toEqual({
    ...recovered,
    md5hash,
  })
})

test.each([
  undefined,
  0,
  -1,
  1.5,
  Number.MAX_SAFE_INTEGER + 1,
])('fails atomically for missing/invalid image dimensions %j', async (width) => {
  const previous = catalogJson({ unrelated: { keep: true } })
  await writeFile('images.json', previous)
  const api = listed([{ ...asset, width }])
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('width'))
  expect(await readFile('images.json', 'utf8')).toBe(previous)
  expect(await readdir(directory)).toEqual(['credentials', 'images.json'])
})

test.each([
  '',
  'loop',
])('rejects incomplete/repeated pagination before changing the file: %s', async (cursor) => {
  const previous = catalogJson({ keep: { ...recovered, path: 'keep' } })
  await writeFile('images.json', previous)
  const api = storageApi()
    .get('/dam/assets')
    .query(true)
    .reply(200, storagePage([], { next_cursor: cursor }))
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('cursor'))
  expect(await readFile('images.json', 'utf8')).toBe(previous)
})

test.each([
  'other/a.jpg',
  'website/../a.jpg',
])('rejects an unexpected or unsafe listed path %s without writing', async (path) => {
  const api = listed([{ ...asset, path }])
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    expect.stringContaining(JSON.stringify(path)),
  )
  expect(await readdir(directory)).toEqual(['credentials'])
})

test.each([
  403, 404, 503,
])('sanitizes catalog HTTP %i and preserves the entire previous catalog', async (status) => {
  const previous = catalogJson({ keep: { ...recovered, path: 'keep' } })
  await writeFile('images.json', previous)
  const api = storageApi()
    .get('/dam/assets')
    .query(true)
    .reply(status, { error: 'DAM_READ_FAILED', message: 'local-secret' })
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    `Storage receipt sync failed (HTTP ${status}). Check the Storage API at http://storage.invalid and the Auth Key dam:read or dam:write scope.`,
  )
  expect(vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join(' ')).not.toContain(
    'local-secret',
  )
  expect(await readFile('images.json', 'utf8')).toBe(previous)
})

test('does not save an earlier image when a later image lacks height', async () => {
  const previous = catalogJson({ keep: { ...recovered, path: 'keep' } })
  await writeFile('images.json', previous)
  listed([asset, storedAsset({ path: 'website/b.jpg', height: undefined })])
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('website/b.jpg'))
  expect(await readFile('images.json', 'utf8')).toBe(previous)
})

test('rejects duplicate paths instead of choosing arbitrary version metadata', async () => {
  const api = listed([asset, asset])
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('duplicate path'))
  expect(await readdir(directory)).toEqual(['credentials'])
})

test.each([
  'locked',
  'invalid JSON',
  'symlink',
])('refuses %s receipts before any network requests', async (kind) => {
  if (kind === 'locked') await writeFile('images.json.lock', '')
  else if (kind === 'symlink') await symlink('credentials', 'images.json')
  else await writeFile('images.json', '{')
  const api = storageApi()
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(false)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    expect.stringContaining(kind === 'symlink' ? 'regular JSON file' : kind),
  )
  if (kind !== 'locked') expect(await readdir(directory)).not.toContain('images.json.lock')
})

test('retains the new complete catalog and releases its lock if atomic replacement fails', async () => {
  const previous = catalogJson({ keep: { ...recovered, path: 'keep' } })
  await writeFile('images.json', previous)
  vi.mocked(rename).mockRejectedValueOnce(new Error('EACCES: rename denied'))
  listed()
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(await readFile('images.json', 'utf8')).toBe(previous)
  const files = await readdir(directory)
  expect(files).not.toContain('images.json.lock')
  const temporary = files.find((name) => name.endsWith('.tmp'))
  expect(temporary).toBeDefined()
  if (temporary === undefined) throw new Error('Expected retained complete catalog')
  expect(JSON.parse(await readFile(temporary, 'utf8')).images).toEqual({
    keep: { ...recovered, path: 'keep' },
    [asset.path]: recovered,
  })
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining(temporary))
})
