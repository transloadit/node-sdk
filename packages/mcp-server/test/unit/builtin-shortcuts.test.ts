import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { mcpBuiltinTemplateSummaries } from '@transloadit/zod/v4/builtinTemplates'
import { Ajv } from 'ajv'
import nock from 'nock'
import { afterEach, describe, expect, it } from 'vitest'

import {
  builtinShortcuts,
  deriveShortcutFieldsSchema,
  describeBuiltinShortcut,
  validateBuiltinFields,
} from '../../src/builtin-shortcuts.ts'
import { createTransloaditMcpServer } from '../../src/server.ts'
import { toolNames } from '../../src/tool-metadata.ts'
import { parseToolPayload } from '../e2e/mcp-client.ts'

const endpoint = 'https://api2.transloadit.com'
const shortcut = builtinShortcuts[0]
const encoding = builtinShortcuts.find(({ id }) => id.includes('/encode-video@'))
if (!shortcut || !encoding) throw new Error('Missing reviewed test shortcuts')
const template = {
  id: shortcut.id,
  description: 'Long catalog description that stays out of the tool text.',
  summary: 'Catalog outcome summary.',
  fields_schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      w: { type: 'integer', minimum: 1, maximum: 8000 },
      strip: { type: 'boolean' },
      bg: { type: ['string', 'null'] },
    },
    required: ['w', 'strip'],
    additionalProperties: false,
    'x-transloadit-input-fidelity': 'conservative',
  },
  content: {
    fields: { w: 1600, strip: true, bg: '#00000000' },
    steps: { original: { robot: '/upload/handle' } },
  },
}
const encoded = {
  ...template,
  id: encoding.id,
  fields_schema: {
    type: 'object',
    properties: {
      preset: { enum: ['webm', 'web/webm/720p', 'ipad'] },
      width: { type: ['integer', 'null'] },
    },
  },
  content: {
    fields: { preset: 'ipad', turbo: true },
    steps: { filter: { robot: '/file/filter', accepts: [['${fields.width}', '!empty', '']] } },
  },
}
const compositions = [
  { allOf: [{ required: ['w'] }] },
  { dependencies: { strip: ['w'] } },
  { oneOf: [{ required: ['w'] }, { required: ['absent'] }] },
  { minProperties: 3 },
]

const acceptsFields = (
  schema: Record<string, unknown> | undefined,
  fields: Record<string, unknown>,
): boolean =>
  new Ajv({ strict: false }).compile({
    type: 'object',
    properties: { fields: schema ?? { type: 'object' } },
  })({ fields })

