import nock from 'nock'
import { afterEach, describe, expect, it } from 'vitest'

import {
  assemblyIndexSchema,
  assemblyStatusErrCodeSchema,
  assemblyStatusSchema,
  getError,
  hasError,
  isAssemblyTerminal,
  isAssemblyTerminalError,
} from '../../src/alphalib/types/assemblyStatus.ts'
import { Transloadit } from '../../src/Transloadit.ts'

const upload = {
  id: 'upload-1',
  original_id: 'upload-1',
  name: 'fixture.jpg',
  basename: 'fixture',
  ext: 'jpg',
  size: 100,
  mime: 'image/jpeg',
  type: 'image',
  field: null,
  url: null,
  meta: {},
}
const dates = ['2026:01:02 03:04:05', 1767312245]
const metadata = {
  state: 42,
  xp_subject: 1984,
  date_file_modified: dates,
  date_recorded: dates,
  date_file_created: dates,
  create_date: dates,
  modify_date: dates,
}

afterEach(() => nock.cleanAll())

describe('Assembly response compatibility', () => {
  it.each([
    { state: 0 },
    { state: -1.5 },
    { xp_subject: 0 },
    { xp_subject: 123 },
    { date_file_modified: dates },
    { date_recorded: dates },
    { date_file_created: dates },
    { create_date: dates },
    { modify_date: dates },
  ])('preserves emitted metadata %j in uploads and results', (meta) => {
    const status = {
      ok: 'ASSEMBLY_COMPLETED',
      uploads: [{ ...upload, meta }],
      results: { output: [{ meta }] },
    }
    expect(assemblyStatusSchema.parse(status)).toStrictEqual(status)
  })

  it.each([
    'ASSEMBLY_UPLOADING',
    'ASSEMBLY_EXECUTING',
    'ASSEMBLY_REPLAYING',
  ])('keeps %s responses with an explicit undefined error busy', (ok) => {
    const status = assemblyStatusSchema.parse({ ok, error: undefined })
    expect(isAssemblyTerminalError(status)).toBe(false)
    expect(isAssemblyTerminal(status)).toBe(false)
  })

  it('keeps a completed response with an undefined error successful', () => {
    const status = assemblyStatusSchema.parse({ ok: 'ASSEMBLY_COMPLETED', error: undefined })
    expect(isAssemblyTerminalError(status)).toBe(false)
    expect(isAssemblyTerminal(status)).toBe(true)
  })

  it('preserves null extensions in completed uploaded files', () => {
    const status = { ok: 'ASSEMBLY_COMPLETED', uploads: [{ ...upload, ext: null }] }
    expect(assemblyStatusSchema.parse(status)).toStrictEqual(status)
  })

  it('retains a closed known-code inventory while reading future nonempty errors', () => {
    const error = 'FUTURE_ASSEMBLY_ERROR'
    const status = assemblyStatusSchema.parse({ error, assembly_id: 'assembly-1' })
    expect(getError(status)).toBe(error)
    expect(hasError(status)).toBe(true)
    expect(hasError(status, error)).toBe(true)
    expect(hasError(status, '')).toBe(false)
    expect(isAssemblyTerminalError(status)).toBe(true)
    expect(assemblyIndexSchema.parse([{ id: 'assembly-1', created: '2026-10-08', error }])).toEqual(
      [{ id: 'assembly-1', created: '2026-10-08', error }],
    )
    expect(assemblyStatusErrCodeSchema.safeParse(error).success).toBe(false)
    expect(assemblyStatusErrCodeSchema.options).toHaveLength(371)
  })

  it.each([
    { state: true },
    { state: Number.POSITIVE_INFINITY },
    { xp_subject: [] },
    { xp_subject: Number.NaN },
    { create_date: [true] },
    { modify_date: [{}] },
    { date_recorded: [Number.POSITIVE_INFINITY] },
    { date_file_modified: [[dates]] },
  ])('rejects malformed emitted metadata %j', (meta) => {
    expect(
      assemblyStatusSchema.safeParse({ ok: 'ASSEMBLY_COMPLETED', results: { output: [{ meta }] } })
        .success,
    ).toBe(false)
  })

  it.each(['', 42])('rejects invalid public errors %j in statuses and lists', (error) => {
    expect(assemblyStatusSchema.safeParse({ error }).success).toBe(false)
    expect(
      assemblyIndexSchema.safeParse([{ id: 'assembly-1', created: '2026-10-08', error }]).success,
    ).toBe(false)
  })
})

describe('SDK response validation over HTTP', () => {
  const origin = 'http://127.0.0.1:9'
  const client = new Transloadit({
    endpoint: origin,
    authKey: 'test-key',
    authSecret: 'test-secret',
    validateResponses: true,
  })

  it('reads current metadata and null extensions without coercing the response', async () => {
    const status = {
      assembly_id: 'assembly-1',
      assembly_url: `${origin}/assemblies/assembly-1`,
      assembly_ssl_url: `${origin}/assemblies/assembly-1`,
      ok: 'ASSEMBLY_COMPLETED',
      uploads: [{ ...upload, ext: null, meta: metadata }],
      results: { output: [{ meta: metadata }] },
    }
    const request = nock(origin).get('/assemblies/assembly-1').query(true).reply(200, status)
    await expect(client.getAssembly('assembly-1')).resolves.toStrictEqual(status)
    expect(request.isDone()).toBe(true)
  })

  it('reads future Assembly errors through both status and paginated list APIs', async () => {
    const error = 'FUTURE_ASSEMBLY_ERROR'
    const status = {
      error,
      assembly_id: 'assembly-1',
      assembly_url: `${origin}/assemblies/assembly-1`,
      assembly_ssl_url: `${origin}/assemblies/assembly-1`,
    }
    const index = { items: [{ id: 'assembly-1', created: '2026-10-08', error }], count: 1 }
    const statusRequest = nock(origin).get('/assemblies/assembly-1').query(true).reply(200, status)
    const listRequest = nock(origin).get('/assemblies').query(true).reply(200, index)
    await expect(client.getAssembly('assembly-1')).resolves.toStrictEqual(status)
    await expect(client.listAssemblies()).resolves.toStrictEqual(index)
    expect(statusRequest.isDone()).toBe(true)
    expect(listRequest.isDone()).toBe(true)
  })
})
