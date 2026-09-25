import type {
  AssemblyStatusErrCode,
  AssemblyStatusMeta,
} from '../../src/alphalib/types/assemblyStatus.ts'

import nock from 'nock'
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import {
  ecmaWhitespaceCharacterClass,
  zodCodePointLength,
  zodInputPreservingTransform,
  zodStableJsonDefault,
  zodWithConservativeJsonInputSchema,
  zodWithJsonInputSchema,
} from '../../src/alphalib/lib/zodInputSemantics.ts'
import {
  describeApiParameter,
  describeApiParameterFields,
} from '../../src/alphalib/types/apiParameterDescription.ts'
import {
  assemblyIndexSchema,
  assemblyStatusErrCodeSchema,
  assemblyStatusSchema,
  getError,
  hasError,
  isAssemblyTerminalError,
} from '../../src/alphalib/types/assemblyStatus.ts'
import { InconsistentResponseError, Transloadit } from '../../src/Transloadit.ts'

const historicalUpload = {
  id: 'upload-1',
  original_id: 'upload-1',
  name: null,
  basename: null,
  ext: 'jpg',
  size: 100,
  mime: 'image/jpeg',
  type: 'image',
  field: null,
  url: null,
  meta: {},
}

const storedIdentity = {
  asset_id: 'A'.repeat(22),
  asset_version: 2,
  version_id: `${'B'.repeat(21)}A`,
  workspace: 'photos',
  sha256: 'f'.repeat(64),
  thumbhash: 'WnU1pyAI9wiIh4hwj3CI+AiIcH/494cP',
  has_alpha: false,
}

const numericMetadata = {
  album: 1984,
  artist: 123,
  author: 456,
  copyright: 2026,
  create_date: 20260101,
  date_file_created: 20260101,
  description: 42,
  device_name: 100,
  xp_keywords: 42,
  xp_title: 200,
  creator: ['first', 'second'],
  keywords: ['first', 123, true, false],
}

afterEach(() => nock.cleanAll())

