import type {
  CompileAssemblyInstructionsAiStep,
  CompileAssemblyInstructionsError,
  CompileAssemblyInstructionsRunInput,
  CompileAssemblyInstructionsRunResult,
} from '@transloadit/utils'

import { compileAssemblyInstructionsFromPrompt } from '@transloadit/utils'
import { describe, expect, it, vi } from 'vitest'

describe('compileAssemblyInstructionsFromPrompt', () => {
  it('builds an AI chat step and returns validated Assembly Instructions', async () => {
    const aiSteps: CompileAssemblyInstructionsAiStep[] = []
    const client = {
      runAssemblyInstructionsCompiler: vi.fn(
        ({
          aiStep,
        }: CompileAssemblyInstructionsRunInput): Promise<CompileAssemblyInstructionsRunResult> => {
          aiSteps.push(aiStep)
          return Promise.resolve({
            assemblyUrl: 'https://api2.test/assemblies/123',
            billedChargeUsd: 0.01,
            response: {
              message: 'Generated resize instructions.',
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
            },
            usageBytes: 12,
          })
        },
      ),
      lintAssemblyInstructions: vi.fn(async () => []),
    }

    const result = await compileAssemblyInstructionsFromPrompt({
      client,
      mcpServerUrl: 'https://api2.test/mcp',
      prompt: 'resize uploaded images to 400px wide',
    })

    expect(result).toMatchObject({
      assemblyUrl: 'https://api2.test/assemblies/123',
      billedChargeUsd: 0.01,
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
      message: 'Generated resize instructions.',
      usageBytes: 12,
      validationAttempts: [],
    })
    expect(result.instructionsJson).toContain('"steps"')
    expect(aiSteps).toHaveLength(1)
    expect(aiSteps[0]).toMatchObject({
      robot: '/ai/chat',
      result: true,
      format: 'json',
      interpolate: { system_message: false },
      mcp_servers: [
        expect.objectContaining({
          auth: 'transloadit',
          type: 'http',
          url: 'https://api2.test/mcp',
        }),
      ],
      messages: [{ role: 'user', content: 'resize uploaded images to 400px wide' }],
    })
    expect(client.lintAssemblyInstructions).toHaveBeenCalledWith(result.instructionsJson)
  })

  it('retries with validation feedback when linting finds an error', async () => {
    const aiSteps: CompileAssemblyInstructionsAiStep[] = []
    const client = {
      runAssemblyInstructionsCompiler: vi.fn(
        ({
          aiStep,
        }: CompileAssemblyInstructionsRunInput): Promise<CompileAssemblyInstructionsRunResult> => {
          aiSteps.push(aiStep)
          return Promise.resolve({
            response: {
              message: 'Generated instructions.',
              instructions: {
                steps: {
                  resized: {
                    robot: '/image/resize',
                    width: 400,
                  },
                },
              },
            },
          })
        },
      ),
      lintAssemblyInstructions: vi
        .fn()
        .mockResolvedValueOnce([{ type: 'error', message: 'Missing use field' }])
        .mockResolvedValueOnce([]),
    }

    const result = await compileAssemblyInstructionsFromPrompt({
      client,
      prompt: 'resize uploaded images to 400px wide',
    })

    expect(result.validationAttempts).toEqual([
      expect.objectContaining({
        attempt: 1,
        error: 'Assembly Instructions failed linting: Missing use field',
      }),
    ])
    expect(aiSteps).toHaveLength(2)
    expect(aiSteps[1]?.messages).toEqual([
      { role: 'user', content: 'resize uploaded images to 400px wide' },
      expect.objectContaining({
        role: 'user',
        content: expect.stringContaining('Missing use field'),
      }),
    ])
  })

  it('throws with lint details after exhausting validation attempts', async () => {
    const client = {
      runAssemblyInstructionsCompiler: vi.fn(
        (): Promise<CompileAssemblyInstructionsRunResult> =>
          Promise.resolve({
            response: {
              message: 'Generated instructions.',
              instructions: {
                steps: {
                  resized: {
                    robot: '/image/resize',
                    width: 400,
                  },
                },
              },
            },
          }),
      ),
      lintAssemblyInstructions: vi.fn(async () => [
        { type: 'error', message: 'Missing use field' },
      ]),
    }

    await expect(
      compileAssemblyInstructionsFromPrompt({
        client,
        maxAttempts: 2,
        prompt: 'resize uploaded images to 400px wide',
      }),
    ).rejects.toMatchObject({
      name: 'CompileAssemblyInstructionsError',
      validationAttempts: [
        expect.objectContaining({ attempt: 1 }),
        expect.objectContaining({ attempt: 2 }),
      ],
    } satisfies Partial<CompileAssemblyInstructionsError>)
  })
})
