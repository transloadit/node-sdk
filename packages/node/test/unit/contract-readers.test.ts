import type { AssemblyUploadSession } from '../../src/contractTus.ts'

import { createHash } from 'node:crypto'

import { expect, it } from 'vitest'

import { AssemblyUploadError } from '../../src/contractTus.ts'
import { ContractClient } from '../../src/generated-contract/client.ts'
import { workflowVectors } from '../workflowFixture.ts'

const assemblyId = workflowVectors.assemblyId
const origin = 'http://127.0.0.1:4000'
const fields = {
  assembly_id: assemblyId,
  assembly_ssl_url: `${origin}/assemblies/${assemblyId}`,
  tus_url: `${origin}/resumable/files/`,
  message: 'Synthetic result',
}
const file = { data: new Blob(['test']), filename: 'input.txt' }
const session: AssemblyUploadSession = {
  version: 1,
  assemblyId,
  uploadUrl: `${fields.tus_url}one`,
  size: 4,
  filename: file.filename,
  fieldname: 'file',
  sha256: createHash('sha256').update('test').digest('hex'),
}
const receipt = {
  upload_url: session.uploadUrl,
  filename: session.filename,
  fieldname: session.fieldname,
  size: session.size,
  offset: session.size,
  finished: true,
}
const authentication = { kind: 'bearer', token: 'synthetic-never-forward' } as const

it.each(
  workflowVectors.readerCompatibility.flatMap((scenario) =>
    ['get', 'wait', 'cancel', 'poll', 'delete', 'http-confirm', 'transport-confirm'].map(
      (mode) => ({ ...scenario, mode }),
    ),
  ),
)('reads $id through $mode without inventing success or another cancellation', async (scenario) => {
  const requests: string[] = []
  const status = { ...fields, ...scenario.state }
  const immediate = ['get', 'wait', 'cancel'].includes(scenario.mode)
  const client = new ContractClient({
    origin,
    authentication,
    fetch: (url, init) => {
      const request = new Request(url, init)
      expect(request.headers.has('authorization')).toBe(false)
      expect(request.headers.has('cookie')).toBe(false)
      expect(request.url).toBe(fields.assembly_ssl_url)
      requests.push(request.method)
      if (requests.length > 3) throw new Error('Unexpected request after reader observation')
      if (!immediate && requests.length === 1)
        return Promise.resolve(Response.json({ ...fields, ok: 'ASSEMBLY_EXECUTING' }))
      if (request.method === 'DELETE' && scenario.mode === 'transport-confirm')
        return Promise.reject(new TypeError('Synthetic lost cancellation response'))
      if (request.method === 'DELETE' && scenario.mode === 'http-confirm')
        return Promise.resolve(Response.json({}, { status: 404 }))
      return Promise.resolve(Response.json(status))
    },
  })
  const options = { assemblyId, interval: 1, timeout: 1_000 }
  const result =
    scenario.mode === 'get'
      ? client.getAssembly({ path: { assemblyId } })
      : scenario.mode === 'wait' || scenario.mode === 'poll'
        ? client.waitForAssembly(options)
        : client.cancelAndWaitForAssembly(options)
  // Node's low-level JSON transport is not a full response validator. Workflow admission is.
  if (scenario.accepted || scenario.mode === 'get') await expect(result).resolves.toEqual(status)
  else await expect(result).rejects.toBeInstanceOf(Error)
  expect(requests).toEqual(
    immediate
      ? ['GET']
      : scenario.mode === 'poll'
        ? ['GET', 'GET']
        : scenario.mode.endsWith('confirm')
          ? ['GET', 'DELETE', 'GET']
          : ['GET', 'DELETE'],
  )
})

it.each(
  workflowVectors.readerCompatibility.flatMap((scenario) =>
    ['fresh', 'partial', 'receipt'].map((mode) => ({ ...scenario, mode })),
  ),
)('does not write after $id during $mode upload recovery', async (scenario) => {
  const requests: string[] = []
  const client = new ContractClient({
    origin,
    authentication,
    fetch: (url, init) => {
      const request = new Request(url, init)
      expect(request.headers.has('authorization')).toBe(false)
      expect(request.headers.has('cookie')).toBe(false)
      requests.push(request.method)
      if (requests.length > 3) throw new Error('Unexpected upload recovery request')
      if (request.method === 'GET')
        return Promise.resolve(
          Response.json({ ...fields, ...scenario.state, tus_uploads: [receipt] }),
        )
      expect(request.url).toBe(session.uploadUrl)
      if (request.method !== 'HEAD') throw new Error('Stopped Assembly attempted an upload write')
      if (scenario.mode === 'receipt') return Promise.resolve(new Response(null, { status: 404 }))
      return Promise.resolve(
        new Response(null, {
          headers: {
            'tus-resumable': '1.0.0',
            'upload-length': '4',
            'upload-offset': '0',
            'upload-metadata': Object.entries({
              assembly_url: fields.assembly_ssl_url,
              filename: session.filename,
              fieldname: session.fieldname,
            })
              .map(([key, value]) => `${key} ${Buffer.from(value).toString('base64')}`)
              .join(','),
          },
        }),
      )
    },
  })
  const options = { assemblyId, file, maxRetries: 0, timeout: 1_000 }
  const result =
    scenario.mode === 'fresh'
      ? client.uploadAssemblyFile(options)
      : client.resumeAssemblyFile({ ...options, session })
  if (scenario.accepted && scenario.mode === 'receipt')
    await expect(result).resolves.toEqual(session)
  else {
    const failure = await result.then(
      () => {
        throw new Error('Unexpected successful upload')
      },
      (error: unknown) => error,
    )
    expect(failure).toBeInstanceOf(AssemblyUploadError)
    if (!(failure instanceof AssemblyUploadError)) throw new Error('Missing upload error')
    expect(failure.message).toBe('Assembly upload stopped; remote cleanup is not confirmed')
    expect(failure.assemblyCode).toBe(scenario.accepted ? scenario.state.error : undefined)
    if (scenario.accepted) {
      expect(failure.cause).toBeInstanceOf(Error)
      if (!(failure.cause instanceof Error)) throw new Error('Missing stopped-upload cause')
      expect(failure.cause.message).toBe('Assembly is not accepting upload writes')
      expect(failure.cause.cause).toBeUndefined()
    }
  }
  expect(requests).toEqual(
    !scenario.accepted || scenario.mode === 'fresh'
      ? ['GET']
      : scenario.mode === 'partial'
        ? ['GET', 'HEAD']
        : ['GET', 'HEAD', 'GET'],
  )
})
