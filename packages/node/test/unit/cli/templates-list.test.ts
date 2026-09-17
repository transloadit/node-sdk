import { afterEach, describe, expect, it, vi } from 'vitest'

import OutputCtl from '../../../src/cli/OutputCtl.ts'
import { main } from '../../../src/cli.ts'
import { Transloadit } from '../../../src/Transloadit.ts'

const noopWrite = () => true

const resetExitCode = () => {
  process.exitCode = undefined
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  resetExitCode()
})

describe('cli templates list', () => {
  it.each([true, false])('projects --fields in JSON=%s output', async (json) => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')
    vi.spyOn(Transloadit.prototype, 'listTemplates').mockResolvedValue({
      items: [
        {
          id: 'template-id',
          name: 'Products',
          content: { steps: {} },
          require_signature_auth: 1,
        },
      ],
      count: 1,
    })
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main(['templates', 'list', '--fields', 'id,name', ...(json ? ['--json'] : [])])

    expect(process.exitCode).toBeUndefined()
    const output = stdout.mock.calls.map(([chunk]) => String(chunk)).join('')
    if (json) {
      expect(JSON.parse(output)).toEqual({ id: 'template-id', name: 'Products' })
    } else {
      expect(output.trim()).toBe('template-id Products')
    }
  })

  it('keeps the complete JSON record when --fields is omitted', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')
    const template = {
      id: 'template-id',
      name: 'Products',
      content: { steps: {} },
      require_signature_auth: 1,
    }
    vi.spyOn(Transloadit.prototype, 'listTemplates').mockResolvedValue({
      items: [template],
      count: 1,
    })
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main(['templates', 'list', '--json'])

    expect(process.exitCode).toBeUndefined()
    expect(JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join(''))).toEqual(template)
  })

  it('accepts --include-builtin and forwards it to the API', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const listSpy = vi
      .spyOn(Transloadit.prototype, 'listTemplates')
      .mockResolvedValueOnce({
        items: [
          {
            id: 'builtin/encode-hls-video@0.0.1',
            name: 'Encode HLS video',
            // minimal shape for CLI printing
            content: {},
            require_signature_auth: 0,
          },
        ],
        count: 1,
      })
      .mockResolvedValueOnce({ items: [], count: 1 })

    vi.spyOn(OutputCtl.prototype, 'print').mockImplementation(() => {})
    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main(['templates', 'list', '--include-builtin', 'exclusively-latest'])

    expect(process.exitCode).toBeUndefined()
    expect(listSpy).toHaveBeenCalled()
    expect(listSpy.mock.calls[0]?.[0]).toMatchObject({
      include_builtin: 'exclusively-latest',
    })
  })

  it('accepts --include-content and fetches template steps', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    vi.spyOn(Transloadit.prototype, 'listTemplates')
      .mockResolvedValueOnce({
        items: [
          {
            id: 'builtin/encode-hls-video@0.0.1',
            name: 'Encode HLS video',
            content: {},
            require_signature_auth: 0,
          },
        ],
        count: 1,
      })
      .mockResolvedValueOnce({ items: [], count: 1 })

    const getSpy = vi.spyOn(Transloadit.prototype, 'getTemplate').mockResolvedValue({
      ok: 'ok',
      message: 'OK',
      id: 'builtin/encode-hls-video@0.0.1',
      name: 'Encode HLS video',
      require_signature_auth: 0,
      content: {
        steps: {
          imported: { robot: '/http/import', url: 'https://example.com' },
        },
      },
    })

    vi.spyOn(OutputCtl.prototype, 'print').mockImplementation(() => {})
    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main(['templates', 'list', '--include-content', '--include-builtin', 'latest'])

    expect(process.exitCode).toBeUndefined()
    expect(getSpy).toHaveBeenCalledWith('builtin/encode-hls-video@0.0.1')
  })

  it('fails with an invalid --include-builtin value', async () => {
    vi.stubEnv('TRANSLOADIT_KEY', 'key')
    vi.stubEnv('TRANSLOADIT_SECRET', 'secret')

    const errorSpy = vi.spyOn(OutputCtl.prototype, 'error').mockImplementation(() => {})
    vi.spyOn(process.stdout, 'write').mockImplementation(noopWrite)

    await main(['templates', 'list', '--include-builtin', 'nope'])

    expect(process.exitCode).toBe(1)
    expect(errorSpy).toHaveBeenCalled()
  })
})