describe('Builtin field contracts', () => {
  it('derives fields without mutating the catalog and merges typed defaults before validation', () => {
    expect(deriveShortcutFieldsSchema(template)).toEqual({
      ...template.fields_schema,
      $id: expect.any(String),
      required: [],
      default: template.content.fields,
    })
    expect(template.fields_schema.required).toEqual(['w', 'strip'])
    expect(validateBuiltinFields(template)).toEqual(template.content.fields)
    expect(validateBuiltinFields(template, { w: 300, strip: false, bg: null })).toEqual({
      w: 300,
      strip: false,
      bg: null,
    })
    expect(deriveShortcutFieldsSchema({ ...template, fields_schema: null })).toBeUndefined()
    expect(deriveShortcutFieldsSchema({ content: template.content })).toBeUndefined()
    expect(validateBuiltinFields({ ...template, fields_schema: null }, { w: 0 }).w).toBe(0)
  })

  it.each([
    [0, 'minimum'],
    [8001, 'maximum'],
    ['private-value', 'type'],
  ])('rejects width %s without coercion or leaking values', (w, keyword) => {
    expect(() => validateBuiltinFields(template, { w })).toThrow(
      `Invalid Builtin fields: fields.w violates ${keyword}.`,
    )
    expect(() => validateBuiltinFields(template, { w })).not.toThrow('private-value')
  })

  it.each(compositions)('allows default-merged calls with root constraints %j', (composition) => {
    const contract = { ...template, fields_schema: { ...template.fields_schema, ...composition } }
    expect(validateBuiltinFields(contract, {})).toEqual(template.content.fields)
    expect(acceptsFields(deriveShortcutFieldsSchema(contract), {})).toBe(true)
  })

  it('preserves standalone references under the transport schema', () => {
    const contract = {
      ...template,
      fields_schema: {
        type: 'object',
        definitions: { width: { type: 'integer', maximum: 1920 } },
        properties: { width: { $ref: '#/definitions/width' } },
      },
    }
    const fields = deriveShortcutFieldsSchema(contract)
    expect(acceptsFields(fields, { width: 1920 })).toBe(true)
    expect(acceptsFields(fields, { width: 1921 })).toBe(false)
  })

  it.each([
    {
      schema: { properties: { width: {}, options: { type: 'object', required: ['width'] } } },
      fields: { width: 320, options: {} },
      message: 'fields.options violates required',
    },
    {
      schema: {
        properties: { kind: {}, width: {}, height: {} },
        anyOf: [{ required: ['width'] }, { properties: { height: { type: 'integer' } } }],
      },
      fields: { height: 'private-value' },
      message: 'fields violates anyOf',
    },
    {
      schema: {
        if: { properties: { strip: { const: true } } },
        // biome-ignore lint/suspicious/noThenProperty: JSON Schema conditional, not a thenable.
        then: { not: { required: ['password'] } },
      },
      fields: { strip: true, password: 'private-value' },
      message: 'fields violates if',
    },
  ])('sanitizes nested and conditional diagnostics: $message', ({ schema, fields, message }) => {
    const contract = { fields_schema: { type: 'object', ...schema }, content: { fields: {} } }
    expect(() => validateBuiltinFields(contract, fields)).toThrow(message)
    expect(() => validateBuiltinFields(contract, fields)).not.toThrow('private-value')
  })

  it('applies the single deployment gate in discovery and execution', () => {
    expect(deriveShortcutFieldsSchema(encoded)).toMatchObject({
      properties: { preset: { enum: ['web/webm/720p', 'ipad'] } },
    })
    expect(() => validateBuiltinFields(encoded, { preset: 'webm' })).toThrow('unavailable')
    expect(validateBuiltinFields(encoded, { preset: 'web/webm/720p' }).preset).toBe('web/webm/720p')
  })
})

