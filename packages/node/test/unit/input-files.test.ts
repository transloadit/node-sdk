import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { prepareInputFiles } from '../../src/inputFiles.ts'

describe('prepareInputFiles', () => {
  it('splits files, uploads, and url imports', async () => {
    const base64 = Buffer.from('hello').toString('base64')

    const result = await prepareInputFiles({
      inputFiles: [
        { kind: 'path', field: 'video', path: '/tmp/video.mp4' },
        { kind: 'base64', field: 'logo', base64, filename: 'logo.png' },
        { kind: 'url', field: 'remote', url: 'https://example.com/remote.jpg' },
      ],
      params: {
        steps: {
          resize: { robot: '/image/resize', use: ':original' },
        },
        fields: { a: 1 },
      },
      fields: { b: 2 },
    })

    expect(result.files).toEqual({ video: '/tmp/video.mp4' })
    expect(result.uploads.logo).toBeInstanceOf(Buffer)
    expect(result.cleanup).toHaveLength(0)

    expect(result.params.fields).toEqual({ a: 1, b: 2 })
    expect(result.params.steps?.resize).toEqual({ robot: '/image/resize', use: ':original' })
    expect(result.params.steps?.remote).toEqual({
      robot: '/http/import',
      url: 'https://example.com/remote.jpg',
    })
  })

  it('keeps base64 tempfiles inside the temp directory', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'transloadit-test-'))

    try {
      const base64 = Buffer.from('hello').toString('base64')

      const result = await prepareInputFiles({
        inputFiles: [
          {
            kind: 'base64',
            field: 'logo',
            base64,
            filename: '../escape.txt',
          },
        ],
        base64Strategy: 'tempfile',
        tempDir,
      })

      expect(result.files.logo.startsWith(tempDir)).toBe(true)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('rejects oversized base64 payloads before decoding', async () => {
    const oversized = '!'.repeat(128)

    await expect(
      prepareInputFiles({
        inputFiles: [
          {
            kind: 'base64',
            field: 'logo',
            base64: oversized,
            filename: 'logo.png',
          },
        ],
        maxBase64Bytes: 4,
      }),
    ).rejects.toThrow('Base64 payload exceeds')
  })

  it('rejects private URL downloads', async () => {
    await expect(
      prepareInputFiles({
        inputFiles: [
          {
            kind: 'url',
            field: 'remote',
            url: 'http://127.0.0.1/secret',
          },
        ],
        urlStrategy: 'download',
      }),
    ).rejects.toThrow('URL downloads are limited')
  })
})
