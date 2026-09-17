import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import nock from 'nock'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'

const originalCwd = process.cwd()
const origin = 'http://storage.invalid'
const asset = {
  workspace: 'my-app',
  asset_id: 'A'.repeat(22),
  version_id: 'B'.repeat(21) + 'A',
  path: 'website/a.jpg',
  width: 800,
  height: 600,
  mime: 'image/jpeg',
  size: 123,
}
const page = {
  ok: 'DAM_ASSETS_LISTED',
  message: 'Listed',
  workspace: 'my-app',
  assets: [asset],
  next_cursor: null,
}
let directory: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'storage-native-'))
  process.chdir(directory)
  await writeFile(
    'credentials',
    `TRANSLOADIT_KEY=local-key\nTRANSLOADIT_SECRET=local-secret\nTRANSLOADIT_ENDPOINT=${origin}\n`,
  )
  for (const name of [
    'TRANSLOADIT_KEY',
    'TRANSLOADIT_SECRET',
    'TRANSLOADIT_AUTH_KEY',
    'TRANSLOADIT_AUTH_SECRET',
    'TRANSLOADIT_AUTH_TOKEN',
    'TRANSLOADIT_ENDPOINT',
  ])
    vi.stubEnv(name, '')
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', join(directory, 'credentials'))
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
  await rm(directory, { recursive: true, force: true })
})

function discovery(): nock.Scope {
  return nock(origin)
    .get('/dam/assets')
    .query((query) => JSON.parse(String(query.params)).limit === 1)
    .reply(200, { ...page, assets: [] })
}

test('ls pages the native catalog and returns identities without S3 requests', async () => {
  const api = discovery()
    .get('/dam/assets')
    .query((query) => JSON.parse(String(query.params)).prefix === 'website/')
    .reply(200, { ...page, next_cursor: asset.path })
    .get('/dam/assets')
    .query((query) => JSON.parse(String(query.params)).cursor === asset.path)
    .reply(200, { ...page, assets: [{ ...asset, path: 'website/b.jpg' }] })
  await main(['storage', 'ls', 'website/'])
  expect(
    process.exitCode,
    JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls),
  ).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(expect.any(String), [
    asset,
    { ...asset, path: 'website/b.jpg' },
  ])
})

test('receipts sync recovers pinned identities, dimensions and public policy in native pages', async () => {
  const api = discovery()
    .get('/dam/assets')
    .query(true)
    .reply(200, page)
    .get('/storage/public_prefixes')
    .query(true)
    .reply(200, {
      ok: 'STORAGE_PUBLIC_PREFIXES_LISTED',
      public_prefixes: [{ prefix: 'website/', created_at: '2026-09-17T00:00:00Z' }],
    })
  await main(['storage', 'receipts', 'sync', 'website/'])
  expect(
    process.exitCode,
    JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls),
  ).toBeUndefined()
  expect(api.isDone()).toBe(true)
  const catalog = JSON.parse(await readFile('transloadit.images.json', 'utf8'))
  expect(catalog).toMatchObject({
    workspace: 'my-app',
    public: ['website/'],
    images: { [asset.path]: asset },
  })
  expect(await readFile('transloadit-images.d.ts', 'utf8')).toContain(asset.asset_id)
})

test('a later page failure preserves the whole catalog and releases its lock', async () => {
  const previous = JSON.stringify({ workspace: 'my-app', public: [], images: {} })
  await writeFile('transloadit.images.json', previous)
  discovery()
    .get('/dam/assets')
    .query(true)
    .reply(200, { ...page, next_cursor: asset.path })
    .get('/dam/assets')
    .query(true)
    .reply(503, { error: 'DAM_READ_FAILED', message: 'remote-secret' })
  await main(['storage', 'receipts', 'sync', 'website/'])
  expect(process.exitCode).toBe(1)
  expect(await readFile('transloadit.images.json', 'utf8')).toBe(previous)
  expect(await readdir(directory)).not.toContain('transloadit.images.json.lock')
  expect(JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls)).not.toContain(
    'remote-secret',
  )
})
