import type { MessageExtraInfo } from '@modelcontextprotocol/sdk/types.js'
import type { AssemblyStatus } from '@transloadit/node'

import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { ApiError, Transloadit } from '@transloadit/node'
import nock from 'nock'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
      serverTransport.onmessage = (message, extra) => {
        const withHeaders: MessageExtraInfo = {
          ...extra,
          requestInfo: { headers: { authorization: `Bearer ${bearer}` } },
        }
        receive?.(message, withHeaders)
      }
    }
    return client.callTool({ name, arguments: args })
  }

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

  it('logs work that fails after an early return to stderr, never to stdout', async () => {
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) => {
      options?.onAssemblyCreated?.(uploading)
      const failed = new Promise<AssemblyStatus>((_resolve, reject) => {
        setTimeout(reject, maxWaitMs * 2, new Error('Upload failed'))
      })
      return Object.assign(failed, { assemblyId })
    })
    const stdoutWrite = vi.spyOn(process.stdout, 'write')
    const stderrWrite = vi.spyOn(process.stderr, 'write')

    const result = await call('transloadit_create_assembly', {
      instructions: uploadTemplate,
      files: [{ kind: 'base64', field: 'file', base64: 'aGVsbG8=', filename: 'hello.txt' }],
    })

    expect(result.structuredContent).toMatchObject({ status: 'ok', running: true })
    // The stdio transport owns stdout, so diagnostics must not be written there.
    await vi.waitFor(() =>
      expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining('early return failed')),
    )
    expect(stdoutWrite).not.toHaveBeenCalledWith(expect.stringContaining('early return failed'))
  })

  it('creates nothing when a URL download outlasts the budget, and removes the file later', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'wait-budget-'))
    const previousTmpdir = process.env.TMPDIR
    // os.tmpdir() reads TMPDIR on every call, so the download lands in a directory this test owns.
    process.env.TMPDIR = tempRoot
    try {
      const scope = nock('http://198.51.100.10')
        .get('/large.mp4')
        // Far longer than the budget, so only a stopped download leaves the directory empty soon.
        .delay(maxWaitMs * 100)
        .reply(200, 'Downloaded bytes')
      vi.spyOn(Transloadit.prototype, 'createAssembly')

      const result = await call('transloadit_create_assembly', {
        instructions: uploadTemplate,
        files: [{ kind: 'url', field: 'file', url: 'http://198.51.100.10/large.mp4' }],
      })

      expect(result.structuredContent).toMatchObject({
        status: 'error',
        errors: [
          { code: 'mcp_preparation_timeout', hint: expect.stringContaining('/http/import') },
        ],
      })
      expect(Transloadit.prototype.createAssembly).not.toHaveBeenCalled()
      // A retry starts another download, so the abandoned one is stopped and its file removed.
      await vi.waitFor(async () => expect(await readdir(tempRoot)).toEqual([]), {
        timeout: 3_000,
      })
      expect(scope.isDone()).toBe(true)
    } finally {
      if (previousTmpdir === undefined) delete process.env.TMPDIR
      else process.env.TMPDIR = previousTmpdir
      await rm(tempRoot, { recursive: true, force: true })
    }
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

  it('suggests resuming, not recreating, an Assembly that waits for uploads after a stopped creation', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation(() =>
      Object.assign(pending(), { assemblyId }),
    )

    const pendingResult = call('transloadit_create_assembly', {
      instructions: uploadTemplate,
      files: [{ kind: 'base64', field: 'file', base64: 'aGVsbG8=', filename: 'hello.txt' }],
    })
    await vi.waitFor(() => expect(Transloadit.prototype.createAssembly).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(maxWaitMs + 10_000)
    const result = await pendingResult

    // Imports in such an Assembly may already have been processed or exported.
    expect(result.structuredContent).toMatchObject({
      errors: [
        {
          code: 'mcp_assembly_creation_pending',
          hint: expect.stringContaining(`resume it with assembly_url ${assemblyUrl}`),
        },
      ],
    })
    // A request API2 received before the abort may still create the Assembly after one check.
    expect(JSON.stringify(result.structuredContent)).toContain('several checks')
  })

  it('asks for a new Assembly when a stopped creation expected uploads from the sandbox', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation(() =>
      Object.assign(pending(), { assemblyId }),
    )

    const pendingResult = call('transloadit_create_assembly', {
      instructions: uploadTemplate,
      expected_uploads: 1,
    })
    await vi.waitFor(() => expect(Transloadit.prototype.createAssembly).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(maxWaitMs + 10_000)
    const result = await pendingResult

    // Resuming cannot hand out upload_instructions, so the sandbox could never upload its files.
    const [error] = (result.structuredContent as { errors: Array<{ hint: string }> }).errors
    expect(error?.hint).not.toContain('resume it')
    expect(error?.hint).toContain('create a new Assembly')
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

  it('does not challenge for new credentials while a resumed upload continues', async () => {
    vi.spyOn(Transloadit.prototype, 'resumeAssemblyUploads').mockImplementation(() => pending())
    const tokenRejected = Object.assign(new ApiError({ body: { error: 'INVALID_TOKEN' } }), {
      response: { statusCode: 401 },
    })
    vi.spyOn(Transloadit.prototype, 'getAssembly').mockRejectedValue(tokenRejected)

    const result = await call(
      'transloadit_create_assembly',
      {
        assembly_url: assemblyUrl,
        files: [{ kind: 'base64', field: 'file', base64: 'aGVsbG8=', filename: 'hello.txt' }],
      },
      { bearer: 'forwarded-token' },
    )

    // A challenge would make the client refresh and replay the call next to the running upload.
    expect(result._meta?.['mcp/www_authenticate']).toBeUndefined()
    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      running: true,
      assembly: { assembly_id: assemblyId },
      warnings: [{ code: 'mcp_assembly_still_running' }],
    })
  })

  it('says how to get the upload URLs when reserving uploads outlasts the budget', async () => {
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation((options) => {
      options?.onAssemblyCreated?.(uploading)
      return Object.assign(pending(), { assemblyId })
    })

    const result = await call('transloadit_create_assembly', {
      instructions: uploadTemplate,
      files: [{ kind: 'base64', field: 'file', base64: 'aGVsbG8=', filename: 'hello.txt' }],
      upload_behavior: 'none',
    })

    expect(result.structuredContent).toMatchObject({
      running: true,
      warnings: expect.arrayContaining([
        expect.objectContaining({
          code: 'mcp_upload_urls_pending',
          // This call's reservations still run; resuming at once could reserve the files twice.
          hint: expect.stringMatching(`^Wait about 30 seconds.* assembly_url ${assemblyUrl},`),
        }),
      ]),
    })
  })

  it('says how to get reserved upload URLs when a resumed reservation has no status in time', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    vi.spyOn(Transloadit.prototype, 'resumeAssemblyUploads').mockImplementation(() => pending())
    vi.spyOn(Transloadit.prototype, 'getAssembly').mockImplementation(() => pending())

    const pendingResult = call('transloadit_create_assembly', {
      assembly_url: assemblyUrl,
      files: [{ kind: 'base64', field: 'file', base64: 'aGVsbG8=', filename: 'hello.txt' }],
      upload_behavior: 'none',
    })
    await vi.waitFor(() => expect(Transloadit.prototype.resumeAssemblyUploads).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(maxWaitMs + 10_000)
    const result = await pendingResult

    // Nothing uploads in this mode, so waiting alone would never finish the Assembly.
    expect(result.structuredContent).toMatchObject({
      running: true,
      upload: { status: 'none' },
      warnings: expect.arrayContaining([
        expect.objectContaining({ code: 'mcp_upload_urls_pending' }),
      ]),
    })
  })

  it('creates nothing when looking up the Template uses up the budget', async () => {
    vi.spyOn(Transloadit.prototype, 'getTemplate').mockImplementation(
      () => new Promise(() => undefined),
    )
    vi.spyOn(Transloadit.prototype, 'createAssembly')

    const result = await call('transloadit_create_assembly', {
      instructions: { template_id: 'slow-template' },
    })

    expect(result.structuredContent).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_preparation_timeout' }],
    })
    expect(Transloadit.prototype.createAssembly).not.toHaveBeenCalled()
  })

  it('checks a forwarded token before any URL input is downloaded, whatever the Steps are named', async () => {
    nock('http://198.51.100.10').get('/file.jpg').reply(200, 'Downloaded bytes')
    vi.spyOn(Transloadit.prototype, 'listTemplates').mockResolvedValue({ items: [], count: 0 })
    vi.spyOn(Transloadit.prototype, 'createAssembly').mockImplementation(() =>
      Object.assign(Promise.resolve<AssemblyStatus>({ ...executing, ok: 'ASSEMBLY_COMPLETED' }), {
        assemblyId,
      }),
    )

    await call(
      'transloadit_create_assembly',
      {
        // The SDK does not import into a Step with an empty name, so it downloads the URL.
        instructions: { steps: { '': { robot: '/http/import' } } },
        files: [{ kind: 'url', field: 'file', url: 'http://198.51.100.10/file.jpg' }],
      },
      { bearer: 'forwarded-token' },
    )

    expect(Transloadit.prototype.listTemplates).toHaveBeenCalled()
  })
})
