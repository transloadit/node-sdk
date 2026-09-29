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
    location?: string
    head?: Record<string, string>
    creationStatus?: number
    patchStatus?: number
  } = {},
) {
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
          assembly_ssl_url: `${origin}/assemblies/${assemblyId}`,
          tus_url: `${origin}/resumable/files/`,
        })
      case 'POST':
        metadata = request.headers.get('upload-metadata') ?? ''
        return new Response(null, {
          status: options.creationStatus ?? 201,
          headers: { ...base, location: options.location ?? '/resumable/files/one' },
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
      origin,
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
