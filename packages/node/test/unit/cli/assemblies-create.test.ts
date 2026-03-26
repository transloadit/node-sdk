import { mkdir, mkdtemp, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import nock from 'nock'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { create } from '../../../src/cli/commands/assemblies.ts'
import OutputCtl from '../../../src/cli/OutputCtl.ts'

const tempDirs: string[] = []

async function createTempDir(prefix: string): Promise<string> {
  const tempDir = await mkdtemp(path.join(tmpdir(), prefix))
  tempDirs.push(tempDir)
  return tempDir
}

function getLegacyRelativeInputPath(inputPath: string): string {
  return path.relative(process.cwd(), inputPath).replace(/^(\.\.\/)+/, '')
}

async function collectRelativeFiles(rootDir: string, currentDir = rootDir): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectRelativeFiles(rootDir, fullPath)))
      continue
    }

    files.push(path.relative(rootDir, fullPath))
  }

  return files.sort()
}

afterEach(async () => {
  vi.restoreAllMocks()
  nock.cleanAll()
  nock.abortPendingRequests()

  await Promise.all(
    tempDirs.splice(0).map((tempDir) => rm(tempDir, { recursive: true, force: true })),
  )
})

describe('assemblies create', () => {
  it('supports bundled single-assembly outputs written to a file path', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-bundle-')
    const inputA = path.join(tempDir, 'a.txt')
    const inputB = path.join(tempDir, 'b.txt')
    const outputPath = path.join(tempDir, 'bundle.zip')

    await writeFile(inputA, 'a')
    await writeFile(inputB, 'b')

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-1' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          compressed: [{ url: 'http://downloads.test/bundle.zip', name: 'bundle.zip' }],
        },
      }),
    }

    nock('http://downloads.test').get('/bundle.zip').reply(200, 'bundle-contents')

    await expect(
      create(output, client as never, {
        inputs: [inputA, inputB],
        output: outputPath,
        singleAssembly: true,
        stepsData: {
          compressed: {
            robot: '/file/compress',
            result: true,
            use: {
              steps: [':original'],
              bundle_steps: true,
            },
          },
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        hasFailures: false,
      }),
    )

    expect(client.createAssembly).toHaveBeenCalledTimes(1)
    expect(await readFile(outputPath, 'utf8')).toBe('bundle-contents')
  })

  it('keeps unchanged inputs in single-assembly rebuilds when one input is stale', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-bundle-stale-')
    const inputA = path.join(tempDir, 'a.txt')
    const inputB = path.join(tempDir, 'b.txt')
    const outputPath = path.join(tempDir, 'bundle.zip')

    await writeFile(inputA, 'a')
    await writeFile(inputB, 'b')
    await writeFile(outputPath, 'old-bundle')

    const baseTime = new Date('2026-01-01T00:00:00.000Z')
    const outputTime = new Date('2026-01-01T00:00:10.000Z')
    const changedInputTime = new Date('2026-01-01T00:00:20.000Z')

    await utimes(inputA, changedInputTime, changedInputTime)
    await utimes(inputB, baseTime, baseTime)
    await utimes(outputPath, outputTime, outputTime)

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-stale-bundle' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          compressed: [{ url: 'http://downloads.test/bundle.zip', name: 'bundle.zip' }],
        },
      }),
    }

    nock('http://downloads.test').get('/bundle.zip').reply(200, 'bundle-contents')

    await create(output, client as never, {
      inputs: [inputA, inputB],
      output: outputPath,
      singleAssembly: true,
      stepsData: {
        compressed: {
          robot: '/file/compress',
          result: true,
          use: {
            steps: [':original'],
            bundle_steps: true,
          },
        },
      },
    })

    expect(client.createAssembly).toHaveBeenCalledTimes(1)
    const uploads = client.createAssembly.mock.calls[0]?.[0]?.uploads
    expect(Object.keys(uploads ?? {}).sort()).toEqual(['a.txt', 'b.txt'])
  })

  it('writes single-input directory outputs using result filenames', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-outdir-')
    const inputPath = path.join(tempDir, 'clip.mp4')
    const outputDir = path.join(tempDir, 'thumbs')

    await writeFile(inputPath, 'video')
    await mkdir(outputDir, { recursive: true })

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-2' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          thumbs: [
            { url: 'http://downloads.test/one.jpg', name: 'one.jpg' },
            { url: 'http://downloads.test/two.jpg', name: 'two.jpg' },
          ],
        },
      }),
    }

    nock('http://downloads.test').get('/one.jpg').reply(200, 'one')
    nock('http://downloads.test').get('/two.jpg').reply(200, 'two')

    await expect(
      create(
        output,
        client as never,
        {
          inputs: [inputPath],
          output: outputDir,
          stepsData: {
            thumbs: {
              robot: '/video/thumbs',
              result: true,
              use: ':original',
            },
          },
          outputMode: 'directory',
        } as never,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        hasFailures: false,
      }),
    )

    expect(await readFile(path.join(outputDir, 'one.jpg'), 'utf8')).toBe('one')
    expect(await readFile(path.join(outputDir, 'two.jpg'), 'utf8')).toBe('two')
  })

  it('preserves legacy step-directory layout for generic directory outputs', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-legacy-outdir-')
    const inputPath = path.join(tempDir, 'clip.mp4')
    const outputDir = path.join(tempDir, 'thumbs')

    await writeFile(inputPath, 'video')
    await mkdir(outputDir, { recursive: true })

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-legacy-dir' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          thumbs: [
            { url: 'http://downloads.test/one.jpg', name: 'one.jpg' },
            { url: 'http://downloads.test/two.jpg', name: 'two.jpg' },
          ],
        },
      }),
    }

    nock('http://downloads.test').get('/one.jpg').reply(200, 'one')
    nock('http://downloads.test').get('/two.jpg').reply(200, 'two')

    await create(
      output,
      client as never,
      {
        inputs: [inputPath],
        output: outputDir,
        stepsData: {
          thumbs: {
            robot: '/video/thumbs',
            result: true,
            use: ':original',
          },
        },
      } as never,
    )

    const legacyRelative = getLegacyRelativeInputPath(inputPath)
    const legacyBaseDir = path.join(path.dirname(legacyRelative), path.parse(legacyRelative).name)

    expect(await collectRelativeFiles(outputDir)).toEqual([
      path.join(legacyBaseDir, 'thumbs', 'one.jpg'),
      path.join(legacyBaseDir, 'thumbs', 'two.jpg'),
    ])
  })

  it('uses the actual result filename for single-result directory outputs', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-single-result-outdir-')
    const inputPath = path.join(tempDir, 'archive.zip')
    const outputDir = path.join(tempDir, 'extracted')

    await writeFile(inputPath, 'zip-data')
    await mkdir(outputDir, { recursive: true })

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-3' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          decompressed: [{ url: 'http://downloads.test/input.txt', name: 'input.txt' }],
        },
      }),
    }

    nock('http://downloads.test').get('/input.txt').reply(200, 'hello')

    await expect(
      create(output, client as never, {
        inputs: [inputPath],
        output: outputDir,
        stepsData: {
          decompressed: {
            robot: '/file/decompress',
            result: true,
            use: ':original',
          },
        },
        outputMode: 'directory',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        hasFailures: false,
      }),
    )

    expect(await readFile(path.join(outputDir, 'input.txt'), 'utf8')).toBe('hello')
  })

  it('preserves mapped out paths for legacy single-result directory outputs', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-legacy-single-result-')
    const inputPath = path.join(tempDir, 'archive.zip')
    const outputDir = path.join(tempDir, 'extracted')

    await writeFile(inputPath, 'zip-data')
    await mkdir(outputDir, { recursive: true })

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-legacy-single-result' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          decompressed: [{ url: 'http://downloads.test/input.txt', name: 'input.txt' }],
        },
      }),
    }

    nock('http://downloads.test').get('/input.txt').reply(200, 'hello')

    await create(output, client as never, {
      inputs: [inputPath],
      output: outputDir,
      stepsData: {
        decompressed: {
          robot: '/file/decompress',
          result: true,
          use: ':original',
        },
      },
    })

    expect(await collectRelativeFiles(outputDir)).toEqual([getLegacyRelativeInputPath(inputPath)])
  })

  it('does not create an empty output file when assembly creation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-failed-create-')
    const inputPath = path.join(tempDir, 'image.jpg')
    const outputPath = path.join(tempDir, 'resized.jpg')

    await writeFile(inputPath, 'image-data')

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockRejectedValue(new Error('boom')),
    }

    await expect(
      create(output, client as never, {
        inputs: [inputPath],
        output: outputPath,
        stepsData: {
          resized: {
            robot: '/image/resize',
            result: true,
            use: ':original',
            width: 200,
          },
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        hasFailures: true,
      }),
    )

    await expect(stat(outputPath)).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })
})
