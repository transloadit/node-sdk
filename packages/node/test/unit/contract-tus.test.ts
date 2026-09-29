import type { AssemblyUploadSession } from '../../src/contractTus.ts'

import { createHash } from 'node:crypto'

import { expect, it, vi } from 'vitest'

import { AssemblyUploadError } from '../../src/contractTus.ts'
import { ContractClient } from '../../src/generated-contract/client.ts'
import { workflowVectors } from '../workflowFixture.ts'

const origin = 'http://127.0.0.1:4000'
const assemblyId = workflowVectors.assemblyId
const file = { data: new Blob(['test']), filename: 'input.txt' }

function fixture(
  options: {
    origin?: string
    location?: string
    head?: Record<string, string>
    creationStatus?: number
    creationVersion?: string
    patchStatus?: number
  } = {},
) {
  const endpoint = options.origin ?? origin
  let metadata = ''
  let position = 0
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const request = new Request(input, init)
    expect(request.headers.has('authorization')).toBe(false)
    expect(request.headers.has('cookie')).toBe(false)
    expect(request.redirect).toBe('error')
    expect(request.credentials).toBe('omit')
    const base = { 'tus-resumable': '1.0.0' }
    switch (request.method) {
      case 'GET':
        return Response.json({
          assembly_id: assemblyId,
          ok: 'ASSEMBLY_UPLOADING',
          assembly_ssl_url: `${endpoint}/assemblies/${assemblyId}`,
          tus_url: `${endpoint}/resumable/files/`,
        })
      case 'POST':
        metadata = request.headers.get('upload-metadata') ?? ''
        return new Response(null, {
          status: options.creationStatus ?? 201,
          headers: {
            ...base,
            'tus-resumable': options.creationVersion ?? '1.0.0',
            location: options.location ?? '/resumable/files/one',
          },
        })
      case 'HEAD':
        return new Response(null, {
          status: 200,
          headers: {
            ...base,
            'upload-length': '4',
            'upload-offset': String(position),
            'upload-metadata': metadata,
            ...options.head,
          },
        })
      case 'PATCH':
        position += (await request.arrayBuffer()).byteLength
        return new Response(null, {
          status: options.patchStatus ?? 204,
          headers: { ...base, 'upload-offset': String(position) },
        })
      default:
        throw new Error(`Unexpected method ${request.method}`)
    }
  })
  return {
    transport,
    client: new ContractClient({
      origin: endpoint,
      authentication: { kind: 'bearer', token: 'never-forward' },
      fetch: transport,
    }),
  }
}

it.each([
  'https://evil.example/resumable/files/one',
  '//evil.example/resumable/files/one',
  `${origin}/resumable/files/../one`,
  `${origin}/resumable/files/%2e%2e`,
  `${origin}/resumable/files/%2e%2e/files/one`,
  'https://%61pi2-uploader.transloadit.com/resumable/files/one',
  `${origin}/resumable/files/one?override=DELETE`,
  `${origin}/resumable/files/one#fragment`,
  `${origin}/resumable/files/one/two`,
  'https://user:secret@api2-uploader.transloadit.com/resumable/files/one',
])('rejects returned upload destination %s before HEAD/PATCH', async (location) => {
  const { client, transport } = fixture({ location })
  await expect(client.uploadAssemblyFile({ assemblyId, file })).rejects.toBeInstanceOf(
    AssemblyUploadError,
  )
  expect(transport).toHaveBeenCalledTimes(2)
})

it.each([
  { 'upload-length': '5' },
  { 'upload-length': '3' },
  { 'upload-offset': '-1' },
  { 'upload-offset': '1.5' },
  { 'upload-offset': '5' },
  { 'upload-offset': '00' },
  { 'upload-offset': '0, 0' },
  { 'tus-resumable': 'other' },
  { 'upload-metadata': '' },
  { 'upload-metadata': 'assembly_url Zm9yZWlnbg==,filename aW5wdXQudHh0,fieldname ZmlsZQ==' },
])('rejects inconsistent resume headers %j before appending bytes', async (head) => {
  const { client, transport } = fixture({ head })
  await expect(client.uploadAssemblyFile({ assemblyId, file })).rejects.toBeInstanceOf(
    AssemblyUploadError,
  )
  expect(transport).toHaveBeenCalledTimes(3)
})

