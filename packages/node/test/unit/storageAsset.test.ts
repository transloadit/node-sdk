import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, expect, onTestFinished, test, vi } from 'vitest'

import { InconsistentResponseError, Transloadit } from '../../src/Transloadit.ts'

afterEach(() => vi.restoreAllMocks())

async function fixture(mime = 'application/pdf', extension = 'pdf') {
  const directory = await mkdtemp(join(tmpdir(), 'store-asset-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  const file = join(directory, `original.${extension}`)
  const bytes = Buffer.from('original fixture bytes')
  await writeFile(file, bytes)
  const receipt = {
    workspace: 'my-app',
    asset_id: 'A'.repeat(22),
    version_id: `${'B'.repeat(21)}A`,
    path: `media/original.${extension}`,
    size: bytes.length,
    md5hash: createHash('md5').update(bytes).digest('hex'),
    mime,
  }
  const response = {
    assembly_id: 'completed',
    ok: 'ASSEMBLY_COMPLETED',
    results: { ':original': [receipt] },
  }
  const client = new Transloadit({
    authKey: 'test',
    authSecret: 'test',
    endpoint: 'http://127.0.0.1:9',
  })
  const create = vi.spyOn(client, 'createAssembly').mockResolvedValue(response)
  const get = vi.spyOn(client, 'getAssembly').mockResolvedValue(response)
  return { file, client, create, get, receipt, response }
}

test.each([
  ['video/mp4', 'mp4'],
  ['audio/mpeg', 'mp3'],
  ['application/pdf', 'pdf'],
  ['text/html', 'html'],
  ['image/x-canon-cr2', 'cr2'],
  ['application/zip', 'zip'],
])('stores and recovers %s without requiring dimensions or transforming bytes', async (mime, extension) => {
  const { client, create, get, file, receipt } = await fixture(mime, extension)
  await expect(client.storeAsset(file, { path: receipt.path })).resolves.toEqual(receipt)
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      files: { file },
      waitForCompletion: true,
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
    }),
  )
  await expect(
    client.getStoredAssetReceipt({ assemblyId: 'completed', expected: receipt }),
  ).resolves.toEqual(receipt)
  expect(create).toHaveBeenCalledOnce()
  expect(get).toHaveBeenCalledWith('completed')
})

test('preserves the actual completed receipt when original-byte fidelity fails', async () => {
  const { client, create, file, receipt, response } = await fixture()
  const changed = { ...receipt, md5hash: 'a'.repeat(32) }
  create.mockResolvedValue({ ...response, results: { ':original': [changed] } })
  const onReceipt = vi.fn()
  await expect(client.storeAsset(file, { path: receipt.path, onReceipt })).rejects.toMatchObject({
    cause: {
      assemblyId: 'completed',
      receipt: changed,
      expected: expect.objectContaining({ md5hash: receipt.md5hash }),
    },
  })
  expect(onReceipt).toHaveBeenCalledWith(
    changed,
    expect.objectContaining({ md5hash: receipt.md5hash }),
    'completed',
  )
  expect(create).toHaveBeenCalledOnce()
})

test('rejects mismatched recovery without another upload', async () => {
  const { client, create, receipt } = await fixture()
  await expect(
    client.getStoredAssetReceipt({ assemblyId: 'completed', expected: { ...receipt, size: 999 } }),
  ).rejects.toBeInstanceOf(InconsistentResponseError)
  expect(create).not.toHaveBeenCalled()
})

test('requires deliberate overwrite and propagates cancellation without uploading', async () => {
  const { client, create, file, receipt } = await fixture()
  await client.storeAsset(file, { path: receipt.path, overwrite: true })
  expect(create.mock.calls[0]?.[0]?.params?.steps?.stored).toMatchObject({
    conflict_strategy: 'overwrite',
  })
  create.mockClear()
  const signal = AbortSignal.abort()
  await expect(client.storeAsset(file, { path: receipt.path, signal })).rejects.toThrow()
  expect(create).not.toHaveBeenCalled()
})
