import type { stat as NodeStat } from 'node:fs/promises'
import { PassThrough } from 'node:stream'
import type { OnSuccessPayload, UploadOptions } from 'tus-js-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let startBehavior: (options: UploadOptions) => void

type StatPathArg = Parameters<typeof NodeStat>[0]
interface MockStatResult {
  size: number
}
type MockStatFn = (path: StatPathArg) => Promise<MockStatResult>

const createStatResult = (size: number): MockStatResult => ({ size })

const { statMock } = vi.hoisted(() => ({
  statMock: vi.fn<MockStatFn>(async () => createStatResult(0)),
}))

vi.mock('node:fs/promises', () => ({
  stat: statMock as unknown as typeof NodeStat,
}))

const { uploadCtor } = vi.hoisted(() => ({
  uploadCtor: vi.fn((_stream: unknown, options: UploadOptions) => ({
    start: vi.fn(() => {
      if (!startBehavior) {
        throw new Error('startBehavior not configured for test')
      }
      startBehavior(options)
    }),
  })),
}))

vi.mock('tus-js-client', () => ({
  Upload: uploadCtor,
}))

const { pMapSpy } = vi.hoisted(() => ({
  pMapSpy: vi.fn(
    async (
      iterable: Iterable<unknown>,
      mapper: (item: unknown) => unknown | Promise<unknown>,
      _options?: { concurrency?: number },
    ) => {
      const items = Array.isArray(iterable) ? iterable : Array.from(iterable)
      const results: unknown[] = []
      for (const item of items) {
        results.push(await mapper(item))
      }
      return results
    },
  ),
}))

vi.mock('p-map', () => ({
  default: pMapSpy,
}))

import type { AssemblyStatus } from '../../src/alphalib/types/assemblyStatus.ts'
import { sendTusRequest } from '../../src/tus.ts'

const baseAssembly = {
  assembly_ssl_url: 'https://assembly.example.com',
  tus_url: 'https://tus.example.com/files/',
} as AssemblyStatus

