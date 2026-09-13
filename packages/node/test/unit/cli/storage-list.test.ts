import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import nock from 'nock'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'

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
  const intended = nock(endpoint ?? 'http://saved.invalid', {
    reqheaders: {
      authorization: (value: string) => value.startsWith('AWS4-HMAC-SHA256 Credential=local-key/'),
    },
  })
    .get('/storage/my-app/')
    .query(true)
    .reply(200, '<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>')
  const unrelated = nock('http://token.invalid')
    .get('/storage/my-app/')
    .query(true)
    .reply(403, '<Error><Code>AccessDenied</Code></Error>')
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

test('lists the key workspace and follows signed S3 continuation tokens without an Assembly', async () => {
  const api = nock('http://storage.invalid', {
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
    .get('/storage/my-app/')
    .query(
      (query) =>
        query.prefix === 'website/' && query['list-type'] === '2' && !query['continuation-token'],
    )
    .reply(
      200,
      '<ListBucketResult><IsTruncated>true</IsTruncated><NextContinuationToken>next-page</NextContinuationToken><Contents><Key>website/a.jpg</Key><Size>123</Size><ETag>"hash-a"</ETag></Contents></ListBucketResult>',
    )
    .get('/storage/my-app/')
    .query((query) => query.prefix === 'website/' && query['continuation-token'] === 'next-page')
    .reply(
      200,
      '<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>website/b.jpg</Key><Size>456</Size></Contents></ListBucketResult>',
    )
  await main(['storage', 'ls', 'website/', '--endpoint', 'http://storage.invalid'])
  expect(
    process.exitCode,
    JSON.stringify(vi.mocked(OutputCtl.prototype.error).mock.calls),
  ).toBeUndefined()
  expect(api.isDone()).toBe(true)
  expect(OutputCtl.prototype.print).toHaveBeenCalledWith(expect.stringContaining('website/a.jpg'), [
    { path: 'website/a.jpg', size: 123, etag: '"hash-a"' },
    { path: 'website/b.jpg', size: 456 },
  ])
})

test('rejects a truncated listing with a missing cursor instead of silently showing partial data', async () => {
  const api = nock('http://storage.invalid')
    .get('/storage/my-app/')
    .query(true)
    .reply(200, '<ListBucketResult><IsTruncated>true</IsTruncated></ListBucketResult>')
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
    .get('/storage/my-app/')
    .query(true)
    .reply(403, '<Error><Code>AccessDenied</Code><Message>secret-remote-message</Message></Error>')
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
    'Storage listing failed (HTTP 403). Check that the Storage S3 API is enabled and that you are using the correct workspace and an Auth Key with read or dam:write scope.',
  )
})
