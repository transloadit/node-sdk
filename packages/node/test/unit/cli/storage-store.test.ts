import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

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
  vi.spyOn(OutputCtl.prototype, 'print').mockImplementation(() => {})
})

afterEach(async () => {
  process.chdir(originalCwd)
  process.exitCode = undefined
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
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
  test('uses storeImage and appends a keyed receipt with a ready-to-render snippet', async () => {
    const earlier = { ...receipt, path: 'website/earlier.jpg' }
    await writeFile('images.json', JSON.stringify({ [earlier.path]: earlier }))
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBeUndefined()
    expect(store).toHaveBeenCalledExactlyOnceWith('./hero.jpg', { path: receipt.path })
    expect(JSON.parse(await readFile('images.json', 'utf8'))).toEqual({
      [earlier.path]: earlier,
      [receipt.path]: receipt,
    })
    expect(await readFile('images.json', 'utf8')).toMatch(/\n$/)
    expect(OutputCtl.prototype.print).toHaveBeenCalledWith(
      expect.stringContaining('<StorageImage src={images["website/hero.jpg"]}'),
      receipt,
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
    expect(OutputCtl.prototype.error).toHaveBeenCalledWith(expect.stringContaining('receipts'))
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
    const previous = JSON.stringify({ [receipt.path]: receipt })
    await writeFile('images.json', previous)
    const store = vi.spyOn(Transloadit.prototype, 'storeImage').mockResolvedValue(receipt)
    await runStore()
    expect(process.exitCode).toBe(1)
    expect(store).not.toHaveBeenCalled()
    expect(await readFile('images.json', 'utf8')).toBe(previous)
  })
})
