import { createReadStream } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import temp from 'temp'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssemblyStatus } from '../../src/alphalib/types/assemblyStatus.ts'
import { Transloadit } from '../../src/Transloadit.ts'
import { sendTusRequest } from '../../src/tus.ts'

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    createReadStream: vi.fn(actual.createReadStream),
  }
})

vi.mock('../../src/tus.ts', () => ({
  sendTusRequest: vi.fn(),
}))

const sendTusRequestMock = vi.mocked(sendTusRequest)
const createReadStreamMock = vi.mocked(createReadStream)

function buildAssembly(overrides: Partial<AssemblyStatus> = {}): AssemblyStatus {
  const assembly = {
    ok: 'ASSEMBLY_UPLOADING',
    assembly_id: 'assembly-id',
    assembly_url: 'http://example.com/assemblies/assembly-id',
    assembly_ssl_url: 'http://example.com/assemblies/assembly-id',
    tus_url: 'http://example.com/tus',
    tus_uploads: [],
    uploads: [],
    ...overrides,
  } satisfies AssemblyStatus

  return assembly
}

describe('resumeAssemblyUploads', () => {
  beforeEach(() => {
    sendTusRequestMock.mockReset()
    createReadStreamMock.mockClear()
  })

  it('returns the latest assembly status after resuming', async () => {
    const client = new Transloadit({
      authKey: 'key',
      authSecret: 'secret',
      endpoint: 'http://example.com',
    })

    const initial = buildAssembly()
    const updated = buildAssembly({ ok: 'ASSEMBLY_COMPLETED' })

    const getAssemblySpy = vi
      .spyOn(client, 'getAssembly')
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(updated)

    sendTusRequestMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 50)
        }),
    )

    const result = await client.resumeAssemblyUploads({
      assemblyUrl: initial.assembly_url,
      files: {},
    })

    expect(getAssemblySpy).toHaveBeenCalledTimes(2)
    expect(result).toBe(updated)
  })

  it('does not open streams for finished uploads', async () => {
    const client = new Transloadit({
      authKey: 'key',
      authSecret: 'secret',
      endpoint: 'http://example.com',
    })

    const dir = await temp.mkdir('resume-finished')
    const filePath = join(dir, 'done.txt')
    await writeFile(filePath, 'done', 'utf8')

    const assembly = buildAssembly({
      uploads: [
        {
          id: 'done-id',
          name: 'done.txt',
          basename: 'done.txt',
          ext: 'txt',
          size: 4,
          mime: null,
          type: null,
          field: 'file1',
          md5hash: null,
          original_id: 'done-id',
          original_basename: 'done.txt',
          original_name: 'done.txt',
          original_path: 'done.txt',
          original_md5hash: null,
          from_batch_import: false,
          is_tus_file: true,
          tus_upload_url: 'http://example.com/tus/done-id',
          url: null,
          ssl_url: null,
          meta: {},
        },
      ],
    })

    vi.spyOn(client, 'getAssembly').mockResolvedValue(assembly)

    sendTusRequestMock.mockResolvedValue(undefined)

    await client.resumeAssemblyUploads({
      assemblyUrl: assembly.assembly_url,
      files: {
        file1: filePath,
      },
    })

    expect(createReadStreamMock).not.toHaveBeenCalled()
  })

  it('keeps upload URL mapping stable when names include ::', async () => {
    const client = new Transloadit({
      authKey: 'key',
      authSecret: 'secret',
      endpoint: 'http://example.com',
    })

    const dir = await temp.mkdir('resume-collision')
    const fileAPath = join(dir, 'b::1')
    const fileBPath = join(dir, '1')

    await writeFile(fileAPath, 'abc', 'utf8')
    await writeFile(fileBPath, 'abc', 'utf8')

    const assembly = buildAssembly({
      tus_uploads: [
        {
          filename: 'b::1',
          fieldname: 'a',
          user_meta: {},
          size: 3,
          offset: 0,
          finished: false,
          upload_url: 'http://example.com/tus/upload-a',
        },
        {
          filename: '1',
          fieldname: 'a::b',
          user_meta: {},
          size: 3,
          offset: 0,
          finished: false,
          upload_url: 'http://example.com/tus/upload-b',
        },
      ],
    })

    vi.spyOn(client, 'getAssembly').mockResolvedValue(assembly)

    const capturedUploads: Record<string, string> = {}
    sendTusRequestMock.mockImplementation((opts) => {
      Object.assign(capturedUploads, opts.uploadUrls ?? {})
      for (const stream of Object.values(opts.streamsMap)) {
        stream.stream.destroy()
      }
    })

    await client.resumeAssemblyUploads({
      assemblyUrl: assembly.assembly_url,
      files: {
        a: fileAPath,
        'a::b': fileBPath,
      },
    })

    expect(capturedUploads).toEqual({
      a: 'http://example.com/tus/upload-a',
      'a::b': 'http://example.com/tus/upload-b',
    })
  })

  it('skips resume URLs for non-file uploads', async () => {
    const client = new Transloadit({
      authKey: 'key',
      authSecret: 'secret',
      endpoint: 'http://example.com',
    })

    const assembly = buildAssembly({
      tus_uploads: [
        {
          filename: 'buffer',
          fieldname: 'buffer',
          user_meta: {},
          size: 3,
          offset: 1,
          finished: false,
          upload_url: 'http://example.com/tus/upload-buffer',
        },
      ],
    })

    vi.spyOn(client, 'getAssembly').mockResolvedValue(assembly)

    const capturedUploads: Record<string, string> = {}
    sendTusRequestMock.mockImplementation((opts) => {
      Object.assign(capturedUploads, opts.uploadUrls ?? {})
      for (const stream of Object.values(opts.streamsMap)) {
        stream.stream.destroy()
      }
    })

    await client.resumeAssemblyUploads({
      assemblyUrl: assembly.assembly_url,
      uploads: {
        buffer: Buffer.from('abc'),
      },
    })

    expect(capturedUploads).toEqual({})
  })

  it('rejects when upload streams error before tus starts', async () => {
    const client = new Transloadit({
      authKey: 'key',
      authSecret: 'secret',
      endpoint: 'http://example.com',
    })

    const failingStream = new Readable({
      read() {},
    })

    const failure = new Error('stream failed')

    vi.spyOn(client, 'getAssembly').mockResolvedValue(buildAssembly())
    sendTusRequestMock.mockImplementation(async (opts) => {
      const stream = Object.values(opts.streamsMap)[0]?.stream
      process.nextTick(() => {
        stream?.emit('error', failure)
      })
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 50)
      })
    })

    await expect(
      client.resumeAssemblyUploads({
        assemblyUrl: 'http://example.com/assemblies/assembly-id',
        uploads: {
          file1: failingStream,
        },
      }),
    ).rejects.toThrow('stream failed')
  })
})
