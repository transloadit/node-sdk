import type { AssemblyStatus } from '../../src/Transloadit.ts'

import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, expect, onTestFinished, test, vi } from 'vitest'

import { ApiError, InconsistentResponseError, Transloadit } from '../../src/Transloadit.ts'

const filePath = resolve(import.meta.dirname, '../e2e/fixtures/sample.jpg')
const bytes = await readFile(filePath)
const receipt = {
  asset_id: 'JN6OawlqFmL419U23jUKcg',
  md5hash: createHash('md5').update(bytes).digest('hex'),
  meta: { height: 100, width: 100 },
  path: 'website/photo.jpg',
  size: bytes.length,
}
const completed: AssemblyStatus = {
  assembly_id: 'completed-assembly',
  ok: 'ASSEMBLY_COMPLETED',
  results: { ':original': [receipt] },
}

function fixture(response: AssemblyStatus = completed) {
  const client = new Transloadit({
    authKey: 'test-key',
    authSecret: 'test-secret',
    endpoint: 'http://127.0.0.1:9',
  })
  const create = vi
    .spyOn(client, 'createAssembly')
    .mockImplementation(() =>
      Object.assign(Promise.resolve(response), { assemblyId: 'completed-assembly' }),
    )
  return { client, create }
}

afterEach(() => vi.restoreAllMocks())

test('stores one original at the exact destination and returns only the verified image receipt', async () => {
  const { client, create } = fixture()
  const result = await client.storeImage(filePath, { path: receipt.path })
  expect(result).toEqual({
    asset_id: receipt.asset_id,
    height: 100,
    md5hash: receipt.md5hash,
    path: receipt.path,
    size: bytes.length,
    width: 100,
  })
  expect(create).toHaveBeenCalledExactlyOnceWith({
    files: { image: filePath },
    params: {
      steps: {
        stored: {
          robot: '/transloadit/store',
          use: ':original',
          path: receipt.path,
          conflict_strategy: 'error',
        },
      },
    },
    waitForCompletion: true,
  })
})

test.each([
  ['missing results', { ...completed, results: undefined }],
  ['missing original', { ...completed, results: { stored: [receipt] } }],
  ['empty original', { ...completed, results: { ':original': [] } }],
  ['multiple originals', { ...completed, results: { ':original': [receipt, receipt] } }],
  ['incomplete Assembly', { ...completed, ok: 'ASSEMBLY_EXECUTING' }],
])('rejects %s while preserving the Assembly identifier for investigation', async (_name, response) => {
  const { client } = fixture(response)
  await expect(client.storeImage(filePath, { path: receipt.path })).rejects.toMatchObject({
    name: 'InconsistentResponseError',
    cause: { assemblyId: 'completed-assembly' },
  })
})

test.each([
  ['missing asset ID', { ...receipt, asset_id: undefined }],
  ['empty asset ID', { ...receipt, asset_id: '' }],
  ['whitespace asset ID', { ...receipt, asset_id: '  ' }],
  ['wrong path', { ...receipt, path: 'website/other.jpg' }],
  ['wrong byte count', { ...receipt, size: bytes.length + 1 }],
  ['missing checksum', { ...receipt, md5hash: undefined }],
  ['wrong checksum', { ...receipt, md5hash: 'f'.repeat(32) }],
  ['missing metadata', { ...receipt, meta: undefined }],
  ['missing width', { ...receipt, meta: { height: 100 } }],
  ['zero height', { ...receipt, meta: { width: 100, height: 0 } }],
  ['negative width', { ...receipt, meta: { width: -1, height: 100 } }],
  ['fractional height', { ...receipt, meta: { width: 100, height: 1.5 } }],
  ['unsafe width', { ...receipt, meta: { width: Number.MAX_SAFE_INTEGER + 1, height: 100 } }],
  ['non-finite height', { ...receipt, meta: { width: 100, height: Number.POSITIVE_INFINITY } }],
])('rejects a receipt with %s after writing', async (_name, invalid) => {
  const { client, create } = fixture({ ...completed, results: { ':original': [invalid] } })
  await expect(client.storeImage(filePath, { path: receipt.path })).rejects.toThrow(
    InconsistentResponseError,
  )
  expect(create).toHaveBeenCalledOnce()
})

