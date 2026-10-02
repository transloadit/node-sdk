import type { IncomingMessage, ServerResponse } from 'node:http'

import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'

import { z } from 'zod'

const status = z.union([
  z.object({ ok: z.string() }).strict(),
  z.object({ error: z.string() }).strict(),
])
const upload = z
  .object({
    id: z.string(),
    filename: z.string(),
    hex: z.string(),
    chunkSize: z.number().int().positive(),
    loseResponseAfterBytes: z.number().int().positive().optional(),
  })
  .strict()
const workflowCaseSchema = z.discriminatedUnion('kind', [
  upload.extend({ kind: z.literal('upload') }),
  upload.extend({ kind: z.literal('resume'), interruptAfterBytes: z.number().int().positive() }),
  z
    .object({
      id: z.string(),
      kind: z.literal('wait'),
      responses: z.array(status).nonempty(),
      expected: status,
    })
    .strict(),
  z.object({ id: z.string(), kind: z.literal('abort') }).strict(),
  z
    .object({
      id: z.string(),
      kind: z.literal('deadline'),
      responseDelayMs: z.number().positive().optional(),
    })
    .strict(),
  z.object({ id: z.string(), kind: z.literal('cancel'), expected: status }).strict(),
])

/** Reject new unimplemented scenario kinds instead of silently skipping them. */
export const workflowVectors = z
  .object({
    format: z.literal('transloadit-sdk-workflow-vectors'),
    version: z.literal(1),
    credentials: z.object({ key: z.string(), secret: z.string() }),
    assemblyId: z.string(),
    admission: z.object({
      assemblyId: z.string(),
      acceptedOrigins: z.array(z.string()),
      rejectedOrigins: z.array(z.string()),
      rejectedAssemblyPaths: z.array(z.string()),
    }),
    cases: z.array(workflowCaseSchema).nonempty(),
    smartCdn: z
      .array(
        z
          .object({
            id: z.string(),
            workspace: z.string(),
            template: z.string(),
            input: z.string(),
            expiresAt: z.number(),
            params: z.record(z.string(), z.array(z.string())),
            expectedUrl: z.string(),
          })
          .strict(),
      )
      .nonempty(),
  })
  .strict()
  .parse(
    JSON.parse(
      await readFile(
        new URL('../src/generated-contract/workflow-vectors.json', import.meta.url),
        'utf8',
      ),
    ),
  )

export type WorkflowCase = z.infer<typeof workflowCaseSchema>

interface WorkflowServer {
  origin: string
  requests: string[]
  patchOffsets: number[]
  interruptNextChunk(callback: () => void): void
  received(): Buffer
  verify(): void
  close(): Promise<void>
}