describe('sendTusRequest', () => {
  beforeEach(() => {
    statMock.mockReset()
    statMock.mockImplementation(async () => createStatResult(0))
    uploadCtor.mockClear()
    pMapSpy.mockClear()
    startBehavior = (options) => {
      options.onSuccess?.({} as OnSuccessPayload)
    }
  })

  it('reports aggregate progress when every stream has a known size', async () => {
    const firstPath = '/tmp/first'
    const secondPath = '/tmp/second'
    const sizesByPath: Record<string, number> = {
      [firstPath]: 1024,
      [secondPath]: 2048,
    }

    statMock.mockImplementation(async (path: StatPathArg) => {
      const key = typeof path === 'string' ? path : path.toString()
      return createStatResult(sizesByPath[key] ?? 0)
    })

    const onProgress = vi.fn()

    startBehavior = (options) => {
      const field = options.metadata?.fieldname as 'first' | 'second'
      const total = field === 'first' ? sizesByPath[firstPath] : sizesByPath[secondPath]
      const uploaded = total
      options.onProgress?.(uploaded, total)
      options.onSuccess?.({} as OnSuccessPayload)
    }

    await sendTusRequest({
      streamsMap: {
        first: { path: firstPath, stream: new PassThrough() },
        second: { path: secondPath, stream: new PassThrough() },
      },
      assembly: baseAssembly,
      requestedChunkSize: 5_242_880,
      uploadConcurrency: 2,
      onProgress,
    })

    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      uploadedBytes: 1024,
      totalBytes: 3072,
    })
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      uploadedBytes: 3072,
      totalBytes: 3072,
    })

    expect(statMock).toHaveBeenCalledWith(firstPath)
    expect(statMock).toHaveBeenCalledWith(secondPath)

    expect(uploadCtor).toHaveBeenCalledTimes(2)
    const uploadOptions = uploadCtor.mock.calls.map(([, options]) => options)

    expect(uploadOptions[0]).toMatchObject({
      chunkSize: 5_242_880,
      uploadSize: 1024,
      metadata: expect.objectContaining({
        assembly_url: baseAssembly.assembly_ssl_url,
        fieldname: 'first',
        filename: 'first',
      }),
    })
    expect(uploadOptions[1]).toMatchObject({
      chunkSize: 5_242_880,
      uploadSize: 2048,
      metadata: expect.objectContaining({
        fieldname: 'second',
        filename: 'second',
      }),
    })

    expect(pMapSpy.mock.calls[1]?.[2]?.concurrency).toBe(2)
  })

  it('emits incremental aggregate progress as each stream advances', async () => {
    const firstPath = '/tmp/inc-first'
    const secondPath = '/tmp/inc-second'
    const sizesByPath: Record<string, number> = {
      [firstPath]: 200,
      [secondPath]: 100,
    }

    statMock.mockImplementation(async (path: StatPathArg) => {
      const key = typeof path === 'string' ? path : path.toString()
      return createStatResult(sizesByPath[key] ?? 0)
    })

    const onProgress = vi.fn()

    const progressByField: Record<string, Array<{ uploaded: number; total: number }>> = {
      first: [
        { uploaded: 50, total: sizesByPath[firstPath] },
        { uploaded: sizesByPath[firstPath], total: sizesByPath[firstPath] },
      ],
      second: [
        { uploaded: 30, total: sizesByPath[secondPath] },
        { uploaded: 60, total: sizesByPath[secondPath] },
        { uploaded: sizesByPath[secondPath], total: sizesByPath[secondPath] },
      ],
    }

    startBehavior = (options) => {
      const field = options.metadata?.fieldname as keyof typeof progressByField
      const events = progressByField[field]
      if (!events) {
        throw new Error(`Unexpected field ${String(field)}`)
      }
      for (const { uploaded, total } of events) {
        options.onProgress?.(uploaded, total)
      }
      options.onSuccess?.({} as OnSuccessPayload)
    }

    await sendTusRequest({
      streamsMap: {
        first: { path: firstPath, stream: new PassThrough() },
        second: { path: secondPath, stream: new PassThrough() },
      },
      assembly: baseAssembly,
      requestedChunkSize: 1_048_576,
      uploadConcurrency: 2,
      onProgress,
    })

    expect(onProgress.mock.calls.map(([payload]) => payload)).toEqual([
      { uploadedBytes: 50, totalBytes: 300 },
      { uploadedBytes: 200, totalBytes: 300 },
      { uploadedBytes: 230, totalBytes: 300 },
      { uploadedBytes: 260, totalBytes: 300 },
      { uploadedBytes: 300, totalBytes: 300 },
    ])
  })

  it('configures deferred length uploads when stream size is unknown', async () => {
    const onProgress = vi.fn()

    startBehavior = (options) => {
      options.onProgress?.(123, Number.POSITIVE_INFINITY)
      options.onSuccess?.({} as OnSuccessPayload)
    }

    await sendTusRequest({
      streamsMap: {
        raw: { stream: new PassThrough() },
      },
      assembly: baseAssembly,
      requestedChunkSize: Number.POSITIVE_INFINITY,
      uploadConcurrency: 1,
      onProgress,
    })

    expect(onProgress).toHaveBeenCalledWith({
      uploadedBytes: 123,
      totalBytes: undefined,
    })

    expect(statMock).not.toHaveBeenCalled()

    expect(uploadCtor).toHaveBeenCalledTimes(1)
    const [, options] = uploadCtor.mock.calls[0]
    expect(options.uploadLengthDeferred).toBe(true)
    expect(options.chunkSize).toBe(50_000_000)
    expect(options.metadata).toMatchObject({
      fieldname: 'raw',
      filename: 'raw',
    })
  })

  it('rejects when the Assembly is missing the SSL URL', async () => {
    statMock.mockResolvedValue({ size: 2048 })

    await expect(
      sendTusRequest({
        streamsMap: {
          broken: { path: '/tmp/broken', stream: new PassThrough() },
        },
        assembly: {
          tus_url: baseAssembly.tus_url,
        } as AssemblyStatus,
        requestedChunkSize: 1_048_576,
        uploadConcurrency: 1,
        onProgress: () => {},
      }),
    ).rejects.toThrow('assembly_ssl_url is not present in the assembly status')

    expect(uploadCtor).not.toHaveBeenCalled()
  })
})
