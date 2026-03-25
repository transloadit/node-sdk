import { afterEach, describe, expect, it, vi } from 'vitest'

import * as assembliesCommands from '../../../src/cli/commands/assemblies.ts'
import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'

const noopWrite = () => true

const resetExitCode = () => {
  process.exitCode = undefined
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  resetExitCode()
})

describe('intent commands', () => {
  it('maps image generate flags to /image/generate step parameters', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main([
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
          generated_image: expect.objectContaining({
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

  it('maps preview generate flags to /http/import + /file/preview steps', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main([
      'preview',
      'generate',
      '--input',
      'https://example.com/file.pdf',
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
        inputs: [],
        output: 'preview.jpg',
        stepsData: {
          imported: {
            robot: '/http/import',
            url: 'https://example.com/file.pdf',
          },
          preview: expect.objectContaining({
            robot: '/file/preview',
            result: true,
            use: 'imported',
            width: 320,
            height: 200,
            format: 'jpg',
          }),
        },
      }),
    )
  })

  it('maps video encode-hls to the builtin template', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main(['video', 'encode-hls', '--input', 'input.mp4', '--out', 'dist/hls', '--recursive'])

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
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main([
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
          synthesized: expect.objectContaining({
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

  it('omits schema defaults from generated intent steps', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main(['audio', 'waveform', '--input', 'podcast.mp3', '--out', 'waveform.png'])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        inputs: ['podcast.mp3'],
        output: 'waveform.png',
        stepsData: {
          waveformed: {
            robot: '/audio/waveform',
            result: true,
            use: ':original',
          },
        },
      }),
    )
  })

  it('applies schema normalization before submitting generated steps', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main([
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
          waveformed: expect.objectContaining({
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
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main(['video', 'thumbs', '--input', 'demo.mp4', '--out', 'thumbs'])

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
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main(['video', 'thumbs', '--input', 'demo.mp4', '--rotate', '90', '--out', 'thumbs'])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        stepsData: {
          thumbnailed: expect.objectContaining({
            robot: '/video/thumbs',
            rotate: 90,
          }),
        },
      }),
    )
  })

  it('maps file compress to a bundled single assembly by default', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main([
      'file',
      'compress',
      '--input',
      'assets',
      '--format',
      'zip',
      '--gzip',
      'true',
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
          compressed: expect.objectContaining({
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
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main(['file', 'compress', '--input', 'assets', '--format', 'zip', '--out', 'assets.zip'])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        stepsData: {
          compressed: {
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
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const createSpy = vi.spyOn(assembliesCommands, 'create').mockResolvedValue({
      results: [],
      hasFailures: false,
    })

    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main(['video', 'thumbs', '--input', 'demo.mp4', '--out', 'thumbs'])

    expect(process.exitCode).toBeUndefined()
    expect(createSpy).toHaveBeenCalledWith(
      expect.any(OutputCtl),
      expect.anything(),
      expect.objectContaining({
        stepsData: {
          thumbnailed: {
            robot: '/video/thumbs',
            result: true,
            use: ':original',
          },
        },
      }),
    )
  })
})
