import type { AssemblyResultEntryLike } from '../../../src/cli/resultFiles.ts'

import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  unlink,
  utimes,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { Cli } from 'clipanion'
import nock from 'nock'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { tryCatch } from '../../../src/alphalib/tryCatch.ts'
import { AssembliesCreateCommand } from '../../../src/cli/commands/assemblies.ts'
import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
}))

const tempDirs: string[] = []

async function fixture(results: Record<string, AssemblyResultEntryLike[]>): Promise<{
  inputPath: string
  outputDir: string
  run: (args?: string[], output?: string) => Promise<number>
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
    run: async (args = [], output = `${outputDir}/`) =>
      await Cli.from([AssembliesCreateCommand]).run([
        'assemblies',
        'create',
        '--steps',
        stepsPath,
        '-o',
        output,
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
  vi.doUnmock('node-watch')
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

it.each([
  { firstName: 'first.mp4', secondName: 'second.mp4', firstDir: 'first', secondDir: 'second' },
  { firstName: 'clip.mp4', secondName: 'clip.mp4', firstDir: 'clip', secondDir: 'clip__1' },
  { firstName: '...', secondName: '...', firstDir: 'adaptive', secondDir: 'adaptive__1' },
])('separates independent HLS bundles (sources: $firstName, $secondName)', async ({
  firstName,
  secondName,
  firstDir,
  secondDir,
}) => {
  const firstMaster = {
    name: 'master.m3u8',
    url: 'https://downloads.test/first-master',
    original_id: 'first-source',
    original_name: firstName,
    meta: { relative_path: '' },
  }
  const firstSegment = {
    ...firstMaster,
    name: 'segment.ts',
    url: 'https://downloads.test/first-segment',
    meta: { relative_path: 'video' },
  }
  const secondMaster = {
    ...firstMaster,
    url: 'https://downloads.test/second-master',
    original_id: 'second-source',
    original_name: secondName,
  }
  const secondSegment = {
    ...secondMaster,
    name: 'segment.ts',
    url: 'https://downloads.test/second-segment',
    meta: { relative_path: 'video' },
  }
  const { inputPath, outputDir, run } = await fixture({
    adaptive: [firstMaster, secondMaster, firstSegment, secondSegment],
  })
  const secondInput = path.join(path.dirname(inputPath), 'second.mp4')
  await writeFile(secondInput, 'second input')
  nock('https://downloads.test')
    .get('/first-master')
    .reply(200, '#EXTM3U\nvideo/segment.ts\n')
    .get('/second-master')
    .reply(200, '#EXTM3U\nvideo/segment.ts\n')
    .get('/first-segment')
    .reply(200, 'first stream')
    .get('/second-segment')
    .reply(200, 'second stream')

  expect(await run(['--single-assembly', '-i', inputPath, '-i', secondInput])).toBe(0)
  expect(await readdir(outputDir)).toEqual([firstDir, secondDir])
  expect(await readFile(path.join(outputDir, firstDir, 'master.m3u8'), 'utf8')).toBe(
    '#EXTM3U\nvideo/segment.ts\n',
  )
  expect(await readFile(path.join(outputDir, firstDir, 'video', 'segment.ts'), 'utf8')).toBe(
    'first stream',
  )
  expect(await readFile(path.join(outputDir, secondDir, 'master.m3u8'), 'utf8')).toBe(
    '#EXTM3U\nvideo/segment.ts\n',
  )
  expect(await readFile(path.join(outputDir, secondDir, 'video', 'segment.ts'), 'utf8')).toBe(
    'second stream',
  )
})

it('fails promptly when a file blocks the parent of grouped HLS source folders', async () => {
  const first = {
    name: 'master.m3u8',
    url: 'https://downloads.test/master',
    original_id: 'first',
    original_name: 'first.mp4',
    meta: { relative_path: '' },
  }
  const second = { ...first, original_id: 'second', original_name: 'second.mp4' }
  const { outputDir, run } = await fixture({ adaptive: [first, second] })
  await mkdir(outputDir)
  await writeFile(path.join(outputDir, 'adaptive'), 'existing file')
  const lstat = fs.promises.lstat
  let probes = 0
  vi.spyOn(fs.promises, 'lstat').mockImplementation(async (...args) => {
    probes += 1
    if (probes > 40) throw new Error('Filesystem probe budget exceeded')
    return await lstat(...args)
  })

  expect(await run(['--single-assembly'])).toBe(1)
  expect(probes).toBeLessThan(20)
  expect(await readFile(path.join(outputDir, 'adaptive'), 'utf8')).toBe('existing file')
})

it.each([
  'photo.png',
  'Photo.png',
])('keeps URL uploads separate (second filename: %s)', async (secondName) => {
  const { run } = await fixture({})
  const uploadPaths: string[] = []
  const uploadBytes: string[] = []
  vi.mocked(Transloadit.prototype.createAssembly).mockImplementation(async ({ files }) => {
    const uploadedPath = Object.values(files ?? {})[0]
    if (uploadedPath == null) throw new Error('Missing upload path')
    uploadPaths.push(uploadedPath)
    uploadBytes.push(await readFile(uploadedPath, 'utf8'))
    return { assembly_id: 'url-upload' }
  })
  nock('https://source.invalid')
    .get('/Photo.png')
    .reply(200, 'first input')
    .get(`/${secondName}`)
    .reply(200, 'second input')

  expect(
    await run([
      '-i',
      'https://source.invalid/Photo.png',
      '-i',
      `https://source.invalid/${secondName}`,
    ]),
  ).toBe(0)
  expect(uploadPaths).toHaveLength(2)
  expect(new Set(uploadPaths.map((file) => file.normalize('NFC').toLowerCase())).size).toBe(2)
  expect(uploadBytes.sort()).toEqual(['first input', 'second input'])
  for (const uploadedPath of uploadPaths) {
    await expect(stat(uploadedPath)).rejects.toHaveProperty('code', 'ENOENT')
  }
})

it('rejects duplicate paths within a single HLS bundle', async () => {
  const segment = {
    name: 'segment.ts',
    url: 'https://downloads.test/segment',
    original_id: 'same-source',
    original_name: 'source.mp4',
    meta: { relative_path: 'video' },
  }
  const { inputPath, outputDir, run } = await fixture({ adaptive: [segment, segment] })

  expect(await run(['-i', inputPath])).toBe(1)
  expect(await readdir(outputDir)).toEqual([])
})

it('suffixes ordinary collisions within the same source as an HLS bundle', async () => {
  const source = { original_id: 'video', original_name: 'clip.mp4' }
  const { inputPath, outputDir, run } = await fixture({
    adaptive: [
      {
        ...source,
        name: 'master.m3u8',
        url: 'https://downloads.test/master',
        meta: { relative_path: '' },
      },
      { ...source, name: 'cover.jpg', url: 'https://downloads.test/first-cover' },
      { ...source, name: 'cover.jpg', url: 'https://downloads.test/second-cover' },
    ],
  })
  nock('https://downloads.test')
    .get('/master')
    .reply(200, '#EXTM3U\n')
    .get('/first-cover')
    .reply(200, 'first cover')
    .get('/second-cover')
    .reply(200, 'second cover')

  expect(await run(['-i', inputPath])).toBe(0)
  expect(await readdir(outputDir)).toEqual(['cover.jpg', 'cover__1.jpg', 'master.m3u8'])
  expect(await readFile(path.join(outputDir, 'cover.jpg'), 'utf8')).toBe('first cover')
  expect(await readFile(path.join(outputDir, 'cover__1.jpg'), 'utf8')).toBe('second cover')
})

it.each([
  false,
  true,
])('separates input directories from result files (file first: %s)', async (fileFirst) => {
  const { inputPath, outputDir, run } = await fixture({})
  const singleInput = path.join(path.dirname(inputPath), 'report.docx')
  const multiInput = path.join(path.dirname(inputPath), 'report.pdf.docx')
  await writeFile(singleInput, 'single-result input')
  await writeFile(multiInput, 'multi-result input')
  const single = { output: [{ name: 'report.pdf', url: 'https://downloads.test/pdf' }] }
  const multi = {
    output: [
      { name: 'page1.jpg', url: 'https://downloads.test/page1' },
      { name: 'page2.jpg', url: 'https://downloads.test/page2' },
    ],
  }
  vi.mocked(Transloadit.prototype.awaitAssemblyCompletion)
    .mockResolvedValueOnce({ ok: 'ASSEMBLY_COMPLETED', results: fileFirst ? single : multi })
    .mockResolvedValueOnce({ ok: 'ASSEMBLY_COMPLETED', results: fileFirst ? multi : single })
  nock('https://downloads.test')
    .get('/pdf')
    .reply(200, 'pdf bytes')
    .get('/page1')
    .reply(200, 'first page')
    .get('/page2')
    .reply(200, 'second page')

  expect(
    await run([
      '-i',
      fileFirst ? singleInput : multiInput,
      '-i',
      fileFirst ? multiInput : singleInput,
    ]),
  ).toBe(0)
  expect(
    await readFile(path.join(outputDir, fileFirst ? 'report.pdf' : 'report__1.pdf'), 'utf8'),
  ).toBe('pdf bytes')
  const inputDir = path.join(outputDir, fileFirst ? 'report.pdf__1' : 'report.pdf')
  expect(await readFile(path.join(inputDir, 'page1.jpg'), 'utf8')).toBe('first page')
  expect(await readFile(path.join(inputDir, 'page2.jpg'), 'utf8')).toBe('second page')
})

it('retains ordinary results from different source groups in a Step containing HLS', async () => {
  const master = {
    name: 'master.m3u8',
    url: 'https://downloads.test/master',
    original_id: 'video',
    original_name: 'clip.mp4',
    meta: { relative_path: '' },
  }
  const segment = {
    ...master,
    name: 'segment.ts',
    url: 'https://downloads.test/segment',
    meta: { relative_path: 'video' },
  }
  const firstCover = {
    name: 'cover.jpg',
    url: 'https://downloads.test/first-cover',
    original_id: 'first-cover',
    original_name: 'same.png',
  }
  const secondCover = {
    ...firstCover,
    original_id: 'second-cover',
    url: 'https://downloads.test/second-cover',
  }
  const { inputPath, outputDir, run } = await fixture({
    adaptive: [master, segment, firstCover, secondCover],
  })
  nock('https://downloads.test')
    .get('/master')
    .reply(200, '#EXTM3U\nvideo/segment.ts\n')
    .get('/segment')
    .reply(200, 'stream bytes')
    .get('/first-cover')
    .reply(200, 'first cover')
    .get('/second-cover')
    .reply(200, 'second cover')

  expect(await run(['--single-assembly', '-i', inputPath])).toBe(0)
  expect(await readdir(path.join(outputDir, 'same'))).toEqual(['cover.jpg', 'cover__1.jpg'])
  expect(await readFile(path.join(outputDir, 'same', 'cover.jpg'), 'utf8')).toBe('first cover')
  expect(await readFile(path.join(outputDir, 'same', 'cover__1.jpg'), 'utf8')).toBe('second cover')
  expect(await readFile(path.join(outputDir, 'clip', 'video', 'segment.ts'), 'utf8')).toBe(
    'stream bytes',
  )
})

it('preserves every independent Assembly result when file and directory inputs overlap', async () => {
  const { inputPath, outputDir, run } = await fixture({})
  let count = 0
  vi.mocked(Transloadit.prototype.createAssembly).mockImplementation(async () => ({
    assembly_id: String(++count),
  }))
  vi.mocked(Transloadit.prototype.awaitAssemblyCompletion).mockImplementation(async (id) => ({
    ok: 'ASSEMBLY_COMPLETED',
    results: {
      images: [
        { name: 'a.png', url: `https://downloads.test/${id}/a` },
        { name: 'b.png', url: `https://downloads.test/${id}/b` },
      ],
    },
  }))
  nock('https://downloads.test')
    .get('/1/a')
    .reply(200, 'a1')
    .get('/1/b')
    .reply(200, 'b1')
    .get('/2/a')
    .reply(200, 'a2')
    .get('/2/b')
    .reply(200, 'b2')

  expect(await run(['-i', inputPath, '-i', path.dirname(inputPath)])).toBe(0)
  expect(count).toBe(2)
  const files = await readdir(path.join(outputDir, 'logo'))
  expect(files).toEqual(['a.png', 'a__1.png', 'b.png', 'b__1.png'])
  expect(
    (
      await Promise.all(
        files.map(async (file) => await readFile(path.join(outputDir, 'logo', file), 'utf8')),
      )
    ).sort(),
  ).toEqual(['a1', 'a2', 'b1', 'b2'])
})

it('stages HLS files on their destination filesystem', async () => {
  const { inputPath, outputDir, run } = await fixture({
    adaptive: [
      { name: 'master.m3u8', url: 'https://downloads.test/master', meta: { relative_path: '' } },
      {
        name: 'segment.ts',
        url: 'https://downloads.test/segment',
        meta: { relative_path: 'video' },
      },
    ],
  })
  const rename = fs.promises.rename
  let crossDeviceAttempts = 0
  vi.spyOn(fs.promises, 'rename').mockImplementation(async (source, target) => {
    const onRenditionDevice = (file: fs.PathLike): boolean =>
      String(file).includes(`${path.sep}video${path.sep}`)
    if (onRenditionDevice(source) !== onRenditionDevice(target)) {
      crossDeviceAttempts += 1
      throw Object.assign(new Error('Cross-device rename'), { code: 'EXDEV' })
    }
    await rename(source, target)
  })
  nock('https://downloads.test')
    .get('/master')
    .reply(200, '#EXTM3U\nvideo/segment.ts\n')
    .get('/segment')
    .reply(200, 'stream bytes')

  expect(await run(['-i', inputPath])).toBe(0)
  expect(crossDeviceAttempts).toBe(0)
  expect(await readdir(outputDir)).toEqual(['master.m3u8', 'video'])
  expect(await readdir(path.join(outputDir, 'video'))).toEqual(['segment.ts'])
  expect(await readFile(path.join(outputDir, 'video', 'segment.ts'), 'utf8')).toBe('stream bytes')
})

it('keeps concurrent case-only result names separate on case-insensitive filesystems', async () => {
  const { inputPath, outputDir, run } = await fixture({})
  const secondInput = path.join(path.dirname(inputPath), 'second.png')
  await writeFile(secondInput, 'second input')
  vi.mocked(Transloadit.prototype.awaitAssemblyCompletion)
    .mockResolvedValueOnce({
      ok: 'ASSEMBLY_COMPLETED',
      results: { resized: [{ name: 'Photo.jpg', url: 'https://downloads.test/first' }] },
    })
    .mockResolvedValueOnce({
      ok: 'ASSEMBLY_COMPLETED',
      results: { resized: [{ name: 'photo.jpg', url: 'https://downloads.test/second' }] },
    })
  async function resolveCaseInsensitivePath(value: fs.PathLike): Promise<fs.PathLike> {
    if (typeof value !== 'string') return value
    const [error, siblings] = await tryCatch(readdir(path.dirname(value)))
    if (error) {
      if ('code' in error && error.code === 'ENOENT') return value
      throw error
    }
    const match = siblings.find((name) => name.toLowerCase() === path.basename(value).toLowerCase())
    return match == null ? value : path.join(path.dirname(value), match)
  }
  const { lstat, rename } = fs.promises
  vi.spyOn(fs.promises, 'lstat').mockImplementation(
    async (target, ...args) => await lstat(await resolveCaseInsensitivePath(target), ...args),
  )
  vi.spyOn(fs.promises, 'rename').mockImplementation(
    async (source, target) => await rename(source, await resolveCaseInsensitivePath(target)),
  )
  nock('https://downloads.test')
    .get('/first')
    .delayBody(40)
    .reply(200, 'first result')
    .get('/second')
    .delayBody(40)
    .reply(200, 'second result')

  expect(await run(['-i', inputPath, '-i', secondInput, '--concurrency', '2'])).toBe(0)
  expect(await readdir(outputDir)).toEqual(['Photo.jpg', 'photo__1.jpg'])
  expect(await readFile(path.join(outputDir, 'Photo.jpg'), 'utf8')).toBe('first result')
  expect(await readFile(path.join(outputDir, 'photo__1.jpg'), 'utf8')).toBe('second result')
})

it.each([
  false,
  true,
])('resolves file and bundle-directory conflicts (bundle first: %s)', async (bundleFirst) => {
  const linked = {
    adaptive: [
      {
        name: 'segment.ts',
        url: 'https://downloads.test/segment',
        meta: { relative_path: 'video' },
      },
    ],
  }
  const ordinary = { output: [{ name: 'video', url: 'https://downloads.test/file' }] }
  const { inputPath, outputDir, run } = await fixture(
    bundleFirst ? { ...linked, ...ordinary } : { ...ordinary, ...linked },
  )
  nock('https://downloads.test')
    .get('/file')
    .reply(200, 'ordinary file')
    .get('/segment')
    .reply(200, 'stream bytes')

  expect(await run(['--single-assembly', '-i', inputPath])).toBe(0)
  expect(await readFile(path.join(outputDir, bundleFirst ? 'video__1' : 'video'), 'utf8')).toBe(
    'ordinary file',
  )
  expect(
    await readFile(
      path.join(outputDir, ...(bundleFirst ? [] : ['adaptive']), 'video', 'segment.ts'),
      'utf8',
    ),
  ).toBe('stream bytes')
})

it('finishes publishing a linked watch bundle when a newer Assembly fails', async () => {
  const results = {
    adaptive: [
      { name: 'master.m3u8', url: 'https://downloads.test/master', meta: { relative_path: '' } },
      {
        name: 'segment.ts',
        url: 'https://downloads.test/segment',
        meta: { relative_path: 'video' },
      },
    ],
  }
  const { inputPath, outputDir } = await fixture(results)
  class FakeWatcher extends EventEmitter {
    close(): void {
      this.emit('close')
    }
  }
  const watcher = new FakeWatcher()
  vi.doMock('node-watch', () => ({ default: () => watcher }))
  vi.resetModules()
  const { create } = await import('../../../src/cli/commands/assemblies.ts')
  vi.mocked(Transloadit.prototype.awaitAssemblyCompletion)
    .mockResolvedValueOnce({ ok: 'ASSEMBLY_COMPLETED', results })
    .mockRejectedValueOnce(new Error('Newer Assembly failed'))
  const rename = fs.promises.rename
  vi.spyOn(fs.promises, 'rename').mockImplementation(async (source, target) => {
    await rename(source, target)
    if (target === path.join(outputDir, 'master.m3u8')) watcher.emit('change', 'update', inputPath)
  })
  const output = new OutputCtl()
  vi.spyOn(output, 'error').mockImplementation(() => watcher.close())
  nock('https://downloads.test')
    .get('/master')
    .reply(200, '#EXTM3U\nvideo/segment.ts\n')
    .get('/segment')
    .delayBody(40)
    .reply(200, 'complete stream')

  const result = await create(output, new Transloadit({ authKey: 'key', authSecret: 'secret' }), {
    inputs: [inputPath],
    output: `${outputDir}/`,
    watch: true,
    stepsData: { adaptive: { robot: '/video/adaptive', use: ':original' } },
  })

  expect(result.hasFailures).toBe(true)
  expect(Transloadit.prototype.createAssembly).toHaveBeenCalledTimes(2)
  expect(await readFile(path.join(outputDir, 'master.m3u8'), 'utf8')).toBe(
    '#EXTM3U\nvideo/segment.ts\n',
  )
  expect(await readFile(path.join(outputDir, 'video', 'segment.ts'), 'utf8')).toBe(
    'complete stream',
  )
})

it.each([
  'steps',
  'output',
])('validates local %s configuration before downloading a URL', async (invalid) => {
  const { outputDir, run } = await fixture({})
  let downloads = 0
  nock('https://source.invalid')
    .get('/remote.png')
    .reply(200, () => {
      downloads += 1
      return 'remote input'
    })
  const args = ['-i', 'https://source.invalid/remote.png']
  if (invalid === 'steps') args.push('--steps', path.join(outputDir, 'missing.json'))
  else args.push('-i', 'https://source.invalid/second.png')

  expect(
    await run(args, invalid === 'output' ? path.join(outputDir, 'result.png') : `${outputDir}/`),
  ).toBe(1)
  expect(downloads).toBe(0)
  expect(Transloadit.prototype.createAssembly).not.toHaveBeenCalled()
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
  nock('https://source.invalid').get('/remote.png?signature=example').reply(200, 'remote input')
  nock('https://downloads.test').get('/result').reply(200, 'processed bytes')

  expect(
    await run([
      '-i',
      'https://source.invalid/remote.png?signature=example',
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

it('keeps single-result downloads flat for multiple standalone inputs', async () => {
  const { inputPath, outputDir, run, tempDir } = await fixture({
    resized: [{ name: 'result.png', url: 'https://downloads.test/result' }],
  })
  const secondInput = path.join(tempDir, 'second.png')
  await writeFile(secondInput, 'second input')
  nock('https://downloads.test').get('/result').twice().reply(200, 'result bytes')

  expect(await run(['-i', inputPath, '-i', secondInput])).toBe(0)
  expect(await readdir(outputDir)).toEqual(['result.png', 'result__1.png'])
})

it('accepts inputs with the same basename in different folders', async () => {
  const { inputPath, outputDir, run, tempDir } = await fixture({
    resized: [{ name: 'result.png', url: 'https://downloads.test/result' }],
  })
  const secondInput = path.join(tempDir, 'logo.png')
  await writeFile(secondInput, 'second input')
  nock('https://downloads.test').get('/result').twice().reply(200, 'result bytes')

  expect(await run(['-i', inputPath, '-i', secondInput])).toBe(0)
  expect(await readdir(outputDir)).toEqual(['result.png', 'result__1.png'])
})

it('does not mistake an input-named file for a current result with a different filename', async () => {
  const { inputPath, outputDir, run } = await fixture({
    bundled: [{ name: 'archive.zip', url: 'https://downloads.test/result' }],
  })
  await mkdir(outputDir)
  await writeFile(path.join(outputDir, 'logo.png'), 'unrelated file')
  await utimes(path.join(outputDir, 'logo.png'), new Date(), new Date(Date.now() + 10_000))
  nock('https://downloads.test').get('/result').reply(200, 'result bytes')

  expect(await run(['-i', inputPath])).toBe(0)
  expect(await readFile(path.join(outputDir, 'archive.zip'), 'utf8')).toBe('result bytes')
})

it('allows an explicitly selected output root that is a symlink', async () => {
  const { inputPath, outputDir, run, tempDir } = await fixture({
    resized: [{ name: 'result.png', url: 'https://downloads.test/result' }],
  })
  const destination = path.join(tempDir, 'destination')
  await mkdir(destination)
  await symlink(destination, outputDir)
  nock('https://downloads.test').get('/result').reply(200, 'result bytes')

  expect(await run(['-i', inputPath], outputDir)).toBe(0)
  expect(await readFile(path.join(destination, 'result.png'), 'utf8')).toBe('result bytes')
})

it('reserves concurrent linked downloads together when input stems match', async () => {
  const { inputPath, outputDir, run } = await fixture({
    adaptive: [
      { name: 'master.m3u8', url: 'https://downloads.test/master', meta: { relative_path: '' } },
      {
        name: 'segment.ts',
        url: 'https://downloads.test/segment',
        meta: { relative_path: 'video' },
      },
    ],
  })
  await writeFile(path.join(path.dirname(inputPath), 'logo.jpg'), 'second input')
  nock('https://downloads.test')
    .get('/master')
    .twice()
    .reply(200, '#EXTM3U\nvideo/segment.ts\n')
    .get('/segment')
    .twice()
    .reply(200, 'stream bytes')

  expect(await run(['-i', path.dirname(inputPath), '--concurrency', '2'])).toBe(0)
  expect(await readFile(path.join(outputDir, 'logo', 'master.m3u8'), 'utf8')).toBe(
    '#EXTM3U\nvideo/segment.ts\n',
  )
  expect(await readFile(path.join(outputDir, 'logo', 'adaptive', 'master.m3u8'), 'utf8')).toBe(
    '#EXTM3U\nvideo/segment.ts\n',
  )
  expect(
    await readFile(path.join(outputDir, 'logo', 'adaptive', 'video', 'segment.ts'), 'utf8'),
  ).toBe('stream bytes')
})

it.each([
  {
    existing: false,
    removeConflict: false,
    expectedName: 'result.png',
    expectedFiles: ['result.png'],
  },
  {
    existing: true,
    removeConflict: false,
    expectedName: 'result__1.png',
    expectedFiles: ['result.png', 'result__1.png'],
  },
  {
    existing: true,
    removeConflict: true,
    expectedName: 'result__1.png',
    expectedFiles: ['result__1.png'],
  },
])('refreshes its owned watch result (existing: $existing, removed: $removeConflict)', async ({
  existing,
  removeConflict,
  expectedName,
  expectedFiles,
}) => {
  const { inputPath, outputDir } = await fixture({
    resized: [{ name: 'result.png', url: 'https://downloads.test/result' }],
  })
  if (existing) {
    await mkdir(outputDir)
    await writeFile(path.join(outputDir, 'result.png'), 'unrelated file')
  }
  class FakeWatcher extends EventEmitter {
    close(): void {
      this.emit('close')
    }
  }
  const watcher = new FakeWatcher()
  vi.doMock('node-watch', () => ({ default: () => watcher }))
  vi.resetModules()
  const { create } = await import('../../../src/cli/commands/assemblies.ts')
  let completions = 0
  let resolveFirstCompletion: (() => void) | undefined
  const firstCompletion = new Promise<void>((resolve) => {
    resolveFirstCompletion = resolve
  })
  const output = new OutputCtl()
  vi.spyOn(output, 'debug').mockImplementation((message) => {
    if (!String(message).startsWith('COMPLETED')) return
    completions += 1
    if (completions === 1) resolveFirstCompletion?.()
    else watcher.close()
  })
  nock('https://downloads.test')
    .get('/result')
    .reply(200, 'first result')
    .get('/result')
    .reply(200, 'updated result')

  const processing = create(output, new Transloadit({ authKey: 'key', authSecret: 'secret' }), {
    inputs: [inputPath],
    output: `${outputDir}/`,
    watch: true,
    stepsData: { resized: { robot: '/image/resize', use: ':original', width: 16 } },
  })
  await firstCompletion
  if (removeConflict) await unlink(path.join(outputDir, 'result.png'))
  watcher.emit('change', 'update', inputPath)
  const result = await processing

  expect(result.hasFailures).toBe(false)
  expect(completions).toBe(2)
  expect(await readdir(outputDir)).toEqual(expectedFiles)
  expect(await readFile(path.join(outputDir, expectedName), 'utf8')).toBe('updated result')
  if (existing && !removeConflict)
    expect(await readFile(path.join(outputDir, 'result.png'), 'utf8')).toBe('unrelated file')
})

it('keeps a watched HLS Step in its selected folder after the original conflict disappears', async () => {
  const { inputPath, outputDir } = await fixture({
    adaptive: [
      { name: 'master.m3u8', url: 'https://downloads.test/master', meta: { relative_path: '' } },
      {
        name: 'segment.ts',
        url: 'https://downloads.test/segment',
        meta: { relative_path: 'video' },
      },
    ],
  })
  await mkdir(outputDir)
  await writeFile(path.join(outputDir, 'master.m3u8'), 'unrelated file')
  class FakeWatcher extends EventEmitter {
    close(): void {
      this.emit('close')
    }
  }
  const watcher = new FakeWatcher()
  vi.doMock('node-watch', () => ({ default: () => watcher }))
  vi.resetModules()
  const { create } = await import('../../../src/cli/commands/assemblies.ts')
  let resolveFirstCompletion: (() => void) | undefined
  const firstCompletion = new Promise<void>((resolve) => {
    resolveFirstCompletion = resolve
  })
  let completions = 0
  const output = new OutputCtl()
  vi.spyOn(output, 'debug').mockImplementation((message) => {
    if (!String(message).startsWith('COMPLETED')) return
    if (++completions === 1) resolveFirstCompletion?.()
    else watcher.close()
  })
  nock('https://downloads.test')
    .get('/master')
    .twice()
    .reply(200, '#EXTM3U\nvideo/segment.ts\n')
    .get('/segment')
    .reply(200, 'old segment')
    .get('/segment')
    .reply(200, 'new segment')

  const processing = create(output, new Transloadit({ authKey: 'key', authSecret: 'secret' }), {
    inputs: [inputPath],
    output: `${outputDir}/`,
    watch: true,
    stepsData: { adaptive: { robot: '/video/adaptive', use: ':original' } },
  })
  await firstCompletion
  await unlink(path.join(outputDir, 'master.m3u8'))
  watcher.emit('change', 'update', inputPath)

  expect((await processing).hasFailures).toBe(false)
  expect(completions).toBe(2)
  expect(await readdir(outputDir)).toEqual(['adaptive'])
  expect(await readFile(path.join(outputDir, 'adaptive', 'video', 'segment.ts'), 'utf8')).toBe(
    'new segment',
  )
})

it.each([
  { firstPath: 'first/clip.mp4', secondPath: 'second/clip.mp4' },
  { firstPath: 'clip.mp4', secondPath: undefined },
])('keeps watched HLS source paths attached to their folders (paths: $firstPath, $secondPath)', async ({
  firstPath,
  secondPath,
}) => {
  const firstMaster = {
    original_id: 'first-old',
    original_name: 'clip.mp4',
    original_path: firstPath,
    name: 'master.m3u8',
    url: 'https://downloads.test/first-master',
    meta: { relative_path: '' },
  }
  const firstSegment = {
    ...firstMaster,
    name: 'segment.ts',
    url: 'https://downloads.test/first-segment',
    meta: { relative_path: 'video' },
  }
  const secondMaster = {
    ...firstMaster,
    original_id: 'second-old',
    original_path: secondPath,
    url: 'https://downloads.test/second-master',
  }
  const secondSegment = {
    ...firstSegment,
    original_id: 'second-old',
    original_path: secondPath,
    url: 'https://downloads.test/second-segment',
  }
  const { inputPath, outputDir } = await fixture({
    adaptive: [firstMaster, firstSegment, secondMaster, secondSegment],
  })
  vi.mocked(Transloadit.prototype.awaitAssemblyCompletion)
    .mockResolvedValueOnce({
      ok: 'ASSEMBLY_COMPLETED',
      results: { adaptive: [firstMaster, firstSegment, secondMaster, secondSegment] },
    })
    .mockResolvedValueOnce({
      ok: 'ASSEMBLY_COMPLETED',
      results: {
        adaptive: [
          { ...secondMaster, original_id: 'second-new' },
          { ...secondSegment, original_id: 'second-new' },
          { ...firstMaster, original_id: 'first-new' },
          { ...firstSegment, original_id: 'first-new' },
        ],
      },
    })
  class FakeWatcher extends EventEmitter {
    close(): void {
      this.emit('close')
    }
  }
  const watcher = new FakeWatcher()
  vi.doMock('node-watch', () => ({ default: () => watcher }))
  vi.resetModules()
  const { create } = await import('../../../src/cli/commands/assemblies.ts')
  const output = new OutputCtl()
  let completions = 0
  vi.spyOn(output, 'debug').mockImplementation((message) => {
    if (!String(message).startsWith('COMPLETED')) return
    if (++completions === 1) watcher.emit('change', 'update', inputPath)
    else watcher.close()
  })
  nock('https://downloads.test')
    .get('/first-master')
    .twice()
    .reply(200, '#EXTM3U\nvideo/segment.ts\n')
    .get('/second-master')
    .twice()
    .reply(200, '#EXTM3U\nvideo/segment.ts\n')
    .get('/first-segment')
    .reply(200, 'first original')
    .get('/first-segment')
    .reply(200, 'first updated')
    .get('/second-segment')
    .reply(200, 'second original')
    .get('/second-segment')
    .reply(200, 'second updated')

  const result = await create(output, new Transloadit({ authKey: 'key', authSecret: 'secret' }), {
    inputs: [inputPath],
    output: `${outputDir}/`,
    watch: true,
    stepsData: { adaptive: { robot: '/video/adaptive', use: ':original' } },
  })
  expect(result.hasFailures).toBe(false)
  expect(completions).toBe(2)
  expect(await readFile(path.join(outputDir, 'clip', 'video', 'segment.ts'), 'utf8')).toBe(
    'first updated',
  )
  expect(await readFile(path.join(outputDir, 'clip__1', 'video', 'segment.ts'), 'utf8')).toBe(
    'second updated',
  )
})

it('accepts a standalone input and a directory containing the same basename', async () => {
  const { inputPath, outputDir, run, tempDir } = await fixture({
    resized: [{ name: 'result.png', url: 'https://downloads.test/result' }],
  })
  const directoryInput = path.join(tempDir, 'pictures')
  await mkdir(directoryInput)
  await writeFile(path.join(directoryInput, 'logo.png'), 'second input')
  nock('https://downloads.test').get('/result').twice().reply(200, 'result bytes')

  expect(await run(['-i', inputPath, '-i', directoryInput])).toBe(0)
  expect(await readdir(outputDir)).toEqual(['result.png', 'result__1.png'])
})

it('fails promptly when a regular file blocks an ordinary Step directory', async () => {
  const { inputPath, outputDir, run } = await fixture({
    thumbs: [{ name: 'result.png', url: 'https://downloads.test/image' }],
    text: [{ name: 'result.txt', url: 'https://downloads.test/text' }],
  })
  await mkdir(outputDir)
  await writeFile(path.join(outputDir, 'thumbs'), 'existing file')
  const lstat = fs.promises.lstat
  let probes = 0
  vi.spyOn(fs.promises, 'lstat').mockImplementation(async (...args) => {
    probes += 1
    // Bound the broken implementation so a failed regression does not hang the test worker.
    if (probes > 30) throw new Error('Filesystem probe budget exceeded')
    return await lstat(...args)
  })

  expect(await run(['-i', inputPath])).toBe(1)
  expect(probes).toBeLessThan(15)
  expect(await readFile(path.join(outputDir, 'thumbs'), 'utf8')).toBe('existing file')
})

it('discards a slow watch download when a newer result has already been saved', async () => {
  const { inputPath, outputDir } = await fixture({})
  class FakeWatcher extends EventEmitter {
    close(): void {
      this.emit('close')
    }
  }
  const watcher = new FakeWatcher()
  let resolveWatcherReady: (() => void) | undefined
  const watcherReady = new Promise<void>((resolve) => {
    resolveWatcherReady = resolve
  })
  vi.doMock('node-watch', () => ({
    default: () => {
      resolveWatcherReady?.()
      return watcher
    },
  }))
  vi.resetModules()
  const { create } = await import('../../../src/cli/commands/assemblies.ts')
  let count = 0
  vi.mocked(Transloadit.prototype.createAssembly).mockImplementation(async () => ({
    assembly_id: String(++count),
  }))
  vi.mocked(Transloadit.prototype.awaitAssemblyCompletion).mockImplementation(async (id) => ({
    ok: 'ASSEMBLY_COMPLETED',
    results: { resized: [{ name: 'result.png', url: `https://downloads.test/${id}` }] },
  }))
  let resolveDownloadStarted: (() => void) | undefined
  const downloadStarted = new Promise<void>((resolve) => {
    resolveDownloadStarted = resolve
  })
  nock('https://downloads.test')
    .get('/1')
    .delayBody(120)
    .reply(200, () => {
      resolveDownloadStarted?.()
      return 'older result'
    })
    .get('/2')
    .reply(200, 'newer result')
  const output = new OutputCtl()
  vi.spyOn(output, 'debug').mockImplementation((message) => {
    if (String(message).startsWith('COMPLETED')) watcher.close()
  })

  const processing = create(output, new Transloadit({ authKey: 'key', authSecret: 'secret' }), {
    inputs: [inputPath],
    output: `${outputDir}/`,
    watch: true,
    stepsData: { resized: { robot: '/image/resize', use: ':original', width: 16 } },
  })
  await watcherReady
  await downloadStarted
  watcher.emit('change', 'update', inputPath)

  expect((await processing).hasFailures).toBe(false)
  expect(count).toBe(2)
  expect(await readFile(path.join(outputDir, 'result.png'), 'utf8')).toBe('newer result')
})

it('moves a linked Step together when an existing file occupies a rendition directory', async () => {
  const { inputPath, outputDir, run } = await fixture({
    adaptive: [
      { name: 'master.m3u8', url: 'https://downloads.test/master', meta: { relative_path: '' } },
      {
        name: 'segment.ts',
        url: 'https://downloads.test/segment',
        meta: { relative_path: 'video' },
      },
    ],
  })
  await mkdir(outputDir)
  await writeFile(path.join(outputDir, 'video'), 'existing file')
  nock('https://downloads.test')
    .get('/master')
    .reply(200, '#EXTM3U\nvideo/segment.ts\n')
    .get('/segment')
    .reply(200, 'stream bytes')

  expect(await run(['-i', inputPath])).toBe(0)
  expect(await readFile(path.join(outputDir, 'adaptive', 'video', 'segment.ts'), 'utf8')).toBe(
    'stream bytes',
  )
  expect(await readFile(path.join(outputDir, 'video'), 'utf8')).toBe('existing file')
})

it('reuses watched filenames when the Assembly returns its results in a different order', async () => {
  const { inputPath, outputDir } = await fixture({})
  class FakeWatcher extends EventEmitter {
    close(): void {
      this.emit('close')
    }
  }
  const watcher = new FakeWatcher()
  vi.doMock('node-watch', () => ({ default: () => watcher }))
  vi.resetModules()
  const { create } = await import('../../../src/cli/commands/assemblies.ts')
  const a = { name: 'a.png', url: 'https://downloads.test/a' }
  const b = { name: 'b.png', url: 'https://downloads.test/b' }
  vi.mocked(Transloadit.prototype.awaitAssemblyCompletion)
    .mockResolvedValueOnce({ ok: 'ASSEMBLY_COMPLETED', results: { resized: [a, b] } })
    .mockResolvedValueOnce({ ok: 'ASSEMBLY_COMPLETED', results: { resized: [b, a] } })
  const output = new OutputCtl()
  let completions = 0
  vi.spyOn(output, 'debug').mockImplementation((message) => {
    if (!String(message).startsWith('COMPLETED')) return
    if (++completions === 1) watcher.emit('change', 'update', inputPath)
    else watcher.close()
  })
  nock('https://downloads.test')
    .get('/a')
    .reply(200, 'old a')
    .get('/b')
    .reply(200, 'old b')
    .get('/b')
    .reply(200, 'new b')
    .get('/a')
    .reply(200, 'new a')

  const result = await create(output, new Transloadit({ authKey: 'key', authSecret: 'secret' }), {
    inputs: [inputPath],
    output: `${outputDir}/`,
    watch: true,
    stepsData: { resized: { robot: '/image/resize', use: ':original', width: 16 } },
  })

  expect(result.hasFailures).toBe(false)
  expect(await readdir(outputDir)).toEqual(['a.png', 'b.png'])
  expect(await readFile(path.join(outputDir, 'a.png'), 'utf8')).toBe('new a')
  expect(await readFile(path.join(outputDir, 'b.png'), 'utf8')).toBe('new b')
})