describe('lean Assembly Status compatibility', () => {
  it('keeps the complete runtime inventory and public code type', () => {
    expect(assemblyStatusErrCodeSchema.options).toHaveLength(369)
    expect(new Set(assemblyStatusErrCodeSchema.options).size).toBe(369)
    expectTypeOf<AssemblyStatusErrCode>()
      .extract<'HTTP_REQUEST_FAILURE'>()
      .toEqualTypeOf<'HTTP_REQUEST_FAILURE'>()
    expectTypeOf<AssemblyStatusErrCode>()
      .extract<'SLOT_COUNT_ERROR'>()
      .toEqualTypeOf<'SLOT_COUNT_ERROR'>()
  })

  it.each([
    'AZURE_STORE_NOT_FOUND',
    'HTTP_REQUEST_FAILURE',
    'HTTP_REQUEST_VALIDATION',
    'S3_WRONG_REGION',
    'STORAGE_GRANT_NOT_CREATED',
    'TRANSIENT_STORAGE_SERVICE_ERROR',
    'VIDEO_THUMBS_INVALID_FORMAT',
    'ASSEMBLY_INSTANCE_NOT_FOUND',
    'CANNOT_FETCH_ACTIVE_ASSEMBLIES',
    'FILE_WATERMARK_VALIDATION',
    'PROGRESS_SIMULATE_VALIDATION',
    'SLOT_COUNTS_ERROR',
    'SLOT_COUNT_ERROR',
    'SLOT_COUNT_MISSING_PARAMS',
  ])('parses runtime error %s in statuses and list entries', (error) => {
    const status = assemblyStatusSchema.parse({ error, assembly_id: 'assembly-1' })
    expect(getError(status)).toBe(error)
    expect(hasError(status)).toBe(true)
    expect(isAssemblyTerminalError(status)).toBe(true)
    expect(assemblyIndexSchema.parse([{ id: 'assembly-1', created: '2026-09-24', error }])).toEqual(
      [{ id: 'assembly-1', created: '2026-09-24', error }],
    )
  })

  it('retains system errors and runtime diagnostics', () => {
    const systemError = { errno: -2, code: 'ENOENT', syscall: 'open', path: '/missing/input.jpg' }
    expect(assemblyStatusSchema.parse(systemError)).toEqual(systemError)
    expect(isAssemblyTerminalError(assemblyStatusSchema.parse(systemError))).toBe(true)
    const error = {
      error: 'HTTP_REQUEST_FAILURE',
      response_code: 503,
      retryable: true,
      worker: 'historical-worker',
      path: '/input.jpg',
      cmd: ['convert', 'input.jpg', 1],
      stdout: 'output',
      stderr: 'diagnostic',
      build_id: 'release',
      err: { message: 'upstream failure' },
    }
    expect(assemblyStatusSchema.parse(error)).toEqual(error)
  })

  it.each([
    { reason: undefined },
    { reason: null },
    { reason: 'unrecognized metadata' },
    { reason: 12 },
    { reason: false },
    { reason: ['message', { code: 12 }] },
    { reason: { message: 'metadata failed', details: { exitCode: 1 } } },
    { reason: {} },
  ])('preserves serialized diagnostic reason $reason', ({ reason }) => {
    const error = { error: 'INVALID_FILE_META_DATA', reason }
    expect(assemblyStatusSchema.parse(error)).toEqual(error)
  })

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    1n,
    () => 'reason',
  ])('rejects a non-serialized diagnostic reason %s', (reason) => {
    expect(
      assemblyStatusSchema.safeParse({ error: 'INVALID_FILE_META_DATA', reason }).success,
    ).toBe(false)
  })

  it('parses numeric and repeated metadata in both uploads and results', () => {
    const status = {
      ok: 'ASSEMBLY_COMPLETED',
      uploads: [{ ...historicalUpload, meta: numericMetadata }],
      results: { output: [{ meta: numericMetadata }] },
    }
    expect(assemblyStatusSchema.parse(status)).toEqual(status)
  })

  it.each([
    0,
    42,
    -1.5,
    '',
    '007',
    null,
    undefined,
  ])('preserves XPKeywords %j in uploads and results', (xp_keywords) => {
    const meta = { xp_keywords }
    const status = {
      ok: 'ASSEMBLY_COMPLETED',
      uploads: [{ ...historicalUpload, meta }],
      results: { output: [{ meta }] },
    }
    expect(assemblyStatusSchema.parse(status)).toStrictEqual(status)
    expectTypeOf<AssemblyStatusMeta['xp_keywords']>().toEqualTypeOf<
      string | number | null | undefined
    >()
  })

  it('preserves omitted XPKeywords in uploads and results', () => {
    const status = {
      ok: 'ASSEMBLY_COMPLETED',
      uploads: [historicalUpload],
      results: { output: [{ meta: {} }] },
    }
    expect(assemblyStatusSchema.parse(status)).toStrictEqual(status)
  })

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    {},
    [],
    true,
    42n,
  ])('rejects invalid XPKeywords %s in uploads and results', (xp_keywords) => {
    const meta = { xp_keywords }
    expect(
      assemblyStatusSchema.safeParse({
        ok: 'ASSEMBLY_COMPLETED',
        uploads: [{ ...historicalUpload, meta }],
      }).success,
    ).toBe(false)
    expect(
      assemblyStatusSchema.safeParse({
        ok: 'ASSEMBLY_COMPLETED',
        results: { output: [{ meta }] },
      }).success,
    ).toBe(false)
  })

  it.each([
    { keywords: 123, creator: 456 },
    { album: null, artist: null, author: null, copyright: null, keywords: null },
    { album: 'album', artist: 'artist', author: 'author', keywords: ['first', 2] },
    {
      copyright: {
        licenses: [],
        flagged: false,
        max_confidence: 0,
        confidence_threshold: 80,
        provider_detail: 'retained',
      },
    },
  ])('keeps existing metadata forms and numeric keywords %j', (meta) => {
    const status = { ok: 'ASSEMBLY_COMPLETED', results: { output: [{ meta }] } }
    expect(assemblyStatusSchema.parse(status)).toEqual(status)
  })

  it('retains ThumbHash, alpha state and version identity on uploads and results', () => {
    const status = {
      ok: 'ASSEMBLY_COMPLETED',
      uploads: [{ ...historicalUpload, ...storedIdentity, meta: storedIdentity }],
      results: { output: [{ ...storedIdentity, url: null, ssl_url: null, meta: storedIdentity }] },
    }
    expect(assemblyStatusSchema.parse(status)).toEqual(status)
  })

  it('accepts reserved uploads and incomplete historical payloads', () => {
    const status = {
      ok: 'ASSEMBLY_UPLOADING',
      account_id: null,
      instance: null,
      assembly_url: null,
      assembly_ssl_url: null,
      uppyserver_url: null,
      companion_url: null,
      websocket_url: null,
      update_stream_url: null,
      bytes_usage: null,
      uploads: [{ original_id: 'reserved-1' }, historicalUpload],
      results: { output: [{}, { meta: null, user_meta: null }] },
      ignored_errors: [{ step: null, error: { message: 'ignored' } }, {}],
    }
    expect(assemblyStatusSchema.parse(status)).toEqual(status)
  })

  it('retains nested user metadata without restricting it to strings and numbers', () => {
    const userMeta = { enabled: false, tags: ['one'], options: { nested: null } }
    const status = {
      ok: 'ASSEMBLY_COMPLETED',
      uploads: [{ ...historicalUpload, user_meta: userMeta }],
      results: { output: [{ user_meta: userMeta }] },
    }
    expect(assemblyStatusSchema.parse(status)).toEqual(status)
  })

  it('preserves the historical thumbnail offset transform', () => {
    const status = assemblyStatusSchema.parse({
      ok: 'ASSEMBLY_COMPLETED',
      results: { output: [{ meta: { thumb_offset: ' 12.5seconds' } }] },
    })
    expect(status.results?.output?.[0]?.meta?.thumb_offset).toBe(12)
  })

  it.each([
    { error: 'NOT_AN_ASSEMBLY_ERROR' },
    { ok: 'ASSEMBLY_COMPLETED', error: 'HTTP_REQUEST_FAILURE' },
    { ok: 'ASSEMBLY_COMPLETED', uploads: {} },
    { ok: 'ASSEMBLY_COMPLETED', uploads: [{}] },
    { ok: 'ASSEMBLY_COMPLETED', uploads: [{ ...historicalUpload, meta: undefined }] },
    { ok: 'ASSEMBLY_COMPLETED', uploads: [{ ...historicalUpload, meta: null }] },
    { ok: 'ASSEMBLY_COMPLETED', uploads: [{ original_id: 'reserved-1', meta: [] }] },
    { ok: 'ASSEMBLY_COMPLETED', results: [] },
    { ok: 'ASSEMBLY_COMPLETED', results: { output: {} } },
    { ok: 'ASSEMBLY_COMPLETED', results: { output: [{ meta: [] }] } },
    { ok: 'ASSEMBLY_COMPLETED', results: { output: [{ meta: 'metadata' }] } },
    { ok: 'ASSEMBLY_COMPLETED', results: { output: [{ user_meta: [] }] } },
  ])('rejects malformed containers or discriminators %j', (status) => {
    expect(assemblyStatusSchema.safeParse(status).success).toBe(false)
  })

  it.each([
    { album: {} },
    { artist: [] },
    { author: false },
    { creator: [123] },
    { copyright: {} },
    { create_date: true },
    { keywords: true },
    { keywords: [{}] },
    { thumb_offset: 'invalid' },
    { thumbhash: 'invalid' },
    { has_alpha: 'false' },
  ])('rejects malformed metadata fields %j', (meta) => {
    expect(
      assemblyStatusSchema.safeParse({ ok: 'ASSEMBLY_COMPLETED', results: { output: [{ meta }] } })
        .success,
    ).toBe(false)
  })
})

