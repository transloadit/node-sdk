import type { AssemblyResultEntryLike } from '../../../src/cli/resultFiles.ts'

import fs from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { Cli } from 'clipanion'
import nock from 'nock'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { AssembliesCreateCommand } from '../../../src/cli/commands/assemblies.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

const tempDirs: string[] = []

async function fixture(results: Record<string, AssemblyResultEntryLike[]>): Promise<{
  inputPath: string
  outputDir: string
  run: (args?: string[]) => Promise<number>
  tempDir: string
}> {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'transloadit-download-layout-'))
  tempDirs.push(tempDir)
  const stepsPath = path.join(tempDir, 'steps.json')
  const inputPath = path.join(tempDir, 'inputs', 'logo.png')
  const outputDir = path.join(tempDir, 'out')
  await mkdir(path.dirname(inputPath))
  await writeFile(inputPath, 'input bytes')
  await writeFile(stepsPath, JSON.stringify({ output: { robot: '/file/filter' } }))
  vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
    assembly_id: 'download-layout',
  })
  vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockResolvedValue({
    ok: 'ASSEMBLY_COMPLETED',
    results,
  })

  return {
    inputPath,
    outputDir,
    tempDir,
    run: async (args = []) =>
      await Cli.from([AssembliesCreateCommand]).run([
        'assemblies',
        'create',
        '--steps',
        stepsPath,
        '-o',
        `${outputDir}/`,
        ...args,
      ]),
  }
}

