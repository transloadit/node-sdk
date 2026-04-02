import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import nock from 'nock'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as assembliesCommands from '../../../src/cli/commands/assemblies.ts'
import {
  findIntentDefinitionByPaths,
  getIntentPaths,
  getIntentResultStepName,
  intentCatalog,
} from '../../../src/cli/intentCommandSpecs.ts'
import { intentCommands } from '../../../src/cli/intentCommands.ts'
import { coerceIntentFieldValue } from '../../../src/cli/intentFields.ts'
import { prepareIntentInputs } from '../../../src/cli/intentRuntime.ts'
import { intentSmokeCases } from '../../../src/cli/intentSmokeCases.ts'
import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'

const noopWrite = () => true
const tempDirs: string[] = []

const resetExitCode = () => {
  process.exitCode = undefined
}

async function createTempDir(prefix: string): Promise<string> {
  const tempDir = await mkdtemp(path.join(tmpdir(), prefix))
  tempDirs.push(tempDir)
  return tempDir
}

async function runIntentCommand(
  args: string[],
  createResult: Awaited<ReturnType<typeof assembliesCommands.create>> = {
    results: [],
    hasFailures: false,
  },
): Promise<{
  createSpy: ReturnType<typeof vi.spyOn<typeof assembliesCommands, 'create'>>
}> {
  vi.stubEnv('TRANSLOADIT_KEY', 'key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

  const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue(createResult)
  vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

  await main(args)

  return { createSpy }
}

function getIntentCommand(paths: string[]): (typeof intentCommands)[number] {
  const command = intentCommands.find((candidate) => {
    const candidatePaths = candidate.paths[0]
    return candidatePaths != null && candidatePaths.join(' ') === paths.join(' ')
  })

  if (command == null) {
    throw new Error(`No intent command found for ${paths.join(' ')}`)
  }

  return command
}

function getIntentStepName(paths: string[]): string {
  const definition = findIntentDefinitionByPaths(paths)
  if (definition == null || definition.kind !== 'robot') {
    throw new Error(`No robot intent definition found for ${paths.join(' ')}`)
  }

  const stepName = getIntentResultStepName(definition)
  if (stepName == null) {
    throw new Error(`No intent result step name found for ${paths.join(' ')}`)
  }

  return stepName
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  nock.cleanAll()
  resetExitCode()
  return Promise.all(
    tempDirs.splice(0).map((tempDir) => rm(tempDir, { recursive: true, force: true })),
  )
})