describe('Assembly parsing through the SDK client', () => {
  const origin = 'http://127.0.0.1:9'
  const client = new Transloadit({
    authKey: 'test-key',
    authSecret: 'test-secret',
    endpoint: origin,
    validateResponses: true,
  })
  const urls = {
    assembly_url: `${origin}/assemblies/assembly-1`,
    assembly_ssl_url: `${origin}/assemblies/assembly-1`,
  }

  it('accepts a current error response with historical uploads and serialized reasons', async () => {
    const status = {
      ...urls,
      assembly_id: 'assembly-1',
      error: 'HTTP_REQUEST_FAILURE',
      reason: { status: 503, message: 'Upstream unavailable' },
      response_code: 503,
      uploads: [{ original_id: 'reserved-1' }, { ...historicalUpload, meta: numericMetadata }],
      results: { stored: [storedIdentity] },
    }
    const request = nock(origin).get('/assemblies/assembly-1').query(true).reply(200, status)
    await expect(client.getAssembly('assembly-1')).resolves.toEqual(status)
    expect(request.isDone()).toBe(true)
  })

  it('preserves structured HTTP error reasons without stringifying them into the message', async () => {
    const reason = { code: 503, diagnostic: 'opaque diagnostic detail' }
    const request = nock(origin).get('/assemblies/assembly-1').query(true).reply(400, {
      error: 'HTTP_REQUEST_FAILURE',
      message: 'The upstream request failed',
      reason,
      assembly_ssl_url: null,
    })
    await expect(client.getAssembly('assembly-1')).rejects.toMatchObject({
      name: 'ApiError',
      reason: undefined,
      rawReason: reason,
      assemblySslUrl: undefined,
      message: expect.not.stringContaining('opaque diagnostic detail'),
    })
    expect(request.isDone()).toBe(true)
  })

  it('cancels through the validated Assembly URL', async () => {
    const status = { ...urls, ok: 'ASSEMBLY_EXECUTING' }
    const canceled = { ...urls, ok: 'ASSEMBLY_CANCELED' }
    const request = nock(origin)
      .get('/assemblies/assembly-1')
      .query(true)
      .reply(200, status)
      .delete('/assemblies/assembly-1')
      .query(true)
      .reply(200, canceled)
    await expect(client.cancelAssembly('assembly-1')).resolves.toEqual(canceled)
    expect(request.isDone()).toBe(true)
  })

  it('does not turn a missing cancellation URL into a request to the API root', async () => {
    const request = nock(origin)
      .get('/assemblies/assembly-1')
      .query(true)
      .reply(200, { ...urls, assembly_ssl_url: null, ok: 'ASSEMBLY_EXECUTING' })
    await expect(client.cancelAssembly('assembly-1')).rejects.toBeInstanceOf(
      InconsistentResponseError,
    )
    expect(request.isDone()).toBe(true)
  })

  it('continues rejecting a completed upload with malformed metadata', async () => {
    const request = nock(origin)
      .get('/assemblies/assembly-1')
      .query(true)
      .reply(200, {
        ...urls,
        ok: 'ASSEMBLY_COMPLETED',
        uploads: [{ ...historicalUpload, meta: [] }],
      })
    await expect(client.getAssembly('assembly-1')).rejects.toBeInstanceOf(InconsistentResponseError)
    expect(request.isDone()).toBe(true)
  })
})

