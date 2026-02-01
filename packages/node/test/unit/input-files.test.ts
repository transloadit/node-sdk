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
})
