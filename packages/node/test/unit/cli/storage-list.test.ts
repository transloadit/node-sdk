import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { signParamsSync } from '@transloadit/utils/node'
import nock from 'nock'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'
import { storagePage, storedAsset } from './storage-fixtures.ts'

const originalCwd = process.cwd()
const stdoutListeners = process.stdout.listeners('error')
const stderrListeners = process.stderr.listeners('error')
let directory: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'storage-list-'))
  process.chdir(directory)
  await writeFile('credentials', 'TRANSLOADIT_KEY=local-key\nTRANSLOADIT_SECRET=local-secret\n')
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

test('listing help explains the available asset and version identities', async () => {
  await main(['storage', 'ls', '--help'])
  expect(process.stdout.write).toHaveBeenCalledWith(
    expect.stringContaining('asset/version identities'),
  )
})

test.each([
  undefined,
  'http://override.invalid',
])('uses the saved credentials endpoint, with only the explicit %j override taking precedence', async (endpoint) => {
  await writeFile(
    '.env',
    'TRANSLOADIT_AUTH_TOKEN=project-token\nTRANSLOADIT_ENDPOINT=http://token.invalid\n',
  )
  await writeFile(
    'credentials',
    'TRANSLOADIT_KEY=local-key\nTRANSLOADIT_SECRET=local-secret\nTRANSLOADIT_ENDPOINT=http://saved.invalid\n',
  )
  const intended = nock(endpoint ?? 'http://saved.invalid')
    .get('/dam/assets')
    .query((query) => {
      if (typeof query.params !== 'string') return false
      expect(JSON.parse(query.params)).toMatchObject({ auth: { key: 'local-key' } })
      expect(query.signature).toBe(signParamsSync(query.params, 'local-secret'))
      return true
    })
    .twice()
    .reply(200, storagePage())
  const unrelated = nock('http://token.invalid')
    .get('/dam/assets')
    .query(true)
    .reply(403, { error: 'INSUFFICIENT_AUTH_SCOPE' })
  await main([
    'storage',
    'ls',
    'website/',
    '--workspace',
    'my-app',
    ...(endpoint === undefined ? [] : ['--endpoint', endpoint]),
  ])
  expect(process.exitCode).toBeUndefined()
  expect(intended.isDone()).toBe(true)
  expect(unrelated.isDone()).toBe(false)
})

test.each([
  { ...storagePage(), workspace: undefined },
  { ...storagePage(), workspace: '' },
  storagePage([storedAsset({ workspace: 'other-app' })]),
])('refuses incomplete or inconsistent workspace discovery even with an override: %j', async (body) => {
  await writeFile(
    'transloadit.images.json',
    JSON.stringify({ workspace: 'my-app', public: [], images: {} }),
  )
  const discovery = nock('http://storage.invalid').get('/dam/assets').query(true).reply(200, body)
  const listing = nock('http://storage.invalid')
    .get('/dam/assets')
    .query(true)
    .reply(200, storagePage())
  await main([
    'storage',
    'ls',
    'website/',
    '--workspace',
    'my-app',
    '--endpoint',
    'http://storage.invalid',
  ])
  expect(discovery.isDone()).toBe(true)
  expect(listing.isDone()).toBe(false)
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.print).not.toHaveBeenCalled()
})

test('lists the key workspace and follows signed catalog cursors without an Assembly', async () => {
  const first = storedAsset()
  const second = storedAsset({ asset_id: 'C'.repeat(21) + 'A', path: 'website/b.jpg', size: 456 })
  const api = nock('http://storage.invalid')
    .get('/dam/assets')
    .query(true)
    .reply(200, storagePage())
    .get('/dam/assets')
    .query((query) => {
      const params = JSON.parse(String(query.params))
      return params.prefix === 'website/' && params.limit === 500 && params.cursor === undefined
    })
    .reply(200, storagePage([first], { next_cursor: first.path }))
    .get('/dam/assets')
    .query((query) => JSON.parse(String(query.params)).cursor === first.path)
    .reply(200, storagePage([second]))
  await main(['storage', 'ls', 'website/', '--endpoint', 'http://storage.invalid'])
  expect(
    process.exitCode,
    JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls),
  ).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(expect.stringContaining('website/a.jpg'), [
    first,
    second,
  ])
})

test('rejects a cursor inconsistent with its page instead of silently showing partial data', async () => {
  const api = nock('http://storage.invalid')
    .get('/dam/assets')
    .query(true)
    .reply(200, storagePage())
    .get('/dam/assets')
    .query(true)
    .reply(200, storagePage([storedAsset()], { next_cursor: 'wrong-path' }))
  await main([
    'storage',
    'ls',
    'website/',
    '--workspace',
    'my-app',
    '--endpoint',
    'http://storage.invalid',
  ])
  expect(api.isDone()).toBe(true)
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('cursor'))
  expect(OutputCtl.prototype.print).not.toHaveBeenCalled()
})

test('sanitizes remote list errors without exposing signed requests', async () => {
  const api = nock('http://storage.invalid')
    .get('/dam/assets')
    .query(true)
    .reply(403, { error: 'INSUFFICIENT_AUTH_SCOPE', message: 'secret-remote-message' })
  await main([
    'storage',
    'ls',
    'website/',
    '--workspace',
    'my-app',
    '--endpoint',
    'http://storage.invalid',
  ])
  expect(api.isDone()).toBe(true)
  expect(process.exitCode).toBe(1)
  expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
    'Storage listing failed (HTTP 403). Check the Storage API at http://storage.invalid and the Auth Key dam:read or dam:write scope.',
  )
})
