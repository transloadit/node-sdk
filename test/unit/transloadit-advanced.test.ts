import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { postMock, getMock, putMock, deleteMock, streamMock, MockRequestError, MockHTTPError } =
  vi.hoisted(() => {
    class RequestError extends Error {
      response?: unknown

      constructor(message = 'RequestError', response?: unknown) {
        super(message)
        this.name = 'RequestError'
        this.response = response
      }
    }

    class HTTPError extends RequestError {
      constructor(response: unknown) {
        super('HTTPError', response)
        this.name = 'HTTPError'
      }
    }

    return {
      postMock: vi.fn(),
      getMock: vi.fn(),
      putMock: vi.fn(),
      deleteMock: vi.fn(),
      streamMock: vi.fn(),
      MockRequestError: RequestError,
      MockHTTPError: HTTPError,
    }
  })

vi.mock('got', () => {
  const mockClient = {
    post: postMock,
    get: getMock,
    put: putMock,
    delete: deleteMock,
    stream: streamMock,
  }

  return {
    default: mockClient,
    ...mockClient,
    HTTPError: MockHTTPError,
    RequestError: MockRequestError,
  }
})

import { ApiError } from '../../src/ApiError.ts'
import type { AssemblyStatus } from '../../src/alphalib/types/assemblyStatus.ts'
import PaginationStream from '../../src/PaginationStream.ts'
import PollingTimeoutError from '../../src/PollingTimeoutError.ts'
import { Transloadit } from '../../src/Transloadit.ts'

const getInternalRemoteJson = (client: Transloadit) =>
  (client as unknown as { _remoteJson: Transloadit['_remoteJson'] })._remoteJson.bind(client)

describe('Transloadit advanced behaviors', () => {
  let client: Transloadit

  beforeEach(() => {
    client = new Transloadit({ authKey: 'key', authSecret: 'secret', maxRetries: 2 })
    postMock.mockReset()
    getMock.mockReset()
    putMock.mockReset()
    deleteMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('retries rate limited requests before succeeding', async () => {
    vi.useFakeTimers()
    const remoteJson = getInternalRemoteJson(client)

    const body = {
      error: 'RATE_LIMIT_REACHED',
      info: {
        retryIn: 1,
      },
    }

    const retryError = new MockHTTPError({ statusCode: 429, body })
    postMock.mockRejectedValueOnce(retryError).mockResolvedValueOnce({ body: { ok: true } })

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

    const resultPromise = remoteJson({ urlSuffix: '/foo', method: 'post' })

    await vi.advanceTimersByTimeAsync(1000)

    const result = await resultPromise

    expect(result).toEqual({ ok: true })
    expect(postMock).toHaveBeenCalledTimes(2)

    randomSpy.mockRestore()
  })

  it('wraps non-retryable HTTP errors in ApiError', async () => {
    const remoteJson = getInternalRemoteJson(client)

    const errorBody = { error: 'SOME_ERROR', info: {} }
    const httpError = new MockHTTPError({ statusCode: 500, body: errorBody })
    postMock.mockRejectedValueOnce(httpError)

    await expect(remoteJson({ urlSuffix: '/foo', method: 'post' })).rejects.toBeInstanceOf(ApiError)
  })

  it('polls assemblies until a terminal status is reached', async () => {
    const statuses: AssemblyStatus[] = [
      { ok: 'ASSEMBLY_UPLOADING' } as AssemblyStatus,
      { ok: 'ASSEMBLY_EXECUTING' } as AssemblyStatus,
      { ok: 'ASSEMBLY_COMPLETED' } as AssemblyStatus,
    ]

    const getAssembly = vi
      .spyOn(client, 'getAssembly')
      .mockImplementation(async () => statuses.shift() as AssemblyStatus)

    const onAssemblyProgress = vi.fn()

    const result = await client.awaitAssemblyCompletion('assembly-id', {
      onAssemblyProgress,
      interval: 1,
    })

    expect(result).toEqual({ ok: 'ASSEMBLY_COMPLETED' })
    expect(onAssemblyProgress).toHaveBeenCalledTimes(2)
    expect(getAssembly).toHaveBeenCalledTimes(3)
  })

  it('throws a timeout error when polling exceeds the allowed duration', async () => {
    vi.useFakeTimers()
    vi.spyOn(client, 'getAssembly').mockResolvedValue({
      ok: 'ASSEMBLY_UPLOADING',
    } as AssemblyStatus)

    const promise = client.awaitAssemblyCompletion('assembly-id', {
      timeout: 0,
      startTimeMs: 0,
      interval: 1,
    })

    await expect(promise).rejects.toBeInstanceOf(PollingTimeoutError)
  })

  it('streams assemblies page by page until all items are read', async () => {
    type ListAssembliesReturn = Awaited<ReturnType<Transloadit['listAssemblies']>>

    const listAssemblies = vi.spyOn(client, 'listAssemblies').mockImplementation(async (params) => {
      const page = params?.page ?? 1

      if (page === 1) {
        return {
          items: [{ id: 1 }, { id: 2 }],
          count: 3,
        } as unknown as ListAssembliesReturn
      }
      if (page === 2) {
        return {
          items: [{ id: 3 }],
          count: 3,
        } as unknown as ListAssembliesReturn
      }
      return { items: [], count: 3 } as unknown as ListAssembliesReturn
    })

    const stream = client.streamAssemblies({ page: 1 } as never)

    const collected: Array<{ id: number }> = []

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (item) => {
        collected.push(item as { id: number })
      })
      stream.on('end', resolve)
      stream.on('error', reject)
    })

    expect(collected).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    expect(listAssemblies).toHaveBeenCalledTimes(2)
    expect(listAssemblies).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1 }))
    expect(listAssemblies).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }))
  })
})

describe('PaginationStream edge cases', () => {
  it('stops requesting pages once the reported count is reached', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], count: 2 })
      .mockResolvedValueOnce({ items: [3, 4] })

    const stream = new PaginationStream<number>(fetchPage)
    const items: number[] = []

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (item) => {
        items.push(item)
      })
      stream.on('end', resolve)
      stream.on('error', reject)
    })

    expect(items).toEqual([1, 2])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })
})
