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
import { setTimeout } from 'node:timers'
import { setTimeout as delay } from 'node:timers/promises'

import nock from 'nock'
import { afterEach, beforeEach, expect, onTestFinished, test, vi } from 'vitest'

import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>()
  return { ...original, rename: vi.fn(original.rename) }
})

const originalCwd = process.cwd()
const stdoutListeners = process.stdout.listeners('error')
const stderrListeners = process.stderr.listeners('error')
const md5 = 'd41d8cd98f00b204e9800998ecf8427e'
const metadata = { 'x-amz-meta-dam-width': '800', 'x-amz-meta-dam-height': '600' }
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

function storageApi(origin = 'http://storage.invalid'): nock.Scope {
  nock(origin)
    .get('/storage/public_prefixes')
    .query((query) => {
      // Nock can inspect query matchers before choosing the matching path.
      if (typeof query.params !== 'string') return false
      expect(JSON.parse(query.params)).toMatchObject({ auth: { key: 'local-key' } })
      return true
    })
    .optionally()
    .reply(200, {
      ok: 'STORAGE_PUBLIC_PREFIXES_LISTED',
      public_prefixes: [{ prefix: 'website/', created_at: '2026-09-14T00:00:00Z' }],
    })
  return nock(origin, {
    reqheaders: {
      authorization: (value: string) => value.startsWith('AWS4-HMAC-SHA256 Credential=local-key/'),
    },
  })
    .get('/storage/')
    .query(true)
    .reply(
      200,
      '<ListAllMyBucketsResult><Buckets><Bucket><Name>my-app</Name></Bucket></Buckets></ListAllMyBucketsResult>',
    )
}

function listed(path = 'website/a.jpg'): nock.Scope {
  return storageApi()
    .get('/storage/my-app/')
    .query((query) => query.prefix === 'website/')
    .reply(
      200,
      `<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>${path}</Key><Size>123</Size></Contents></ListBucketResult>`,
    )
}

test('a fresh sync recovers the declared delivery policy, not just image dimensions', async () => {
  listed().head('/storage/my-app/website/a.jpg').reply(200, '', metadata)
  await runSync()
  expect(process.exitCode).toBeUndefined()
  expect(JSON.parse(await readFile('images.json', 'utf8'))).toEqual({
    workspace: 'my-app',
    public: ['website/'],
    images: { 'website/a.jpg': { path: 'website/a.jpg', width: 800, height: 600 } },
  })
})

