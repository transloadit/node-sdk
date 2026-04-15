import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import tty from 'node:tty'
import nock from 'nock'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { create } from '../../../src/cli/commands/assemblies.ts'
import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { parseStepsInputJson } from '../../../src/cli/stepsInput.ts'
import PollingTimeoutError from '../../../src/PollingTimeoutError.ts'

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
  vi.resetModules()
  nock.cleanAll()
  nock.abortPendingRequests()

  await Promise.all(
    tempDirs.splice(0).map((tempDir) => rm(tempDir, { recursive: true, force: true })),
  )
})

describe('assemblies create', () => {
  it('writes result bytes to stdout when output is -', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const output = new OutputCtl()
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-stdout' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          generated: [{ url: 'http://downloads.test/stdout.txt', name: 'stdout.txt' }],
        },
      }),
    }

    nock('http://downloads.test').get('/stdout.txt').reply(200, 'stdout-contents')

    await expect(
      create(output, client as never, {
        inputs: [],
        output: '-',
        stepsData: {
          generated: {
            robot: '/image/generate',
            result: true,
            prompt: 'hello',
            model: 'flux-schnell',
          },
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        hasFailures: false,
      }),
    )

    expect(stdoutWrite).toHaveBeenCalled()
    expect(stdoutWrite.mock.calls.map(([chunk]) => String(chunk)).join('')).toContain(
      'stdout-contents',
    )
  })

  it('waits for stdout drain before finishing stdout downloads', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const output = new OutputCtl()
    let resolved = false
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => false)
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-stdout-drain' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          generated: [{ url: 'http://downloads.test/stdout-drain.txt', name: 'stdout-drain.txt' }],
        },
      }),
    }

    nock('http://downloads.test').get('/stdout-drain.txt').reply(200, 'stdout-drain')

    const createPromise = create(output, client as never, {
      inputs: [],
      output: '-',
      stepsData: {
        generated: {
          robot: '/image/generate',
          result: true,
          prompt: 'hello',
          model: 'flux-schnell',
        },
      },
    }).then(() => {
      resolved = true
    })

    await delay(20)
    expect(resolved).toBe(false)
    expect(stdoutWrite).toHaveBeenCalled()

    process.stdout.emit('drain')

    await createPromise
    expect(resolved).toBe(true)
  })

  it('returns result URLs for completed assemblies without local output', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-urls' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          generated: [{ url: 'http://downloads.test/result.png', name: 'result.png' }],
        },
      }),
    }

    await expect(
      create(output, client as never, {
        inputs: [],
        output: null,
        stepsData: {
          generated: {
            robot: '/image/generate',
            result: true,
            prompt: 'hello',
            model: 'flux-schnell',
          },
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        hasFailures: false,
        resultUrls: [
          {
            assemblyId: 'assembly-urls',
            step: 'generated',
            name: 'result.png',
            url: 'http://downloads.test/result.png',
          },
        ],
      }),
    )
  })

  it('rejects stdout output when an assembly returns multiple files', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-stdout-multi' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          generated: [
            { url: 'http://downloads.test/stdout-a.txt', name: 'a.txt' },
            { url: 'http://downloads.test/stdout-b.txt', name: 'b.txt' },
          ],
        },
      }),
    }

    nock('http://downloads.test').get('/stdout-a.txt').reply(200, 'stdout-a')
    nock('http://downloads.test').get('/stdout-b.txt').reply(200, 'stdout-b')

    await expect(
      create(output, client as never, {
        inputs: [],
        output: '-',
        stepsData: {
          generated: {
            robot: '/image/generate',
            result: true,
            prompt: 'hello',
            model: 'flux-schnell',
          },
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        hasFailures: true,
      }),
    )

    expect(stdoutWrite).not.toHaveBeenCalled()
  })

  it('rejects file outputs when an assembly returns multiple files', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-file-output-multi-')
    const outputPath = path.join(tempDir, 'result.txt')

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-file-multi' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          generated: [
            { url: 'http://downloads.test/result-a.txt', name: 'a.txt' },
            { url: 'http://downloads.test/result-b.txt', name: 'b.txt' },
          ],
        },
      }),
    }

    nock('http://downloads.test').get('/result-a.txt').reply(200, 'result-a')
    nock('http://downloads.test').get('/result-b.txt').reply(200, 'result-b')

    await expect(
      create(output, client as never, {
        inputs: [],
        output: outputPath,
        stepsData: {
          generated: {
            robot: '/image/generate',
            result: true,
            prompt: 'hello',
            model: 'flux-schnell',
          },
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        hasFailures: true,
      }),
    )

    await expect(stat(outputPath)).rejects.toThrow()
  })

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

  it('runs valid inputless single-assembly steps instead of no-oping', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-inputless-single-assembly-')
    const outputPath = path.join(tempDir, 'generated.png')

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-inputless-single' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          generated: [{ url: 'http://downloads.test/generated.png', name: 'generated.png' }],
        },
      }),
    }

    nock('http://downloads.test').get('/generated.png').reply(200, 'image-bytes')

    await create(output, client as never, {
      inputs: [],
      output: outputPath,
      singleAssembly: true,
      stepsData: {
        generated: {
          robot: '/image/generate',
          result: true,
          prompt: 'hello',
          model: 'google/nano-banana',
        },
      },
    })

    expect(client.createAssembly).toHaveBeenCalledTimes(1)
    expect(await readFile(outputPath, 'utf8')).toBe('image-bytes')
  })

  it('runs valid inputless single-assembly steps when --out is a directory', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-inputless-single-assembly-dir-')
    const outputDir = path.join(tempDir, 'out')
    await mkdir(outputDir, { recursive: true })

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-inputless-single-dir' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          generated: [
            { url: 'http://downloads.test/generated-dir.png', name: 'generated-dir.png' },
          ],
        },
      }),
    }

    nock('http://downloads.test').get('/generated-dir.png').reply(200, 'dir-image-bytes')

    await create(output, client as never, {
      inputs: [],
      output: outputDir,
      outputMode: 'directory',
      singleAssembly: true,
      stepsData: {
        generated: {
          robot: '/image/generate',
          result: true,
          prompt: 'hello',
          model: 'google/nano-banana',
        },
      },
    })

    expect(client.createAssembly).toHaveBeenCalledTimes(1)
    expect(await readFile(path.join(outputDir, 'generated-dir.png'), 'utf8')).toBe(
      'dir-image-bytes',
    )
  })

  it('returns normalized step data from steps input parsing', () => {
    const parsed = parseStepsInputJson(
      JSON.stringify({
        waveform: {
          robot: '/audio/waveform',
          use: ':original',
          result: true,
          style: 1,
        },
      }),
    )

    expect(parsed).toEqual({
      waveform: {
        robot: '/audio/waveform',
        use: ':original',
        result: true,
        style: 'v1',
      },
    })
  })

  it('rejects invalid steps files before calling the API', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-invalid-steps-')
    const stepsPath = path.join(tempDir, 'steps.json')

    await writeFile(
      stepsPath,
      JSON.stringify({
        generated: {
          robot: '/image/generate',
          prompt: 123,
          model: 'google/nano-banana',
        },
      }),
    )

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn(),
      awaitAssemblyCompletion: vi.fn(),
    }

    await expect(
      create(output, client as never, {
        inputs: [],
        output: path.join(tempDir, 'result.png'),
        steps: stepsPath,
      }),
    ).rejects.toThrow(/Invalid steps format/)

    expect(client.createAssembly).not.toHaveBeenCalled()
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
    const files = client.createAssembly.mock.calls[0]?.[0]?.files
    expect(Object.keys(files ?? {}).sort()).toEqual(['a.txt', 'b.txt'])
  })

  it('skips bundled single-assembly runs when the output is newer than every input', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-bundle-skip-stale-')
    const inputA = path.join(tempDir, 'a.txt')
    const inputB = path.join(tempDir, 'b.txt')
    const outputPath = path.join(tempDir, 'bundle.zip')

    await writeFile(inputA, 'a')
    await writeFile(inputB, 'b')
    await writeFile(outputPath, 'existing-bundle')

    const inputTime = new Date('2026-01-01T00:00:00.000Z')
    const outputTime = new Date('2026-01-01T00:00:10.000Z')

    await utimes(inputA, inputTime, inputTime)
    await utimes(inputB, inputTime, inputTime)
    await utimes(outputPath, outputTime, outputTime)

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn(),
      awaitAssemblyCompletion: vi.fn(),
    }

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
        results: [],
      }),
    )

    expect(client.createAssembly).not.toHaveBeenCalled()
    expect(await readFile(outputPath, 'utf8')).toBe('existing-bundle')
  })

  it('reruns single-input bundled assemblies when the input is newer than the output', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-bundle-single-input-stale-')
    const inputPath = path.join(tempDir, 'a.txt')
    const outputPath = path.join(tempDir, 'bundle.zip')

    await writeFile(inputPath, 'a')
    await writeFile(outputPath, 'existing-bundle')

    const outputTime = new Date('2026-01-01T00:00:10.000Z')
    const inputTime = new Date('2026-01-01T00:00:20.000Z')

    await utimes(inputPath, inputTime, inputTime)
    await utimes(outputPath, outputTime, outputTime)

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-single-input-stale' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          compressed: [{ url: 'http://downloads.test/bundle-single.zip', name: 'bundle.zip' }],
        },
      }),
    }

    nock('http://downloads.test').get('/bundle-single.zip').reply(200, 'fresh-bundle')

    await create(output, client as never, {
      inputs: [inputPath],
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
    expect(client.createAssembly.mock.calls[0]?.[0]?.files).toEqual({
      'a.txt': inputPath,
    })
    expect(await readFile(outputPath, 'utf8')).toBe('fresh-bundle')
  })

  it('preserves the original filename for per-file uploads', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-file-upload-name-')
    const inputPath = path.join(tempDir, 'README.md')
    const outputPath = path.join(tempDir, 'README.pdf')

    await writeFile(inputPath, '# Hello')

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-readme-md' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          converted: [{ url: 'http://downloads.test/README.pdf', name: 'README.pdf' }],
        },
      }),
    }

    nock('http://downloads.test').get('/README.pdf').reply(200, 'pdf-contents')

    await create(output, client as never, {
      inputs: [inputPath],
      output: outputPath,
      stepsData: {
        converted: {
          robot: '/document/convert',
          result: true,
          use: ':original',
          format: 'pdf',
        },
      },
    })

    expect(client.createAssembly).toHaveBeenCalledTimes(1)
    expect(client.createAssembly.mock.calls[0]?.[0]?.files).toEqual({
      in: inputPath,
    })
    expect(client.createAssembly.mock.calls[0]?.[0]?.uploads).toBeUndefined()
  })

  it('rewrites existing bundled outputs on single-assembly reruns', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-bundle-rerun-')
    const inputA = path.join(tempDir, 'a.txt')
    const inputB = path.join(tempDir, 'b.txt')
    const outputPath = path.join(tempDir, 'bundle.zip')

    await writeFile(inputA, 'a')
    await writeFile(inputB, 'b')
    await writeFile(outputPath, 'old-bundle')

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-rerun-bundle' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          compressed: [{ url: 'http://downloads.test/bundle-rerun.zip', name: 'bundle.zip' }],
        },
      }),
    }

    nock('http://downloads.test').get('/bundle-rerun.zip').reply(200, 'fresh-bundle')

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

    expect(await readFile(outputPath, 'utf8')).toBe('fresh-bundle')
  })

  it('does not let older watch assemblies overwrite newer results', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.resetModules()

    class FakeWatcher extends EventEmitter {
      close(): void {
        this.emit('close')
      }
    }

    const fakeWatcher = new FakeWatcher()
    vi.doMock('node-watch', () => {
      return {
        default: vi.fn(() => fakeWatcher),
      }
    })

    const { create: createWithWatch } = await import('../../../src/cli/commands/assemblies.ts')

    const tempDir = await createTempDir('transloadit-watch-')
    const inputPath = path.join(tempDir, 'clip.mp4')
    const outputPath = path.join(tempDir, 'thumb.jpg')

    await writeFile(inputPath, 'video-v1')
    await writeFile(outputPath, 'existing-thumb')

    const baseTime = new Date('2026-01-01T00:00:00.000Z')
    const outputTime = new Date('2026-01-01T00:00:10.000Z')
    const firstChangeTime = new Date('2026-01-01T00:00:20.000Z')
    const secondChangeTime = new Date('2026-01-01T00:00:30.000Z')

    await utimes(inputPath, baseTime, baseTime)
    await utimes(outputPath, outputTime, outputTime)

    const output = new OutputCtl()
    const client = {
      createAssembly: vi
        .fn()
        .mockResolvedValueOnce({ assembly_id: 'assembly-old' })
        .mockResolvedValueOnce({ assembly_id: 'assembly-new' }),
      awaitAssemblyCompletion: vi.fn(async (assemblyId: string) => {
        if (assemblyId === 'assembly-old') {
          await delay(80)
          return {
            ok: 'ASSEMBLY_COMPLETED',
            results: {
              thumbs: [{ url: 'http://downloads.test/old.jpg', name: 'old.jpg' }],
            },
          }
        }

        await delay(10)
        return {
          ok: 'ASSEMBLY_COMPLETED',
          results: {
            thumbs: [{ url: 'http://downloads.test/new.jpg', name: 'new.jpg' }],
          },
        }
      }),
    }

    nock('http://downloads.test').get('/old.jpg').reply(200, 'old-result')
    nock('http://downloads.test').get('/new.jpg').reply(200, 'new-result')

    const createPromise = createWithWatch(output, client as never, {
      inputs: [inputPath],
      output: outputPath,
      watch: true,
      concurrency: 2,
      stepsData: {
        thumbs: {
          robot: '/video/thumbs',
          result: true,
          use: ':original',
        },
      },
    })

    await delay(20)
    await writeFile(inputPath, 'video-v2')
    await utimes(inputPath, firstChangeTime, firstChangeTime)
    fakeWatcher.emit('change', 'update', inputPath)

    await delay(5)
    await writeFile(inputPath, 'video-v3')
    await utimes(inputPath, secondChangeTime, secondChangeTime)
    fakeWatcher.emit('change', 'update', inputPath)

    await vi.waitFor(() => {
      expect(client.awaitAssemblyCompletion).toHaveBeenCalledTimes(2)
    })
    fakeWatcher.close()

    await expect(createPromise).resolves.toEqual(
      expect.objectContaining({
        hasFailures: false,
      }),
    )

    expect(await readFile(outputPath, 'utf8')).toBe('new-result')
  })

  it('does not return stale watched result URLs that lose the race', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.resetModules()

    class FakeWatcher extends EventEmitter {
      close(): void {
        this.emit('close')
      }
    }

    const fakeWatcher = new FakeWatcher()
    vi.doMock('node-watch', () => {
      return {
        default: vi.fn(() => fakeWatcher),
      }
    })

    const { create: createWithWatch } = await import('../../../src/cli/commands/assemblies.ts')

    const tempDir = await createTempDir('transloadit-watch-urls-')
    const inputPath = path.join(tempDir, 'clip.mp4')
    const outputPath = path.join(tempDir, 'thumb.jpg')

    await writeFile(inputPath, 'video-v1')
    await writeFile(outputPath, 'existing-thumb')

    const baseTime = new Date('2026-01-01T00:00:00.000Z')
    const outputTime = new Date('2026-01-01T00:00:10.000Z')
    const firstChangeTime = new Date('2026-01-01T00:00:20.000Z')
    const secondChangeTime = new Date('2026-01-01T00:00:30.000Z')

    await utimes(inputPath, baseTime, baseTime)
    await utimes(outputPath, outputTime, outputTime)

    const output = new OutputCtl()
    const client = {
      createAssembly: vi
        .fn()
        .mockResolvedValueOnce({ assembly_id: 'assembly-old' })
        .mockResolvedValueOnce({ assembly_id: 'assembly-new' }),
      awaitAssemblyCompletion: vi.fn(async (assemblyId: string) => {
        if (assemblyId === 'assembly-old') {
          await delay(80)
          return {
            ok: 'ASSEMBLY_COMPLETED',
            results: {
              thumbs: [{ url: 'http://downloads.test/old.jpg', name: 'old.jpg' }],
            },
          }
        }

        await delay(10)
        return {
          ok: 'ASSEMBLY_COMPLETED',
          results: {
            thumbs: [{ url: 'http://downloads.test/new.jpg', name: 'new.jpg' }],
          },
        }
      }),
    }

    nock('http://downloads.test').get('/old.jpg').reply(200, 'old-result')
    nock('http://downloads.test').get('/new.jpg').reply(200, 'new-result')

    const createPromise = createWithWatch(output, client as never, {
      inputs: [inputPath],
      output: outputPath,
      watch: true,
      concurrency: 2,
      stepsData: {
        thumbs: {
          robot: '/video/thumbs',
          result: true,
          use: ':original',
        },
      },
    })

    await delay(20)
    await writeFile(inputPath, 'video-v2')
    await utimes(inputPath, firstChangeTime, firstChangeTime)
    fakeWatcher.emit('change', 'update', inputPath)

    await delay(5)
    await writeFile(inputPath, 'video-v3')
    await utimes(inputPath, secondChangeTime, secondChangeTime)
    fakeWatcher.emit('change', 'update', inputPath)

    await vi.waitFor(() => {
      expect(client.awaitAssemblyCompletion).toHaveBeenCalledTimes(2)
    })
    fakeWatcher.close()

    await expect(createPromise).resolves.toEqual(
      expect.objectContaining({
        hasFailures: false,
        resultUrls: [
          {
            assemblyId: 'assembly-new',
            step: 'thumbs',
            name: 'new.jpg',
            url: 'http://downloads.test/new.jpg',
          },
        ],
      }),
    )
  })

  it('does not let a newer watch job get skipped after an older watch result updates the output', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.resetModules()

    class FakeWatcher extends EventEmitter {
      close(): void {
        this.emit('close')
      }
    }

    const fakeWatcher = new FakeWatcher()
    vi.doMock('node-watch', () => {
      return {
        default: vi.fn(() => fakeWatcher),
      }
    })

    const { create: createWithWatch } = await import('../../../src/cli/commands/assemblies.ts')

    const tempDir = await createTempDir('transloadit-watch-newer-skipped-')
    const inputPath = path.join(tempDir, 'clip.mp4')
    const outputPath = path.join(tempDir, 'thumb.jpg')

    await writeFile(inputPath, 'video-v1')
    await writeFile(outputPath, 'existing-thumb')

    const baseTime = new Date('2026-01-01T00:00:00.000Z')
    const outputTime = new Date('2026-01-01T00:00:10.000Z')
    const firstChangeTime = new Date('2026-01-01T00:00:20.000Z')
    const secondChangeTime = new Date('2026-01-01T00:00:30.000Z')

    await utimes(inputPath, baseTime, baseTime)
    await utimes(outputPath, outputTime, outputTime)

    const output = new OutputCtl()
    const client = {
      createAssembly: vi
        .fn()
        .mockResolvedValueOnce({ assembly_id: 'assembly-old-fast' })
        .mockResolvedValueOnce({ assembly_id: 'assembly-new-slow' }),
      awaitAssemblyCompletion: vi.fn(async (assemblyId: string) => {
        if (assemblyId === 'assembly-old-fast') {
          await delay(40)
          return {
            ok: 'ASSEMBLY_COMPLETED',
            results: {
              thumbs: [{ url: 'http://downloads.test/old-fast.jpg', name: 'old-fast.jpg' }],
            },
          }
        }

        await delay(140)
        return {
          ok: 'ASSEMBLY_COMPLETED',
          results: {
            thumbs: [{ url: 'http://downloads.test/new-slow.jpg', name: 'new-slow.jpg' }],
          },
        }
      }),
    }

    nock('http://downloads.test').get('/old-fast.jpg').reply(200, 'old-fast-result')
    nock('http://downloads.test').get('/new-slow.jpg').reply(200, 'new-slow-result')

    const createPromise = createWithWatch(output, client as never, {
      inputs: [inputPath],
      output: outputPath,
      watch: true,
      concurrency: 2,
      stepsData: {
        thumbs: {
          robot: '/video/thumbs',
          result: true,
          use: ':original',
        },
      },
    })

    await delay(20)
    await writeFile(inputPath, 'video-v2')
    await utimes(inputPath, firstChangeTime, firstChangeTime)
    fakeWatcher.emit('change', 'update', inputPath)

    await delay(5)
    await writeFile(inputPath, 'video-v3')
    await utimes(inputPath, secondChangeTime, secondChangeTime)
    fakeWatcher.emit('change', 'update', inputPath)

    await vi.waitFor(() => {
      expect(client.awaitAssemblyCompletion).toHaveBeenCalledTimes(2)
    })
    fakeWatcher.close()

    await expect(createPromise).resolves.toEqual(
      expect.objectContaining({
        hasFailures: false,
      }),
    )

    expect(await readFile(outputPath, 'utf8')).toBe('new-slow-result')
  })

  it('does not try to delete /dev/stdin after stdin processing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(tty, 'isatty').mockReturnValue(false)

    const tempDir = await createTempDir('transloadit-stdin-')
    const outputPath = path.join(tempDir, 'waveform.png')

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-stdin' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          waveform: [{ url: 'http://downloads.test/stdin-waveform.png', name: 'waveform.png' }],
        },
      }),
    }

    nock('http://downloads.test').get('/stdin-waveform.png').reply(200, 'waveform')

    await expect(
      create(output, client as never, {
        inputs: ['-'],
        output: outputPath,
        del: true,
        stepsData: {
          waveform: {
            robot: '/audio/waveform',
            result: true,
            use: ':original',
          },
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        hasFailures: false,
      }),
    )

    expect(await readFile(outputPath, 'utf8')).toBe('waveform')
  })

  it('surfaces output plan failures through the normal error path', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    const tempDir = await createTempDir('transloadit-output-plan-failure-')
    const outputDir = path.join(tempDir, 'out')
    await mkdir(outputDir, { recursive: true })

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn(),
      awaitAssemblyCompletion: vi.fn(),
    }

    await expect(
      create(output, client as never, {
        inputs: ['-'],
        output: outputDir,
        outputMode: 'directory',
        stepsData: {
          waveform: {
            robot: '/audio/waveform',
            result: true,
            use: ':original',
          },
        },
      }),
    ).rejects.toThrow('You must provide an input to output to a directory')

    expect(client.createAssembly).not.toHaveBeenCalled()
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

  it('keeps duplicate sanitized result filenames from overwriting each other', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-dupe-results-')
    const inputPath = path.join(tempDir, 'clip.mp4')
    const outputDir = path.join(tempDir, 'thumbs')

    await writeFile(inputPath, 'video')
    await mkdir(outputDir, { recursive: true })

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({ assembly_id: 'assembly-dupe-results' }),
      awaitAssemblyCompletion: vi.fn().mockResolvedValue({
        ok: 'ASSEMBLY_COMPLETED',
        results: {
          thumbs: [
            { url: 'http://downloads.test/dupe-a.jpg', name: 'thumb.jpg' },
            { url: 'http://downloads.test/dupe-b.jpg', name: 'thumb.jpg' },
          ],
        },
      }),
    }

    nock('http://downloads.test').get('/dupe-a.jpg').reply(200, 'first-thumb')
    nock('http://downloads.test').get('/dupe-b.jpg').reply(200, 'second-thumb')

    await expect(
      create(output, client as never, {
        inputs: [inputPath],
        output: outputDir,
        outputMode: 'directory',
        stepsData: {
          thumbs: {
            robot: '/video/thumbs',
            result: true,
            use: ':original',
          },
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        hasFailures: false,
      }),
    )

    expect(await readFile(path.join(outputDir, 'thumb.jpg'), 'utf8')).toBe('first-thumb')
    expect(await readFile(path.join(outputDir, 'thumb__1.jpg'), 'utf8')).toBe('second-thumb')
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

  it('includes the assembly URL when polling times out', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-timeout-url-')
    const inputPath = path.join(tempDir, 'image.jpg')
    const outputPath = path.join(tempDir, 'resized.jpg')

    await writeFile(inputPath, 'image-data')

    const output = new OutputCtl()
    const client = {
      createAssembly: vi.fn().mockResolvedValue({
        assembly_id: 'assembly-timeout',
        assembly_ssl_url: 'https://api2.transloadit.com/assemblies/assembly-timeout',
      }),
      awaitAssemblyCompletion: vi
        .fn()
        .mockRejectedValue(new PollingTimeoutError('Polling timed out')),
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

    const loggedError = consoleError.mock.calls.find(
      ([prefix, value]) =>
        prefix === 'err    ' &&
        value instanceof Error &&
        value.message.includes(
          'Assembly URL: https://api2.transloadit.com/assemblies/assembly-timeout',
        ),
    )?.[1]

    expect(loggedError).toBeInstanceOf(Error)
    expect((loggedError as Error).message).toContain('Polling timed out')
  })

  it('does not report another assembly URL when concurrent polling times out', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-timeout-concurrent-url-')
    const inputA = path.join(tempDir, 'a.jpg')
    const inputB = path.join(tempDir, 'b.jpg')

    await writeFile(inputA, 'image-a')
    await writeFile(inputB, 'image-b')

    const output = new OutputCtl()
    const client = {
      createAssembly: vi
        .fn()
        .mockResolvedValueOnce({ assembly_id: 'assembly-one' })
        .mockResolvedValueOnce({ assembly_id: 'assembly-two' }),
      getLastUsedAssemblyUrl: vi
        .fn()
        .mockReturnValue('https://api2.transloadit.com/assemblies/assembly-two'),
      awaitAssemblyCompletion: vi.fn(async (assemblyId: string) => {
        if (assemblyId === 'assembly-one') {
          await delay(30)
          throw new PollingTimeoutError('Polling timed out')
        }

        await delay(5)
        return {
          ok: 'ASSEMBLY_COMPLETED',
          results: {
            resized: [{ url: 'http://downloads.test/result-two.jpg', name: 'result-two.jpg' }],
          },
        }
      }),
    }

    await expect(
      create(output, client as never, {
        concurrency: 2,
        inputs: [inputA, inputB],
        output: null,
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

    const loggedError = consoleError.mock.calls.find(
      ([prefix, value]) =>
        prefix === 'err    ' &&
        value instanceof Error &&
        value.message.includes('Assembly ID: assembly-one'),
    )?.[1]

    expect(loggedError).toBeInstanceOf(Error)
    expect((loggedError as Error).message).not.toContain(
      'https://api2.transloadit.com/assemblies/assembly-two',
    )
  })
})
