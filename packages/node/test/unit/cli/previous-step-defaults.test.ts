import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { runSig } from '../../../src/cli/commands/auth.ts'
import { sync } from '../../../src/cli/commands/templates.ts'
import OutputCtl from '../../../src/cli/OutputCtl.ts'
// Recorded from @transloadit/node 6.9.1 with dummy credentials and a fixed expiry.
import previous from './fixtures/previous-step-defaults.json' with { type: 'json' }

const directories: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  process.exitCode = undefined
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function signParams(params: unknown): Promise<{ params: string; signature: string }> {
  vi.stubEnv('TRANSLOADIT_KEY', 'dummy-key')
  vi.stubEnv('TRANSLOADIT_SECRET', 'dummy-secret')
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})

  await runSig({ providedInput: JSON.stringify(params) })

  expect(error).not.toHaveBeenCalled()
  expect(stdout).toHaveBeenCalledOnce()
  return JSON.parse(`${stdout.mock.calls[0]?.[0]}`)
}

async function syncNewTemplate(
  steps: unknown,
): Promise<{ createTemplate: unknown; writtenFile: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), 'transloadit-previous-defaults-'))
  directories.push(dir)
  const file = path.join(dir, 'golden.json')
  await writeFile(file, JSON.stringify({ transloadit_template_id: '', steps }))
  const client = { createTemplate: vi.fn().mockResolvedValue({ id: 'created-template' }) }

  await sync(new OutputCtl(), client as never, { files: [file] })

  expect(client.createTemplate).toHaveBeenCalledOnce()
  return {
    createTemplate: client.createTemplate.mock.calls[0]?.[0],
    writtenFile: await readFile(file, 'utf8'),
  }
}

describe('contract defaults within this major', () => {
  it('signs the same params as the previous release for unchanged Steps', async () => {
    expect(await signParams(previous.input)).toEqual(previous.authSignature)
  })

  it('syncs and writes the same Template as the previous release for unchanged Steps', async () => {
    expect(await syncNewTemplate(previous.input.steps)).toEqual(previous.templatesSync)
  })

  it('omits new page margin flags when signing and syncing unchanged PDF Steps', async () => {
    const steps = { extracted: { robot: '/document/extract', use: ':original' } }
    const signed = await signParams({ auth: { expires: '2030-01-01T00:00:00.000Z' }, steps })
    const synced = await syncNewTemplate(steps)
    const signedStep = JSON.parse(signed.params).steps.extracted
    const writtenStep = JSON.parse(synced.writtenFile).steps.extracted

    expect(signedStep).not.toHaveProperty('keep_page_headers')
    expect(signedStep).not.toHaveProperty('keep_page_footers')
    expect(writtenStep).toEqual(signedStep)
    expect(synced.createTemplate).toEqual({
      name: 'golden',
      template: { steps: { extracted: signedStep } },
    })
  })

  it('passes explicit values for the changed defaults through unchanged', async () => {
    const steps = {
      generated: { robot: '/image/generate', prompt: 'a cat', inpainting: 'strict' },
      served: { robot: '/file/serve', use: 'generated', download: true },
      imported: { robot: '/transloadit/import', path: 'photos/a.jpg', return_file_stubs: true },
      merged: { robot: '/video/merge', use: 'generated', framerate: '1/10' },
      resized: { robot: '/image/resize', use: 'generated', imagemagick_stack: 'v2.0.11' },
      enhanced: { robot: '/image/enhance', use: 'generated', imagemagick_stack: 'v3' },
      thumbnailed: { robot: '/document/thumbs', use: ':original', imagemagick_stack: 'v3.0.2' },
      extracted: {
        robot: '/document/extract',
        use: ':original',
        keep_page_headers: true,
        keep_page_footers: false,
      },
    }
    const expected = {
      steps: Object.fromEntries(
        Object.entries(steps).map(([name, step]) => [name, expect.objectContaining(step)]),
      ),
    }

    const signed = await signParams({ auth: { expires: '2030-01-01T00:00:00.000Z' }, steps })
    expect(JSON.parse(signed.params)).toEqual(expect.objectContaining(expected))

    const synced = await syncNewTemplate(steps)
    expect(synced.createTemplate).toEqual({ name: 'golden', template: expected })
    expect(JSON.parse(synced.writtenFile)).toEqual(expect.objectContaining(expected))
  })

  it('forwards new parameters without calling them unrecognized', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const steps = { served: { robot: '/file/serve', use: ':original', download: 'false' } }

    const signed = await signParams({ auth: { expires: '2030-01-01T00:00:00.000Z' }, steps })

    expect(JSON.parse(signed.params).steps.served.download).toBe('false')
    expect(warning).not.toHaveBeenCalled()
  })

  it('leaves the ElevenLabs language to detection unless the Step sets one', async () => {
    const steps = {
      detected: { robot: '/speech/transcribe', use: ':original', provider: 'elevenlabs' },
      chosen: {
        robot: '/speech/transcribe',
        use: ':original',
        provider: 'elevenlabs',
        source_language: 'nl-NL',
      },
    }

    const signed = await signParams({ auth: { expires: '2030-01-01T00:00:00.000Z' }, steps })
    const synced = await syncNewTemplate(steps)

    for (const emitted of [JSON.parse(signed.params).steps, JSON.parse(synced.writtenFile).steps]) {
      expect(emitted.detected).not.toHaveProperty('source_language')
      expect(emitted.chosen.source_language).toBe('nl-NL')
    }
  })
})
