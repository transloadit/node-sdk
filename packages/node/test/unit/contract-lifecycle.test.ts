import { once } from 'node:events'
import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'

import { expect, it } from 'vitest'

import { ContractClient } from '../../src/generated-contract/client.ts'
import { workflowVectors } from '../workflowFixture.ts'

const { admission } = workflowVectors
const assemblyId = admission.assemblyId
const owner = 'https://api2-owner.transloadit.com'
const body = {
  assembly_id: assemblyId,
  assembly_ssl_url: `${owner}/assemblies/${assemblyId}`,
  ok: 'ASSEMBLY_EXECUTING',
}
const authentication = { kind: 'bearer', token: 'synthetic-never-forward' } as const

it.each([
  ...admission.rejectedOrigins.map((origin) => `${origin}/assemblies/${assemblyId}`),
  ...admission.rejectedAssemblyPaths.map((path) => `${owner}${path}`),
])('rejects the shared inadmissible destination before following it: %s', async (url) => {
  let requests = 0
  const client = new ContractClient({
    authentication,
    fetch: () => {
      requests++
      return Promise.resolve(Response.json({ ...body, assembly_ssl_url: url }))
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId, interval: 1 })).rejects.toThrow(
    'Invalid Assembly workflow',
  )
  expect(requests).toBe(1)
})

it.each(admission.acceptedOrigins)('admits the shared public uploader: %s', async (origin) => {
  const requests: string[] = []
  const client = new ContractClient({
    authentication,
    fetch: (url) => {
      requests.push(String(url))
      return Promise.resolve(
        Response.json({
          ...body,
          assembly_ssl_url: `${origin}/assemblies/${assemblyId}`,
          ok: requests.length === 1 ? 'ASSEMBLY_EXECUTING' : 'ASSEMBLY_CANCELED',
        }),
      )
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).resolves.toMatchObject({
    ok: 'ASSEMBLY_CANCELED',
  })
  expect(requests[1]).toBe(new URL(`${origin}/assemblies/${assemblyId}`).href)
})

it.each([
  { assembly_id: 'b'.repeat(32), ok: 'ASSEMBLY_COMPLETED' },
  { assembly_id: undefined },
  { assembly_ssl_url: null },
  { assembly_ssl_url: undefined },
  { ok: 'UNKNOWN_FUTURE_STATE' },
  { error: 'FILE_FILTER_DECLINED_FILE' },
])('does not claim cleanup from incomplete or contradictory responses: %j', async (change) => {
  const client = new ContractClient({
    authentication,
    fetch: () => Promise.resolve(Response.json({ ...body, ...change })),
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).rejects.toThrow(
    'Invalid Assembly workflow',
  )
})

it('retains the owner and fails instead of following a changed uploader', async () => {
  let calls = 0
  const client = new ContractClient({
    authentication,
    fetch: () => {
      calls++
      return Promise.resolve(
        Response.json({
          ...body,
          ...(calls > 1
            ? { assembly_ssl_url: `https://api2-other.transloadit.com/assemblies/${assemblyId}` }
            : {}),
        }),
      )
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).rejects.toThrow(
    'Invalid Assembly workflow',
  )
  expect(calls).toBe(2)
})

it('does not retry an ambiguous failed cancellation write', async () => {
  const failure = new Error('synthetic dropped response')
  let calls = 0
  const client = new ContractClient({
    authentication,
    fetch: () => {
      calls++
      return calls === 1 ? Promise.resolve(Response.json(body)) : Promise.reject(failure)
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).rejects.toBe(failure)
  expect(calls).toBe(2)
})

it('requires a terminal status after cancellation and stops at the overall deadline', async () => {
  let deletes = 0
  const client = new ContractClient({
    authentication,
    fetch: (_url, init) => {
      if (init?.method === 'DELETE') deletes++
      return Promise.resolve(Response.json(body))
    },
  })
  await expect(
    client.cancelAndWaitForAssembly({ assemblyId, interval: 1, timeout: 200 }),
  ).rejects.toMatchObject({ code: 'ASSEMBLY_WORKFLOW_TIMED_OUT' })
  expect(deletes).toBe(1)
})

it.each([
  'deadline',
  'caller',
] as const)('rejects a late terminal response after %s cancellation', async (kind) => {
  let respond: ((response: Response) => void) | undefined
  const controller = new AbortController()
  const reason = new Error('synthetic caller cancellation')
  const client = new ContractClient({
    authentication,
    fetch: () =>
      new Promise<Response>((resolve) => {
        respond = resolve
      }),
  })
  const request = client.waitForAssembly({
    assemblyId,
    timeout: kind === 'deadline' ? 10 : 5000,
    signal: controller.signal,
  })
  if (kind === 'caller') controller.abort(reason)
  else await delay(25)
  expect(respond).toBeTypeOf('function')
  respond?.(Response.json({ ...body, ok: 'ASSEMBLY_COMPLETED' }))
  if (kind === 'caller') await expect(request).rejects.toBe(reason)
  else await expect(request).rejects.toMatchObject({ code: 'ASSEMBLY_WORKFLOW_TIMED_OUT' })
})

it('routes between two actual uploaders without sending credentials to either', async () => {
  const requests: string[] = []
  const errors: unknown[] = []
  const uploader = createServer((request, response) => {
    try {
      requests.push(`${request.method} owner`)
      expect(request.headers.authorization).toBeUndefined()
      expect(request.headers.cookie).toBeUndefined()
      expect(request.url).toBe(`/assemblies/${assemblyId}`)
      response.setHeader('content-type', 'application/json')
      response.end(
        JSON.stringify({
          ...body,
          assembly_ssl_url: `${uploaderOrigin}/assemblies/${assemblyId}`,
          ok: request.method === 'DELETE' ? 'ASSEMBLY_EXECUTING' : 'ASSEMBLY_CANCELED',
        }),
      )
    } catch (error) {
      errors.push(error)
      response.writeHead(500).end()
    }
  }).listen(0, '127.0.0.1')
  await once(uploader, 'listening')
  const address = uploader.address()
  if (address === null || typeof address === 'string') throw new Error('Missing uploader address')
  const uploaderOrigin = `http://127.0.0.1:${address.port}`
  const entry = createServer((request, response) => {
    requests.push(`${request.method} entry`)
    response.setHeader('content-type', 'application/json')
    response.end(
      JSON.stringify({ ...body, assembly_ssl_url: `${uploaderOrigin}/assemblies/${assemblyId}` }),
    )
  }).listen(0, '127.0.0.1')
  await once(entry, 'listening')
  try {
    const endpoint = entry.address()
    if (endpoint === null || typeof endpoint === 'string') throw new Error('Missing entry address')
    const client = new ContractClient({
      origin: `http://127.0.0.1:${endpoint.port}`,
      assemblyOrigins: [uploaderOrigin],
      authentication,
    })
    await expect(
      client.cancelAndWaitForAssembly({ assemblyId, interval: 1 }),
    ).resolves.toMatchObject({ ok: 'ASSEMBLY_CANCELED' })
    expect(requests).toEqual(['GET entry', 'DELETE owner', 'GET owner'])
    expect(errors).toEqual([])
  } finally {
    await Promise.all([
      new Promise<void>((resolve) => entry.close(() => resolve())),
      new Promise<void>((resolve) => uploader.close(() => resolve())),
    ])
  }
})