test.each([
  false,
  true,
])('unreadable policy preserves the catalog (existing: %s)', async (existing) => {
  const previous = catalogJson({ 'older.jpg': { retained: true } })
  if (existing) await writeFile('images.json', previous)
  nock('http://storage.invalid')
    .get('/storage/public_prefixes')
    .query(true)
    .reply(403, { error: 'INSUFFICIENT_AUTH_SCOPE', message: 'remote-secret-must-not-leak' })
  listed().head('/storage/my-app/website/a.jpg').reply(200, '', metadata)
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

test('sync replaces stale local policy with the server declarations, including a private workspace', async () => {
  await writeFile(
    'images.json',
    JSON.stringify({ workspace: 'my-app', public: ['website/'], images: {} }),
  )
  nock('http://storage.invalid')
    .get('/storage/public_prefixes')
    .query(true)
    .reply(200, { ok: 'STORAGE_PUBLIC_PREFIXES_LISTED', public_prefixes: [] })
  listed().head('/storage/my-app/website/a.jpg').reply(200, '', metadata)
  await runSync()
  expect(process.exitCode).toBeUndefined()
  expect(JSON.parse(await readFile('images.json', 'utf8')).public).toEqual([])
})

test.each([
  'discovery',
  'listing',
  'HEAD',
  'policy',
])('Ctrl-C cancels a stalled %s and releases the catalog lock', async (stage) => {
  nock.enableNetConnect('127.0.0.1')
  const listeners = process.listeners('SIGINT')
  const registrations = vi.spyOn(process, 'once')
  const previous = catalogJson({ 'other.jpg': { retained: true } })
  await writeFile('images.json', previous)
  let stalled = false
  const server = createServer((request, response) => {
    if (stage !== 'discovery' && request.url?.split('?')[0] === '/storage/') {
      response.end(
        '<ListAllMyBucketsResult><Buckets><Bucket><Name>my-app</Name></Bucket></Buckets></ListAllMyBucketsResult>',
      )
      return
    }
    if (stage === 'policy' && request.method === 'HEAD') {
      response.writeHead(200, metadata).end()
      return
    }
    if (
      (stage === 'HEAD' || stage === 'policy') &&
      request.url?.startsWith('/storage/my-app/') &&
      request.method === 'GET'
    ) {
      response.end(
        '<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>website/a.jpg</Key><Size>123</Size></Contents></ListBucketResult>',
      )
      return
    }
    stalled = true
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Expected a local port')
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
    // The CLI's first dynamic imports may add a dependency's own process listeners.
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
  const api = listed().head('/storage/my-app/website/a.jpg').reply(200, '', metadata)
  await main(['storage', 'receipts', 'sync', 'website/'])
  expect(process.exitCode).toBeUndefined()
  expect(
    JSON.parse(await readFile('transloadit.images.json', 'utf8')).images['website/a.jpg'],
  ).toMatchObject({
    width: 800,
    height: 600,
  })
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
    images: {
      'website/a.jpg': {
        path: 'website/a.jpg',
        width: 800,
        height: 600,
        md5hash: md5,
        asset_id: 'other-workspace-id',
        size: 123,
      },
    },
  })
  await writeFile('images.json', previous)
  const api = listed()
    .head('/storage/my-app/website/a.jpg')
    .reply(200, '', { ...metadata, etag: `"${md5}"` })
  await runSync(['--workspace', 'my-app'])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(await readFile('images.json', 'utf8')).toBe(previous)
  const printed = vi.mocked(OutputCtl.prototype.print).mock.calls[0]
  expect(printed?.[1]).toEqual({
    'website/a.jpg': { path: 'website/a.jpg', width: 800, height: 600, md5hash: md5 },
  })
  expect(printed?.[0]).toContain('Catalog unchanged')
})

test('rebuilds a rendering catalog from paginated List + HEAD without asset IDs or image GETs', async () => {
  const api = storageApi()
    .get('/storage/my-app/')
    .query((query) => query.prefix === 'website/' && !query['continuation-token'])
    .reply(
      200,
      '<ListBucketResult><IsTruncated>true</IsTruncated><NextContinuationToken>next</NextContinuationToken><Contents><Key>website/a.jpg</Key><Size>123</Size><ETag>"stale-list-etag"</ETag></Contents></ListBucketResult>',
    )
    .get('/storage/my-app/')
    .query((query) => query['continuation-token'] === 'next')
    .reply(
      200,
      '<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>website/b.jpg</Key><Size>456</Size></Contents></ListBucketResult>',
    )
    .head('/storage/my-app/website/a.jpg')
    .reply(200, '', { ...metadata, etag: `"${md5}"` })
    .head('/storage/my-app/website/b.jpg')
    .reply(200, '', {
      'x-amz-meta-dam-width': '1200',
      'x-amz-meta-dam-height': '900',
      etag: '"multipart-2"',
    })
  await runSync()
  expect(
    process.exitCode,
    JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls),
  ).toBeUndefined()
  expect(api.isDone()).toBe(true)
  const expected = {
    'website/a.jpg': { path: 'website/a.jpg', width: 800, height: 600, md5hash: md5 },
    'website/b.jpg': { path: 'website/b.jpg', width: 1200, height: 900 },
  }
  expect(JSON.parse(await readFile('images.json', 'utf8')).images).toEqual(expected)
  expect(await readFile('images.json', 'utf8')).toMatch(/\n$/)
  expect(await readdir(directory)).toEqual(['credentials', 'images.json'])
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
    expect.stringContaining('Synced 2'),
    expected,
  )
})

test.each([
  0o022, 0o077,
])('creates a catalog using umask %i without changing credentials', async (mask) => {
  // This CLI suite runs in a separate process, just like its existing chdir-based fixtures.
  const setMask = process.umask
  const previousMask = setMask(mask)
  onTestFinished(() => {
    setMask(previousMask)
  })
  const maskRead = vi.spyOn(process, 'umask')
  await chmod('credentials', 0o600)
  const api = listed().head('/storage/my-app/website/a.jpg').reply(200, '', metadata)
  await runSync()
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect((await stat('images.json')).mode & 0o777).toBe(0o666 & ~mask)
  expect((await stat('credentials')).mode & 0o777).toBe(0o600)
  expect(maskRead).not.toHaveBeenCalled()
})

