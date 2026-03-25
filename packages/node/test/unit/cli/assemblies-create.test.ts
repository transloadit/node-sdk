import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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

  it('treats explicit directory outputs as directories even when the path does not exist yet', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const tempDir = await createTempDir('transloadit-outdir-')
    const inputPath = path.join(tempDir, 'clip.mp4')
    const outputDir = path.join(tempDir, 'thumbs')

    await writeFile(inputPath, 'video')

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

    let relpath = path.relative(process.cwd(), inputPath)
    relpath = relpath.replace(/^(\.\.\/)+/, '')
    const resultsDir = path.join(
      outputDir,
      path.dirname(relpath),
      path.parse(relpath).name,
      'thumbs',
    )

    expect(await readFile(path.join(resultsDir, 'one.jpg'), 'utf8')).toBe('one')
    expect(await readFile(path.join(resultsDir, 'two.jpg'), 'utf8')).toBe('two')
  })
})
