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

it('retains an unconfirmed cancellation outcome when no owner URL is available', async () => {
  let requests = 0
  const client = new ContractClient({
    authentication,
    fetch: () => {
      requests++
      return Promise.resolve(Response.json({ assembly_id: assemblyId, ok: 'REQUEST_ABORTED' }))
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).rejects.toMatchObject({
    code: 'ASSEMBLY_WORKFLOW_UNCONFIRMED',
  })
  expect(requests).toBe(1)
})

it.each(
  ['https://proxy.example.com', 'https://api2-owner.transloadit.com'].flatMap((endpoint) =>
    [false, true].map((explicit) => ({ endpoint, explicit })),
  ),
)('requires explicit admission to drop the configured proxy prefix: $endpoint, $explicit', async ({
  endpoint,
  explicit,
}) => {
  const urls: string[] = []
  const client = new ContractClient({
    origin: `${endpoint}/prefix`,
    authentication,
    assemblyOrigins: explicit ? [endpoint] : [],
    fetch: (url) => {
      urls.push(String(url))
      return Promise.resolve(
        Response.json({
          ...body,
          assembly_ssl_url: `${endpoint}/assemblies/${assemblyId}`,
          ok: urls.length === 1 ? 'ASSEMBLY_EXECUTING' : 'ASSEMBLY_COMPLETED',
        }),
      )
    },
  })
  const pending = client.cancelAndWaitForAssembly({ assemblyId, interval: 1 })
  if (explicit) await expect(pending).resolves.toMatchObject({ ok: 'ASSEMBLY_COMPLETED' })
  else await expect(pending).rejects.toThrow('Invalid Assembly workflow response')
  expect(urls).toEqual(
    explicit
      ? [`${endpoint}/prefix/assemblies/${assemblyId}`, `${endpoint}/assemblies/${assemblyId}`]
      : [`${endpoint}/prefix/assemblies/${assemblyId}`],
  )
})

it.each([
  'waitForAssembly',
  'cancelAndWaitForAssembly',
] as const)('%s does not hide a local request-construction error behind workflow timeout', async (method) => {
  let requests = 0
  const client = new ContractClient({
    authentication,
    clientName: 'bad\nname',
    fetch: () => {
      requests++
      return Promise.resolve(Response.json(body))
    },
  })
  await expect(client[method]({ assemblyId, interval: 1, timeout: 100 })).rejects.toBeInstanceOf(
    TypeError,
  )
  expect(requests).toBe(0)
})

it.each([
  'waitForAssembly',
  'cancelAndWaitForAssembly',
] as const)('%s returns REQUEST_ABORTED without treating it as processing success', async (method) => {
  const requests: string[] = []
  const client = new ContractClient({
    authentication,
    fetch: (_url, init) => {
      requests.push(init?.method ?? 'GET')
      return Promise.resolve(Response.json({ ...body, ok: 'REQUEST_ABORTED' }))
    },
  })
  await expect(client[method]({ assemblyId, interval: 1 })).resolves.toMatchObject({
    assembly_id: assemblyId,
    ok: 'REQUEST_ABORTED',
  })
  expect(requests).toEqual(method === 'waitForAssembly' ? ['GET'] : ['GET', 'DELETE'])
})

it('ordinary waiting returns REQUEST_ABORTED even without an owner URL', async () => {
  let requests = 0
  const result = { assembly_id: assemblyId, ok: 'REQUEST_ABORTED' }
  const client = new ContractClient({
    authentication,
    fetch: () => {
      requests++
      return Promise.resolve(Response.json(result))
    },
  })
  await expect(client.waitForAssembly({ assemblyId })).resolves.toEqual(result)
  expect(requests).toBe(1)
})

it('explicitly cancels after REQUEST_ABORTED and returns the owner outcome', async () => {
  const requests: string[] = []
  const client = new ContractClient({
    authentication,
    fetch: (_url, init) => {
      requests.push(init?.method ?? 'GET')
      return Promise.resolve(
        Response.json({
          ...body,
          ok: init?.method === 'DELETE' ? 'ASSEMBLY_CANCELED' : 'REQUEST_ABORTED',
        }),
      )
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).resolves.toMatchObject({
    ok: 'ASSEMBLY_CANCELED',
  })
  expect(requests).toEqual(['GET', 'DELETE'])
})

it('does not swallow a failed cancellation when a later GET still reports REQUEST_ABORTED', async () => {
  const requests: string[] = []
  const client = new ContractClient({
    authentication,
    fetch: (_url, init) => {
      requests.push(init?.method ?? 'GET')
      return Promise.resolve(
        init?.method === 'DELETE'
          ? Response.json({ error: 'ASSEMBLY_CANCEL_UNAVAILABLE' }, { status: 503 })
          : Response.json({ ...body, ok: 'REQUEST_ABORTED' }),
      )
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).rejects.toMatchObject({
    status: 503,
  })
  expect(requests).toEqual(['GET', 'DELETE', 'GET'])
})

it.each([
  'waitForAssembly',
  'cancelAndWaitForAssembly',
] as const)('%s retries temporary read failures without retrying cancellation', async (method) => {
  let reads = 0
  let deletes = 0
  const client = new ContractClient({
    authentication,
    fetch: (_url, init) => {
      if (init?.method === 'DELETE') deletes++
      else if (++reads === 1 || reads === 3) return Promise.reject(new TypeError('fetch failed'))
      return Promise.resolve(
        Response.json({
          ...body,
          ok: reads === 4 ? 'ASSEMBLY_COMPLETED' : 'ASSEMBLY_EXECUTING',
        }),
      )
    },
  })
  await expect(client[method]({ assemblyId, interval: 1 })).resolves.toMatchObject({
    ok: 'ASSEMBLY_COMPLETED',
  })
  expect(reads).toBe(4)
  expect(deletes).toBe(method === 'waitForAssembly' ? 0 : 1)
})

it.each([
  'https://user:secret@[::1]',
  'https://[::1]?query=1',
  'https://[::1]#fragment',
  'https://[::1]/proxy',
  'http://[2001:db8::1]',
])('rejects invalid configured uploader origins before making requests: %s', (origin) => {
  expect(() => new ContractClient({ authentication, assemblyOrigins: [origin] })).toThrow()
})

it.each([
  'waitForAssembly',
  'cancelAndWaitForAssembly',
] as const)('%s returns a terminal processing error with nullable ok', async (method) => {
  const terminal = { assembly_id: assemblyId, error: 'FILE_FILTER_DECLINED_FILE', ok: null }
  const client = new ContractClient({
    authentication,
    fetch: () => Promise.resolve(Response.json(terminal)),
  })
  await expect(client[method]({ assemblyId })).resolves.toEqual(terminal)
})

it.each([
  'http://[::1]:8081',
  'https://[2001:db8::1]',
])('follows an explicitly configured IPv6 uploader without credentials: %s', async (origin) => {
  const requests: string[] = []
  const ownerUrl = `${origin}/assemblies/${assemblyId}`
  const client = new ContractClient({
    origin: 'https://entry.example.com',
    assemblyOrigins: [origin],
    authentication,
    fetch: (url, init) => {
      requests.push(`${init?.method} ${url}`)
      expect(new Headers(init?.headers).has('authorization')).toBe(false)
      return Promise.resolve(
        Response.json({
          ...body,
          assembly_ssl_url: ownerUrl,
          ok: requests.length === 3 ? 'ASSEMBLY_CANCELED' : 'ASSEMBLY_EXECUTING',
        }),
      )
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId, interval: 1 })).resolves.toMatchObject(
    { ok: 'ASSEMBLY_CANCELED' },
  )
  expect(requests).toEqual([
    `GET https://entry.example.com/assemblies/${assemblyId}`,
    `DELETE ${ownerUrl}`,
    `GET ${ownerUrl}`,
  ])
})

it.each([
  'http://[::1]:8081',
  'https://[2001:db8::1]',
])('does not trust an unconfigured IPv6 uploader: %s', async (origin) => {
  let requests = 0
  const client = new ContractClient({
    authentication,
    fetch: () => {
      requests++
      return Promise.resolve(
        Response.json({ ...body, assembly_ssl_url: `${origin}/assemblies/${assemblyId}` }),
      )
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).rejects.toThrow(
    'Invalid Assembly workflow',
  )
  expect(requests).toBe(1)
})

it.each([
  'https://example.com/proxy',
  'https://example.com/a%20b',
  'http://[::1]:8080',
])('retains an exactly configured proxy or loopback endpoint: %s', async (origin) => {
  const requests: string[] = []
  const ownerUrl = `${origin}/assemblies/${assemblyId}`
  const client = new ContractClient({
    origin,
    authentication,
    fetch: (url, init) => {
      requests.push(`${init?.method} ${url}`)
      return Promise.resolve(
        Response.json({
          ...body,
          assembly_ssl_url: ownerUrl,
          ok: requests.length === 3 ? 'ASSEMBLY_CANCELED' : 'ASSEMBLY_EXECUTING',
        }),
      )
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId, interval: 1 })).resolves.toMatchObject(
    { ok: 'ASSEMBLY_CANCELED' },
  )
  expect(requests).toEqual([`GET ${ownerUrl}`, `DELETE ${ownerUrl}`, `GET ${ownerUrl}`])
})

it.each([
  'https://example.com/other',
  'https://api2-owner.transloadit.com/proxy',
  'https://example.com/proxy/../proxy',
  'https://example.com/%70roxy',
])('does not infer a proxy prefix from an untrusted response: %s', async (prefix) => {
  let requests = 0
  const client = new ContractClient({
    origin: 'https://example.com/proxy',
    authentication,
    fetch: () => {
      requests++
      return Promise.resolve(
        Response.json({ ...body, assembly_ssl_url: `${prefix}/assemblies/${assemblyId}` }),
      )
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).rejects.toThrow(
    'Invalid Assembly workflow',
  )
  expect(requests).toBe(1)
})

it('confirms a terminal cancellation race with GET without repeating DELETE', async () => {
  const requests: string[] = []
  const client = new ContractClient({
    authentication,
    fetch: (_url, init) => {
      requests.push(init?.method ?? '')
      if (init?.method === 'DELETE')
        return Promise.resolve(
          Response.json({ assembly_id: assemblyId, error: 'ASSEMBLY_EXPIRED' }, { status: 410 }),
        )
      return Promise.resolve(
        Response.json(
          requests.length === 1 ? body : { assembly_id: assemblyId, error: 'ASSEMBLY_EXPIRED' },
        ),
      )
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).resolves.toMatchObject({
    error: 'ASSEMBLY_EXPIRED',
  })
  expect(requests).toEqual(['GET', 'DELETE', 'GET'])
})

it.each([
  'discovery',
  'poll',
] as const)('respects Retry-After on %s reads within the workflow deadline', async (phase) => {
  const requests: number[] = []
  const client = new ContractClient({
    authentication,
    fetch: () => {
      requests.push(performance.now())
      const rateLimited = requests.length === (phase === 'discovery' ? 1 : 2)
      return Promise.resolve(
        rateLimited
          ? Response.json(
              { error: 'ASSEMBLY_STATUS_FETCHING_RATE_LIMIT_REACHED' },
              { status: 429, headers: { 'Retry-After': '1' } },
            )
          : Response.json({
              ...body,
              ok:
                phase === 'poll' && requests.length === 1
                  ? 'ASSEMBLY_EXECUTING'
                  : 'ASSEMBLY_COMPLETED',
            }),
      )
    },
  })
  await expect(
    client.waitForAssembly({ assemblyId, interval: 10, timeout: 5_000 }),
  ).resolves.toMatchObject({ ok: 'ASSEMBLY_COMPLETED' })
  expect(requests).toHaveLength(phase === 'discovery' ? 2 : 3)
  const last = requests.at(-1)
  const limited = requests.at(-2)
  if (last === undefined || limited === undefined) throw new Error('Missing retry observations')
  expect(last - limited).toBeGreaterThanOrEqual(990)
})

it('retries a transient server read but not a non-retriable request failure', async () => {
  let calls = 0
  const client = new ContractClient({
    authentication,
    fetch: () => {
      calls++
      return Promise.resolve(
        Response.json({ error: 'SERVER_ERROR' }, { status: calls === 1 ? 503 : 403 }),
      )
    },
  })
  await expect(client.waitForAssembly({ assemblyId, interval: 1 })).rejects.toMatchObject({
    status: 403,
  })
  expect(calls).toBe(2)
})

it('bounds Retry-After by the workflow deadline without sending another request', async () => {
  let calls = 0
  const client = new ContractClient({
    authentication,
    fetch: () => {
      calls++
      return Promise.resolve(
        Response.json(
          { error: 'RATE_LIMIT_REACHED' },
          { status: 429, headers: { 'Retry-After': '999999999999999999999' } },
        ),
      )
    },
  })
  await expect(
    client.waitForAssembly({ assemblyId, interval: 1, timeout: 200 }),
  ).rejects.toMatchObject({ code: 'ASSEMBLY_WORKFLOW_TIMED_OUT' })
  expect(calls).toBe(1)
})

it('preserves caller cancellation during Retry-After', async () => {
  const controller = new AbortController()
  const reason = new Error('caller stopped')
  let calls = 0
  const client = new ContractClient({
    authentication,
    fetch: () => {
      calls++
      setTimeout(() => controller.abort(reason), 10)
      return Promise.resolve(
        Response.json(
          { error: 'RATE_LIMIT_REACHED' },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      )
    },
  })
  await expect(client.waitForAssembly({ assemblyId, signal: controller.signal })).rejects.toBe(
    reason,
  )
  expect(calls).toBe(1)
})

it('does not disguise a failed cancellation as cleanup when confirmation is still active', async () => {
  const requests: string[] = []
  const client = new ContractClient({
    authentication,
    fetch: (_url, init) => {
      requests.push(init?.method ?? '')
      return Promise.resolve(
        init?.method === 'DELETE'
          ? Response.json({ error: 'SERVER_ERROR' }, { status: 503 })
          : Response.json(body),
      )
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).rejects.toMatchObject({
    status: 503,
  })
  expect(requests).toEqual(['GET', 'DELETE', 'GET'])
})

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
  { ok: null, error: 'UNKNOWN_FUTURE_ERROR' },
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

it.each(
  ['transport', 'request-timeout'].flatMap((failureKind) =>
    ['ASSEMBLY_CANCELED', 'REQUEST_ABORTED', 'ASSEMBLY_EXECUTING'].map((confirmed) => ({
      failureKind,
      confirmed,
    })),
  ),
)('confirms one uncertain DELETE: $failureKind, $confirmed', async ({ failureKind, confirmed }) => {
  const failure =
    failureKind === 'transport'
      ? new TypeError('synthetic lost DELETE response')
      : new DOMException('synthetic request deadline', 'TimeoutError')
  const requests: string[] = []
  const client = new ContractClient({
    authentication,
    fetch: (_url, init) => {
      requests.push(init?.method ?? 'GET')
      if (init?.method === 'DELETE') return Promise.reject(failure)
      return Promise.resolve(
        Response.json({ ...body, ok: requests.length === 1 ? body.ok : confirmed }),
      )
    },
  })
  const pending = client.cancelAndWaitForAssembly({ assemblyId })
  if (confirmed === 'ASSEMBLY_CANCELED')
    await expect(pending).resolves.toMatchObject({ ok: confirmed })
  else if (failureKind === 'transport')
    await expect(pending).rejects.toMatchObject({ cause: failure })
  else await expect(pending).rejects.toBe(failure)
  expect(requests).toEqual(['GET', 'DELETE', 'GET'])
})

it.each([
  403, 429, 503,
])('keeps HTTP %s and server backoff when the error body fails', async (status) => {
  let calls = 0
  const failure = new TypeError('synthetic error body disconnect')
  const client = new ContractClient({
    authentication,
    fetch: () => {
      calls++
      return Promise.resolve(
        calls === 1
          ? new Response(
              new ReadableStream({
                start(controller) {
                  controller.error(failure)
                },
              }),
              { status, headers: { 'retry-after': '30' } },
            )
          : Response.json({ ...body, ok: 'ASSEMBLY_COMPLETED' }),
      )
    },
  })
  const pending = client.waitForAssembly({ assemblyId, interval: 1, timeout: 100 })
  if (status === 403)
    await expect(pending).rejects.toMatchObject({
      status,
      retryAfter: 30_000,
      data: undefined,
      cause: { cause: failure },
    })
  else await expect(pending).rejects.toMatchObject({ code: 'ASSEMBLY_WORKFLOW_TIMED_OUT' })
  expect(calls).toBe(1)
})

it.each([
  403, 429, 503,
])('keeps HTTP %s and server backoff when an error-body request times out', async (status) => {
  let calls = 0
  const client = new ContractClient({
    authentication,
    timeout: 10,
    fetch: (_url, init) => {
      calls++
      const signal = init?.signal
      if (signal === null || signal === undefined) throw new Error('Missing request signal')
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(stream) {
              signal.addEventListener('abort', () => stream.error(signal.reason), { once: true })
            },
          }),
          { status, headers: { 'retry-after': '30' } },
        ),
      )
    },
  })
  const pending = client.waitForAssembly({ assemblyId, interval: 1, timeout: 100 })
  if (status === 403) await expect(pending).rejects.toMatchObject({ status })
  else await expect(pending).rejects.toMatchObject({ code: 'ASSEMBLY_WORKFLOW_TIMED_OUT' })
  expect(calls).toBe(1)
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
  'transport',
  'http',
])('retains both $0 cancellation and confirmation failures', async (kind) => {
  const failure = new TypeError('synthetic lost DELETE reply')
  const requests: string[] = []
  const client = new ContractClient({
    authentication,
    fetch: (_url, init) => {
      requests.push(init?.method ?? 'GET')
      if (init?.method === 'DELETE')
        return kind === 'transport'
          ? Promise.reject(failure)
          : Promise.resolve(
              Response.json({ error: 'ASSEMBLY_CANCEL_UNAVAILABLE' }, { status: 503 }),
            )
      return Promise.resolve(
        requests.length === 1
          ? Response.json(body)
          : Response.json({ error: 'AUTH_KEY_INVALID' }, { status: 403 }),
      )
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).rejects.toMatchObject({
    name: 'AggregateError',
    message: 'Assembly cancellation could not be confirmed',
    cause: kind === 'transport' ? { cause: failure } : { status: 503 },
    errors: [kind === 'transport' ? { cause: failure } : { status: 503 }, { status: 403 }],
  })
  expect(requests).toEqual(['GET', 'DELETE', 'GET'])
})

it('prioritizes caller cancellation during a failed DELETE confirmation', async () => {
  const caller = new AbortController()
  const reason = new Error('synthetic caller abort during confirmation')
  const requests: string[] = []
  const client = new ContractClient({
    authentication,
    fetch: (_url, init) => {
      requests.push(init?.method ?? 'GET')
      if (init?.method === 'DELETE') return Promise.reject(new TypeError('synthetic lost reply'))
      if (requests.length === 1) return Promise.resolve(Response.json(body))
      const signal = init?.signal
      if (signal === null || signal === undefined) throw new Error('Missing request signal')
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(stream) {
              signal.addEventListener('abort', () => stream.error(signal.reason), { once: true })
              queueMicrotask(() => caller.abort(reason))
            },
          }),
          { status: 403 },
        ),
      )
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId, signal: caller.signal })).rejects.toBe(
    reason,
  )
  expect(requests).toEqual(['GET', 'DELETE', 'GET'])
})

it.each(
  ['transport', 'http'].flatMap((kind) =>
    [
      {
        name: 'wrong identity',
        value: { ...body, assembly_id: 'b'.repeat(32), ok: 'ASSEMBLY_COMPLETED' },
      },
      { name: 'nonobject', value: null },
      { name: 'unknown status', value: { ...body, ok: 'UNKNOWN_ASSEMBLY_STATUS' } },
      {
        name: 'unknown error',
        value: { assembly_id: assemblyId, error: 'UNKNOWN_ASSEMBLY_ERROR' },
      },
    ].map((confirmation) => ({ kind, ...confirmation })),
  ),
)('retains a $kind cancellation failure after $name confirmation', async ({ kind, value }) => {
  const failure = new TypeError('synthetic lost DELETE reply')
  const requests: string[] = []
  const client = new ContractClient({
    authentication,
    fetch: (_url, init) => {
      requests.push(init?.method ?? 'GET')
      if (init?.method === 'DELETE')
        return kind === 'transport'
          ? Promise.reject(failure)
          : Promise.resolve(Response.json({}, { status: 503 }))
      return Promise.resolve(Response.json(requests.length === 1 ? body : value))
    },
  })
  await expect(client.cancelAndWaitForAssembly({ assemblyId })).rejects.toMatchObject({
    name: 'AggregateError',
    message: 'Assembly cancellation could not be confirmed',
    cause: kind === 'transport' ? { cause: failure } : { status: 503 },
    errors: [
      kind === 'transport' ? { cause: failure } : { status: 503 },
      { message: 'Invalid Assembly workflow response or uploader destination' },
    ],
  })
  expect(requests).toEqual(['GET', 'DELETE', 'GET'])
})

it.each([
  'caller',
  'deadline',
] as const)('prioritizes %s cancellation over an invalid confirmation', async (kind) => {
  const caller = new AbortController()
  const reason = new Error('synthetic caller cancellation')
  const requests: string[] = []
  const client = new ContractClient({
    authentication,
    fetch: async (_url, init) => {
      requests.push(init?.method ?? 'GET')
      if (init?.method === 'DELETE') throw new TypeError('synthetic lost DELETE reply')
      if (requests.length === 1) return Response.json(body)
      if (kind === 'caller') caller.abort(reason)
      else await delay(25)
      return Response.json({ ...body, assembly_id: 'b'.repeat(32) })
    },
  })
  const pending = client.cancelAndWaitForAssembly({
    assemblyId,
    signal: caller.signal,
    timeout: kind === 'deadline' ? 10 : 5_000,
  })
  if (kind === 'caller') await expect(pending).rejects.toBe(reason)
  else await expect(pending).rejects.toMatchObject({ code: 'ASSEMBLY_WORKFLOW_TIMED_OUT' })
  expect(requests).toEqual(['GET', 'DELETE', 'GET'])
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
