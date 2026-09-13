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

import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

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
  asset_id: 'stored-asset',
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
  vi.spyOn(OutputCtl.prototype, 'print').mockImplementation(() => {})
  nock.disableNetConnect()
  nock('https://api2.transloadit.com')
    .persist()
    .get('/storage/')
    .query(true)
    .reply(
      200,
      '<ListAllMyBucketsResult><Buckets><Bucket><Name>my-app</Name></Bucket></Buckets></ListAllMyBucketsResult>',
    )
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
      ['./a.jpg', { path: 'website/a.jpg', signal: expect.any(AbortSignal) }],
      ['./b.jpg', { path: 'website/b.jpg', signal: expect.any(AbortSignal) }],
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

  test('the printed alt is explicitly decorative until the developer supplies meaningful text', async () => {
    vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    const text = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(text).toContain('alt=""')
    expect(text).toContain('decorative')
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
    expect(notice).toContain(
      setup === 'saved'
        ? 'saved-workspace'
        : setup === 'shell'
          ? 'workspace not declared'
          : 'project-workspace',
    )
  })
  test.each([
    '--private',
    '--public',
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
    expect(snippet).toContain('Render it with <StorageImage src="hero.jpg"')
    expect(snippet).not.toContain('createStorageImages')
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
      expect.stringContaining(`<StorageImage src="website/hero.jpg" alt="" width={${maxWidth}} />`),
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
    expect(message).toContain('may already exist')
    expect(message).toMatch(/retry.*conflict_strategy.*error.*conflict/)
    expect(message).not.toContain('assembly-secret')
    expect(await readFile('images.json', 'utf8')).toBe(previous)
    expect(await readdir(directory)).toEqual(['credentials', 'hero.jpg', 'images.json'])
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
    })
    expect(JSON.parse(await readFile('images.json', 'utf8')).images).toEqual({
      [earlier.path]: earlier,
      [receipt.path]: receipt,
    })
    expect(await readFile('images.json', 'utf8')).toMatch(/\n$/)
    expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
      expect.stringContaining('<StorageImage src="website/hero.jpg"'),
      receipt,
    )
    const snippet = vi.mocked(OutputCtl.prototype.print).mock.calls[0]?.[0]
    expect(snippet).toBe(
      'Saved website/hero.jpg in images.json. Commit this receipt file.\nRender it with <StorageImage src="website/hero.jpg" alt="" width={800} />\n{/* Empty alt is decorative; replace it for an informative image. */}',
    )
    expect(await readdir(directory)).toEqual(['credentials', 'images.json'])
  })

  test('preserves the first receipt when a second store conflicts', async () => {
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValueOnce(receipt)
    await runStore()
    const previous = await readFile('images.json', 'utf8')
    store.mockRejectedValueOnce(new Error('TRANSLOADIT_STORE_CONFLICT'))
    await runStore()
    expect(process.exitCode).toBe(1)
    expect(await readFile('images.json', 'utf8')).toBe(previous)
    expect(await readdir(directory)).toEqual(['credentials', 'images.json'])
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
      previous === '' || previous === '{' ? 'invalid JSON' : 'expected a project catalog',
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
  return `${JSON.stringify({ workspace: 'my-app', public: [], images })}\n`
}
