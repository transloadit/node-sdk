import type { ReadStream } from 'node:fs'

import type { HttpRequest } from 'tus-js-client'

import { getEventListeners, setMaxListeners } from 'node:events'
import fs from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { ClientRequest } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { setImmediate } from 'node:timers/promises'

import nock from 'nock'
import { defaultOptions, Upload } from 'tus-js-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Transloadit } from '../../src/Transloadit.ts'
import * as tus from '../../src/tus.ts'

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

const openedStreams = vi.hoisted((): ReadStream[] => [])
const endpoint = 'http://assembly.test'

async function mockTusUpload(directory: string, retryOffset?: number): Promise<void> {
  // The Node build of tus-js-client uses require('fs'), outside Vitest's module mock.
  const createReadStream = fs.createReadStream
  vi.spyOn(fs, 'createReadStream').mockImplementation((...args) => {
    const stream = createReadStream(...args)
    openedStreams.push(stream)
    return stream
  })
  await writeFile(join(directory, 'first.txt'), Buffer.alloc(4 * 1024 * 1024))
  nock(endpoint)
    .post(/\/assemblies\/[a-f\d]{32}$/)
    .reply(200, {
      ok: 'ASSEMBLY_UPLOADING',
      assembly_url: `${endpoint}/assemblies/test`,
      assembly_ssl_url: `${endpoint}/assemblies/test`,
      tus_url: `${endpoint}/tus/`,
    })
  const tus = nock(endpoint)
    .post('/tus/')
    .reply(201, '', { Location: `${endpoint}/tus/file` })
  if (retryOffset !== undefined) {
    tus
      .patch('/tus/file')
      .reply(500)
      .head('/tus/file')
      .reply(200, '', {
        'Upload-Offset': String(retryOffset),
        'Upload-Length': String(4 * 1024 * 1024),
      })
  }
  tus.patch('/tus/file').reply(204, '', { 'Upload-Offset': String(4 * 1024 * 1024) })
}

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
    vi.restoreAllMocks()
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

  it('closes tus chunk streams before an upload abort settles', async () => {
    await mockTusUpload(directory)
    const controller = new AbortController()

    await expect(
      client.createAssembly({
        files,
        signal: controller.signal,
        uploadConcurrency: 1,
        onUploadProgress: () => controller.abort(),
      }),
    ).rejects.toThrow(/aborted/i)

    expect(openedStreams).toHaveLength(3)
    expect(openedStreams.map((stream) => stream.closed)).toEqual([true, true, true])
  })

  it('closes tus chunks for caller-owned file streams without closing the original', async () => {
    await mockTusUpload(directory)
    const controller = new AbortController()
    const upload = fs.createReadStream(join(directory, 'first.txt'))

    await expect(
      client.createAssembly({
        uploads: { file: upload },
        signal: controller.signal,
        onUploadProgress: () => controller.abort(),
      }),
    ).rejects.toThrow(/aborted/i)

    expect(upload.destroyed).toBe(false)
    const chunks = openedStreams.filter((stream) => stream !== upload)
    expect(chunks).toHaveLength(1)
    expect(chunks.map((stream) => stream.closed)).toEqual([true])
  })

  it('waits for a file slice pending when creation fails', async () => {
    await mockTusUpload(directory)
    const openFile = defaultOptions.fileReader.openFile.bind(defaultOptions.fileReader)
    let releaseSlice: () => void = () => {}
    let markSliceCreated: () => void = () => {}
    const sliceGate = new Promise<void>((resolve) => {
      releaseSlice = resolve
    })
    const sliceCreated = new Promise<void>((resolve) => {
      markSliceCreated = resolve
    })
    vi.spyOn(defaultOptions.fileReader, 'openFile').mockImplementation(async (input, chunkSize) => {
      const source = await openFile(input, chunkSize)
      return {
        size: source.size,
        async slice(start: number, end: number) {
          const chunk = await source.slice(start, end)
          markSliceCreated()
          await sliceGate
          return chunk
        },
        close() {
          source.close()
        },
      }
    })
    const upload = fs.createReadStream(join(directory, 'first.txt'))
    const failure = new Error('Upload source failed')
    const result = client.createAssembly({ uploads: { file: upload } }).catch((error: unknown) => ({
      error,
      chunksClosed: openedStreams
        .filter((stream) => stream !== upload)
        .map((stream) => stream.closed),
    }))

    await sliceCreated
    upload.emit('error', failure)
    await setImmediate()
    releaseSlice()

    expect(await result).toEqual({ error: failure, chunksClosed: [true] })
    expect(upload.destroyed).toBe(false)
  })

  it.each(['synchronous', 'queued'])('stops HTTP sends for %s retry cancellation', async (mode) => {
    await mockTusUpload(directory, 128 * 1024)
    const controller = new AbortController()
    const abortUpload =
      mode === 'queued' ? () => queueMicrotask(() => controller.abort()) : () => controller.abort()
    let retrying = false
    let markRetrySendAttempted: () => void = () => {}
    const retrySendAttempted = new Promise<void>((resolve) => {
      markRetrySendAttempted = resolve
    })
    const sentAfterCancellation: string[] = []
    const requests: HttpRequest[] = []
    const startedRequests: ClientRequest[] = []
    const requestClosures: Promise<void>[] = []
    const createRequest = defaultOptions.httpStack.createRequest.bind(defaultOptions.httpStack)
    vi.spyOn(defaultOptions.httpStack, 'createRequest').mockImplementation((method, url) => {
      const request = createRequest(method, url)
      requests.push(request)
      const send = request.send.bind(request)
      request.send = (body: unknown) => {
        if (controller.signal.aborted) sentAfterCancellation.push(method)
        const response = send(body)
        const underlyingRequest: unknown = request.getUnderlyingObject()
        if (underlyingRequest instanceof ClientRequest) {
          startedRequests.push(underlyingRequest)
          requestClosures.push(
            new Promise<void>((resolve) => underlyingRequest.once('close', resolve)),
          )
        }
        return response.then((result) => {
          if (result.getStatus() === 500) retrying = true
          return result
        })
      }
      return request
    })
    const start = Upload.prototype.start
    vi.spyOn(Upload.prototype, 'start').mockImplementation(function (this: Upload) {
      this.options.onBeforeRequest = (request) => {
        if (!retrying || request.getMethod() !== 'PATCH') return
        // Cancel at a retry boundary, independent of throttled progress and HEAD ordering.
        const send = request.send.bind(request)
        request.send = (body: unknown) => {
          const response = send(body)
          markRetrySendAttempted()
          return response
        }
        abortUpload()
      }
      start.call(this)
    })

    try {
      await expect(
        client.createAssembly({
          files,
          signal: controller.signal,
          uploadConcurrency: 1,
        }),
      ).rejects.toThrow(/aborted/i)
      await retrySendAttempted

      expect(sentAfterCancellation).toEqual([])
      expect(openedStreams.length).toBeGreaterThan(2)
      expect(openedStreams.every((stream) => stream.destroyed && stream.closed)).toBe(true)
      await Promise.all(requestClosures)
      expect(startedRequests.every((request) => request.destroyed)).toBe(true)
    } finally {
      await Promise.all(requests.map((request) => request.abort()))
    }
  })

  it('does not retry after cancellation while tus opens its file source', async () => {
    await mockTusUpload(directory)
    const controller = new AbortController()
    const openFile = defaultOptions.fileReader.openFile.bind(defaultOptions.fileReader)
    let releaseSource: () => void = () => {}
    let markSourceOpened: () => void = () => {}
    const sourceGate = new Promise<void>((resolve) => {
      releaseSource = resolve
    })
    const sourceOpened = new Promise<void>((resolve) => {
      markSourceOpened = resolve
    })
    vi.spyOn(defaultOptions.fileReader, 'openFile').mockImplementation(async (input, chunkSize) => {
      const source = await openFile(input, chunkSize)
      markSourceOpened()
      await sourceGate
      return source
    })
    const start = Upload.prototype.start
    const starts = vi.spyOn(Upload.prototype, 'start').mockImplementation(function (this: Upload) {
      // Count unexpected retries without letting a failing test start more work.
      if (!controller.signal.aborted) start.call(this)
    })
    const rejected = expect(
      client.createAssembly({ files, signal: controller.signal, uploadConcurrency: 1 }),
    ).rejects.toThrow(/aborted/i)

    await sourceOpened
    controller.abort()
    await rejected
    expect(openedStreams.map((stream) => stream.closed)).toEqual([true, true])

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      releaseSource()
      await vi.advanceTimersByTimeAsync(0)
      expect(starts).toHaveBeenCalledTimes(1)
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('does not warn at default upload concurrency on legacy abort signals', async () => {
    nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(200, {
        ok: 'ASSEMBLY_UPLOADING',
        assembly_ssl_url: `${endpoint}/assemblies/test`,
        tus_url: `${endpoint}/tus/`,
      })
    nock(endpoint)
      .post('/tus/')
      .times(10)
      .reply(201, '', { Location: `${endpoint}/tus/file` })
      .patch('/tus/file')
      .times(10)
      .reply(204, '', { 'Upload-Offset': String('upload contents'.length) })
    const warnings: Error[] = []
    const onWarning = (warning: Error): void => {
      if (warning.name === 'MaxListenersExceededWarning') warnings.push(warning)
    }
    class LegacyAbortController extends AbortController {
      constructor() {
        super()
        // Node 20.10 applies this limit; newer releases default AbortSignals to unlimited.
        setMaxListeners(10, this.signal)
      }
    }
    vi.stubGlobal('AbortController', LegacyAbortController)
    process.on('warning', onWarning)
    try {
      await client.createAssembly({
        files: Object.fromEntries(
          Array.from({ length: 10 }, (_, index) => [`file${index}`, join(directory, 'first.txt')]),
        ),
      })
      await setImmediate()

      expect(warnings).toEqual([])
    } finally {
      process.off('warning', onWarning)
      vi.unstubAllGlobals()
    }
  })

  it.each([
    { name: 'during upload', abortWhileUploading: true, abortCalls: 1 },
    { name: 'after completion', abortWhileUploading: false, abortCalls: 0 },
  ])('forwards background cancellation only $name', async ({ abortWhileUploading, abortCalls }) => {
    const controller = new AbortController()
    const onAbort = vi.fn()
    let completeUploads: () => void = () => {}
    const uploadsComplete = new Promise<void>((resolve) => {
      completeUploads = resolve
    })
    vi.spyOn(tus, 'sendTusRequest').mockImplementation(({ signal }) => {
      signal?.addEventListener('abort', onAbort, { once: true })
      return Promise.resolve({ uploadUrls: {}, uploadsComplete })
    })
    nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(200, { ok: 'ASSEMBLY_UPLOADING' })

    await client.createAssembly({ files, signal: controller.signal, uploadBehavior: 'background' })
    if (abortWhileUploading) controller.abort()
    completeUploads()
    await setImmediate()
    controller.abort()

    expect(onAbort).toHaveBeenCalledTimes(abortCalls)
    expect(getEventListeners(controller.signal, 'abort')).toEqual([])
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
