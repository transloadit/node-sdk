import type { AssemblyStatus } from '../../src/Transloadit.ts'

import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import nock from 'nock'
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

afterEach(() => {
  vi.restoreAllMocks()
  nock.cleanAll()
})

test.each([
  'TRANSLOADIT_STORE_CONFLICT',
  'TRANSLOADIT_STORE_UNAVAILABLE',
] as const)('preserves %s when recovering a failed Assembly status', async (error) => {
  const failed = {
    assembly_id: completed.assembly_id,
    assembly_ssl_url: 'https://api2.transloadit.com/assemblies/completed-assembly',
    assembly_url: 'http://api2.transloadit.com/assemblies/completed-assembly',
    error,
    message: 'Storage write failed',
    reason: 'The requested destination could not be written',
  } satisfies AssemblyStatus
  const { client, create } = fixture()
  const api = nock('http://127.0.0.1:9')
    .get('/assemblies/completed-assembly')
    .query(true)
    .reply(200, failed)
  await expect(
    client.getStoredImageReceipt({
      assemblyId: 'completed-assembly',
      expected: { path: receipt.path, size: receipt.size, md5hash: receipt.md5hash },
    }),
  ).rejects.toMatchObject({
    name: 'ApiError',
    code: error,
    assemblyId: completed.assembly_id,
    assemblySslUrl: failed.assembly_ssl_url,
    rawMessage: failed.message,
    reason: failed.reason,
  })
  expect(create).not.toHaveBeenCalled()
  expect(api.isDone()).toBe(true)
})

test.each([
  'ASSEMBLY_UPLOADING',
  'ASSEMBLY_EXECUTING',
  'ASSEMBLY_REPLAYING',
] as const)('distinguishes %s from a malformed completed receipt', async (ok) => {
  const { client } = fixture()
  vi.spyOn(client, 'getAssembly').mockResolvedValue({ ...completed, ok, results: {} })
  await expect(
    client.getStoredImageReceipt({
      assemblyId: 'completed-assembly',
      expected: { path: receipt.path, size: receipt.size, md5hash: receipt.md5hash },
    }),
  ).rejects.toMatchObject({
    name: 'InconsistentResponseError',
    message: `The Storage Assembly is not complete (${ok})`,
    cause: { assemblyId: completed.assembly_id },
  })
})

test('reports canceled Assemblies distinctly when storing or recovering receipts', async () => {
  const canceled = { ...completed, ok: 'ASSEMBLY_CANCELED', results: {} } satisfies AssemblyStatus
  const { client } = fixture(canceled)
  vi.spyOn(client, 'getAssembly').mockResolvedValue(canceled)
  const expected = { path: receipt.path, size: receipt.size, md5hash: receipt.md5hash }
  await expect(client.storeImage(filePath, { path: receipt.path })).rejects.toMatchObject({
    message: expect.stringContaining('ASSEMBLY_CANCELED'),
    cause: { assemblyId: completed.assembly_id },
  })
  await expect(
    client.getStoredImageReceipt({ assemblyId: 'completed-assembly', expected }),
  ).rejects.toMatchObject({
    message: expect.stringContaining('ASSEMBLY_CANCELED'),
    cause: { assemblyId: completed.assembly_id },
  })
})

test('retrieves a verified receipt from a completed Assembly without uploading again', async () => {
  const { client, create } = fixture()
  const get = vi.spyOn(client, 'getAssembly').mockResolvedValue(completed)
  await expect(
    client.getStoredImageReceipt({
      assemblyId: 'completed-assembly',
      expected: { path: receipt.path, size: receipt.size, md5hash: receipt.md5hash },
    }),
  ).resolves.toEqual({
    asset_id: receipt.asset_id,
    path: receipt.path,
    size: receipt.size,
    md5hash: receipt.md5hash,
    width: 100,
    height: 100,
  })
  expect(get).toHaveBeenCalledExactlyOnceWith('completed-assembly')
  expect(create).not.toHaveBeenCalled()
})

test('explicit overwrite changes only the Storage conflict policy', async () => {
  const { client, create } = fixture()
  await client.storeImage(filePath, { path: receipt.path, overwrite: true })
  expect(create.mock.calls[0]?.[0]?.params?.steps).toEqual({
    stored: {
      robot: '/transloadit/store',
      use: ':original',
      path: receipt.path,
      conflict_strategy: 'overwrite',
    },
  })
})

test.each(['path', 'size', 'md5hash'])('recovery rejects an unexpected %s', async (field) => {
  const { client } = fixture()
  vi.spyOn(client, 'getAssembly').mockResolvedValue(completed)
  const expected = {
    path: receipt.path,
    size: receipt.size,
    md5hash: receipt.md5hash,
    [field]: field === 'size' ? 1 : field === 'path' ? 'other.jpg' : '0'.repeat(32),
  }
  await expect(
    client.getStoredImageReceipt({ assemblyId: 'completed-assembly', expected }),
  ).rejects.toMatchObject({
    name: 'InconsistentResponseError',
    cause: { assemblyId: 'completed-assembly' },
  })
})