describe('Builtin shortcut protocol', () => {
  let client: Client | undefined
  let server: ReturnType<typeof createTransloaditMcpServer> | undefined
  const connect = async (): Promise<Client> => {
    server = createTransloaditMcpServer({ authKey: 'key', authSecret: 'secret' })
    const [a, b] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'builtin-shortcuts', version: '1.0.0' })
    await Promise.all([server.connect(b), client.connect(a)])
    return client
  }
  const call = (
    mcp: Client,
    args: Record<string, unknown> = { expected_uploads: 1 },
    name = shortcut.name,
  ) => mcp.callTool({ name, arguments: args })
  const catalog = (items: unknown[] = [template]) =>
    nock(endpoint).get('/templates').query(true).reply(200, { items, count: items.length })
  const assembly = (entry: { id: string }) => {
    const get = nock(endpoint).get(`/templates/${entry.id}`).query(true).reply(200, entry)
    let body = ''
    const post = nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/, (value) => {
        body = String(value)
        return true
      })
      .reply(200, { ok: 'ASSEMBLY_COMPLETED' })
    return {
      get,
      post,
      params: () => JSON.parse(body.match(/name="params"\r\n\r\n([^\r]+)\r\n/)?.[1] ?? '{}'),
    }
  }
  afterEach(async () => {
    await client?.close()
    await server?.close()
    nock.cleanAll()
  })

  it.each(
    builtinShortcuts,
  )('derives $name metadata/schema and creates its Assembly over HTTP', async ({
    id,
    name,
    title,
  }) => {
    const entry = { ...template, id, summary: `Catalog summary for ${name}.` }
    const discovery = catalog([entry])
    const mcp = await connect()
    const { tools } = await mcp.listTools()
    const tool = tools.find((tool) => tool.name === name)
    expect(discovery.isDone()).toBe(true)
    expect(tool).toMatchObject({
      title,
      description: describeBuiltinShortcut(id, entry.summary),
      annotations: { readOnlyHint: false, destructiveHint: false },
      _meta: {
        'openai/fileParams': ['attachments'],
        securitySchemes: [{ type: 'noauth' }],
        ui: { resourceUri: 'ui://transloadit/assembly-result' },
      },
    })
    expect(tool?.description?.startsWith(`${entry.summary} Pass`)).toBe(true)
    expect(tool?.description).not.toContain(entry.description)
    // Catalog wording keeps the self-contained suffix: no other tool is named.
    expect(
      [...(tool?.description ?? '').matchAll(/transloadit_[a-z_]+/g)].filter(
        ([match]) => match !== name,
      ),
    ).toEqual([])
    expect(tool?.inputSchema.properties?.fields).toEqual(deriveShortcutFieldsSchema(entry))
    expect(tool?.inputSchema.properties).toHaveProperty('attachments')
    expect(tool?.inputSchema.properties).not.toHaveProperty('instructions')
    expect(tool?.inputSchema.properties).not.toHaveProperty('assembly_url')
    catalog([entry])
    const http = assembly(entry)
    expect(
      parseToolPayload(await call(mcp, { fields: { strip: false }, expected_uploads: 1 }, name)),
    ).toMatchObject({ status: 'ok' })
    expect(http.get.isDone() && http.post.isDone()).toBe(true)
    expect(http.params()).toMatchObject({
      template_id: id,
      fields: { ...entry.content.fields, strip: false },
    })
    expect(http.params()).not.toHaveProperty('steps')
  })

  it.each([
    undefined,
    '',
    '  ',
  ])('keeps the static summary for catalog summary %j', async (summary) => {
    catalog([{ ...template, summary }])
    const tools = (await (await connect()).listTools()).tools
    const listed = tools.find(({ name }) => name === shortcut.name)?.description
    const staticSummary = mcpBuiltinTemplateSummaries[shortcut.id]
    if (!staticSummary) throw new Error(`Missing static summary for ${shortcut.id}`)
    expect(listed?.startsWith(`${staticSummary} Pass`), listed).toBe(true)
    expect(listed).toBe(describeBuiltinShortcut(shortcut.id))
  })

  it('marks fields required only when required properties lack defaults', async () => {
    catalog([{ ...template, content: { ...template.content, fields: { strip: true } } }])
    const tools = (await (await connect()).listTools()).tools
    expect(tools.find(({ name }) => name === shortcut.name)?.inputSchema).toMatchObject({
      required: ['fields'],
      properties: { fields: { required: ['w'] } },
    })
  })

  it.each([
    undefined,
    null,
    { $ref: '#/private-value' },
    { type: 'object', required: [42] },
    { ...template.fields_schema, allOf: [{ required: ['w'] }] },
  ])('keeps generic discovery valid with schema %j', async (fields_schema) => {
    catalog([{ ...template, fields_schema }])
    const tools = (await (await connect()).listTools()).tools
    const visible = Boolean(fields_schema)
    expect(tools).toHaveLength(toolNames.length + Number(visible))
    const tool = tools.find(({ name }) => name === shortcut.name)
    expect(Boolean(tool)).toBe(visible)
    if (visible) {
      const generic = tools.find(({ name }) => name === 'transloadit_create_assembly')
      expect(tool?.inputSchema.properties?.fields).toEqual(generic?.inputSchema.properties?.fields)
      expect(acceptsFields(tool?.inputSchema.properties?.fields, { arbitrary: 'discovery' })).toBe(
        true,
      )
    }
  })

  const invalid = 'mcp_invalid_builtin_fields'
  const unavailable = 'mcp_builtin_unavailable'
  it.each([
    { entry: template, fields: { w: 8001 }, code: invalid },
    { entry: encoded, fields: { preset: 'webm' }, code: invalid },
    {
      entry: { ...template, fields_schema: { $ref: '#/private-value' } },
      fields: {},
      code: unavailable,
    },
    { entry: { ...template, fields_schema: null }, fields: {}, code: unavailable },
  ])('rejects invalid/unavailable contracts before input access: $code', async ({
    entry,
    fields,
    code,
  }) => {
    catalog([entry])
    const name = builtinShortcuts.find(({ id }) => id === entry.id)?.name ?? ''
    const result = await call(
      await connect(),
      { fields, files: [{ kind: 'url', field: 'f', url: 'https://example.com/private-value' }] },
      name,
    )
    expect(result.isError).toBe(true)
    expect(parseToolPayload(result)).toMatchObject({ errors: [{ code }] })
    expect(JSON.stringify(result)).not.toContain('private-value')
  })

  it.each([
    { ...template, fields_schema: { ...template.fields_schema, allOf: [{ required: ['w'] }] } },
    encoded,
  ])('uses the merged contract rather than generic placeholder guessing: $id', async (entry) => {
    catalog([entry])
    const http = assembly(entry)
    const name = builtinShortcuts.find(({ id }) => id === entry.id)?.name ?? ''
    expect(parseToolPayload(await call(await connect(), undefined, name))).toMatchObject({
      status: 'ok',
    })
    expect(http.get.isDone() && http.post.isDone()).toBe(true)
  })

  it('stops pagination once the requested contract is found', async () => {
    nock(endpoint)
      .get('/templates')
      .query(true)
      .reply(200, {
        items: [
          template,
          ...Array.from({ length: 99 }, (_, i) => ({ id: `builtin/other-${i}@0.0.1` })),
        ],
        count: 1000,
      })
    const later = nock(endpoint).get('/templates').query(true).reply(503)
    const http = assembly(template)
    expect(parseToolPayload(await call(await connect()))).toMatchObject({ status: 'ok' })
    expect(http.post.isDone()).toBe(true)
    expect(later.isDone()).toBe(false)
  })

  it('marks shared executor failures as errors only for shortcuts', async () => {
    catalog()
    nock(endpoint)
      .get(`/templates/${template.id}`)
      .query(true)
      .reply(404, { error: 'TEMPLATE_NOT_FOUND' })
    const result = await call(await connect())
    expect(result.isError).toBe(true)
    expect(parseToolPayload(result)).toMatchObject({ errors: [{ code: 'mcp_template_not_found' }] })
  })

  it('retains names during outages, then reloads contracts for cached clients', async () => {
    nock(endpoint).get('/templates').query(true).reply(403)
    const mcp = await connect()
    const tools = (await mcp.listTools()).tools
    expect(tools).toHaveLength(toolNames.length + builtinShortcuts.length)
    expect(
      tools.find(({ name }) => name === shortcut.name)?.inputSchema.properties?.fields,
    ).toEqual(
      tools.find(({ name }) => name === 'transloadit_create_assembly')?.inputSchema.properties
        ?.fields,
    )
    catalog()
    expect((await call(mcp, { fields: { w: 8001 } })).isError).toBe(true)
    catalog()
    expect((await mcp.listTools()).tools.map(({ name }) => name)).toContain(shortcut.name)
  })

  it('bounds catalog stalls and never retries rate limits', async () => {
    nock(endpoint)
      .get('/templates')
      .query(true)
      .delayConnection(10_000)
      .reply(200, { items: [template] })
    const mcp = await connect()
    expect((await mcp.listTools({}, { timeout: 4000 })).tools).toHaveLength(
      toolNames.length + builtinShortcuts.length,
    )
    const rateLimit = nock(endpoint)
      .get('/templates')
      .query(true)
      .reply(429, {}, { 'retry-after': '10' })
    expect((await mcp.listTools({}, { timeout: 1000 })).tools).toHaveLength(
      toolNames.length + builtinShortcuts.length,
    )
    expect(rateLimit.isDone()).toBe(true)
    catalog()
    expect((await mcp.listTools()).tools).toHaveLength(toolNames.length + 1)
  })

  it('passes schema/null through list_templates and preserves generic string-field creation', async () => {
    catalog([template, { id: 'builtin/legacy@0.0.1', fields_schema: null }, { id: 'workspace' }])
    const mcp = await connect()
    expect(parseToolPayload(await call(mcp, {}, 'transloadit_list_templates')).templates).toEqual([
      expect.objectContaining({ fields_schema: template.fields_schema }),
      expect.objectContaining({ fields_schema: null }),
      { id: 'workspace' },
    ])
    const http = assembly(template)
    expect(
      parseToolPayload(
        await call(
          mcp,
          { instructions: { template_id: template.id }, fields: { w: '300' } },
          'transloadit_create_assembly',
        ),
      ),
    ).toMatchObject({ status: 'ok' })
    expect(http.get.isDone() && http.post.isDone()).toBe(true)
    expect(http.params()).toMatchObject({ fields: { w: '300' } })
  })
})