test.each([
  'ls',
  'ls-body',
  'sync-discovery',
  'sync-list',
  'sync-body',
  'sync-head',
])('aborts stalled %s requests and releases the catalog lock without replacing its contents', async (operation) => {
  nock.enableNetConnect('127.0.0.1')
  // Exercise Smithy's real HTTP handler and retries with accelerated header/body deadlines.
  vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, timeout, ...args) =>
    setTimeout(callback, timeout === 30_000 ? 100 : timeout, ...args),
  )
  const deadline = AbortSignal.timeout
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((timeout) =>
    deadline(timeout === 60_000 ? 1000 : timeout),
  )
  let stalledRequests = 0
  const server = createServer((request, response) => {
    // Bound catalogs discover ownership before listing, even with an explicit workspace.
    if (
      operation.startsWith('sync-') &&
      operation !== 'sync-discovery' &&
      request.url?.split('?')[0] === '/storage/'
    ) {
      response.end(
        '<ListAllMyBucketsResult><Buckets><Bucket><Name>my-app</Name></Bucket></Buckets></ListAllMyBucketsResult>',
      )
      return
    }
    if (operation === 'sync-head' && request.method === 'GET') {
      response.end(
        '<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>website/a.jpg</Key><Size>123</Size></Contents></ListBucketResult>',
      )
      return
    }
    if (operation.endsWith('-body')) response.write('<ListBucketResult>')
    stalledRequests += 1
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Expected a local port')
  const previous = catalogJson({ 'other.jpg': { owner: 'app' } })
  await writeFile('images.json', previous)
  const options = [
    '--endpoint',
    `http://127.0.0.1:${address.port}`,
    ...(operation === 'sync-discovery' ? [] : ['--workspace', 'my-app']),
  ]
  const command = operation.startsWith('ls')
    ? main(['storage', 'ls', 'website/', ...options])
    : runSync(options)
  try {
    expect(await Promise.race([command.then(() => 'finished'), delay(3000, 'stalled')])).toBe(
      'finished',
    )
    expect(process.exitCode).toBe(1)
    expect(stalledRequests).toBe(operation.endsWith('-body') ? 1 : 2)
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
  const api = storageApi(endpoint)
    .get('/storage/my-app/')
    .query(true)
    .reply(200, '<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>')
  await runSync(endpoint === undefined ? [] : ['--endpoint', endpoint])
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(JSON.parse(await readFile('images.json', 'utf8')).images).toEqual({})
})

test.each([
  md5,
  md5.toUpperCase(),
])('preserves upload evidence when the HEAD MD5 still matches %s', async (previousHash) => {
  const receipt = {
    path: 'website/a.jpg',
    width: 600,
    height: 800,
    md5hash: previousHash,
    asset_id: 'verified-asset',
    size: 123,
  }
  await writeFile('images.json', catalogJson({ [receipt.path]: receipt }))
  const api = listed()
    .head('/storage/my-app/website/a.jpg')
    .reply(200, '', { ...metadata, etag: `"${md5}"` })
  await runSync()
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(JSON.parse(await readFile('images.json', 'utf8')).images[receipt.path]).toEqual({
    ...receipt,
    width: 800,
    height: 600,
    md5hash: md5,
  })
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
    expect.stringContaining('Synced 1 rendering receipts and public policy'),
    expect.anything(),
  )
})

test('refreshes matched entries without stale upload fields and preserves unmatched records verbatim', async () => {
  const previous = {
    ['__proto__']: { path: '__proto__' },
    'other/a.jpg': { owner: 'app' },
    'website/deleted.jpg': { kept: true },
    'website/a.jpg': { asset_id: 'old', size: 999, md5hash: 'stale' },
  }
  await writeFile('images.json', catalogJson(previous))
  await chmod('images.json', 0o640)
  const api = listed().head('/storage/my-app/website/a.jpg').reply(200, '', metadata)
  await runSync()
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(JSON.parse(await readFile('images.json', 'utf8')).images).toEqual({
    ...previous,
    'website/a.jpg': { path: 'website/a.jpg', width: 800, height: 600 },
  })
  expect((await stat('images.json')).mode & 0o777).toBe(0o640)
})

test.each([
  [{ etag: `"${md5}"` }, md5],
  [{ etag: md5.toUpperCase() }, md5],
  [{ etag: `"${md5}"`, 'x-amz-server-side-encryption': 'AES256' }, md5],
  [{ etag: `"${md5}-2"` }, undefined],
  [{ etag: `W/"${md5}"` }, undefined],
  [{ etag: '"opaque"' }, undefined],
  [{ etag: `"${md5}"`, 'x-amz-server-side-encryption': 'aws:kms' }, undefined],
  [{ etag: `"${md5}"`, 'x-amz-server-side-encryption-customer-algorithm': 'AES256' }, undefined],
])('only records a compatible single-part MD5 ETag (%j)', async (headers, expectedMd5) => {
  const api = listed()
    .head('/storage/my-app/website/a.jpg')
    .reply(200, '', { ...metadata, ...headers })
  await runSync()
  expect(process.exitCode).toBeUndefined()
  expect(api.isDone()).toBe(true)
  const receipt = JSON.parse(await readFile('images.json', 'utf8')).images['website/a.jpg']
  expect(receipt.md5hash).toBe(expectedMd5)
  expect(receipt).not.toHaveProperty('asset_id')
})