test('recovery refuses malformed expectations before fetching', async () => {
  const { client } = fixture()
  const get = vi.spyOn(client, 'getAssembly')
  await expect(
    client.getStoredImageReceipt({
      assemblyId: 'completed-assembly',
      expected: { path: '../escape', size: -1, md5hash: 'invalid' },
    }),
  ).rejects.toThrow()
  expect(get).not.toHaveBeenCalled()
})

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
  { size: 71_336, md5hash: 'b'.repeat(32) },
  { size: bytes.length, md5hash: 'c'.repeat(32) },
])('returns stored metadata when the workspace transforms the upload: %j', async (stored) => {
  const { client } = fixture({
    ...completed,
    results: { ':original': [{ ...receipt, ...stored, meta: { width: 1200, height: 800 } }] },
  })
  await expect(client.storeImage(filePath, { path: receipt.path })).resolves.toEqual({
    asset_id: receipt.asset_id,
    path: receipt.path,
    ...stored,
    width: 1200,
    height: 800,
  })
})

test('reports input and stored receipt once, without letting an observer hide a completed write', async () => {
  const { client } = fixture()
  const onReceipt = vi.fn(() => {
    throw new Error('observer failed')
  })
  await expect(
    client.storeImage(filePath, { path: receipt.path, onReceipt }),
  ).resolves.toMatchObject({
    path: receipt.path,
    md5hash: receipt.md5hash,
  })
  expect(onReceipt).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ asset_id: receipt.asset_id }),
    { path: receipt.path, size: receipt.size, md5hash: receipt.md5hash },
    'completed-assembly',
  )
})

test('handles an async receipt observer rejection after returning a verified receipt', async () => {
  const { client } = fixture()
  const unhandled: unknown[] = []
  const observeUnhandled = (reason: unknown): void => {
    unhandled.push(reason)
  }
  process.on('unhandledRejection', observeUnhandled)
  try {
    let calls = 0
    function onReceipt(): Promise<void> {
      calls += 1
      return Promise.reject(new Error('async observer failed'))
    }
    await expect(
      client.storeImage(filePath, { path: receipt.path, onReceipt }),
    ).resolves.toMatchObject({
      asset_id: receipt.asset_id,
    })
    await new Promise<void>((resolve) => setImmediate(resolve))
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(calls).toBe(1)
    expect(unhandled).toEqual([])
  } finally {
    process.off('unhandledRejection', observeUnhandled)
  }
})

test.each<[string | number | null | undefined, number, number]>([
  [undefined, 450, 600],
  [null, 450, 600],
  ['Horizontal (normal)', 450, 600],
  ['Mirror horizontal', 450, 600],
  ['Rotate 180', 450, 600],
  ['Mirror vertical', 450, 600],
  ['Mirror horizontal and rotate 270 CW', 600, 450],
  ['Rotate 90 CW', 600, 450],
  ['Mirror horizontal and rotate 90 CW', 600, 450],
  ['Rotate 270 CW', 600, 450],
  [1, 450, 600],
  [2, 450, 600],
  [3, 450, 600],
  [4, 450, 600],
  [5, 600, 450],
  [6, 600, 450],
  [7, 600, 450],
  [8, 600, 450],
])('returns display dimensions for EXIF orientation %j', async (orientation, width, height) => {
  // API2's file-info/rotated_8.jpg.json reports 450×600 with "Rotate 90 CW".
  const meta = { width: 450, height: 600, orientation }
  const { client } = fixture({
    ...completed,
    results: { ':original': [{ ...receipt, meta }] },
  })
  await expect(client.storeImage(filePath, { path: receipt.path })).resolves.toMatchObject({
    width,
    height,
  })
  expect(meta).toEqual({ width: 450, height: 600, orientation })
  vi.spyOn(client, 'getAssembly').mockResolvedValue({
    ...completed,
    results: { ':original': [{ ...receipt, meta }] },
  })
  await expect(
    client.getStoredImageReceipt({
      assemblyId: 'completed-assembly',
      expected: { path: receipt.path, size: receipt.size, md5hash: receipt.md5hash },
    }),
  ).resolves.toMatchObject({ width, height })
})

test.each<[string, AssemblyStatus]>([
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
  ['zero byte count', { ...receipt, size: 0 }],
  ['missing checksum', { ...receipt, md5hash: undefined }],
  ['malformed checksum', { ...receipt, md5hash: 'not-an-md5' }],
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
  vi.spyOn(client, 'getAssembly').mockResolvedValue({
    ...completed,
    results: { ':original': [invalid] },
  })
  await expect(
    client.getStoredImageReceipt({
      assemblyId: 'completed-assembly',
      expected: { path: receipt.path, size: receipt.size, md5hash: receipt.md5hash },
    }),
  ).rejects.toThrow(InconsistentResponseError)
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
    body: { error: 'TRANSLOADIT_STORE_CONFLICT', assembly_id: 'conflict' },
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