beforeEach(async () => {
  vi.stubEnv('TRANSLOADIT_KEY', 'key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'secret')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(fs, 'fstatSync').mockReturnValue(await stat('/dev/null'))
})

afterEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  nock.cleanAll()
  nock.abortPendingRequests()
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

it('keeps every HLS playlist reference reachable from its downloaded playlist', async () => {
  const master = '#EXTM3U\nvariant/stream.m3u8\n'
  const variant = '#EXTM3U\n#EXTINF:1,\nsegment.ts\n#EXT-X-ENDLIST\n'
  const { inputPath, outputDir, run } = await fixture({
    adaptive: [
      { name: 'master.m3u8', url: 'https://downloads.test/master', meta: { relative_path: '' } },
      {
        name: 'stream.m3u8',
        url: 'https://downloads.test/variant',
        meta: { relative_path: 'variant' },
      },
      {
        name: 'segment.ts',
        url: 'https://downloads.test/segment',
        meta: { relative_path: 'variant' },
      },
    ],
  })
  nock('https://downloads.test')
    .get('/master')
    .reply(200, master)
    .get('/variant')
    .reply(200, variant)
    .get('/segment')
    .reply(200, 'transport stream')

  expect(await run(['-i', inputPath])).toBe(0)
  expect(await readFile(path.join(outputDir, 'master.m3u8'), 'utf8')).toBe(master)
  const variantPath = path.join(outputDir, master.split('\n')[1])
  expect(await readFile(variantPath, 'utf8')).toBe(variant)
  expect(await readFile(path.join(path.dirname(variantPath), variant.split('\n')[2]), 'utf8')).toBe(
    'transport stream',
  )
})

it.each([false, true])('uses the bundle result name (single Assembly: %s)', async (single) => {
  const { inputPath, outputDir, run } = await fixture({
    bundled: [{ name: 'archive.zip', url: 'https://downloads.test/archive' }],
  })
  nock('https://downloads.test').get('/archive').reply(200, 'archive bytes')

  expect(await run(['-i', inputPath, ...(single ? ['--single-assembly'] : [])])).toBe(0)
  expect(await readdir(outputDir)).toEqual(['archive.zip'])
  expect(await readFile(path.join(outputDir, 'archive.zip'), 'utf8')).toBe('archive bytes')
})

it('leaves the input folders out of a multi-step download', async () => {
  const { inputPath, outputDir, run } = await fixture({
    image: [{ name: 'result.png', url: 'https://downloads.test/image' }],
    text: [{ name: 'result.txt', url: 'https://downloads.test/text' }],
  })
  nock('https://downloads.test')
    .get('/image')
    .reply(200, 'image bytes')
    .get('/text')
    .reply(200, 'text bytes')

  expect(await run(['-i', inputPath])).toBe(0)
  expect(await readdir(outputDir)).toEqual(['image', 'text'])
  expect(await readFile(path.join(outputDir, 'image', 'result.png'), 'utf8')).toBe('image bytes')
  expect(await readFile(path.join(outputDir, 'text', 'result.txt'), 'utf8')).toBe('text bytes')
})

it.each([
  false,
  true,
])('uploads URL inputs and cleans them up (single Assembly: %s)', async (single) => {
  const { outputDir, run } = await fixture({
    processed: [{ name: 'remote.png', url: 'https://downloads.test/result' }],
  })
  let uploadedPath = ''
  vi.mocked(Transloadit.prototype.createAssembly).mockImplementation(async ({ files }) => {
    uploadedPath = Object.values(files ?? {})[0] ?? ''
    expect(path.basename(uploadedPath)).toBe('remote.png')
    expect(await readFile(uploadedPath, 'utf8')).toBe('remote input')
    return { assembly_id: 'url-upload' }
  })
  nock('https://example.com').get('/remote.png?signature=example').reply(200, 'remote input')
  nock('https://downloads.test').get('/result').reply(200, 'processed bytes')

  expect(
    await run([
      '-i',
      'https://example.com/remote.png?signature=example',
      ...(single ? ['--single-assembly'] : []),
    ]),
  ).toBe(0)
  expect(await readFile(path.join(outputDir, 'remote.png'), 'utf8')).toBe('processed bytes')
  await expect(stat(uploadedPath)).rejects.toMatchObject({ code: 'ENOENT' })
})

it('rejects watch mode for URL inputs before making a download request', async () => {
  const { run } = await fixture({})
  const download = nock('https://example.com').get('/remote.png').reply(200, 'remote input')

  expect(await run(['-i', 'https://example.com/remote.png', '--watch'])).toBe(1)
  expect(download.isDone()).toBe(false)
  expect(Transloadit.prototype.createAssembly).not.toHaveBeenCalled()
})

it('keeps a repeated linked download together instead of renaming playlist targets', async () => {
  const { inputPath, outputDir, run } = await fixture({
    adaptive: [
      { name: 'master.m3u8', url: 'https://downloads.test/master', meta: { relative_path: '' } },
      {
        name: 'segment.ts',
        url: 'https://downloads.test/segment',
        meta: { relative_path: 'variant' },
      },
    ],
  })
  const playlist = '#EXTM3U\nvariant/segment.ts\n'
  nock('https://downloads.test')
    .get('/master')
    .twice()
    .reply(200, playlist)
    .get('/segment')
    .twice()
    .reply(200, 'stream bytes')

  expect(await run(['-i', inputPath])).toBe(0)
  expect(await run(['-i', inputPath])).toBe(0)
  expect(await readFile(path.join(outputDir, 'adaptive', 'master.m3u8'), 'utf8')).toBe(playlist)
  expect(await readFile(path.join(outputDir, 'adaptive', 'variant', 'segment.ts'), 'utf8')).toBe(
    'stream bytes',
  )
})

it('rejects a relative result path through a symlink outside the output directory', async () => {
  const { inputPath, outputDir, run, tempDir } = await fixture({
    adaptive: [
      {
        name: 'result.txt',
        url: 'https://downloads.test/result',
        meta: { relative_path: 'nested' },
      },
    ],
  })
  const outside = path.join(tempDir, 'outside')
  await mkdir(outputDir)
  await mkdir(outside)
  await symlink(outside, path.join(outputDir, 'nested'))
  nock('https://downloads.test').get('/result').reply(200, 'escaped bytes')

  expect(await run(['-i', inputPath])).toBe(1)
  expect(await readdir(outside)).toEqual([])
})
