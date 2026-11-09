import type { MockInstance } from 'vitest'

import fs from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { Cli } from 'clipanion'
import nock from 'nock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AssembliesCreateCommand } from '../../../src/cli/commands/assemblies.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

const tempDirs: string[] = []

async function createFixture(): Promise<{
  stepsPath: string
  tempDir: string
  createAssembly: MockInstance<Transloadit['createAssembly']>
}> {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'transloadit-create-command-'))
  tempDirs.push(tempDir)
  const stepsPath = path.join(tempDir, 'steps.json')
  await writeFile(
    stepsPath,
    JSON.stringify({
      imported: { robot: '/http/import', url: 'https://example.com/small.txt', result: true },
    }),
  )

  const createAssembly = vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
    ok: 'ASSEMBLY_UPLOADING',
    assembly_id: 'assembly-import',
  })
  vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockResolvedValue({
    ok: 'ASSEMBLY_COMPLETED',
    results: {
      imported: [{ name: 'small.txt', url: 'http://downloads.test/small.txt' }],
    },
  })

  return { stepsPath, tempDir, createAssembly }
}

beforeEach(() => {
  vi.stubEnv('TRANSLOADIT_KEY', 'key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'secret')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // Agent shells can expose a socket as fd 0, which cannot be reopened via /dev/stdin.
  vi.spyOn(fs, 'createReadStream').mockImplementation(() => {
    throw new Error('stdin must not be reopened by path')
  })
})

afterEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  nock.cleanAll()
  nock.abortPendingRequests()
  await Promise.all(
    tempDirs.splice(0).map((tempDir) => rm(tempDir, { recursive: true, force: true })),
  )
})

describe('assemblies create command', () => {
  it.each([
    { robot: '/http/import', existing: false },
    { robot: '/http/import', existing: true },
    { robot: '/vimeo/import', existing: false },
    { robot: '/vimeo/import', existing: true },
  ])('downloads $robot results without uploads (existing directory: $existing)', async ({
    robot,
    existing,
  }) => {
    const { stepsPath, tempDir, createAssembly } = await createFixture()
    const steps = {
      imported:
        robot === '/vimeo/import'
          ? { robot, credentials: 'vimeo-fixture', path: 'me/videos', result: true }
          : { robot, url: 'https://example.com/small.txt', result: true },
    }
    await writeFile(stepsPath, JSON.stringify(steps))
    vi.spyOn(fs, 'fstatSync').mockReturnValue(await stat('/dev/null'))

    const outputDir = path.join(tempDir, 'nested', 'out')
    if (existing) await mkdir(outputDir, { recursive: true })
    const downloads = nock('http://downloads.test').get('/small.txt').reply(200, 'imported bytes')

    const exitCode = await Cli.from([AssembliesCreateCommand]).run([
      'assemblies',
      'create',
      '--steps',
      stepsPath,
      '-o',
      existing ? outputDir : `${outputDir}/`,
    ])

    expect(exitCode).toBe(0)
    expect(createAssembly).toHaveBeenCalledExactlyOnceWith({
      params: { steps, fields: {} },
      onAssemblyCreated: expect.any(Function),
      signal: expect.any(AbortSignal),
    })
    expect(await readdir(outputDir)).toEqual(['imported'])
    expect(await readFile(path.join(outputDir, 'imported', 'small.txt'), 'utf8')).toBe(
      'imported bytes',
    )
    expect(downloads.isDone()).toBe(true)
    expect(fs.createReadStream).not.toHaveBeenCalled()
  })

  it.each([
    'socket',
    'character device',
    'closed descriptor',
  ])('does not infer uploads from non-TTY stdin backed by a %s', async (kind) => {
    const { stepsPath, tempDir, createAssembly } = await createFixture()
    const stdinStats = await stat(tempDir)
    vi.spyOn(stdinStats, 'isSocket').mockReturnValue(kind === 'socket')
    vi.spyOn(stdinStats, 'isCharacterDevice').mockReturnValue(kind === 'character device')
    vi.spyOn(fs, 'fstatSync').mockImplementation(() => {
      if (kind === 'closed descriptor') throw new Error('EBADF: bad file descriptor')
      return stdinStats
    })

    expect(
      await Cli.from([AssembliesCreateCommand]).run(['assemblies', 'create', '--steps', stepsPath]),
    ).toBe(0)
    expect(createAssembly).toHaveBeenCalledExactlyOnceWith({
      params: { steps: expect.any(Object), fields: {} },
      onAssemblyCreated: expect.any(Function),
      signal: expect.any(AbortSignal),
    })
    expect(fs.createReadStream).not.toHaveBeenCalled()
  })

  it.each([
    'pipe',
    'redirected file',
    'explicit -i -',
  ])('uploads the existing stdin stream for %s', async (kind) => {
    const { stepsPath, tempDir, createAssembly } = await createFixture()
    const stdinStats = await stat(tempDir)
    vi.spyOn(stdinStats, 'isFIFO').mockReturnValue(kind === 'pipe')
    vi.spyOn(stdinStats, 'isFile').mockReturnValue(kind === 'redirected file')
    vi.spyOn(fs, 'fstatSync').mockReturnValue(stdinStats)

    expect(
      await Cli.from([AssembliesCreateCommand]).run([
        'assemblies',
        'create',
        '--steps',
        stepsPath,
        ...(kind === 'explicit -i -' ? ['-i', '-'] : []),
      ]),
    ).toBe(0)
    expect(createAssembly).toHaveBeenCalledExactlyOnceWith({
      params: { steps: expect.any(Object), fields: {} },
      uploads: { in: process.stdin },
      onAssemblyCreated: expect.any(Function),
      signal: expect.any(AbortSignal),
    })
    expect(fs.createReadStream).not.toHaveBeenCalled()
  })

  it('keeps explicit local inputs when stdin is a pipe', async () => {
    const { stepsPath, tempDir, createAssembly } = await createFixture()
    const inputPath = path.join(tempDir, 'input.txt')
    await writeFile(inputPath, 'local upload')
    const stdinStats = await stat(tempDir)
    vi.spyOn(stdinStats, 'isFIFO').mockReturnValue(true)
    vi.spyOn(fs, 'fstatSync').mockReturnValue(stdinStats)

    expect(
      await Cli.from([AssembliesCreateCommand]).run([
        'assemblies',
        'create',
        '--steps',
        stepsPath,
        '-i',
        inputPath,
      ]),
    ).toBe(0)
    expect(createAssembly).toHaveBeenCalledExactlyOnceWith({
      params: { steps: expect.any(Object), fields: {} },
      files: { in: inputPath },
      onAssemblyCreated: expect.any(Function),
      signal: expect.any(AbortSignal),
    })
  })
})
