import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import nock from 'nock'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepareInputFiles } from '../../src/inputFiles.ts'

const { lookupMock } = vi.hoisted(() => ({
  lookupMock: vi.fn(),
}))

vi.mock('node:dns/promises', () => ({
  lookup: lookupMock,
}))

afterEach(() => {
  vi.restoreAllMocks()
  lookupMock.mockReset()
  nock.cleanAll()
})

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

  it('preserves leading-dot basenames when duplicate tempfiles collide', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'transloadit-test-'))

    try {
      const base64 = Buffer.from('hello').toString('base64')

      const result = await prepareInputFiles({
        inputFiles: [
          {
            kind: 'base64',
            field: 'first',
            base64,
            filename: '.gitignore',
          },
          {
            kind: 'base64',
            field: 'second',
            base64,
            filename: '.gitignore',
          },
        ],
        base64Strategy: 'tempfile',
        tempDir,
      })

      expect(result.files.first.startsWith(tempDir)).toBe(true)
      expect(result.files.second.startsWith(tempDir)).toBe(true)
      expect(basename(result.files.first)).toBe('.gitignore')
      expect(basename(result.files.second)).toBe('.gitignore-1')
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
        allowPrivateUrls: false,
      }),
    ).rejects.toThrow('URL downloads are limited')
  })

  it('rejects non-canonical IPv6 loopback URL downloads', async () => {
    await expect(
      prepareInputFiles({
        inputFiles: [
          {
            kind: 'url',
            field: 'remote',
            url: 'http://[0:0:0:0:0:0:0:1]/secret',
          },
        ],
        urlStrategy: 'download',
        allowPrivateUrls: false,
      }),
    ).rejects.toThrow('URL downloads are limited')
  })

  it('rejects IPv4-mapped loopback URL downloads', async () => {
    await expect(
      prepareInputFiles({
        inputFiles: [
          {
            kind: 'url',
            field: 'remote',
            url: 'http://[::ffff:127.0.0.1]/secret',
          },
        ],
        urlStrategy: 'download',
        allowPrivateUrls: false,
      }),
    ).rejects.toThrow('URL downloads are limited')
  })

  it('rejects hostnames that resolve to private IPs', async () => {
    lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }])
    const downloadScope = nock('http://rebind.test').get('/secret').reply(200, 'secret')

    await expect(
      prepareInputFiles({
        inputFiles: [
          {
            kind: 'url',
            field: 'remote',
            url: 'http://rebind.test/secret',
          },
        ],
        urlStrategy: 'download',
        allowPrivateUrls: false,
      }),
    ).rejects.toThrow('URL downloads are limited')

    expect(downloadScope.isDone()).toBe(false)
  })

  it('rejects redirects to private URL downloads', async () => {
    lookupMock.mockResolvedValue([{ address: '198.51.100.10', family: 4 }])
    const publicScope = nock('http://198.51.100.10')
      .get('/public')
      .reply(302, undefined, { Location: 'http://127.0.0.1/secret' })
    const privateScope = nock('http://127.0.0.1').get('/secret').reply(200, 'secret')

    await expect(
      prepareInputFiles({
        inputFiles: [
          {
            kind: 'url',
            field: 'remote',
            url: 'http://198.51.100.10/public',
          },
        ],
        urlStrategy: 'download',
        allowPrivateUrls: false,
      }),
    ).rejects.toThrow('URL downloads are limited')

    expect(publicScope.isDone()).toBe(true)
    expect(privateScope.isDone()).toBe(false)
  })

  it('pins URL downloads to the validated DNS answer', async () => {
    lookupMock.mockResolvedValue([{ address: '198.51.100.10', family: 4 }])
    const downloadScope = nock('http://rebind.test').get('/public').reply(200, 'public-data')

    const result = await prepareInputFiles({
      inputFiles: [
        {
          kind: 'url',
          field: 'remote',
          url: 'http://rebind.test/public',
        },
      ],
      urlStrategy: 'download',
      allowPrivateUrls: false,
    })

    try {
      const downloadedPath = result.files.remote
      expect(downloadedPath).toBeDefined()
      expect(downloadScope.isDone()).toBe(true)
    } finally {
      await Promise.all(result.cleanup.map((cleanup) => cleanup()))
    }
  })
})
