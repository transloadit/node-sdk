import type { AssemblyStatus } from '@transloadit/node'
import type { InterpolatableRobotTransloaditStoreInstructions } from '@transloadit/types/robots'

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createTransloaditImageModel } from '@transloadit/img'
import { Transloadit } from '@transloadit/node'
import sharp from 'sharp'

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
  const image = await seedStorageImage(client, filePath, receipt.path)
  assert.deepEqual(image, {
    asset_id: receipt.asset_id,
    height: 1,
    md5hash: receipt.md5hash,
    path: receipt.path,
    size: bytes.length,
    width: 1,
  })
  const model = createTransloaditImageModel(
    { src: image, expiresAt: Date.UTC(2030, 0, 1) },
    ({ input }) => {
      assert.equal(input, receipt.path)
      return `https://cdn.example/${input}`
    },
  )
  assert.equal(model.sources[0]?.candidates[0]?.width, image.width)
  assert.deepEqual(create.mock.calls[0]?.arguments[0], {
    chunkSize: undefined,
    files: { image: filePath },
    onAssemblyProgress: undefined,
    onUploadProgress: undefined,
    params: {
      steps: {
        stored: {
          robot: '/transloadit/store',
          use: ':original',
          path: receipt.path,
          conflict_strategy: 'error',
        } satisfies InterpolatableRobotTransloaditStoreInstructions,
      },
    },
    signal: undefined,
    timeout: undefined,
    waitForCompletion: true,
  })
})

test('orients a phone-photo receipt before generating proportional preview candidates', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'img-seed-rotated-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const filePath = join(directory, 'rotated.jpg')
  const rotated = await sharp({
    create: { width: 450, height: 600, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer()
  await writeFile(filePath, rotated)
  const { width, height, orientation } = await sharp(rotated).metadata()
  assert.deepEqual({ width, height, orientation }, { width: 450, height: 600, orientation: 6 })
  const client = new Transloadit({
    authKey: 'assembly-key',
    authSecret: 'assembly-secret',
    endpoint: 'http://127.0.0.1:9',
  })
  const path = 'website/rotated.jpg'
  // Match API2's EXIFTool metadata, including the label in its rotated_8.jpg fixture.
  const response: AssemblyStatus = {
    ok: 'ASSEMBLY_COMPLETED',
    results: {
      ':original': [
        {
          ...receipt,
          md5hash: createHash('md5').update(rotated).digest('hex'),
          meta: { width, height, orientation: 'Rotate 90 CW' },
          path,
          size: rotated.length,
        },
      ],
    },
  }
  t.mock.method(client, 'createAssembly', () =>
    Object.assign(Promise.resolve(response), { assemblyId: 'offline-assembly' }),
  )
  const image = await seedStorageImage(client, filePath, path)
  assert.equal(image.width, 600)
  assert.equal(image.height, 450)
  const model = createTransloaditImageModel(
    { src: image, expiresAt: Date.UTC(2030, 0, 1), widths: [320], formats: { webp: 75 } },
    ({ urlParams }) => `https://cdn.example/image?w=${urlParams?.w}&h=${urlParams?.h}`,
  )
  assert.equal(model.sources[0]?.candidates[0]?.url, 'https://cdn.example/image?w=320&h=240')
  assert.equal(model.fallbackUrl, 'https://cdn.example/image?w=600&h=450')
  const { info } = await sharp(rotated)
    .autoOrient()
    .resize(320)
    .webp()
    .toBuffer({ resolveWithObject: true })
  assert.deepEqual({ width: info.width, height: info.height }, { width: 320, height: 240 })
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
    await assert.rejects(
      seedStorageImage(client, filePath, receipt.path),
      /matching Storage image receipt/,
    )
  })
}