/** Transport fixture only: no SDK polling, retries, upload or signing implementation. */
export async function workflowServer(scenario: WorkflowCase): Promise<WorkflowServer> {
  let offset = 0
  let polls = 0
  let canceled = false
  let origin = ''
  const received: Buffer[] = []
  const errors: unknown[] = []
  const requests: string[] = []
  const patchOffsets: number[] = []
  const pending = new Set<Promise<void>>()
  let onChunk: (() => void) | undefined
  let metadata = ''
  let responseLost = false
  const bytes = 'hex' in scenario ? Buffer.from(scenario.hex, 'hex') : Buffer.alloc(0)
  const assemblyPath = `/assemblies/${workflowVectors.assemblyId}`
  const statusBody = (state: Record<string, unknown>): Record<string, unknown> => ({
    assembly_id: workflowVectors.assemblyId,
    assembly_url: `${origin}${assemblyPath}`,
    assembly_ssl_url: `${origin}${assemblyPath}`,
    tus_url: `${origin}/resumable/files/`,
    tus_uploads:
      offset || requests.includes('POST /resumable/files')
        ? [
            {
              filename: 'filename' in scenario ? scenario.filename : '',
              fieldname: 'file',
              user_meta: {},
              size: bytes.length,
              offset,
              finished: offset === bytes.length,
              upload_url: `${origin}/resumable/files/one`,
            },
          ]
        : [],
    ...state,
  })
  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const route = new URL(request.url ?? '', origin).pathname
    const key = `${request.method} ${route}`
    requests.push(key)
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(Buffer.from(chunk))
    const body = Buffer.concat(chunks)
    if (route === assemblyPath) {
      response.setHeader('content-type', 'application/json')
      if (request.method === 'POST') {
        response.end(JSON.stringify(statusBody({ ok: 'ASSEMBLY_UPLOADING' })))
        return
      }
      if (request.method === 'DELETE') {
        canceled = true
        response.end(JSON.stringify(statusBody({ ok: 'ASSEMBLY_CANCELED' })))
        return
      }
      assert.equal(request.method, 'GET')
      if (scenario.kind === 'deadline' && scenario.responseDelayMs !== undefined) {
        await delay(scenario.responseDelayMs)
        response.end(JSON.stringify(statusBody({ ok: 'ASSEMBLY_COMPLETED' })))
        return
      }
      const state =
        scenario.kind === 'wait'
          ? scenario.responses[polls++]
          : {
              ok: canceled
                ? 'ASSEMBLY_CANCELED'
                : bytes.length && offset === bytes.length
                  ? 'ASSEMBLY_COMPLETED'
                  : 'ASSEMBLY_UPLOADING',
            }
      assert(state, 'SDK polled past the terminal response')
      response.end(JSON.stringify(statusBody(state)))
      return
    }
    assert(scenario.kind === 'upload' || scenario.kind === 'resume', 'Unexpected upload request')
    response.setHeader('Tus-Resumable', '1.0.0')
    assert.equal(request.headers.authorization, undefined)
    assert.equal(request.headers.cookie, undefined)
    if (key === 'POST /resumable/files') {
      assert.equal(
        requests.filter((entry) => entry === key).length,
        1,
        'Resume must not create a second upload',
      )
      assert.equal(request.headers['upload-length'], String(bytes.length))
      metadata = String(request.headers['upload-metadata'])
      const values = new Map(
        String(request.headers['upload-metadata'])
          .split(',')
          .map((entry) => {
            const [name, value] = entry.trim().split(' ')
            return [name, Buffer.from(value ?? '', 'base64').toString()]
          }),
      )
      assert.equal(values.get('assembly_url'), `${origin}${assemblyPath}`)
      assert.equal(values.get('filename'), scenario.filename)
      assert.equal(values.get('fieldname'), 'file')
      response.writeHead(201, { Location: `${origin}/resumable/files/one` }).end()
      return
    }
    assert.equal(route, '/resumable/files/one')
    if (request.method === 'HEAD') {
      response
        .writeHead(200, {
          'Upload-Offset': String(offset),
          'Upload-Length': String(bytes.length),
          'Upload-Metadata': metadata,
        })
        .end()
      return
    }
    assert.equal(request.method, 'PATCH')
    assert.equal(request.headers['content-type'], 'application/offset+octet-stream')
    assert.equal(request.headers['upload-offset'], String(offset))
    assert(body.length > 0 && body.length <= scenario.chunkSize)
    patchOffsets.push(offset)
    assert.deepEqual(body, bytes.subarray(offset, offset + body.length))
    received.push(body)
    offset += body.length
    if (!responseLost && scenario.loseResponseAfterBytes === offset) {
      responseLost = true
      response.destroy()
      return
    }
    if (onChunk) {
      const interrupt = onChunk
      onChunk = undefined
      interrupt()
      return
    }
    response.writeHead(204, { 'Upload-Offset': String(offset) }).end()
  }
  const server = createServer((request, response) => {
    const task = handle(request, response)
      .catch((error: unknown) => {
        errors.push(error)
        response.writeHead(500).end()
      })
      .finally(() => pending.delete(task))
    pending.add(task)
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert(address && typeof address === 'object')
  origin = `http://127.0.0.1:${address.port}`
  return {
    origin,
    requests,
    patchOffsets,
    interruptNextChunk: (callback: () => void) => {
      onChunk = callback
    },
    received: () => Buffer.concat(received),
    verify: () => {
      assert.deepEqual(errors, [])
    },
    close: async () => {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
      await Promise.all(pending)
      assert.deepEqual(errors, [])
    },
  }
}