test.each([
  '',
  'website/',
  '/website/photo.jpg',
  'website//photo.jpg',
  '../photo.jpg',
  'website/${file.url_name}',
  ' website/photo.jpg',
])('rejects incomplete or ambiguous destination %j before upload', async (path) => {
  const { client, create } = fixture()
  await expect(client.storeImage(filePath, { path })).rejects.toThrow(/path/)
  expect(create).not.toHaveBeenCalled()
})

test('preserves upload/polling options without permitting replacement instructions', async () => {
  const { client, create } = fixture()
  const controller = new AbortController()
  const onUploadProgress = vi.fn()
  const onAssemblyProgress = vi.fn()
  const options = {
    path: receipt.path,
    chunkSize: 64 * 1024,
    onUploadProgress,
    onAssemblyProgress,
    signal: controller.signal,
    timeout: 12_345,
    params: { steps: { unsafe: { robot: '/http/import', url: 'https://example.invalid/' } } },
    waitForCompletion: false,
  }
  const pending = client.storeImage(filePath, options)
  options.path = 'website/changed.jpg'
  await pending
  const sent = create.mock.calls[0]?.[0]
  expect(sent).toMatchObject({
    chunkSize: 64 * 1024,
    onUploadProgress,
    onAssemblyProgress,
    signal: controller.signal,
    timeout: 12_345,
    waitForCompletion: true,
  })
  expect(Object.keys(sent?.params?.steps ?? {})).toEqual(['stored'])
  sent?.onUploadProgress?.({ totalBytes: bytes.length, uploadedBytes: bytes.length })
  sent?.onAssemblyProgress?.(completed)
  expect(onUploadProgress).toHaveBeenCalledOnce()
  expect(onAssemblyProgress).toHaveBeenCalledWith(completed)
})

test('preserves conflict and timeout errors from the existing Assembly client', async () => {
  const { client, create } = fixture()
  const conflict = new ApiError({
    body: { error: 'STORAGE_PATH_CONFLICT', assembly_id: 'conflict' },
  })
  create.mockImplementationOnce(() => {
    throw conflict
  })
  await expect(client.storeImage(filePath, { path: receipt.path })).rejects.toBe(conflict)
  const timeout = new Error('Existing SDK timeout')
  create.mockImplementationOnce(() => {
    throw timeout
  })
  await expect(client.storeImage(filePath, { path: receipt.path })).rejects.toBe(timeout)
})

test.each([
  'before',
  'during',
])('honors cancellation %s checksum reading without starting an Assembly', async (when) => {
  const { client, create } = fixture()
  const controller = new AbortController()
  if (when === 'before') controller.abort()
  const pending = client.storeImage(filePath, { path: receipt.path, signal: controller.signal })
  if (when === 'during') controller.abort()
  await expect(pending).rejects.toHaveProperty('name', 'AbortError')
  expect(create).not.toHaveBeenCalled()
})

test('rejects empty and missing files before starting an Assembly', async () => {
  const { client, create } = fixture()
  await expect(
    client.storeImage(resolve(import.meta.dirname, '../e2e/fixtures/zerobytes.jpg'), {
      path: receipt.path,
    }),
  ).rejects.toThrow(/empty/)
  await expect(
    client.storeImage(`${filePath}.missing`, { path: receipt.path }),
  ).rejects.toMatchObject({ code: 'ENOENT' })
  expect(create).not.toHaveBeenCalled()
})

test('checksums input larger than a stream chunk without truncating the byte count', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'store-image-unit-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  const large = Buffer.alloc(256 * 1024, 42)
  const path = join(directory, 'large.jpg')
  await writeFile(path, large)
  const expected = createHash('md5').update(large).digest('hex')
  const { client } = fixture({
    ...completed,
    results: { ':original': [{ ...receipt, size: large.length, md5hash: expected }] },
  })
  await expect(client.storeImage(path, { path: receipt.path })).resolves.toMatchObject({
    md5hash: expected,
    size: large.length,
  })
})
