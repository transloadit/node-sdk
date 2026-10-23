import type { ReadStream } from 'node:fs'

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import nock from 'nock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Transloadit } from '../../src/Transloadit.ts'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    createReadStream: vi.fn((...args: Parameters<typeof actual.createReadStream>) => {
      const stream = actual.createReadStream(...args)
      openedStreams.push(stream)
      return stream
    }),
  }
})

const openedStreams: ReadStream[] = []
const endpoint = 'http://assembly.test'

describe('createAssembly file stream cleanup', () => {
  let directory: string
  let files: Record<string, string>
  let client: Transloadit

  beforeEach(async () => {
    openedStreams.length = 0
    directory = await mkdtemp(join(tmpdir(), 'assembly-streams-'))
    files = { first: join(directory, 'first.txt'), second: join(directory, 'second.txt') }
    await Promise.all(Object.values(files).map((path) => writeFile(path, 'upload contents')))
    client = new Transloadit({ authKey: 'key', authSecret: 'secret', endpoint, maxRetries: 0 })
  })

  afterEach(async () => {
    nock.abortPendingRequests()
    nock.cleanAll()
    await Promise.all(
      openedStreams.map((stream) => new Promise<void>((resolve) => stream.close(() => resolve()))),
    )
    await rm(directory, { recursive: true, force: true })
  })

  it('closes every local file stream before a failed creation settles', async () => {
    const request = nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(403, { error: 'INVALID_SIGNATURE', message: 'Invalid signature' })

    await expect(client.createAssembly({ files })).rejects.toThrow('INVALID_SIGNATURE')

    request.done()
    expect(openedStreams).toHaveLength(2)
    expect(openedStreams.map((stream) => stream.destroyed)).toEqual([true, true])
    expect(openedStreams.map((stream) => stream.closed)).toEqual([true, true])
  })

  it('closes every local file stream before an aborted creation settles', async () => {
    const controller = new AbortController()
    const request = nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .delay(1000)
      .reply(200, {})
      .on('request', () => controller.abort())

    await expect(client.createAssembly({ files, signal: controller.signal })).rejects.toMatchObject(
      {
        name: 'AbortError',
      },
    )

    request.done()
    expect(openedStreams).toHaveLength(2)
    expect(openedStreams.map((stream) => stream.destroyed)).toEqual([true, true])
    expect(openedStreams.map((stream) => stream.closed)).toEqual([true, true])
  })

  it('closes local files when another upload fails stream setup', async () => {
    const invalidUpload = new PassThrough({ readable: false })

    await expect(
      client.createAssembly({ files, uploads: { invalid: invalidUpload } }),
    ).rejects.toThrow('Upload named "invalid" is not a Readable stream')

    expect(openedStreams).toHaveLength(2)
    expect(openedStreams.map((stream) => stream.closed)).toEqual([true, true])
    invalidUpload.destroy()
  })

  it('closes files overwritten by an upload label while preserving caller-owned streams', async () => {
    nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(403, { error: 'INVALID_SIGNATURE', message: 'Invalid signature' })
    const upload = new PassThrough()

    try {
      await expect(client.createAssembly({ files, uploads: { first: upload } })).rejects.toThrow(
        'INVALID_SIGNATURE',
      )

      expect(openedStreams).toHaveLength(2)
      expect(openedStreams.map((stream) => stream.closed)).toEqual([true, true])
      expect(upload.destroyed).toBe(false)
    } finally {
      upload.destroy()
    }
  })
})