test.each([
  undefined,
  '',
  '0',
  '-1',
  '1.5',
  'NaN',
  'Infinity',
  '1e3',
  '9007199254740992',
])('fails atomically for missing/invalid image dimensions %j', async (width) => {
  const previous = catalogJson({ unrelated: { keep: true } })
  await writeFile('images.json', previous)
  const api = listed()
    .head('/storage/my-app/website/a.jpg')
    .reply(200, '', {
      'x-amz-meta-dam-height': '600',
      ...(width === undefined ? {} : { 'x-amz-meta-dam-width': width }),
    })
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    expect.stringMatching(/website\/a.jpg.*dam-width.*dam-height/),
  )
  expect(await readFile('images.json', 'utf8')).toBe(previous)
  expect(await readdir(directory)).toEqual(['credentials', 'images.json'])
})

test.each([
  '<IsTruncated>true</IsTruncated>',
  '<IsTruncated>true</IsTruncated><NextContinuationToken>loop</NextContinuationToken>',
])('rejects incomplete/repeated pagination before changing the file', async (cursor) => {
  const previous = catalogJson({ keep: true })
  await writeFile('images.json', previous)
  const api = storageApi()
    .get('/storage/my-app/')
    .query(true)
    .times(cursor.includes('loop') ? 2 : 1)
    .reply(200, `<ListBucketResult>${cursor}</ListBucketResult>`)
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
  const api = listed(path)
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    expect.stringContaining(JSON.stringify(path)),
  )
  expect(await readdir(directory)).toEqual(['credentials'])
})

test.each([
  403, 404,
])('identifies a failed HEAD (HTTP %i) safely and preserves the entire previous catalog', async (status) => {
  const previous = catalogJson({ keep: true })
  await writeFile('images.json', previous)
  const api = listed()
    .head('/storage/my-app/website/a.jpg')
    .reply(status, '', { 'x-amz-error-message': 'local-secret' })
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    expect.stringContaining(`Storage HEAD failed for "website/a.jpg" (HTTP ${status})`),
  )
  expect(vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join(' ')).not.toContain(
    'local-secret',
  )
  expect(await readFile('images.json', 'utf8')).toBe(previous)
})

test('does not save an earlier successful HEAD when a later image lacks height', async () => {
  const previous = catalogJson({ keep: true })
  await writeFile('images.json', previous)
  const api = storageApi()
    .get('/storage/my-app/')
    .query(true)
    .reply(
      200,
      '<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>website/a.jpg</Key><Size>123</Size></Contents><Contents><Key>website/b.jpg</Key><Size>456</Size></Contents></ListBucketResult>',
    )
    .head('/storage/my-app/website/a.jpg')
    .reply(200, '', metadata)
    .head('/storage/my-app/website/b.jpg')
    .delay(30)
    .reply(200, '', { 'x-amz-meta-dam-width': '100' })
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('website/b.jpg'))
  expect(await readFile('images.json', 'utf8')).toBe(previous)
})

test('rejects duplicate paths instead of choosing an arbitrary HEAD response', async () => {
  const api = storageApi()
    .get('/storage/my-app/')
    .query(true)
    .reply(
      200,
      '<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>website/a.jpg</Key><Size>123</Size></Contents><Contents><Key>website/a.jpg</Key><Size>123</Size></Contents></ListBucketResult>',
    )
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
  const previous = catalogJson({ keep: true })
  await writeFile('images.json', previous)
  vi.mocked(rename).mockRejectedValueOnce(new Error('EACCES: rename denied'))
  const api = listed().head('/storage/my-app/website/a.jpg').reply(200, '', metadata)
  await runSync()
  expect(process.exitCode).toBe(1)
  expect(api.isDone()).toBe(true)
  expect(await readFile('images.json', 'utf8')).toBe(previous)
  const files = await readdir(directory)
  expect(files).not.toContain('images.json.lock')
  const temporary = files.find((name) => name.endsWith('.tmp'))
  expect(temporary).toBeDefined()
  if (temporary === undefined) throw new Error('Expected retained complete catalog')
  expect(JSON.parse(await readFile(temporary, 'utf8')).images).toEqual({
    keep: true,
    'website/a.jpg': { path: 'website/a.jpg', width: 800, height: 600 },
  })
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining(temporary))
})

function catalogJson(images: Record<string, unknown>): string {
  return `${JSON.stringify({ workspace: 'my-app', public: [], images })}\n`
}