describe('runtime adapters for shared Robot schemas', () => {
  it('describes Storage fields without changing defaults, validation or the source shape', () => {
    const original = {
      limit: z.number().int().min(1).max(500).default(100),
      cursor: z.string().min(1).optional(),
      toString: z.string().optional(),
    }
    const described = describeApiParameterFields('storedAssetsList', original, {
      limit: 'Maximum number of assets per page.',
    })
    expect(described.limit.description).toBe('Maximum number of assets per page.')
    expect(described.cursor).toBe(original.cursor)
    expect(described.toString).toBe(original.toString)
    expect(original.limit.description).toBeUndefined()
    expect(z.object(described).parse({ toString: 'explicit field' })).toEqual({
      limit: 100,
      toString: 'explicit field',
    })
    expect(z.object(described).safeParse({ limit: 501, toString: 'explicit field' }).success).toBe(
      false,
    )
    expectTypeOf(described).toEqualTypeOf<typeof original>()
  })

  it('preserves descriptions, input/output types and default behavior without registering IDs', () => {
    const original = z.boolean().default(false)
    const schema = describeApiParameter('audioArtworkChangeFormatIfNecessary', original, {
      commonMark: 'Convert the file if its original format cannot hold artwork.',
      referenceMarkdown: '<ApiDefinition id="robot">Convert the file</ApiDefinition>',
    })
    expect(schema.description).toBe('Convert the file if its original format cannot hold artwork.')
    expect(original.description).toBeUndefined()
    expect(schema.parse(undefined)).toBe(false)
    expect(schema.safeParse('false').success).toBe(false)
    expectTypeOf(schema).toEqualTypeOf<typeof original>()
    expect(
      describeApiParameter('audioArtworkChangeFormatIfNecessary', original, 'Other context')
        .description,
    ).toBe('Other context')
  })

  it.each([
    zodWithJsonInputSchema,
    zodWithConservativeJsonInputSchema,
  ])('keeps annotation-only wrappers identical to their runtime schema', (annotate) => {
    const original = zodInputPreservingTransform(
      z.union([z.string(), z.number(), z.boolean()]),
      String,
    )
    const schema = annotate(original, z.never())
    expect(schema).toBe(original)
    expect(schema.parse(false)).toBe('false')
    expect(schema.parse(123)).toBe('123')
    expect(schema.safeParse({}).success).toBe(false)
    expectTypeOf<z.output<typeof schema>>().toEqualTypeOf<string>()
  })

  it('retains preprocess validation when publication annotations are ignored', () => {
    const schema = zodWithJsonInputSchema(
      z.preprocess(
        (value) => (value === 0 || value === '0' ? 'v0' : value),
        z.enum(['v0', 'v1']).default('v0'),
      ),
      z.unknown(),
    )
    expect(schema.parse(0)).toBe('v0')
    expect(schema.parse('0')).toBe('v0')
    expect(schema.parse(undefined)).toBe('v0')
    expect(schema.safeParse('invalid').success).toBe(false)
  })

  it('snapshots mutable defaults and still runs their transforms', () => {
    const input = { values: ['original'] }
    const mutable = zodStableJsonDefault(z.object({ values: z.array(z.string()) }), input)
    input.values.push('caller mutation')
    mutable.parse(undefined).values.push('output mutation')
    expect(mutable.parse(undefined)).toEqual({ values: ['original'] })
    const transformed = zodStableJsonDefault(zodInputPreservingTransform(z.string(), Number), '12')
    expect(transformed.parse(undefined)).toBe(12)
    expect(transformed.parse('34')).toBe(34)
    expectTypeOf<z.input<typeof transformed>>().toEqualTypeOf<string | undefined>()
    expectTypeOf<z.output<typeof transformed>>().toEqualTypeOf<number>()
  })

  it('rejects defaults outside the runtime schema and non-JSON values', () => {
    expect(() => zodStableJsonDefault(z.string().min(1), '')).toThrow('must satisfy its schema')
    expect(() => zodStableJsonDefault(z.unknown(), { nested: Number.POSITIVE_INFINITY })).toThrow(
      'only finite JSON values',
    )
    expect(() => zodStableJsonDefault(z.unknown(), new Date(0))).toThrow('only finite JSON values')
    const cyclic: { self?: unknown } = {}
    cyclic.self = cyclic
    expect(() => zodStableJsonDefault(z.unknown(), cyclic)).toThrow('only finite JSON values')
  })

  it('counts Unicode code points and preserves the underlying string validation', () => {
    const schema = zodCodePointLength(z.string().regex(/^😀+$/u), { min: 1, max: 2 })
    expect(schema.parse('😀😀')).toBe('😀😀')
    expect(schema.safeParse('😀😀😀').success).toBe(false)
    expect(schema.safeParse('').success).toBe(false)
    expect(schema.safeParse('ab').success).toBe(false)
    expect(zodCodePointLength(z.string(), { min: 2 }).parse('😀a')).toBe('😀a')
    expect(zodCodePointLength(z.string(), { max: 0 }).parse('')).toBe('')
  })

  it.each([
    {},
    { min: -1 },
    { max: 1.5 },
    { min: 3, max: 2 },
    { max: Number.POSITIVE_INFINITY },
  ])('rejects invalid Unicode length bounds %j', (bounds) => {
    expect(() => zodCodePointLength(z.string(), bounds)).toThrow()
  })

  it('recognizes Unicode whitespace used by shared numeric transforms', () => {
    const whitespace = new RegExp(`^${ecmaWhitespaceCharacterClass}*$`, 'u')
    expect(whitespace.test('\t\n \u00a0\u1680\u2000\u2028\u202f\u3000\ufeff')).toBe(true)
    expect(whitespace.test('\u200b')).toBe(false)
  })
})
