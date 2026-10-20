import type { AssemblyStatus } from '@transloadit/node'

import { readFile } from 'node:fs/promises'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { Transloadit } from '@transloadit/node'
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

  const call = async (name: string, args: Record<string, unknown>) => {
    server = createTransloaditMcpServer({ authKey: 'key', authSecret: 'secret', maxWaitMs })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'wait-budget', version: '1.0.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    return client.callTool({ name, arguments: args })
  }

  beforeEach(() => {
    vi.spyOn(Transloadit.prototype, 'cancelAssembly').mockResolvedValue({
      ok: 'ASSEMBLY_CANCELED',
    })
  })

  afterEach(async () => {
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
      warnings: [{ code: 'mcp_assembly_still_running' }],
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
})
