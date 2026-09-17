import { createHash } from 'node:crypto'
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import nock from 'nock'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../src/ApiError.ts'
import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'
import { Transloadit } from '../../../src/Transloadit.ts'
import { storagePage, storedAsset } from './storage-fixtures.ts'

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...original,
    readFile: vi.fn(original.readFile),
    rename: vi.fn(original.rename),
    rm: vi.fn(original.rm),
  }
})

const originalCwd = process.cwd()
const stdoutErrorListeners = process.stdout.listeners('error')
const stderrErrorListeners = process.stderr.listeners('error')
const receipt = {
  ...storedAsset(),
  apiOrigin: 'https://api2.transloadit.com',
  height: 600,
  md5hash: 'd41d8cd98f00b204e9800998ecf8427e',
  path: 'website/hero.jpg',
  size: 1234,
  width: 800,
}
let directory: string

beforeEach(async () => {
  vi.mocked(rm).mockReset()
  directory = await mkdtemp(join(tmpdir(), 'cli-storage-store-'))
  await writeFile(join(directory, 'credentials'), '')
  process.chdir(directory)
  vi.stubEnv('TRANSLOADIT_CREDENTIALS_FILE', join(directory, 'credentials'))
  vi.stubEnv('TRANSLOADIT_KEY', 'assembly-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'assembly-secret')
  vi.stubEnv('TRANSLOADIT_AUTH_TOKEN', '')
  vi.stubEnv('TRANSLOADIT_AUTH_KEY', '')
  vi.stubEnv('TRANSLOADIT_AUTH_SECRET', '')
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  vi.spyOn(OutputCtl.prototype, 'error').mockImplementation(() => {})
  vi.spyOn(OutputCtl.prototype, 'notice').mockImplementation(() => {})
  vi.spyOn(OutputCtl.prototype, 'warn').mockImplementation(() => {})
  vi.spyOn(OutputCtl.prototype, 'debug').mockImplementation(() => {})
  vi.spyOn(OutputCtl.prototype, 'print').mockImplementation(() => {})
  nock.disableNetConnect()
  nock('https://api2.transloadit.com')
    .persist()
    .get('/dam/assets')
    .query(true)
    .reply(200, storagePage([], { workspace: 'my-app' }))
})

afterEach(async () => {
  process.chdir(originalCwd)
  process.exitCode = undefined
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  nock.cleanAll()
  nock.enableNetConnect()
  // OutputCtl installs stream listeners per CLI invocation; do not leak them between tests.
  for (const listener of process.stdout.listeners('error')) {
    if (!stdoutErrorListeners.includes(listener)) process.stdout.off('error', listener)
  }
  for (const listener of process.stderr.listeners('error')) {
    if (!stderrErrorListeners.includes(listener)) process.stderr.off('error', listener)
  }
  await rm(directory, { recursive: true, force: true })
})

function runStore(path = receipt.path): Promise<void> {
  return main(['storage', 'store', './hero.jpg', path, '--receipts', 'images.json'])
}

describe('storage store', () => {
  test('plain uploads record API provenance so recovery cannot mix matching Workspace slugs', async () => {
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue({
      ...storedAsset(),
      path: receipt.path,
      width: 800,
      height: 600,
    })
    await runStore()
    expect(process.exitCode).toBeUndefined()
    expect(JSON.parse(await readFile('images.json', 'utf8')).images[receipt.path]).toMatchObject({
      apiOrigin: 'https://api2.transloadit.com',
    })
  })

  test('never writes a receipt from another Workspace into the verified project catalog', async () => {
    await writeFile('hero.jpg', Buffer.from('image'))
    const previous = catalogJson({})
    await writeFile('images.json', previous)
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue({
      ...receipt,
      workspace: 'other-app',
    })
    await runStore()
    expect(process.exitCode).toBe(1)
    expect(await readFile('images.json', 'utf8')).toBe(previous)
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('receipt belongs to Workspace'),
    )
  })
  test.each([
    ['website/hero.jpg', 'website/hero.HASH.jpg'],
    ['website/', 'website/local-photo.HASH.jpg'],
    ['website/v1.2/hero.large.png', 'website/v1.2/hero.large.HASH.png'],
    ['website/hero', 'website/hero.HASH'],
    ['website/.hero', 'website/.hero.HASH'],
  ])('hashes %s before the extension and uses that identity throughout the catalog', async (target, pattern) => {
    const bytes = Buffer.from('original image bytes')
    const md5hash = createHash('md5').update(bytes).digest('hex')
    const path = pattern.replace('HASH', md5hash.slice(0, 8))
    const stored = { ...receipt, path, md5hash, size: bytes.length }
    await writeFile('local-photo.jpg', bytes)
    const create = vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
      ok: 'ASSEMBLY_COMPLETED',
      results: { ':original': [{ ...stored, meta: { width: 800, height: 600 } }] },
    })
    await main(['storage', 'store', './local-photo.jpg', target, '--hashed'])
    expect(process.exitCode).toBeUndefined()
    expect(create).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        params: {
          steps: {
            stored: {
              robot: '/transloadit/store',
              use: ':original',
              path,
              conflict_strategy: 'error',
            },
          },
        },
      }),
    )
    const catalog = JSON.parse(await readFile('transloadit.images.json', 'utf8'))
    expect(catalog.images).toEqual({
      [path]: { ...stored, source: 'local-photo.jpg', apiOrigin: 'https://api2.transloadit.com' },
    })
    expect(await readFile('transloadit-images.d.ts', 'utf8')).toContain(
      `"${path}": { path: "${path}";`,
    )
    expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
      expect.stringContaining(`<Image storage src="${path}" alt="local photo"`),
      { ...stored, source: 'local-photo.jpg', apiOrigin: 'https://api2.transloadit.com' },
    )
  })

  test('reuses the same hashed bytes without an upload and gives changed bytes a new name', async () => {
    const bytes = Buffer.from('first')
    const changed = Buffer.from('replacement')
    const md5hash = createHash('md5').update(bytes).digest('hex')
    const nextHash = createHash('md5').update(changed).digest('hex')
    const first = {
      ...receipt,
      path: `website/hero.${md5hash.slice(0, 8)}.jpg`,
      md5hash,
      size: bytes.length,
      source: 'hero.jpg',
      apiOrigin: 'https://api2.transloadit.com',
    }
    const second = {
      ...first,
      path: `website/hero.${nextHash.slice(0, 8)}.jpg`,
      md5hash: nextHash,
      size: changed.length,
    }
    await writeFile('hero.jpg', bytes)
    const store = vi
      .spyOn(Transloadit.prototype, 'storeImage')
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second)
    const args = ['storage', 'store', './hero.jpg', 'website/', '--hashed']
    await main(args)
    expect(process.exitCode).toBeUndefined()
    const saved = await readFile('transloadit.images.json', 'utf8')
    await main(args)
    expect(process.exitCode).toBeUndefined()
    expect(store).toHaveBeenCalledOnce()
    expect(await readFile('transloadit.images.json', 'utf8')).toBe(saved)
    expect(OutputCtl.prototype.print).toHaveBeenLastCalledWith(
      expect.stringContaining(`Unchanged ${first.path}; no upload needed.`),
      first,
    )
    await writeFile('hero.jpg', changed)
    await main(args)
    expect(process.exitCode).toBeUndefined()
    expect(store).toHaveBeenCalledTimes(2)
    expect(store.mock.calls[1]?.[1]).toMatchObject({ path: second.path })
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8')).images).toEqual({
      [first.path]: first,
      [second.path]: second,
    })
  })

  test('native recovery migrates a legacy hashed receipt and enables a no-upload replay', async () => {
    const bytes = Buffer.from('unchanged legacy upload')
    const md5hash = createHash('md5').update(bytes).digest('hex')
    const path = `website/hero.${md5hash.slice(0, 8)}.jpg`
    const current = { ...receipt, path, md5hash, size: bytes.length }
    await writeFile('hero.jpg', bytes)
    await writeFile(
      'transloadit.images.json',
      catalogJson({ [path]: { path, md5hash, size: bytes.length, width: 800, height: 600 } }),
    )
    const store = vi.spyOn(Transloadit.prototype, 'storeImage')
    const args = ['storage', 'store', './hero.jpg', 'website/', '--hashed']
    await main(args)
    expect(process.exitCode).toBe(1)
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringMatching(/storage receipts sync.*same API environment/),
    )
    process.exitCode = undefined
    vi.spyOn(Transloadit.prototype, 'listStoredAssets').mockImplementation(async (options) =>
      storagePage(options?.limit === 1 ? [] : [current]),
    )
    vi.spyOn(Transloadit.prototype, 'listPublicStoragePrefixes').mockResolvedValue({
      ok: 'STORAGE_PUBLIC_PREFIXES_LISTED',
      public_prefixes: [],
    })
    await main(['storage', 'receipts', 'sync', 'website/'])
    expect(process.exitCode).toBeUndefined()
    await main(args)
    expect(process.exitCode).toBeUndefined()
    expect(store).not.toHaveBeenCalled()
    expect(OutputCtl.prototype.print).toHaveBeenLastCalledWith(
      expect.stringContaining('no upload needed'),
      { ...current, apiOrigin: 'https://api2.transloadit.com' },
    )
  })

  test.each([
    'checksum',
    'size',
    'path',
    'dimensions',
  ])('does not reuse a hashed receipt with different %s', async (difference) => {
    const bytes = Buffer.from('original')
    const md5hash = createHash('md5').update(bytes).digest('hex')
    const path = `website/hero.${md5hash.slice(0, 8)}.jpg`
    const old = {
      ...receipt,
      apiOrigin: 'https://api2.transloadit.com',
      path,
      md5hash,
      size: bytes.length,
      ...(difference === 'checksum' ? { md5hash: `${md5hash.slice(0, 8)}${'0'.repeat(24)}` } : {}),
      ...(difference === 'size' ? { size: bytes.length + 1 } : {}),
      ...(difference === 'path' ? { path: 'another/path.jpg' } : {}),
      ...(difference === 'dimensions' ? { width: 0 } : {}),
    }
    await writeFile('hero.jpg', bytes)
    const previous = catalogJson({ [path]: old })
    await writeFile('transloadit.images.json', previous)
    const store = vi.spyOn(Transloadit.prototype, 'storeImage')
    await main(['storage', 'store', './hero.jpg', 'website/hero.jpg', '--hashed'])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(await readFile('transloadit.images.json', 'utf8')).toBe(previous)
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining(path))
    expect(OutputCtl.prototype.error).not.toHaveBeenCalledWith(
      expect.stringContaining('--overwrite'),
    )
  })

  test('hashed and overwrite cannot be combined', async () => {
    const store = vi.spyOn(Transloadit.prototype, 'storeImage')
    await main(['storage', 'store', './hero.jpg', receipt.path, '--hashed', '--overwrite'])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('--hashed cannot be combined with --overwrite'),
    )
  })

  test.each([
    'https://api2-devdock.transloadit.dev',
    undefined,
  ])('never reuses same-slug receipts from an unverified API origin (%s)', async (apiOrigin) => {
    const bytes = Buffer.from('original')
    const md5hash = createHash('md5').update(bytes).digest('hex')
    const path = `website/hero.${md5hash.slice(0, 8)}.jpg`
    const previous = catalogJson({
      [path]: { ...receipt, path, md5hash, size: bytes.length, apiOrigin },
    })
    await writeFile('hero.jpg', bytes)
    await writeFile('transloadit.images.json', previous)
    const store = vi.spyOn(Transloadit.prototype, 'storeImage')
    await main(['storage', 'store', './hero.jpg', receipt.path, '--hashed'])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(await readFile('transloadit.images.json', 'utf8')).toBe(previous)
    expect(OutputCtl.prototype.print).not.toHaveBeenCalled()
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringMatching(/API (?:environment|origin).*--receipts/),
    )
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('--receipts'))
  })

  test('deduplicates a hashed batch even when an explicit workspace override leaves the catalog unchanged', async () => {
    const bytes = Buffer.from('original')
    const md5hash = createHash('md5').update(bytes).digest('hex')
    const path = `website/hero.${md5hash.slice(0, 8)}.jpg`
    const previous = JSON.stringify({ workspace: 'other-app', public: [], images: {} })
    await writeFile('transloadit.images.json', previous)
    await mkdir('a')
    await mkdir('b')
    await writeFile('a/hero.jpg', bytes)
    await writeFile('b/hero.jpg', bytes)
    const store = vi
      .spyOn(Transloadit.prototype, 'storeImage')
      .mockResolvedValueOnce({ ...receipt, path, md5hash, size: bytes.length })
      .mockRejectedValueOnce(new ApiError({ body: { error: 'TRANSLOADIT_STORE_CONFLICT' } }))
    await main([
      'storage',
      'store',
      './a/hero.jpg',
      './b/hero.jpg',
      'website/',
      '--hashed',
      '--workspace',
      'my-app',
    ])
    expect(process.exitCode).toBeUndefined()
    expect(store).toHaveBeenCalledOnce()
    expect(await readFile('transloadit.images.json', 'utf8')).toBe(previous)
    expect(OutputCtl.prototype.print).toHaveBeenLastCalledWith(
      expect.stringContaining(`Unchanged ${path}; no upload needed.`),
      expect.objectContaining({ path }),
    )
  })

  test('explains why restoring the same transformed receipt cannot make a hashed replay succeed', async () => {
    const bytes = Buffer.from('original')
    const hash = createHash('md5').update(bytes).digest('hex').slice(0, 8)
    const path = `website/hero.${hash}.jpg`
    const stored = {
      ...receipt,
      path,
      size: bytes.length + 27,
      md5hash: 'b'.repeat(32),
      source: 'hero.jpg',
      apiOrigin: 'https://api2.transloadit.com',
    }
    const previous = catalogJson({ [path]: stored })
    await writeFile('hero.jpg', bytes)
    await writeFile('transloadit.images.json', previous)
    const store = vi.spyOn(Transloadit.prototype, 'storeImage')
    await main(['storage', 'store', './hero.jpg', receipt.path, '--hashed'])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(await readFile('transloadit.images.json', 'utf8')).toBe(previous)
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('transformed the upload'),
    )
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Restoring the same receipt will not help'),
    )
    expect(OutputCtl.prototype.error).not.toHaveBeenCalledWith(
      expect.stringContaining('--overwrite'),
    )
  })

  test('hashed destinations with conflicting remote objects never suggest overwriting', async () => {
    await writeFile('hero.jpg', 'original')
    const hash = createHash('md5').update('original').digest('hex').slice(0, 8)
    vi.spyOn(Transloadit.prototype, 'storeImage').mockRejectedValue(
      new ApiError({ body: { error: 'TRANSLOADIT_STORE_CONFLICT' } }),
    )
    await main(['storage', 'store', './hero.jpg', receipt.path, '--hashed'])
    expect(process.exitCode).toBe(1)
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining(`website/hero.${hash}.jpg`),
    )
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Restore its catalog receipt'),
    )
    expect(OutputCtl.prototype.error).not.toHaveBeenCalledWith(
      expect.stringContaining('--overwrite'),
    )
  })

  test('hashed batches accept equal basenames with different contents', async () => {
    await mkdir('a')
    await mkdir('b')
    await writeFile('a/hero.jpg', 'a')
    await writeFile('b/hero.jpg', 'b')
    const store = vi
      .spyOn(Transloadit.prototype, 'storeImage')
      .mockImplementation(async (file, options) => ({
        ...receipt,
        path: options.path,
        size: 1,
        md5hash: createHash('md5')
          .update(await readFile(file))
          .digest('hex'),
      }))
    await main(['storage', 'store', './a/hero.jpg', './b/hero.jpg', 'website/', '--hashed'])
    expect(process.exitCode).toBeUndefined()
    expect(store).toHaveBeenCalledTimes(2)
    expect(
      Object.keys(JSON.parse(await readFile('transloadit.images.json', 'utf8')).images),
    ).toEqual(['website/hero.0cc175b9.jpg', 'website/hero.92eb5ffe.jpg'])
  })

  test('hash suffixes still respect the maximum Storage path length before uploading', async () => {
    await writeFile('hero.jpg', 'original')
    const store = vi.spyOn(Transloadit.prototype, 'storeImage')
    await main(['storage', 'store', './hero.jpg', `${'x'.repeat(1020)}.jpg`, '--hashed'])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('1024'))
  })

  test('saves optional ThumbHash metadata without advising blur for a private image', async () => {
    const blurred = { ...receipt, hasAlpha: true, thumbhash: '1QcSHQRnh493V4dIh4eXh1h4kJUI' }
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(blurred)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    expect(JSON.parse(await readFile('images.json', 'utf8')).images[receipt.path]).toEqual(blurred)
    expect(await readFile('transloadit-images.d.ts', 'utf8')).toContain('thumbhash?: string')
    expect(await readFile('transloadit-images.d.ts', 'utf8')).toContain('hasAlpha?: boolean')
    expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
      expect.not.stringContaining('placeholder="blur"'),
      blurred,
    )
    expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
      expect.stringContaining('This directory is private.'),
      blurred,
    )
  })

  test.each([
    {
      prefixes: ['website/'],
      thumbhash: '1QcSHQRnh493V4dIh4eXh1h4kJUI',
      hasAlpha: false,
      blur: true,
    },
    { prefixes: ['website/'], thumbhash: undefined, hasAlpha: false, blur: false },
    {
      prefixes: ['website/'],
      thumbhash: '1QcSHQRnh493V4dIh4eXh1h4kJUI',
      hasAlpha: true,
      blur: false,
    },
    {
      prefixes: ['website/other/'],
      thumbhash: '1QcSHQRnh493V4dIh4eXh1h4kJUI',
      hasAlpha: false,
      blur: false,
    },
  ])('matches rendering advice to existing publication and receipt metadata: %j', async ({
    prefixes,
    thumbhash,
    hasAlpha,
    blur,
  }) => {
    await writeFile(
      'images.json',
      JSON.stringify({
        workspace: 'my-app',
        apiOrigin: receipt.apiOrigin,
        public: prefixes,
        images: {},
      }),
    )
    const stored = { ...receipt, thumbhash, ...(hasAlpha ? { hasAlpha: true } : {}) }
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(stored)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    const text = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(text?.includes('placeholder="blur"')).toBe(blur)
    expect(text?.includes('This directory is private.')).toBe(!prefixes.includes('website/'))
  })

  test('private next steps name the files, application key and restart, using the custom catalog', async () => {
    await mkdir('src/app', { recursive: true })
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    const text = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(text).toContain('transloadit.authorize.ts')
    expect(text).toContain('src/app/api/storage-images/route.ts')
    expect(text).toContain(
      'npx transloadit image init --private --receipts=images.json -- website/',
    )
    expect(text).toContain('TRANSLOADIT_SMART_CDN_KEY/SECRET')
    expect(text).toContain('Restart next dev after adding them.')
    expect(text).not.toContain('placeholder="blur"')
  })

  test.each([
    'ts',
    'mjs',
    'js',
  ])('prints a missing next.config.%s wrapper without executing or editing it', async (extension) => {
    const file = `next.config.${extension}`
    const source = 'throw new Error("the CLI must not execute this config")\n'
    await writeFile(file, source)
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    const text = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(text).toContain(`${file} is not wrapped yet`)
    expect(text).toContain(
      "import { withTransloaditImages } from '@transloadit/viewer/next/config'",
    )
    expect(text).toContain('export default withTransloaditImages(nextConfig)')
    expect(await readFile(file, 'utf8')).toBe(source)
  })

  test('omits wrapper advice when a config already uses the plugin', async () => {
    await writeFile('next.config.ts', 'export default withTransloaditImages(nextConfig)\n')
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    const text = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(text).not.toContain('is not wrapped yet')
  })

  test('the ESM wrapper advice explains migration from a CommonJS Next config', async () => {
    const source = 'module.exports = { reactStrictMode: true }\n'
    await writeFile('next.config.js', source)
    await writeFile('package.json', '{"type":"commonjs"}\n')
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    const text = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(text).toContain('For CommonJS, rename next.config.js to next.config.mjs')
    expect(text).toContain('convert require/module.exports to import/export')
    expect(await readFile('next.config.js', 'utf8')).toBe(source)
    await expect(stat('next.config.mjs')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  test('does not infer destination privacy from a different workspace catalog left unchanged', async () => {
    const previous = JSON.stringify({ workspace: 'other-app', public: ['website/'], images: {} })
    await writeFile('images.json', previous)
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await main([
      'storage',
      'store',
      './hero.jpg',
      receipt.path,
      '--receipts',
      'images.json',
      '--workspace',
      'my-app',
    ])
    expect(process.exitCode).toBeUndefined()
    expect(await readFile('images.json', 'utf8')).toBe(previous)
    const text = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(text).toContain('the different-workspace project catalog was left unchanged')
    expect(text).not.toContain('<Image')
    expect(text).toContain('separate catalog')
    expect(text).not.toContain('This directory is private.')
    expect(text).not.toContain('image init')
    expect(text).not.toContain('placeholder="blur"')
    expect(OutputCtl.prototype.notice).toHaveBeenCalledWith(
      expect.stringContaining('Use --receipts for a separate catalog.'),
    )
  })

  test('prints shared private setup and config advice once for a multi-file upload', async () => {
    await writeFile('next.config.ts', 'export default {}\n')
    vi.spyOn(Transloadit.prototype, 'storeImage').mockImplementation(async (_file, options) => ({
      ...receipt,
      path: options.path,
    }))
    await main(['storage', 'store', './a.jpg', './b.jpg', 'website/'])
    expect(process.exitCode).toBeUndefined()
    const output = vi
      .mocked(OutputCtl.prototype.print)
      .mock.calls.map(([text]) => text)
      .join('\n')
    expect(output).toContain('Saved website/a.jpg')
    expect(output).toContain('Saved website/b.jpg')
    expect(output.split('This directory is private.')).toHaveLength(2)
    expect(output.split('is not wrapped yet')).toHaveLength(2)
  })
  test('generated declarations cannot overwrite the catalog or input image', async () => {
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await main([
      'storage',
      'store',
      './hero.jpg',
      receipt.path,
      '--receipts',
      'transloadit-images.d.ts',
    ])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    process.exitCode = undefined
    await main(['storage', 'store', './transloadit-images.d.ts', receipt.path])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
  })

  test('a handwritten declarations file is preserved before any upload', async () => {
    const previous = "declare module 'my-app' {}\n"
    await writeFile('transloadit-images.d.ts', previous)
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await main(['storage', 'store', './hero.jpg', receipt.path])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(await readFile('transloadit-images.d.ts', 'utf8')).toBe(previous)
  })

  test('upload output names both generated files to commit', async () => {
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
      expect.stringContaining('transloadit-images.d.ts'),
      receipt,
    )
    expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
      expect.stringContaining('Replace alt with a description'),
      receipt,
    )
  })

  test('accepts generated declarations after a Windows checkout converts them to CRLF', async () => {
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    const types = await readFile('transloadit-images.d.ts', 'utf8')
    await writeFile('transloadit-images.d.ts', types.replaceAll('\n', '\r\n'))
    await runStore()
    expect(process.exitCode).toBeUndefined()
    expect(store).toHaveBeenCalledTimes(2)
    expect(await readFile('transloadit-images.d.ts', 'utf8')).toBe(types)
  })

  test('the first public store creates a catalog and generated types without image init', async () => {
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    const publish = vi
      .spyOn(Transloadit.prototype, 'publishStoragePrefix')
      .mockImplementation(() => {
        expect(OutputCtl.prototype.notice).toHaveBeenCalledWith(
          'Publishing website/ recursively: all current and future objects under this prefix will be public.',
        )
        return Promise.resolve({
          ok: 'STORAGE_PUBLIC_PREFIX_DECLARED',
          prefix: 'website/',
          created: false,
          created_at: '',
        })
      })
    await main(['storage', 'store', './hero.jpg', receipt.path, '--public'])
    expect(process.exitCode).toBeUndefined()
    expect(publish).toHaveBeenCalledExactlyOnceWith('website/', { signal: expect.any(AbortSignal) })
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual({
      workspace: 'my-app',
      apiOrigin: receipt.apiOrigin,
      public: ['website/'],
      images: { [receipt.path]: receipt },
    })
    const types = await readFile('transloadit-images.d.ts', 'utf8')
    expect(types).toContain("declare module '@transloadit/viewer/next'")
    expect(types).toContain(
      `"website/hero.jpg": { path: "website/hero.jpg"; workspace: "my-app"; asset_id: "${receipt.asset_id}"; version_id: "${receipt.version_id}"; width: 800; height: 600; thumbhash?: string; hasAlpha?: boolean }`,
    )
    expect(types).not.toMatch(/assembly-key|assembly-secret|stored-asset|md5hash/)
    expect(types).toMatch(/\n$/)
    expect((await stat('transloadit-images.d.ts')).mode & 0o444).toBe(0o444)
    const text = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(text).not.toContain('This directory is private.')
    expect(text).not.toContain('placeholder="blur"')
  })

  test('public store rejects a root object before any upload or policy change', async () => {
    const store = vi.spyOn(Transloadit.prototype, 'storeImage')
    const publish = vi.spyOn(Transloadit.prototype, 'publishStoragePrefix')
    await main(['storage', 'store', './hero.jpg', 'hero.jpg', '--public'])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(publish).not.toHaveBeenCalled()
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('non-root directory'),
    )
  })

  test('catalog writes preserve parameter-only delivery and repeated query values', async () => {
    const delivery = { urlParams: { cdn: 'required', custom: ['first', 'second'] } }
    await writeFile(
      'images.json',
      JSON.stringify({
        workspace: 'my-app',
        apiOrigin: receipt.apiOrigin,
        public: [],
        images: {},
        delivery,
      }),
    )
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    expect(JSON.parse(await readFile('images.json', 'utf8')).delivery).toEqual(delivery)
  })

  test('public store checkpoints a receipt even when publication is denied', async () => {
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    vi.spyOn(Transloadit.prototype, 'publishStoragePrefix').mockRejectedValue(new Error('denied'))
    await main(['storage', 'store', './hero.jpg', receipt.path, '--public'])
    expect(process.exitCode).toBe(1)
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8'))).toEqual({
      workspace: 'my-app',
      apiOrigin: receipt.apiOrigin,
      public: [],
      images: { [receipt.path]: receipt },
    })
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Do not re-upload'),
    )
  })

  test('stores development delivery and refuses later writes from production credentials', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', '')
    vi.stubEnv('TRANSLOADIT_SECRET', '')
    await writeFile(
      'credentials',
      'TRANSLOADIT_KEY=saved-key\nTRANSLOADIT_SECRET=saved-secret\nTRANSLOADIT_WORKSPACE=my-app\nTRANSLOADIT_WORKSPACE_VERIFIED=true\nTRANSLOADIT_ENDPOINT=http://127.0.0.1:32189\n',
    )
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await main(['storage', 'store', './hero.jpg', receipt.path])
    expect(process.exitCode).toBeUndefined()
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8')).delivery).toEqual({
      baseUrl: 'http://127.0.0.1:32189/file/{workspace}',
      urlParams: { cdn: 'required' },
    })
    vi.stubEnv('TRANSLOADIT_KEY', 'assembly-key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'assembly-secret')
    const previous = await readFile('transloadit.images.json', 'utf8')
    await main(['storage', 'store', './hero.jpg', receipt.path])
    expect(process.exitCode).toBe(1)
    expect(await readFile('transloadit.images.json', 'utf8')).toBe(previous)
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringMatching(/API environment.*--receipts/),
    )
    expect(JSON.parse(await readFile('transloadit.images.json', 'utf8')).delivery).toEqual({
      baseUrl: 'http://127.0.0.1:32189/file/{workspace}',
      urlParams: { cdn: 'required' },
    })
  })

  test('sync help recovers the same default catalog that store writes', async () => {
    await main(['storage', 'receipts', 'sync', '--help'])
    const output = vi.mocked(process.stdout.write).mock.calls.flat().join(' ')
    expect(output).toContain('transloadit.images.json')
    expect(output).toContain('transloadit storage receipts sync website/')
    expect(output).not.toContain('--receipts images.json')
  })

  test('names the checksum change when transformed bytes have the same length', async () => {
    await writeFile('hero.jpg', Buffer.alloc(receipt.size, 42))
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
      assembly_id: 'same-size-assembly',
      ok: 'ASSEMBLY_COMPLETED',
      results: {
        ':original': [{ ...receipt, meta: { width: receipt.width, height: receipt.height } }],
      },
    })
    await main(['storage', 'store', './hero.jpg', receipt.path])
    expect(process.exitCode).toBeUndefined()
    expect(OutputCtl.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('same size, different MD5'),
    )
    expect(
      JSON.parse(await readFile('transloadit.images.json', 'utf8')).images[receipt.path],
    ).toEqual(receipt)
  })

  test('saves the Community-plan result and explains changed bytes without suggesting another write', async () => {
    await writeFile('hero.jpg', Buffer.alloc(78_593, 42))
    const stored = { ...receipt, size: 71_336, md5hash: 'b'.repeat(32) }
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
      assembly_id: 'watermarked-assembly',
      ok: 'ASSEMBLY_COMPLETED',
      results: {
        ':original': [{ ...stored, meta: { width: stored.width, height: stored.height } }],
      },
    })
    await main(['storage', 'store', './hero.jpg', receipt.path, '--log-level', 'debug'])
    expect(process.exitCode).toBeUndefined()
    expect(
      JSON.parse(await readFile('transloadit.images.json', 'utf8')).images[receipt.path],
    ).toEqual(stored)
    expect(OutputCtl.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Stored bytes differ from ./hero.jpg (78,593 → 71,336 bytes); the workspace plan may have transformed the upload',
      ),
    )
    expect(OutputCtl.prototype.debug).toHaveBeenCalledWith(
      expect.stringContaining('watermarked-assembly'),
    )
    expect(OutputCtl.prototype.debug).toHaveBeenCalledWith(
      expect.stringContaining('"sizeMatches":false'),
    )
    expect(OutputCtl.prototype.debug).toHaveBeenCalledWith(
      expect.stringContaining('"md5Matches":false'),
    )
    expect(OutputCtl.prototype.error).not.toHaveBeenCalled()
    expect(OutputCtl.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('older deployments'),
    )
  })

  test('Ctrl-C aborts an active upload, releases its lock and preserves the previous catalog', async () => {
    const listeners = process.listeners('SIGINT')
    const previous = catalogJson({ 'website/earlier.jpg': receipt })
    await writeFile('images.json', previous)
    vi.spyOn(Transloadit.prototype, 'storeImage').mockImplementation((_file, options) => {
      process.emit('SIGINT')
      expect(options.signal?.aborted).toBe(true)
      options.signal?.throwIfAborted()
      return Promise.resolve(receipt)
    })
    await runStore()
    expect(process.exitCode).toBe(1)
    expect(await readFile('images.json', 'utf8')).toBe(previous)
    expect(await readdir(directory)).not.toContain('images.json.lock')
    expect(process.listeners('SIGINT')).toEqual(listeners)
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('canceled'))
  })

  test('Ctrl-C during atomic replacement preserves the completed receipt and stops the next upload', async () => {
    const listeners = process.listeners('SIGINT')
    const replace = vi.mocked(rename).getMockImplementation()
    if (replace === undefined) throw new Error('Expected real rename implementation')
    vi.mocked(rename).mockImplementationOnce(async (from, to) => {
      process.emit('SIGINT')
      await replace(from, to)
    })
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await main(['storage', 'store', './hero.jpg', './next.jpg', 'website/'])
    expect(process.exitCode).toBe(1)
    expect(store).toHaveBeenCalledTimes(1)
    expect(
      JSON.parse(await readFile('transloadit.images.json', 'utf8')).images[receipt.path],
    ).toEqual(receipt)
    expect(await readdir(directory)).not.toContain('transloadit.images.json.lock')
    expect(process.listeners('SIGINT')).toEqual(listeners)
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Do not re-upload'),
    )
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Receipt saved in transloadit.images.json. No further files were uploaded.',
      ),
    )
    expect(OutputCtl.prototype.error).not.toHaveBeenCalledWith(
      expect.stringContaining('recover the verified receipt'),
    )
  })

  test('refuses a stale workspace label on env credentials before uploading', async () => {
    vi.stubEnv('TRANSLOADIT_WORKSPACE', 'project-app')
    await writeFile(
      'transloadit.images.json',
      JSON.stringify({ workspace: 'project-app', public: [], images: {} }),
    )
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await main(['storage', 'store', './hero.jpg', receipt.path])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      'Project uses project-app; the selected credentials belong to my-app. Nothing uploaded.',
    )
  })

  test('checkpoints earlier multi-file uploads if a later upload fails', async () => {
    const store = vi
      .spyOn(Transloadit.prototype, 'storeImage')
      .mockResolvedValueOnce({ ...receipt, path: 'website/a.jpg' })
      .mockRejectedValueOnce(new Error('Second upload failed'))
    await main(['storage', 'store', './a.jpg', './b.jpg', 'website/'])
    expect(process.exitCode).toBe(1)
    expect(store).toHaveBeenCalledTimes(2)
    const catalog = JSON.parse(await readFile('transloadit.images.json', 'utf8'))
    expect(Object.keys(catalog.images)).toEqual(['website/a.jpg'])
  })

  test('refuses duplicate destination basenames before the first upload', async () => {
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await main(['storage', 'store', './a/hero.jpg', './b/hero.jpg', 'website/'])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
  })
  test('stores multiple originals in a directory and commits both receipts', async () => {
    const store = vi
      .spyOn(Transloadit.prototype, 'storeImage')
      .mockImplementation(async (_file, options) => ({ ...receipt, path: options.path }))
    await main(['storage', 'store', './a.jpg', './b.jpg', 'website/'])
    expect(process.exitCode).toBeUndefined()
    expect(store.mock.calls).toEqual([
      [
        './a.jpg',
        { path: 'website/a.jpg', signal: expect.any(AbortSignal), onReceipt: expect.any(Function) },
      ],
      [
        './b.jpg',
        { path: 'website/b.jpg', signal: expect.any(AbortSignal), onReceipt: expect.any(Function) },
      ],
    ])
    const catalog = JSON.parse(await readFile('transloadit.images.json', 'utf8'))
    expect(catalog.workspace).toBe('my-app')
    expect(Object.keys(catalog.images)).toEqual(['website/a.jpg', 'website/b.jpg'])
  })

  test('refuses ambiguous multi-file destinations before uploading', async () => {
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await main(['storage', 'store', './a.jpg', './b.jpg', 'website/hero.jpg'])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('directory'))
  })

  test('the printed typed path has a readable filename alt', async () => {
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    const text = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(text).toContain('alt="hero"')
    expect(text).not.toContain('Describe this image')
  })
  test.each([
    { source: 'shell environment', setup: 'shell' },
    { source: 'project .env', setup: 'project' },
    { source: 'saved login', setup: 'saved' },
    { source: 'shell environment + project .env', setup: 'mixed' },
  ])('discloses the winning $source credentials before uploading, without secrets', async ({
    source,
    setup,
  }) => {
    await writeFile(
      'credentials',
      'TRANSLOADIT_KEY=saved-key\nTRANSLOADIT_SECRET=saved-secret\nTRANSLOADIT_WORKSPACE=saved-workspace\n',
    )
    if (setup !== 'shell') {
      vi.stubEnv('TRANSLOADIT_KEY', setup === 'mixed' ? 'assembly-key' : '')
      vi.stubEnv('TRANSLOADIT_SECRET', '')
    }
    if (setup === 'project' || setup === 'mixed')
      await writeFile(
        '.env',
        'TRANSLOADIT_KEY=project-key\nTRANSLOADIT_SECRET=project-secret\nTRANSLOADIT_WORKSPACE=project-workspace\n',
      )
    vi.spyOn(Transloadit.prototype, 'storeImage').mockImplementation(() => {
      if (setup === 'saved') expect(OutputCtl.prototype.notice).not.toHaveBeenCalled()
      else
        expect(OutputCtl.prototype.notice).toHaveBeenCalledWith(
          expect.stringContaining(`Credentials: ${source}`),
        )
      return Promise.resolve(receipt)
    })
    await runStore()
    expect(process.exitCode).toBeUndefined()
    const notice = JSON.stringify(vi.mocked(OutputCtl.prototype.notice).mock.calls)
    expect(notice).not.toMatch(
      /assembly-key|assembly-secret|saved-key|saved-secret|project-key|project-secret/,
    )
    if (setup !== 'saved')
      expect(notice).toContain(setup === 'shell' ? 'workspace not declared' : 'project-workspace')
  })
  test.each([
    '--private',
  ])('refuses the removed snippet-only flag %s before uploading', async (delivery) => {
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await main(['storage', 'store', './hero.jpg', receipt.path, delivery])
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    await expect(stat('images.json')).rejects.toMatchObject({ code: 'ENOENT' })
  })
  test('stores a root object without implicitly generating workspace-wide authorization', async () => {
    const rootReceipt = { ...receipt, path: 'hero.jpg' }
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(rootReceipt)
    await runStore(rootReceipt.path)
    expect(process.exitCode).toBeUndefined()
    expect(JSON.parse(await readFile('images.json', 'utf8')).images['hero.jpg']).toEqual(
      rootReceipt,
    )
    const snippet = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(snippet).toContain('Render it with <Image storage src="hero.jpg"')
    expect(snippet).not.toContain('createImages')
    expect(snippet).not.toContain('allowedPathPrefixes: [""]')
  })

  test.each([
    { width: 800, maxWidth: 800 },
    { width: 2400, maxWidth: 960 },
  ])('prints constrained JSX bounded to $maxWidth pixels for a $width pixel receipt', async ({
    width,
    maxWidth,
  }) => {
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue({ ...receipt, width })
    await runStore()
    expect(process.exitCode).toBeUndefined()
    expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
      expect.stringContaining(
        `<Image storage src="website/hero.jpg" alt="hero" width={${maxWidth}} />`,
      ),
      { ...receipt, width },
    )
  })

  test('printed JSX preserves special characters in Storage paths', async () => {
    const path = 'website/a&"b.jpg'
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue({ ...receipt, path })
    await runStore(path)
    expect(process.exitCode).toBeUndefined()
    expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
      expect.stringContaining('src="website/a&amp;&quot;b.jpg"'),
      { ...receipt, path },
    )
  })

  test('releases the writer lock even when temporary-file cleanup fails', async () => {
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    const remove = vi.mocked(rm).getMockImplementation()
    if (remove === undefined) throw new Error('Expected the real filesystem mock implementation')
    vi.mocked(rm).mockImplementation((path, options) => {
      if (typeof path === 'string' && path.endsWith('.tmp'))
        throw new Error('EPERM: cleanup denied')
      return remove(path, options)
    })
    await runStore()
    expect(process.exitCode).toBe(1)
    expect(await readdir(directory)).not.toContain('images.json.lock')
    expect(JSON.parse(await readFile('images.json', 'utf8')).images[receipt.path]).toEqual(receipt)
  })

  test('retains the complete receipt and previous catalog when atomic replacement fails', async () => {
    const previous = catalogJson({ 'website/earlier.jpg': receipt })
    await writeFile('images.json', previous)
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    vi.mocked(rename).mockRejectedValueOnce(
      Object.assign(new Error('EACCES: rename denied'), { code: 'EACCES' }),
    )
    await runStore()
    expect(process.exitCode).toBe(1)
    expect(await readFile('images.json', 'utf8')).toBe(previous)
    const temporary = (await readdir(directory)).find((name) => name.endsWith('.tmp'))
    expect(temporary).toBeDefined()
    if (temporary === undefined) throw new Error('Expected retained verified receipt')
    expect(JSON.parse(await readFile(temporary, 'utf8')).images[receipt.path]).toEqual(receipt)
    const error = vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join('\n')
    expect(error).toContain(temporary)
    expect(error).toContain('Do not re-upload')
    expect(error).toContain('EACCES')
    expect(await readdir(directory)).not.toContain('images.json.lock')
  })

  test('preserves an existing catalog mode across its atomic replacement', async () => {
    await writeFile('images.json', catalogJson({}))
    await chmod('images.json', 0o640)
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    expect((await stat('images.json')).mode & 0o777).toBe(0o640)
  })

  test('prints only the changed receipt for a src/app consumer', async () => {
    await mkdir('src/app', { recursive: true })
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    const snippet = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(snippet).toContain('Saved website/hero.jpg in images.json.')
    expect(snippet).not.toContain('import ')
  })

  test.each([
    'images.json',
    '.images.json',
  ])('stores a catalog named %s without printing an import', async (name) => {
    await mkdir('app')
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await main(['storage', 'store', './hero.jpg', receipt.path, '--receipts', `app/${name}`])
    expect(process.exitCode).toBeUndefined()
    expect(vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]).toContain(
      `Saved website/hero.jpg in app/${name}.`,
    )
  })

  test('overwrites only when explicitly requested', async () => {
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await main([
      'storage',
      'store',
      './hero.jpg',
      receipt.path,
      '--receipts',
      'images.json',
      '--overwrite',
    ])
    expect(process.exitCode).toBeUndefined()
    expect(store).toHaveBeenCalledExactlyOnceWith('./hero.jpg', {
      path: receipt.path,
      signal: expect.any(AbortSignal),
      onReceipt: expect.any(Function),
      overwrite: true,
    })
  })
  test('prints recovery details for a malformed receipt after the write and preserves saved receipts', async () => {
    const bytes = Buffer.from('image')
    await writeFile('hero.jpg', bytes)
    const previous = catalogJson({ 'website/earlier.jpg': receipt })
    await writeFile('images.json', previous)
    const assemblyId = 'assembly-missing-metadata'
    const create = vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
      assembly_id: assemblyId,
      ok: 'ASSEMBLY_COMPLETED',
      results: {
        ':original': [
          {
            ...receipt,
            height: undefined,
            md5hash: createHash('md5').update(bytes).digest('hex'),
            size: bytes.length,
          },
        ],
      },
    })
    await runStore()
    expect(create).toHaveBeenCalledOnce()
    expect(process.exitCode).toBe(1)
    const message = vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join('\n')
    expect(message).toContain(receipt.path)
    expect(message).toContain(assemblyId)
    expect(message).toContain('transloadit storage ls website/hero.jpg --receipts images.json')
    expect(message).toContain('The commands below require the native Storage catalog API')
    expect(message).toContain('inspect the Assembly in Console')
    expect(message).toContain(
      'transloadit storage receipts sync website/hero.jpg --receipts images.json',
    )
    expect(message).toContain('Do not re-upload')
    expect(message).not.toMatch(/may already exist|overwrite|conflict_strategy/)
    expect(message).not.toContain('assembly-secret')
    expect(OutputCtl.prototype.debug).toHaveBeenCalledWith(
      expect.stringContaining('"metadataValid":false'),
    )
    expect(OutputCtl.prototype.debug).toHaveBeenCalledWith(
      expect.stringContaining('"originalCount":1'),
    )
    expect(await readFile('images.json', 'utf8')).toBe(previous)
    expect(await readdir(directory)).toEqual(['credentials', 'hero.jpg', 'images.json'])
  })

  test('recovery advice keeps endpoint, workspace and catalog overrides, even for root objects', async () => {
    const endpoint = 'http://127.0.0.1:32189'
    nock(endpoint)
      .get('/dam/assets')
      .query(true)
      .reply(200, storagePage([], { workspace: 'my-app' }))
    await writeFile('hero.jpg', Buffer.from('image'))
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
      ok: 'ASSEMBLY_COMPLETED',
      assembly_id: 'missing-original',
      results: {},
    })
    await main([
      'storage',
      'store',
      './hero.jpg',
      'hero.jpg',
      '--endpoint',
      endpoint,
      '--workspace',
      'my-app',
      '--receipts',
      'custom.json',
    ])
    const message = vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join('\n')
    const options = "--receipts custom.json --endpoint 'http://127.0.0.1:32189' --workspace my-app"
    expect(message).toContain(`transloadit storage ls hero.jpg ${options}`)
    expect(message).toContain(`transloadit storage receipts sync hero.jpg ${options}`)
    expect(message).not.toContain("sync ''")
  })

  test.each([
    'ASSEMBLY_CANCELED',
    'ASSEMBLY_EXECUTING',
  ] as const)('does not claim a stored object or metadata recovery for %s', async (ok) => {
    await writeFile('hero.jpg', Buffer.from('image'))
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
      ok,
      assembly_id: 'not-completed',
      results: {},
    })
    await runStore()
    expect(process.exitCode).toBe(1)
    const message = vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join('\n')
    expect(message).toContain(ok)
    expect(message).toContain('not-completed')
    expect(message).not.toMatch(/storage ls|receipts sync|Do not re-upload|already exist/)
  })

  test('keeps a receipts-file permission error and names the file before uploading', async () => {
    const previous = catalogJson({ [receipt.path]: receipt })
    await writeFile('images.json', previous)
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    // Inject the OS error so this also exercises EACCES when the test process runs as root.
    vi.mocked(readFile).mockRejectedValueOnce(
      Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }),
    )
    await runStore()
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    const message = vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join('\n')
    expect(message).toContain(join(directory, 'images.json'))
    expect(message).toContain('EACCES: permission denied')
    expect(await readFile('images.json', 'utf8')).toBe(previous)
    expect(await readdir(directory)).toEqual(['credentials', 'images.json'])
  })

  test.each([
    'symlink',
    'directory',
  ])('names a receipts %s without calling it invalid JSON', async (kind) => {
    if (kind === 'symlink') await symlink('credentials', 'images.json')
    else await mkdir('images.json')
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    const message = vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join('\n')
    expect(message).toContain(join(directory, 'images.json'))
    expect(message).toContain('regular JSON file')
    expect(message).toContain(kind)
    expect(await readdir(directory)).toEqual(['credentials', 'images.json'])
  })

  test('preserves every existing path, including ordinary JSON prototype-looking keys', async () => {
    const earlier = { ...receipt, path: '__proto__' }
    await writeFile('images.json', catalogJson({ [earlier.path]: earlier }))
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(JSON.parse(await readFile('images.json', 'utf8')).images).toEqual({
      [earlier.path]: earlier,
      [receipt.path]: receipt,
    })
  })

  test('uses storeImage and appends a keyed receipt with a ready-to-render snippet', async () => {
    const earlier = { ...receipt, path: 'website/earlier.jpg' }
    await writeFile('images.json', catalogJson({ [earlier.path]: earlier }))
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    expect(store).toHaveBeenCalledExactlyOnceWith('./hero.jpg', {
      path: receipt.path,
      signal: expect.any(AbortSignal),
      onReceipt: expect.any(Function),
    })
    expect(JSON.parse(await readFile('images.json', 'utf8')).images).toEqual({
      [earlier.path]: earlier,
      [receipt.path]: receipt,
    })
    expect(await readFile('images.json', 'utf8')).toMatch(/\n$/)
    expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
      expect.stringContaining('<Image storage src="website/hero.jpg"'),
      receipt,
    )
    const snippet = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(snippet).toContain(
      'Saved website/hero.jpg in images.json. Commit this catalog and transloadit-images.d.ts.\nRender it with <Image storage src="website/hero.jpg" alt="hero" width={800} />\nReplace alt with a description (or an empty string for a decorative image).',
    )
    expect(await readdir(directory)).toEqual([
      'credentials',
      'images.json',
      'transloadit-images.d.ts',
    ])
  })

  test('preserves the first receipt when a second store conflicts', async () => {
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValueOnce(receipt)
    await runStore()
    const previous = await readFile('images.json', 'utf8')
    store.mockRejectedValueOnce(new ApiError({ body: { error: 'TRANSLOADIT_STORE_CONFLICT' } }))
    await runStore()
    expect(process.exitCode).toBe(1)
    expect(await readFile('images.json', 'utf8')).toBe(previous)
    expect(await readdir(directory)).toEqual([
      'credentials',
      'images.json',
      'transloadit-images.d.ts',
    ])
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      'Storage destination "website/hero.jpg" already exists. Choose a fresh name; use --overwrite only if you deliberately want to replace that object.',
    )
  })

  test('leaves no receipts or temporary files after an upload failure', async () => {
    const store = vi
      .spyOn(Transloadit.prototype, 'storeImage')
      .mockRejectedValue(new Error('Offline'))
    await runStore()
    expect(store).toHaveBeenCalledOnce()
    expect(process.exitCode).toBe(1)
    expect(OutputCtl.prototype.error).toHaveBeenCalledExactlyOnceWith('Offline')
    expect(await readdir(directory)).toEqual(['credentials'])
  })

  test.each([
    '',
    'null',
    '[]',
    '{',
  ])('rejects invalid existing receipts before uploading (%j)', async (previous) => {
    await writeFile('images.json', previous)
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(await readFile('images.json', 'utf8')).toBe(previous)
    const message = vi.mocked(OutputCtl.prototype.error).mock.calls.flat().join('\n')
    expect(message).toContain(join(directory, 'images.json'))
    expect(message).toContain(
      previous === '' || previous === '{' ? 'invalid JSON' : 'invalid catalog field',
    )
    expect(await readdir(directory)).toEqual(['credentials', 'images.json'])
  })

  test('refuses another writer before uploading instead of losing its receipts', async () => {
    await writeFile('images.json.lock', 'another-writer')
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('another storage store'),
    )
    expect(await readFile('images.json.lock', 'utf8')).toBe('another-writer')
  })

  test('uses the existing CLI credentials-file resolution without Smart CDN fallback', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', '')
    vi.stubEnv('TRANSLOADIT_SECRET', '')
    vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', 'delivery-key')
    vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', 'delivery-secret')
    await writeFile('credentials', 'TRANSLOADIT_KEY=stored-key\nTRANSLOADIT_SECRET=stored-secret\n')
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    expect(store).toHaveBeenCalledOnce()
  })

  test('missing write credentials preserves receipts and never uploads', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', '')
    vi.stubEnv('TRANSLOADIT_SECRET', '')
    vi.stubEnv('TRANSLOADIT_SMART_CDN_KEY', 'delivery-key')
    vi.stubEnv('TRANSLOADIT_SMART_CDN_SECRET', 'delivery-secret')
    const previous = catalogJson({ [receipt.path]: receipt })
    await writeFile('images.json', previous)
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(await readFile('images.json', 'utf8')).toBe(previous)
  })
})

function catalogJson(images: Record<string, unknown>): string {
  const boundImages = Object.fromEntries(
    Object.entries(images).map(([path, value]) => [
      path,
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? { apiOrigin: 'https://api2.transloadit.com', ...value }
        : value,
    ]),
  )
  return `${JSON.stringify({ workspace: 'my-app', public: [], images: boundImages })}\n`
}
