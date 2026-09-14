import type { AssemblyStatus } from '@transloadit/node'
import type { InterpolatableRobotTransloaditStoreInstructions } from '@transloadit/types/robots'

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
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

test('the packed CLI scaffolds an empty catalog and the actual constrained page used by the browser proof', async (t) => {
  const originalCwd = process.cwd()
  const directory = join(originalCwd, 'app/cli-image')
  const loginDirectory = await mkdtemp(join(tmpdir(), 'img-fixture-login-'))
  t.after(() => rm(loginDirectory, { recursive: true, force: true }))
  const credentials = join(loginDirectory, 'credentials')
  await writeFile(
    credentials,
    'TRANSLOADIT_KEY=assembly-key\nTRANSLOADIT_SECRET=assembly-secret\nTRANSLOADIT_WORKSPACE=fixture\nTRANSLOADIT_WORKSPACE_VERIFIED=true\n',
    { mode: 0o600 },
  )
  await mkdir(join(directory, 'app'), { recursive: true })
  const environment = { ...process.env }
  t.after(() => {
    process.chdir(originalCwd)
    process.env = environment
    process.exitCode = undefined
  })
  process.chdir(directory)
  for (const name of [
    'TRANSLOADIT_KEY',
    'TRANSLOADIT_SECRET',
    'TRANSLOADIT_AUTH_KEY',
    'TRANSLOADIT_AUTH_SECRET',
    'TRANSLOADIT_AUTH_TOKEN',
  ])
    delete process.env[name]
  process.env.TRANSLOADIT_CREDENTIALS_FILE = credentials
  const cli: { main: (args: string[]) => Promise<void> } = await import(
    new URL('./cli.js', import.meta.resolve('@transloadit/node')).href
  )
  const output: string[] = []
  t.mock.method(process.stdout, 'write', (chunk: string | Uint8Array) => {
    output.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString())
    return true
  })
  // Exercise the packed CLI and real receipt validation, including an older backend's
  // pre-Storage transformation. Only the remote Assembly response is simulated here.
  const stored = {
    ...receipt,
    path: 'website/hero.jpg',
    size: bytes.length + 27,
    md5hash: 'b'.repeat(32),
    meta: { width: 2400, height: 1600 },
  }
  const response: AssemblyStatus = {
    assembly_id: 'fixture-transformed-upload',
    ok: 'ASSEMBLY_COMPLETED',
    results: { ':original': [stored] },
  }
  t.mock.method(Transloadit.prototype, 'createAssembly', () =>
    Object.assign(Promise.resolve(response), { assemblyId: response.assembly_id }),
  )
  t.mock.method(Transloadit.prototype, 'publishStoragePrefix', async () => ({
    ok: 'STORAGE_PUBLIC_PREFIX_DECLARED',
    prefix: 'website/',
    created_at: '2026-09-13',
    created: true,
  }))
  await cli.main(['image', 'init', 'website', '--public'])
  assert.equal(process.exitCode, undefined)
  await assert.rejects(stat('.env.local'), { code: 'ENOENT' })
  assert.deepEqual(JSON.parse(await readFile('transloadit.images.json', 'utf8')), {
    workspace: 'fixture',
    public: ['website/'],
    images: {},
  })
  // Keep the genuine post-init/pre-upload state in the Next build and browser matrix too.
  await cp(directory, join(originalCwd, 'app/cli-empty'), { recursive: true })
  await writeFile('hero.jpg', bytes)
  await cli.main(['storage', 'store', './hero.jpg', 'website/hero.jpg'])
  assert.equal(process.exitCode, undefined)
  const catalog = JSON.parse(await readFile('transloadit.images.json', 'utf8'))
  assert.equal(catalog.images[stored.path].md5hash, stored.md5hash)
  assert.equal(catalog.images[stored.path].size, stored.size)
  const mixedCatalog = {
    ...catalog,
    images: {
      'accounts/avatar.jpg': { path: 'accounts/avatar.jpg', width: 200, height: 200 },
      ...catalog.images,
    },
  }
  // An unrelated private entry must not become the generated public example's first image.
  await writeFile('transloadit.images.json', `${JSON.stringify(mixedCatalog)}\n`)

  const privateDirectory = join(originalCwd, 'app/cli-private')
  await mkdir(join(privateDirectory, 'app'), { recursive: true })
  process.chdir(privateDirectory)
  await writeFile('transloadit.images.json', `${JSON.stringify(mixedCatalog)}\n`)
  await cli.main(['image', 'init', 'uploads/', '--private'])
  assert.equal(process.exitCode, undefined)
  // The generated factory must import successfully with preserved public policy, and its
  // example must stay empty when the catalog has images only outside uploads/.
  process.chdir(directory)
  const printed = output.join('')
  const page = await readFile('app/storage-image-example/page.tsx', 'utf8')
  assert(page.includes('width={960} priority'))
  assert(
    printed.includes('Render it with <StorageImage src="website/hero.jpg" alt="" width={960} />'),
  )
  assert(!printed.includes('export default function Page'))
  const factory = await readFile('lib/storageImage.ts', 'utf8')
  assert(factory.includes('createStorageImages(catalog)'))
  assert(!factory.includes('allowedPathPrefixes'))
  // Only the delivery origin changes for this offline fixture; the generated page is verbatim.
  await writeFile(
    'lib/storageImage.ts',
    factory.replace(
      'createStorageImages(catalog)',
      'createStorageImages({ ...catalog, baseUrl: `${process.env.IMG_FIXTURE_CDN_ORIGIN}/file/{workspace}` })',
    ),
  )
})

test('a failed second run of the documented command preserves the first receipt', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'img-seed-receipt-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const previous = `${JSON.stringify({ ...receipt, width: 1, height: 1 })}\n`
  await writeFile(join(directory, 'image.json'), previous)
  const documentation = await readFile(
    process.env.IMG_DOGFOOD_DOC ?? new URL('../../../docs/img-dogfood.md', import.meta.url),
    'utf8',
  )
  const command = documentation.match(
    /<!-- seed-receipt-command -->\n```bash\n([\s\S]*?)\n```/,
  )?.[1]
  assert(command, 'Expected the documented receipt command')
  const result = spawnSync('bash', ['-c', command], { cwd: directory, encoding: 'utf8' })
  assert.notEqual(result.status, 0, 'Missing seed credentials must fail')
  assert.equal(await readFile(join(directory, 'image.json'), 'utf8'), previous)
})

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
  assert.equal(model.fallbackUrl, 'https://cdn.example/image?w=320&h=240')
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