it('persists before bytes and refuses changed content of the same size in a fresh client', async () => {
  const { client, transport } = fixture()
  let saved: AssemblyUploadSession | undefined
  const failure = new Error('persistence unavailable')
  await expect(
    client.uploadAssemblyFile({
      assemblyId,
      file,
      onSession: (session) => {
        saved = session
        throw failure
      },
    }),
  ).rejects.toMatchObject({ cause: failure })
  expect(saved).toMatchObject({
    size: 4,
    sha256: createHash('sha256').update('test').digest('hex'),
  })
  expect(transport).toHaveBeenCalledTimes(2)
  if (saved === undefined) throw new Error('Missing session')
  const fresh = fixture()
  await expect(
    fresh.client.resumeAssemblyFile({
      assemblyId,
      session: saved,
      file: { ...file, data: new Blob(['xxxx']) },
    }),
  ).rejects.toBeInstanceOf(AssemblyUploadError)
  expect(fresh.transport).not.toHaveBeenCalled()
})

it('never retries uncertain creation, even when a recovery budget exists', async () => {
  const { client, transport } = fixture({ creationStatus: 503 })
  await expect(
    client.uploadAssemblyFile({ assemblyId, file, maxRetries: 3, retryDelay: 1 }),
  ).rejects.toMatchObject({ session: undefined })
  expect(transport).toHaveBeenCalledTimes(2)
})

it('bounds PATCH recovery and reads the offset before sending any more bytes', async () => {
  const { client, transport } = fixture({ patchStatus: 503 })
  // The server received all bytes before its error. HEAD confirms completion; no replay is needed.
  await expect(
    client.uploadAssemblyFile({ assemblyId, file, maxRetries: 1, retryDelay: 1 }),
  ).resolves.toMatchObject({ size: 4 })
  expect(transport.mock.calls.map(([, init]) => init?.method)).toEqual([
    'GET',
    'POST',
    'HEAD',
    'PATCH',
    'HEAD',
  ])
})

it('preserves abort identity without sending a request', async () => {
  const { client, transport } = fixture()
  const signal = AbortSignal.abort(new Error('caller stopped'))
  await expect(client.uploadAssemblyFile({ assemblyId, file, signal })).rejects.toMatchObject({
    cause: signal.reason,
  })
  expect(transport).not.toHaveBeenCalled()
})

it('aborts an in-flight request at the overall deadline', async () => {
  const transport = vi.fn<typeof fetch>(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal
        if (signal?.aborted) reject(signal.reason)
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
      }),
  )
  const client = new ContractClient({
    origin,
    authentication: { kind: 'bearer', token: 'unused' },
    fetch: transport,
  })
  await expect(client.uploadAssemblyFile({ assemblyId, file, timeout: 100 })).rejects.toMatchObject(
    { cause: { code: 'ASSEMBLY_WORKFLOW_TIMED_OUT' } },
  )
  expect(transport).toHaveBeenCalledTimes(1)
})

it.each(['POST', 'HEAD', 'PATCH'])('applies the client request deadline to %s', async (method) => {
  const { transport } = fixture()
  const fetcher = vi.fn<typeof fetch>((input, init) => {
    if (init?.method !== method) return transport(input, init)
    return new Promise((_resolve, reject) => {
      const signal = init?.signal
      if (signal?.aborted) reject(signal.reason)
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
    })
  })
  const client = new ContractClient({
    origin,
    authentication: { kind: 'signed', key: 'unused', secret: 'unused' },
    fetch: fetcher,
    timeout: 20,
  })
  await expect(client.uploadAssemblyFile({ assemblyId, file, timeout: 100 })).rejects.toMatchObject(
    { cause: { name: 'TimeoutError' } },
  )
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === method)).toHaveLength(1)
})

