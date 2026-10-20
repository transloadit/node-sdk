import type { AssemblyStatus } from '@transloadit/node'

import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { ApiError, Transloadit } from '@transloadit/node'
import nock from 'nock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTransloaditMcpServer } from '../../src/server.ts'

const assemblyId = '0123456789abcdef0123456789abcdef'
const assemblyUrl = `https://api2.transloadit.com/assemblies/${assemblyId}`
const executing: AssemblyStatus = {
  ok: 'ASSEMBLY_EXECUTING',
  assembly_id: assemblyId,
  assembly_ssl_url: assemblyUrl,
}
const uploading: AssemblyStatus = { ...executing, ok: 'ASSEMBLY_UPLOADING' }
const uploadTemplate = { steps: { ':original': { robot: '/upload/handle' } } }
const maxWaitMs = 300

/** A promise that stays pending, like an Assembly that is still being processed. */
const pending = (): Promise<AssemblyStatus> => new Promise<AssemblyStatus>(() => undefined)

describe('waiting within the host tool-call budget', () => {
  let client: Client | undefined
  let server: ReturnType<typeof createTransloaditMcpServer> | undefined

  const call = async (
    name: string,
    args: Record<string, unknown>,
    { budgetMs = maxWaitMs, bearer }: { budgetMs?: number; bearer?: string } = {},
  ) => {
    server = createTransloaditMcpServer({
      authKey: 'key',
      authSecret: 'secret',
      maxWaitMs: budgetMs,
    })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'wait-budget', version: '1.0.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    if (bearer) {
      // The in-memory transport carries no HTTP headers; add the one a hosted request would have.
      const receive = serverTransport.onmessage
      serverTransport.onmessage = (message, extra) =>
        receive?.(message, {
          ...extra,
          requestInfo: { headers: { authorization: `Bearer ${bearer}` } },
        })
    }
    return client.callTool({ name, arguments: args })
  }

  beforeEach(() => {
    vi.spyOn(Transloadit.prototype, 'cancelAssembly').mockResolvedValue({
      ok: 'ASSEMBLY_CANCELED',
    })
  })

  afterEach(async () => {
    vi.useRealTimers()
    await client?.close()
    await server?.close()
    vi.restoreAllMocks()
    nock.cleanAll()
  })

  it('returns the running Assembly when completion outlasts the budget', async () => {
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) => {
      options?.onAssemblyCreated?.(uploading)
      options?.onAssemblyProgress?.(executing)
      return Object.assign(pending(), { assemblyId })
    })

    const startedAt = performance.now()
    const result = await call('transloadit_create_assembly', {
      instructions: { steps: { resized: { robot: '/image/resize', width: 1 } } },
      wait_for_completion: true,
      // Larger than the server allows; the server's budget still applies.
      wait_timeout_ms: 600_000,
    })

    expect(performance.now() - startedAt).toBeLessThan(5_000)
    expect(result.isError).toBeUndefined()
    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      running: true,
      assembly: { assembly_id: assemblyId, ok: 'ASSEMBLY_EXECUTING' },
      next_steps: ['transloadit_wait_for_assembly', 'transloadit_get_assembly_status'],
      warnings: [
        {
          code: 'mcp_assembly_still_running',
          hint: expect.stringContaining(assemblyUrl),
        },
      ],
    })
  })

  it('returns the known Assembly instead of an error when polling times out', async () => {
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) => {
      options?.onAssemblyCreated?.(uploading)
      options?.onAssemblyProgress?.(executing)
      const timedOut = Object.assign(new Error('Polling timed out'), {
        name: 'PollingTimeoutError',
      })
      return Object.assign(Promise.reject(timedOut), { assemblyId })
    })

    const result = await call('transloadit_create_assembly', {
      instructions: { steps: { resized: { robot: '/image/resize', width: 1 } } },
      wait_for_completion: true,
    })

    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      running: true,
      assembly: { assembly_id: assemblyId, ok: 'ASSEMBLY_EXECUTING' },
      warnings: [{ code: 'mcp_assembly_still_running' }],
    })
  })

  it('reports a completed Assembly without follow-up steps', async () => {
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation(() =>
      Object.assign(Promise.resolve<AssemblyStatus>({ ...executing, ok: 'ASSEMBLY_COMPLETED' }), {
        assemblyId,
      }),
    )

    const result = await call('transloadit_create_assembly', {
      instructions: { steps: { resized: { robot: '/image/resize', width: 1 } } },
      wait_for_completion: true,
    })

    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      running: false,
      next_steps: [],
    })
    expect(result.structuredContent).toEqual(
      expect.not.objectContaining({ warnings: expect.anything() }),
    )
  })

  it('creates the Assembly before a slow URL download finishes, then uploads into it', async () => {
    const content = 'Slowly downloaded bytes'
    nock('http://198.51.100.10').get('/large.mp4').delay(1_000).reply(200, content)
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) => {
      options?.onAssemblyCreated?.(uploading)
      return Object.assign(Promise.resolve(uploading), { assemblyId })
    })
    let uploadedContent: string | undefined
    const resume = vi
      .spyOn(Transloadit.prototype, 'resumeAssemblyUploads')
      .mockImplementation(async (options) => {
        const file = options.files?.file
        if (file == null) throw new Error('Expected the downloaded file')
        uploadedContent = await readFile(file, 'utf8')
        return { ...executing, ok: 'ASSEMBLY_COMPLETED' }
      })

    const result = await call('transloadit_create_assembly', {
      instructions: uploadTemplate,
      files: [{ kind: 'url', field: 'file', url: 'http://198.51.100.10/large.mp4' }],
      wait_for_completion: true,
    })

    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      running: true,
      assembly: { assembly_id: assemblyId },
      upload: { status: 'uploading', total_files: 1 },
      warnings: [
        { code: 'mcp_assembly_still_running', message: expect.stringContaining('URL input') },
      ],
    })
    expect(Transloadit.prototype.createAssembly).toHaveBeenCalledWith(
      expect.objectContaining({ files: {}, expectedUploads: 1, waitForCompletion: false }),
    )
    await vi.waitFor(() => expect(uploadedContent).toBe(content), { timeout: 5_000 })
    expect(resume).toHaveBeenCalledWith(expect.objectContaining({ assemblyUrl }))
    expect(Transloadit.prototype.cancelAssembly).not.toHaveBeenCalled()
  })

  it('cancels the Assembly when a slow URL download fails after it was created', async () => {
    nock('http://198.51.100.10').get('/missing.mp4').delay(600).reply(404)
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) => {
      options?.onAssemblyCreated?.(uploading)
      return Object.assign(Promise.resolve(uploading), { assemblyId })
    })
    vi.spyOn(Transloadit.prototype, 'resumeAssemblyUploads')

    const result = await call('transloadit_create_assembly', {
      instructions: uploadTemplate,
      files: [{ kind: 'url', field: 'file', url: 'http://198.51.100.10/missing.mp4' }],
    })

    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      assembly: { assembly_id: assemblyId },
    })
    await vi.waitFor(
      () => expect(Transloadit.prototype.cancelAssembly).toHaveBeenCalledWith(assemblyId),
      { timeout: 5_000 },
    )
    expect(Transloadit.prototype.resumeAssemblyUploads).not.toHaveBeenCalled()
  })

  it('returns the latest status from transloadit_wait_for_assembly once the budget is spent', async () => {
    let signal: AbortSignal | undefined
    vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockImplementation(
      (_id, options) => {
        signal = options?.signal
        options?.onAssemblyProgress?.(executing)
        return pending()
      },
    )

    const result = await call('transloadit_wait_for_assembly', {
      assembly_url: assemblyUrl,
      timeout_ms: 600_000,
    })

    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      running: true,
      assembly: { assembly_id: assemblyId, ok: 'ASSEMBLY_EXECUTING' },
      warnings: [{ code: 'mcp_assembly_still_running' }],
    })
    expect(signal?.aborted).toBe(true)
  })

  it('removes a slow download once it finishes, even when creating the Assembly failed', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'wait-budget-'))
    const previousTmpdir = process.env.TMPDIR
    // os.tmpdir() reads TMPDIR on every call, so the download lands in a directory this test owns.
    process.env.TMPDIR = tempRoot
    try {
      const scope = nock('http://198.51.100.10')
        .get('/large.mp4')
        .delay(600)
        .reply(200, 'Downloaded bytes')
      vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation(() =>
        Object.assign(Promise.reject(new Error('Creation failed')), { assemblyId }),
      )

      const result = await call('transloadit_create_assembly', {
        instructions: uploadTemplate,
        files: [{ kind: 'url', field: 'file', url: 'http://198.51.100.10/large.mp4' }],
      })

      expect(result.isError).toBe(true)
      await vi.waitFor(() => expect(scope.isDone()).toBe(true), { timeout: 5_000 })
      await vi.waitFor(async () => expect(await readdir(tempRoot)).toEqual([]), {
        timeout: 3_000,
      })
    } finally {
      if (previousTmpdir === undefined) delete process.env.TMPDIR
      else process.env.TMPDIR = previousTmpdir
      await rm(tempRoot, { recursive: true, force: true })
    }
  })

  it('does not challenge for new credentials when a late token check fails after creation', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    const tokenRejected = Object.assign(new ApiError({ body: { error: 'INVALID_TOKEN' } }), {
      response: { statusCode: 401 },
    })
    vi.spyOn(Transloadit.prototype, 'listTemplates').mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(reject, 15_000, tokenRejected)
        }),
    )
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) => {
      options?.onAssemblyCreated?.(uploading)
      return Object.assign(Promise.resolve(uploading), { assemblyId })
    })
    vi.spyOn(Transloadit.prototype, 'resumeAssemblyUploads')

    const pendingResult = call(
      'transloadit_create_assembly',
      {
        instructions: uploadTemplate,
        files: [{ kind: 'url', field: 'file', url: 'http://198.51.100.10/large.mp4' }],
      },
      { budgetMs: 30_000, bearer: 'forwarded-token' },
    )
    await vi.waitFor(() => expect(Transloadit.prototype.listTemplates).toHaveBeenCalled())
    // Past the download head start, so the Assembly is created while the token check still runs.
    await vi.advanceTimersByTimeAsync(10_001)
    await vi.waitFor(() => expect(Transloadit.prototype.createAssembly).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(5_000)
    const result = await pendingResult

    expect(result.structuredContent).toMatchObject({
      status: 'error',
      assembly: { assembly_id: assemblyId },
      errors: [{ code: 'mcp_assembly_status_unavailable' }],
    })
    expect(result._meta?.['mcp/www_authenticate']).toBeUndefined()
    expect(Transloadit.prototype.cancelAssembly).toHaveBeenCalledWith(assemblyId)
    expect(Transloadit.prototype.resumeAssemblyUploads).not.toHaveBeenCalled()
  })

  it('stays within the budget when the creation request itself outlasts it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    let signal: AbortSignal | undefined
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) => {
      signal = options?.signal
      return Object.assign(pending(), { assemblyId })
    })

    const pendingResult = call('transloadit_create_assembly', {
      instructions: { steps: { resized: { robot: '/image/resize', width: 1 } } },
      wait_for_completion: true,
    })
    let settled = false
    pendingResult.then(
      () => {
        settled = true
      },
      () => undefined,
    )
    await vi.waitFor(() => expect(Transloadit.prototype.createAssembly).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(maxWaitMs)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(settled).toBe(true)
    const result = await pendingResult

    expect(result.isError).toBe(true)
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      assembly: { assembly_id: assemblyId, assembly_ssl_url: assemblyUrl },
      errors: [
        { code: 'mcp_assembly_creation_pending', hint: expect.stringContaining(assemblyUrl) },
      ],
    })
    // Stopping the request (and any rate-limit retry) is what makes checking the status safe.
    expect(signal?.aborted).toBe(true)
  })

  it('reports the pending Assembly when the creation request would time out with the budget', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) =>
      // Like got: the request fails once the timeout the SDK was given has passed.
      Object.assign(
        new Promise<AssemblyStatus>((_resolve, reject) => {
          setTimeout(
            reject,
            options?.timeout,
            Object.assign(new Error('Timeout'), { name: 'TimeoutError' }),
          )
        }),
        { assemblyId },
      ),
    )

    const pendingResult = call(
      'transloadit_create_assembly',
      { instructions: { steps: { resized: { robot: '/image/resize', width: 1 } } } },
      { budgetMs: 30_000 },
    )
    await vi.waitFor(() => expect(Transloadit.prototype.createAssembly).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(40_000)
    const result = await pendingResult

    expect(result.structuredContent).toMatchObject({
      status: 'error',
      assembly: { assembly_id: assemblyId },
      errors: [{ code: 'mcp_assembly_creation_pending' }],
    })
  })

  it('returns the known Assembly from transloadit_wait_for_assembly when no status arrives', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    vi.spyOn(Transloadit.prototype, 'awaitAssemblyCompletion').mockImplementation(() => pending())
    // Like a rate-limit backoff, which does not observe the abort signal.
    vi.spyOn(Transloadit.prototype, 'getAssembly').mockImplementation(() => pending())

    const pendingResult = call('transloadit_wait_for_assembly', { assembly_url: assemblyUrl })
    await vi.waitFor(() => expect(Transloadit.prototype.awaitAssemblyCompletion).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(maxWaitMs)
    await vi.advanceTimersByTimeAsync(10_000)
    const result = await pendingResult

    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      running: true,
      assembly: { assembly_id: assemblyId, assembly_ssl_url: assemblyUrl },
      warnings: [{ code: 'mcp_assembly_still_running' }],
    })
  })

  it('names the cancelled Assembly when a URL input fails after it was created', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    vi.spyOn(Transloadit.prototype, 'listTemplates').mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(reject, 15_000, new Error('Network unreachable'))
        }),
    )
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) => {
      options?.onAssemblyCreated?.(uploading)
      return Object.assign(Promise.resolve(uploading), { assemblyId })
    })

    const pendingResult = call(
      'transloadit_create_assembly',
      {
        instructions: uploadTemplate,
        files: [{ kind: 'url', field: 'file', url: 'http://198.51.100.10/large.mp4' }],
      },
      { budgetMs: 30_000, bearer: 'forwarded-token' },
    )
    await vi.waitFor(() => expect(Transloadit.prototype.listTemplates).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(10_001)
    await vi.waitFor(() => expect(Transloadit.prototype.createAssembly).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(5_000)
    const result = await pendingResult

    expect(result.isError).toBe(true)
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      assembly: { assembly_id: assemblyId, assembly_ssl_url: assemblyUrl },
      errors: [{ code: 'mcp_invalid_args' }],
      warnings: [{ code: 'mcp_assembly_cancelled' }],
    })
  })

  it('reserves downloaded URL fields when it suggests out-of-band upload fields', async () => {
    nock('http://198.51.100.10').get('/small.jpg').reply(200, 'Small file')
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) => {
      const status = { ...uploading, tus_url: 'https://api2.transloadit.com/resumable/files/' }
      options?.onAssemblyCreated?.(status)
      return Object.assign(Promise.resolve(status), { assemblyId })
    })

    const result = await call(
      'transloadit_create_assembly',
      {
        instructions: uploadTemplate,
        files: [{ kind: 'url', field: 'file_1', url: 'http://198.51.100.10/small.jpg' }],
        expected_uploads: 2,
      },
      { budgetMs: 5_000 },
    )

    expect(result.structuredContent).toMatchObject({
      upload_instructions: [{ fieldname: 'file_2' }],
    })
  })
})
