import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

const tempDirs: string[] = []

async function createTempDir(prefix: string): Promise<string> {
  const tempDir = await mkdtemp(path.join(tmpdir(), prefix))
  tempDirs.push(tempDir)
  return tempDir
}

function resetExitCode(): void {
  process.exitCode = undefined
}

function stubCredentials(): void {
  vi.stubEnv('TRANSLOADIT_KEY', 'key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'secret')
}

afterEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  resetExitCode()
  await Promise.all(
    tempDirs.splice(0).map((tempDir) => rm(tempDir, { recursive: true, force: true })),
  )
})

describe('run command', () => {
  it('compiles a prompt and submits the generated steps directly', async () => {
    stubCredentials()
    const tempDir = await createTempDir('transloadit-run-command-')
    const inputPath = path.join(tempDir, 'input.jpg')
    await writeFile(inputPath, 'image')

    const compileSpy = vi
      .spyOn(Transloadit.prototype, 'compileAssemblyInstructionsFromPrompt')
      .mockResolvedValue({
        instructions: {
          steps: {
            resized: {
              robot: '/image/resize',
              use: ':original',
              result: true,
              width: 400,
            },
          },
        },
        instructionsJson: JSON.stringify({
          steps: {
            resized: {
              robot: '/image/resize',
              use: ':original',
              result: true,
              width: 400,
            },
          },
        }),
        message: 'Generated resize instructions.',
        validationAttempts: [],
      })
    const createAssemblySpy = vi.spyOn(Transloadit.prototype, 'createAssembly').mockResolvedValue({
      assembly_id: 'assembly-run',
    })
    vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockResolvedValue({
      ok: 'ASSEMBLY_COMPLETED',
      results: {},
    })

    await main([
      'run',
      'resize uploaded images to 400px wide',
      '--input',
      inputPath,
      '--field',
      'workspace=test',
      '--model',
      'openai/gpt-5.5',
      '--max-attempts',
      '2',
      '--timeout',
      '10000',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(compileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        maxAttempts: 2,
        model: 'openai/gpt-5.5',
        prompt: 'resize uploaded images to 400px wide',
        timeout: 10000,
      }),
    )
    expect(createAssemblySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        files: {
          in: inputPath,
        },
        params: {
          fields: {
            workspace: 'test',
          },
          steps: {
            resized: {
              robot: '/image/resize',
              use: ':original',
              result: true,
              width: 400,
            },
          },
        },
      }),
    )
  })

  it('prints compiled Assembly Instructions from assemblies compile', async () => {
    stubCredentials()
    const printSpy = vi.spyOn(OutputCtl.prototype, 'print').mockImplementation(() => {})
    const compileSpy = vi
      .spyOn(Transloadit.prototype, 'compileAssemblyInstructionsFromPrompt')
      .mockResolvedValue({
        instructions: {
          steps: {
            imported: {
              robot: '/http/import',
              result: true,
              url: 'https://example.com/image.jpg',
            },
          },
        },
        instructionsJson: JSON.stringify({
          steps: {
            imported: {
              robot: '/http/import',
              result: true,
              url: 'https://example.com/image.jpg',
            },
          },
        }),
        message: 'Generated import instructions.',
        validationAttempts: [],
      })

    await main([
      'assemblies',
      'compile',
      'import https://example.com/image.jpg',
      '--mcp-server',
      'https://api2.test/mcp',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(compileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mcpServerUrl: 'https://api2.test/mcp',
        prompt: 'import https://example.com/image.jpg',
      }),
    )
    expect(printSpy).toHaveBeenCalledWith(
      expect.stringContaining('"steps"'),
      expect.objectContaining({
        message: 'Generated import instructions.',
      }),
    )
  })
})