describe('intent commands', () => {
  it('routes image describe labels through /image/describe', async () => {
    const { createSpy } = await runIntentCommand([
      'image',
      'describe',
      '--input',
      'hero.jpg',
      '--fields',
      'labels',
      '--out',
      'labels.json',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: ['hero.jpg'],
        output: 'labels.json',
        stepsData: {
          describe: expect.objectContaining({
            robot: '/image/describe',
            use: ':original',
            result: true,
            provider: 'aws',
            format: 'json',
            granularity: 'list',
            explicit_descriptions: false,
          }),
        },
      }),
    )
  })

  it('routes image describe --for wordpress through /ai/chat with a schema', async () => {
    const { createSpy } = await runIntentCommand([
      'image',
      'describe',
      '--input',
      'hero.jpg',
      '--for',
      'wordpress',
      '--out',
      'fields.json',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: ['hero.jpg'],
        output: 'fields.json',
        stepsData: {
          describe: expect.objectContaining({
            robot: '/ai/chat',
            use: ':original',
            result: true,
            model: 'anthropic/claude-sonnet-4-5',
            format: 'json',
            return_messages: 'last',
            test_credentials: true,
            messages: expect.stringContaining('altText, title, caption, description'),
          }),
        },
      }),
    )

    const describeStep = createSpy.mock.calls[0]?.[2].stepsData?.describe
    expect(describeStep).toBeDefined()
    if (describeStep == null || typeof describeStep !== 'object') {
      throw new Error('Missing describe step')
    }

    const schema = JSON.parse(String((describeStep as Record<string, unknown>).schema))
    expect(schema).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['altText', 'title', 'caption', 'description'],
      properties: expect.objectContaining({
        altText: expect.objectContaining({ type: 'string' }),
        title: expect.objectContaining({ type: 'string' }),
        caption: expect.objectContaining({ type: 'string' }),
        description: expect.objectContaining({ type: 'string' }),
      }),
    })
  })

  it('rejects combining labels with authored image describe fields', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })
    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main([
      'image',
      'describe',
      '--input',
      'hero.jpg',
      '--fields',
      'labels,caption',
      '--out',
      'fields.json',
    ])

    expect(process.exitCode).toBe(1)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('maps image generate flags to /image/generate step parameters', async () => {
    const { createSpy } = await runIntentCommand([
      'image',
      'generate',
      '--prompt',
      'A red bicycle in a studio',
      '--model',
      'flux-schnell',
      '--aspect-ratio',
      '2:3',
      '--out',
      'generated.png',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: [],
        output: 'generated.png',
        stepsData: {
          [getIntentStepName(['image', 'generate'])]: expect.objectContaining({
            robot: '/image/generate',
            result: true,
            prompt: 'A red bicycle in a studio',
            model: 'flux-schnell',
            aspect_ratio: '2:3',
          }),
        },
      }),
    )
  })

  it('maps preview generate flags to /file/preview step parameters', async () => {
    const { createSpy } = await runIntentCommand([
      'preview',
      'generate',
      '--input',
      'document.pdf',
      '--width',
      '320',
      '--height',
      '200',
      '--format',
      'jpg',
      '--out',
      'preview.jpg',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: ['document.pdf'],
        output: 'preview.jpg',
        stepsData: {
          [getIntentStepName(['preview', 'generate'])]: expect.objectContaining({
            robot: '/file/preview',
            result: true,
            use: ':original',
            width: 320,
            height: 200,
            format: 'jpg',
          }),
        },
      }),
    )
  })

  it('downloads URL inputs for preview generate before calling assemblies create', async () => {
    nock('https://example.com').get('/file.pdf').reply(200, 'pdf-data')
    const { createSpy } = await runIntentCommand([
      'preview',
      'generate',
      '--input',
      'https://example.com/file.pdf',
      '--out',
      'preview.png',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: [expect.stringContaining('transloadit-input-')],
        stepsData: {
          [getIntentStepName(['preview', 'generate'])]: expect.objectContaining({
            robot: '/file/preview',
            use: ':original',
          }),
        },
      }),
    )
  })

  it('rejects private-host URL inputs for intent commands', async () => {
    await expect(
      prepareIntentInputs({
        inputValues: ['http://127.0.0.1/secret'],
        inputBase64Values: [],
      }),
    ).rejects.toThrow('URL downloads are limited to public hosts')
  })

  it('keeps duplicate remote basenames as distinct temp inputs', async () => {
    nock('http://198.51.100.10').get('/nested/file.pdf').reply(200, 'first-file')
    nock('http://198.51.100.11').get('/other/file.pdf').reply(200, 'second-file')

    const prepared = await prepareIntentInputs({
      inputValues: ['http://198.51.100.10/nested/file.pdf', 'http://198.51.100.11/other/file.pdf'],
      inputBase64Values: [],
    })

    try {
      expect(prepared.inputs).toHaveLength(2)
      const firstPath = prepared.inputs[0]
      const secondPath = prepared.inputs[1]
      expect(firstPath).toBeDefined()
      expect(secondPath).toBeDefined()
      expect(firstPath).not.toBe(secondPath)
      if (firstPath == null || secondPath == null) {
        throw new Error('Expected prepared input paths')
      }

      expect(await readFile(firstPath, 'utf8')).toBe('first-file')
      expect(await readFile(secondPath, 'utf8')).toBe('second-file')
    } finally {
      await Promise.all(prepared.cleanup.map((cleanup) => cleanup()))
    }
  })

  it('supports base64 inputs for intent commands', async () => {
    const { createSpy } = await runIntentCommand([
      'document',
      'convert',
      '--input-base64',
      Buffer.from('hello world').toString('base64'),
      '--format',
      'pdf',
      '--out',
      'output.pdf',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: [expect.stringContaining('transloadit-input-')],
        stepsData: {
          [getIntentStepName(['document', 'convert'])]: expect.objectContaining({
            robot: '/document/convert',
            use: ':original',
            format: 'pdf',
          }),
        },
      }),
    )
  })

  it('rejects --watch URL inputs before downloading them', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })
    const downloadScope = nock('https://example.test').get('/file.pdf').reply(200, 'pdf')

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main([
      'preview',
      'generate',
      '--watch',
      '--input',
      'https://example.test/file.pdf',
      '--out',
      'preview.png',
    ])

    expect(process.exitCode).toBe(1)
    expect(createSpy).not.toHaveBeenCalled()
    expect(downloadScope.isDone()).toBe(false)
  })

  it('accepts native boolean flags for generated intent options', async () => {
    const { createSpy } = await runIntentCommand([
      'image',
      'optimize',
      '--input',
      'input.jpg',
      '--progressive',
      '--out',
      'optimized.jpg',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: ['input.jpg'],
        stepsData: {
          [getIntentStepName(['image', 'optimize'])]: expect.objectContaining({
            robot: '/image/optimize',
            use: ':original',
            progressive: true,
          }),
        },
      }),
    )
  })

  it('rejects multi-input standard single-assembly runs with a file output before processing', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const tempDir = await createTempDir('transloadit-intent-single-assembly-')
    const inputA = path.join(tempDir, 'a.jpg')
    const inputB = path.join(tempDir, 'b.jpg')
    await writeFile(inputA, 'a')
    await writeFile(inputB, 'b')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main([
      'image',
      'optimize',
      '--single-assembly',
      '--input',
      inputA,
      '--input',
      inputB,
      '--out',
      path.join(tempDir, 'optimized.jpg'),
    ])

    expect(process.exitCode).toBe(1)
    expect(createSpy).not.toHaveBeenCalled()
    const loggedError = errorSpy.mock.calls.flatMap((call) => call.map(String)).join(' ')
    expect(loggedError).toContain(
      'Output must be a directory when using --single-assembly with multiple inputs',
    )
  })

  it('maps video encode-hls to the builtin template', async () => {
    const { createSpy } = await runIntentCommand([
      'video',
      'encode-hls',
      '--input',
      'input.mp4',
      '--out',
      'dist/hls',
      '--recursive',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        template: 'builtin/encode-hls-video@latest',
        inputs: ['input.mp4'],
        output: 'dist/hls',
        recursive: true,
      }),
    )
  })

  it('maps text speak flags to /text/speak step parameters', async () => {
    const { createSpy } = await runIntentCommand([
      'text',
      'speak',
      '--prompt',
      'Hello world',
      '--provider',
      'aws',
      '--target-language',
      'en-US',
      '--voice',
      'female-1',
      '--out',
      'hello.mp3',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: [],
        output: 'hello.mp3',
        stepsData: {
          [getIntentStepName(['text', 'speak'])]: expect.objectContaining({
            robot: '/text/speak',
            result: true,
            prompt: 'Hello world',
            provider: 'aws',
            target_language: 'en-US',
            voice: 'female-1',
          }),
        },
      }),
    )
  })

  it('supports prompt-only text speak runs without an input file', async () => {
    const { createSpy } = await runIntentCommand([
      'text',
      'speak',
      '--prompt',
      'Hello from a prompt',
      '--provider',
      'aws',
      '--out',
      'hello.mp3',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: [],
        output: 'hello.mp3',
        stepsData: {
          [getIntentStepName(['text', 'speak'])]: {
            robot: '/text/speak',
            result: true,
            prompt: 'Hello from a prompt',
            provider: 'aws',
          },
        },
      }),
    )
  })

  it('supports file-backed text speak runs without a prompt', async () => {
    const { createSpy } = await runIntentCommand([
      'text',
      'speak',
      '--input',
      'article.txt',
      '--provider',
      'aws',
      '--out',
      'hello.mp3',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: ['article.txt'],
        output: 'hello.mp3',
        stepsData: {
          [getIntentStepName(['text', 'speak'])]: {
            robot: '/text/speak',
            result: true,
            use: ':original',
            provider: 'aws',
          },
        },
      }),
    )
  })

  it('omits schema defaults from generated intent steps', async () => {
    const { createSpy } = await runIntentCommand([
      'audio',
      'waveform',
      '--input',
      'podcast.mp3',
      '--out',
      'waveform.png',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: ['podcast.mp3'],
        output: 'waveform.png',
        stepsData: {
          [getIntentStepName(['audio', 'waveform'])]: {
            robot: '/audio/waveform',
            result: true,
            use: ':original',
          },
        },
      }),
    )
  })

  it('applies schema normalization before submitting generated steps', async () => {
    const { createSpy } = await runIntentCommand([
      'audio',
      'waveform',
      '--input',
      'song.mp3',
      '--style',
      '1',
      '--out',
      'waveform.png',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: ['song.mp3'],
        output: 'waveform.png',
        stepsData: {
          [getIntentStepName(['audio', 'waveform'])]: expect.objectContaining({
            robot: '/audio/waveform',
            result: true,
            use: ':original',
            style: 'v1',
          }),
        },
      }),
    )
  })

  it('passes directory output intent for multi-file commands', async () => {
    const { createSpy } = await runIntentCommand([
      'video',
      'thumbs',
      '--input',
      'demo.mp4',
      '--out',
      'thumbs',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: ['demo.mp4'],
        output: 'thumbs',
        outputMode: 'directory',
      }),
    )
  })

  it('coerces numeric literal union options like video thumbs --rotate', async () => {
    const { createSpy } = await runIntentCommand([
      'video',
      'thumbs',
      '--input',
      'demo.mp4',
      '--rotate',
      '90',
      '--out',
      'thumbs',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        stepsData: {
          [getIntentStepName(['video', 'thumbs'])]: expect.objectContaining({
            robot: '/video/thumbs',
            rotate: 90,
          }),
        },
      }),
    )
  })

  it('maps array-valued robot parameters from JSON flags', async () => {
    const { createSpy } = await runIntentCommand([
      'video',
      'thumbs',
      '--input',
      'demo.mp4',
      '--offsets',
      '[1,2,3]',
      '--out',
      'thumbs',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        stepsData: {
          [getIntentStepName(['video', 'thumbs'])]: expect.objectContaining({
            robot: '/video/thumbs',
            offsets: [1, 2, 3],
          }),
        },
      }),
    )
  })

  it('maps object-valued robot parameters from JSON flags', async () => {
    const { createSpy } = await runIntentCommand([
      'preview',
      'generate',
      '--input',
      'document.pdf',
      '--strategy',
      '{"document":["page","icon"],"unknown":["icon"]}',
      '--out',
      'preview.png',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        stepsData: {
          [getIntentStepName(['preview', 'generate'])]: expect.objectContaining({
            robot: '/file/preview',
            strategy: expect.objectContaining({
              document: ['page', 'icon'],
              unknown: ['icon'],
            }),
          }),
        },
      }),
    )
  })

  it('rejects blank numeric values instead of coercing them to zero', () => {
    expect(() => coerceIntentFieldValue('number', '   ')).toThrow('Expected a number')
  })

  it('parses JSON objects for auto-typed flags like image resize --crop', async () => {
    const { createSpy } = await runIntentCommand([
      'image',
      'resize',
      '--input',
      'demo.jpg',
      '--crop',
      '{"x1":80,"y1":100,"x2":"60%","y2":"80%"}',
      '--out',
      'resized.jpg',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        stepsData: {
          [getIntentStepName(['image', 'resize'])]: expect.objectContaining({
            crop: {
              x1: 80,
              y1: 100,
              x2: '60%',
              y2: '80%',
            },
          }),
        },
      }),
    )
  })

  it('parses JSON arrays for auto-typed flags like image resize --watermark-position', async () => {
    const { createSpy } = await runIntentCommand([
      'image',
      'resize',
      '--input',
      'demo.jpg',
      '--watermark-position',
      '["center","left"]',
      '--out',
      'resized.jpg',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        stepsData: {
          [getIntentStepName(['image', 'resize'])]: expect.objectContaining({
            watermark_position: ['center', 'left'],
          }),
        },
      }),
    )
  })

  it('coerces mixed rotation flags like image resize --rotation 90', async () => {
    const { createSpy } = await runIntentCommand([
      'image',
      'resize',
      '--input',
      'demo.jpg',
      '--rotation',
      '90',
      '--out',
      'resized.jpg',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        stepsData: {
          [getIntentStepName(['image', 'resize'])]: expect.objectContaining({
            robot: '/image/resize',
            rotation: 90,
          }),
        },
      }),
    )
  })

  it('coerces mixed boolean-or-number flags like audio waveform --antialiasing 1', async () => {
    const { createSpy } = await runIntentCommand([
      'audio',
      'waveform',
      '--input',
      'song.mp3',
      '--antialiasing',
      '1',
      '--out',
      'waveform.png',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        stepsData: {
          [getIntentStepName(['audio', 'waveform'])]: expect.objectContaining({
            robot: '/audio/waveform',
            antialiasing: 1,
          }),
        },
      }),
    )
  })

  it('maps file compress to a bundled single assembly by default', async () => {
    const { createSpy } = await runIntentCommand([
      'file',
      'compress',
      '--input',
      'assets',
      '--format',
      'zip',
      '--gzip',
      '--out',
      'assets.zip',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: ['assets'],
        output: 'assets.zip',
        singleAssembly: true,
        stepsData: {
          [getIntentStepName(['file', 'compress'])]: expect.objectContaining({
            robot: '/file/compress',
            result: true,
            format: 'zip',
            gzip: true,
            use: {
              steps: [':original'],
              bundle_steps: true,
            },
          }),
        },
      }),
    )
  })

  it('omits nullable defaults like file compress password when not provided', async () => {
    const { createSpy } = await runIntentCommand([
      'file',
      'compress',
      '--input',
      'assets',
      '--format',
      'zip',
      '--out',
      'assets.zip',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        stepsData: {
          [getIntentStepName(['file', 'compress'])]: {
            robot: '/file/compress',
            result: true,
            format: 'zip',
            use: {
              steps: [':original'],
              bundle_steps: true,
            },
          },
        },
      }),
    )
  })

  it('omits numeric defaults like video thumbs rotate when not provided', async () => {
    const { createSpy } = await runIntentCommand([
      'video',
      'thumbs',
      '--input',
      'demo.mp4',
      '--out',
      'thumbs',
    ])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        stepsData: {
          [getIntentStepName(['video', 'thumbs'])]: {
            robot: '/video/thumbs',
            result: true,
            use: ':original',
          },
        },
      }),
    )
  })

  it('includes required schema flags in generated usage examples', () => {
    expect(getIntentCommand(['document', 'convert']).usage.examples).toEqual([
      ['Run the command', expect.stringContaining('--format')],
    ])
    expect(getIntentCommand(['text', 'speak']).usage.examples).toEqual([
      ['Run the command', expect.stringContaining('--provider')],
    ])
  })

  it('keeps the catalog, generated commands, and smoke cases in sync', () => {
    const catalogPaths = intentCatalog.map((definition) => getIntentPaths(definition).join(' '))
    const generatedPaths = intentCommands.map((command) => command.paths[0]?.join(' '))
    const smokePaths = intentSmokeCases.map((smokeCase) => smokeCase.paths.join(' '))

    expect([...catalogPaths].sort()).toEqual([...generatedPaths].sort())
    expect([...catalogPaths].sort()).toEqual([...smokePaths].sort())
  })
})
