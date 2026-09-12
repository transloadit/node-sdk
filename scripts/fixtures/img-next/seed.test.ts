import type { AssemblyStatus } from '@transloadit/node'

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { Transloadit } from '@transloadit/node'

import { seedStorageImage } from './seed.ts'

// A local 1x1 PNG keeps the seed recipe tests offline; the separate devdock canary uses real API2.
const bytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6nXcAAAAASUVORK5CYII=',
  'base64',
)
const receipt = {
  asset_id: 'JN6OawlqFmL419U23jUKcg',
  md5hash: createHash('md5').update(bytes).digest('hex'),
  meta: { height: 1, width: 1 },
  path: 'website/photo.png',
  size: bytes.length,
}

test('seeds one original and returns verified metadata for rendering without another lookup', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'img-seed-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const filePath = join(directory, 'photo.png')
  await writeFile(filePath, bytes)
  const client = new Transloadit({
    authKey: 'assembly-key',
    authSecret: 'assembly-secret',
    endpoint: 'http://127.0.0.1:9',
  })
  const response: AssemblyStatus = { ok: 'ASSEMBLY_COMPLETED', results: { ':original': [receipt] } }
  const create = t.mock.method(client, 'createAssembly', () =>
    Object.assign(Promise.resolve(response), { assemblyId: 'offline-assembly' }),
  )
  assert.deepEqual(await seedStorageImage(client, filePath), {
    asset_id: receipt.asset_id,
    height: 1,
    md5hash: receipt.md5hash,
    path: receipt.path,
    size: bytes.length,
    width: 1,
  })
  assert.deepEqual(create.mock.calls[0]?.arguments[0], {
    files: { photo: filePath },
    params: {
      steps: {
        stored: {
          robot: '/transloadit/store',
          use: ':original',
          path: 'website/${file.url_name}',
          conflict_strategy: 'error',
        },
      },
    },
    waitForCompletion: true,
  })
})

for (const missing of ['asset_id', 'path', 'size', 'md5hash', 'meta']) {
  test(`rejects a seed receipt missing ${missing}`, async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'img-seed-test-'))
    t.after(() => rm(directory, { recursive: true, force: true }))
    const filePath = join(directory, 'photo.png')
    await writeFile(filePath, bytes)
    const client = new Transloadit({
      authKey: 'assembly-key',
      authSecret: 'assembly-secret',
      endpoint: 'http://127.0.0.1:9',
    })
    const response: AssemblyStatus = {
      ok: 'ASSEMBLY_COMPLETED',
      results: { ':original': [{ ...receipt, [missing]: undefined }] },
    }
    t.mock.method(client, 'createAssembly', () =>
      Object.assign(Promise.resolve(response), { assemblyId: 'offline-assembly' }),
    )
    await assert.rejects(seedStorageImage(client, filePath), /matching Storage image receipt/)
  })
}