it.each([
  'GET',
  'HEAD',
  'PATCH',
])('honors Retry-After on %s within the overall deadline', async (method) => {
  const { transport } = fixture()
  const fetcher = vi.fn<typeof fetch>((input, init) =>
    init?.method === method
      ? Promise.resolve(new Response(null, { status: 429, headers: { 'retry-after': '30' } }))
      : transport(input, init),
  )
  const client = new ContractClient({
    origin,
    authentication: { kind: 'signed', key: 'unused', secret: 'unused' },
    fetch: fetcher,
  })
  await expect(
    client.uploadAssemblyFile({ assemblyId, file, timeout: 100, retryDelay: 1 }),
  ).rejects.toMatchObject({ cause: { code: 'ASSEMBLY_WORKFLOW_TIMED_OUT' } })
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === method)).toHaveLength(1)
})

it.each([false, true])('bounds and retries discovery for resume=%s', async (resume) => {
  const { client, transport } = fixture()
  const session = resume ? await client.uploadAssemblyFile({ assemblyId, file }) : undefined
  let reads = 0
  const fetcher = vi.fn<typeof fetch>((input, init) => {
    if (init?.method === 'GET' && ++reads === 1)
      return Promise.resolve(new Response('null', { status: 503 }))
    return transport(input, init)
  })
  const fresh = new ContractClient({
    origin,
    authentication: { kind: 'signed', key: 'unused', secret: 'unused' },
    fetch: fetcher,
  })
  const result =
    session === undefined
      ? await fresh.uploadAssemblyFile({ assemblyId, file, retryDelay: 1 })
      : await fresh.resumeAssemblyFile({ assemblyId, file, session, retryDelay: 1 })
  expect(result.size).toBe(4)
  expect(reads).toBe(2)
})

it.each([0, 1])('honors a shared discovery retry budget of %s', async (maxRetries) => {
  const transport = vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response('null', { status: 503 })),
  )
  const client = new ContractClient({
    origin,
    authentication: { kind: 'signed', key: 'unused', secret: 'unused' },
    fetch: transport,
  })
  await expect(
    client.uploadAssemblyFile({ assemblyId, file, maxRetries, retryDelay: 1 }),
  ).rejects.toMatchObject({ session: undefined, cause: { status: 503 } })
  expect(transport).toHaveBeenCalledTimes(maxRetries + 1)
  expect(transport.mock.calls.every(([, init]) => init?.method === 'GET')).toBe(true)
})

it('retains an explicitly configured encoded proxy prefix for upload and fresh-client resume', async () => {
  const endpoint = 'https://example.com/a%20b'
  const { client, transport } = fixture({
    origin: endpoint,
    location: `${endpoint}/resumable/files/one`,
  })
  const session = await client.uploadAssemblyFile({ assemblyId, file })
  const fresh = new ContractClient({
    origin: endpoint,
    authentication: { kind: 'signed', key: 'unused', secret: 'unused' },
    fetch: transport,
  })
  await expect(fresh.resumeAssemblyFile({ assemblyId, file, session })).resolves.toEqual(session)
  expect(transport.mock.calls.map(([, init]) => init?.method)).toEqual([
    'GET',
    'POST',
    'HEAD',
    'PATCH',
    'GET',
    'HEAD',
  ])
})

it('rejects an incompatible creation response before persisting or following its Location', async () => {
  const { client, transport } = fixture({ creationVersion: '2.0.0' })
  const persist = vi.fn()
  await expect(
    client.uploadAssemblyFile({ assemblyId, file, onSession: persist }),
  ).rejects.toBeInstanceOf(AssemblyUploadError)
  expect(persist).not.toHaveBeenCalled()
  expect(transport).toHaveBeenCalledTimes(2)
})

it('returns on caller abort even if checkpoint persistence never settles', async () => {
  const { client, transport } = fixture()
  const controller = new AbortController()
  const reason = new Error('caller canceled persistence')
  const pending = client
    .uploadAssemblyFile({
      assemblyId,
      file,
      signal: controller.signal,
      onSession: async () => {
        controller.abort(reason)
        await new Promise<void>(() => {})
      },
    })
    .catch((error: unknown) => error)
  const result = await Promise.race([
    pending,
    new Promise((resolve) => setTimeout(() => resolve('still blocked'), 100)),
  ])
  expect(result).toMatchObject({ cause: reason, session: { size: 4 } })
  expect(transport).toHaveBeenCalledTimes(2)
})
