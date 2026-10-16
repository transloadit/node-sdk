import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import nock from 'nock'
import { afterEach, describe, expect, it } from 'vitest'

import { deriveShortcutFieldsSchema, validateBuiltinFields } from '../../src/builtin-shortcuts.ts'
import { createTransloaditMcpServer } from '../../src/server.ts'
import { parseToolPayload } from '../e2e/mcp-client.ts'

const endpoint = 'https://api2.transloadit.com'
const template = {
  id: 'builtin/prepare-image@0.0.1',
  name: 'builtin/prepare-image@0.0.1',
  builtin_version: '0.0.1',
  description: 'Prepare an image',
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
    steps: { ':original': { robot: '/upload/handle' } },
  },
}

describe('Builtin field contracts', () => {
  it('derives caller fields from catalog constraints, allowing omitted template defaults', () => {
    expect(deriveShortcutFieldsSchema(template)).toEqual({
      ...template.fields_schema,
      $id: expect.any(String),
      required: [],
      default: template.content.fields,
    })
    expect(template.fields_schema.required).toEqual(['w', 'strip'])
  })

  it('merges content.fields before validating and preserves explicit false, zero and null', () => {
    expect(validateBuiltinFields(template, { w: 300, strip: false, bg: null })).toEqual({
      w: 300,
      strip: false,
      bg: null,
    })
    expect(validateBuiltinFields(template)).toEqual(template.content.fields)
    expect(() => validateBuiltinFields(template, { w: 0 })).toThrow('Invalid Builtin fields')
    expect(() => validateBuiltinFields(template, { w: '300' })).toThrow('Invalid Builtin fields')
    expect(() => validateBuiltinFields(template, { w: 8001 })).toThrow('Invalid Builtin fields')
    expect(validateBuiltinFields({ ...template, fields_schema: null }, { w: 0 })).toEqual({
      ...template.content.fields,
      w: 0,
    })
  })

  it('treats null or absent schemas as undeclared, without inventing constraints', () => {
    expect(deriveShortcutFieldsSchema({ ...template, fields_schema: null })).toBeUndefined()
    expect(deriveShortcutFieldsSchema({ content: template.content })).toBeUndefined()
  })

  it.each([
    { schema: { allOf: [{ required: ['width'] }] }, fields: {} },
    { schema: { dependencies: { width: ['height'] } }, fields: { width: 320 } },
    {
      schema: {
        oneOf: [
          { properties: { mode: { const: 'image' } }, required: ['mode', 'width'] },
          { properties: { mode: { const: 'video' } }, required: ['mode', 'height'] },
        ],
      },
      fields: {},
    },
    { schema: { minProperties: 3 }, fields: {} },
  ])('does not advertise constraints that reject valid default-merged calls: %j', async (input) => {
    const contract = {
      fields_schema: { type: 'object', ...input.schema },
      content: { fields: { mode: 'video', width: 1600, height: 900 } },
    }
    expect(validateBuiltinFields(contract, input.fields)).toEqual({
      ...contract.content.fields,
      ...input.fields,
    })
    const { Ajv } = await import('ajv')
    const validate = new Ajv({ strict: false }).compile({
      type: 'object',
      properties: { fields: deriveShortcutFieldsSchema(contract) ?? { type: 'object' } },
    })
    expect(validate({ fields: input.fields })).toBe(true)
  })

  it('identifies the invalid field and rule without disclosing caller values', () => {
    expect(() => validateBuiltinFields(template, { w: 8001 })).toThrow(
      'Invalid Builtin fields: fields.w violates maximum.',
    )
    expect(() => validateBuiltinFields(template, { w: 'private-value' })).toThrow(
      'Invalid Builtin fields: fields.w violates type.',
    )
    expect(() => validateBuiltinFields(template, { w: 'private-value' })).not.toThrow(
      'private-value',
    )
  })

  it('reports the containing field for nested requirements', () => {
    expect(() =>
      validateBuiltinFields({
        fields_schema: {
          type: 'object',
          properties: {
            width: { type: 'integer' },
            options: { type: 'object', required: ['width'] },
          },
        },
        content: { fields: { width: 320, options: {} } },
      }),
    ).toThrow('Invalid Builtin fields: fields.options violates required.')
  })

  it('summarizes failed union branches instead of blaming an irrelevant branch requirement', () => {
    expect(() =>
      validateBuiltinFields({
        fields_schema: {
          type: 'object',
          properties: { kind: {}, width: {}, height: {} },
          anyOf: [
            { properties: { kind: { const: 'image' } }, required: ['width'] },
            { properties: { kind: { const: 'video' }, height: { type: 'integer' } } },
          ],
        },
        content: { fields: { kind: 'video', height: 'private-value' } },
      }),
    ).toThrow('Invalid Builtin fields: fields violates anyOf.')
  })

  it('keeps standalone draft-07 references valid when embedded under the tool’s fields input', async () => {
    const { Ajv } = await import('ajv')
    const referenced = {
      ...template,
      fields_schema: {
        type: 'object',
        definitions: { width: { type: 'integer', maximum: 1920 } },
        properties: { width: { $ref: '#/definitions/width' } },
      },
    }
    const validator = new Ajv().compile({
      type: 'object',
      properties: { fields: deriveShortcutFieldsSchema(referenced) },
    })
    expect(validator({ fields: { width: 1920 } })).toBe(true)
    expect(validator({ fields: { width: 1921 } })).toBe(false)
  })

  it('validates cross-field rules after merging defaults without exposing input values', () => {
    const conditional = {
      ...template,
      fields_schema: {
        type: 'object',
        if: { properties: { strip: { const: true } } },
        // biome-ignore lint/suspicious/noThenProperty: JSON Schema's conditional keyword is not a thenable.
        then: { not: { required: ['password'] } },
      },
    }
    expect(() => validateBuiltinFields(conditional, { password: 'private-value' })).toThrow(
      'Invalid Builtin fields',
    )
    expect(() => validateBuiltinFields(conditional, { password: 'private-value' })).not.toThrow(
      'private-value',
    )
    expect(validateBuiltinFields(conditional, { strip: false, password: 'private-value' })).toEqual(
      { ...template.content.fields, strip: false, password: 'private-value' },
    )
  })

  it('gates legacy webm in both the derived schema and execution until api2#9960 deploys', () => {
    const encoding = {
      id: 'builtin/encode-video@0.0.1',
      fields_schema: {
        type: 'object',
        properties: { preset: { type: 'string', enum: ['webm', 'web/webm/720p', 'ipad'] } },
      },
      content: { fields: { preset: 'ipad', turbo: true } },
    }
    expect(deriveShortcutFieldsSchema(encoding)).toMatchObject({
      properties: { preset: { enum: ['web/webm/720p', 'ipad'] } },
    })
    expect(() => validateBuiltinFields(encoding, { preset: 'webm' })).toThrow('unavailable')
    expect(validateBuiltinFields(encoding, { preset: 'web/webm/720p' }).preset).toBe(
      'web/webm/720p',
    )
  })
})

describe('Builtin shortcut protocol', () => {
  let client: Client | undefined
  let server: ReturnType<typeof createTransloaditMcpServer> | undefined

  const connect = async (): Promise<Client> => {
    server = createTransloaditMcpServer({ authKey: 'key', authSecret: 'secret' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'builtin-shortcuts', version: '1.0.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    return client
  }

  const catalog = (items: unknown[] = [template]) =>
    nock(endpoint).get('/templates').query(true).reply(200, { items, count: items.length })

  afterEach(async () => {
    await client?.close()
    await server?.close()
    nock.cleanAll()
  })

  it('advertises catalog-derived fields and shared upload, auth and widget metadata', async () => {
    const api = catalog()
    const mcp = await connect()
    const { tools } = await mcp.listTools()
    expect(api.isDone()).toBe(true)
    const shortcut = tools.find((tool) => tool.name === 'transloadit_prepare_image')
    expect(shortcut?.inputSchema.properties?.fields).toEqual(deriveShortcutFieldsSchema(template))
    expect(shortcut?.inputSchema.properties).not.toHaveProperty('instructions')
    expect(shortcut?.inputSchema.properties).not.toHaveProperty('assembly_url')
    expect(shortcut?.inputSchema.properties).toHaveProperty('attachments')
    expect(shortcut?._meta).toMatchObject({
      'openai/fileParams': ['attachments'],
      securitySchemes: [{ type: 'noauth' }],
      ui: { resourceUri: 'ui://transloadit/assembly-result' },
    })
    expect(shortcut?.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false })
    expect(tools.find((tool) => tool.name === 'transloadit_create_assembly')).toBeDefined()
  })

  it('requires fields when the catalog has required properties without template defaults', async () => {
    catalog([{ ...template, content: { ...template.content, fields: { strip: true } } }])
    const mcp = await connect()
    const { tools } = await mcp.listTools()
    const shortcut = tools.find((tool) => tool.name === 'transloadit_prepare_image')
    expect(shortcut?.inputSchema.required).toContain('fields')
    expect(shortcut?.inputSchema.properties?.fields).toMatchObject({ required: ['w'] })
  })

  it('classifies broken catalog schemas as unavailable without exposing compiler errors', async () => {
    catalog([{ ...template, fields_schema: { $ref: '#/catalog-private-value' } }])
    const mcp = await connect()
    const result = await mcp.callTool({ name: 'transloadit_prepare_image', arguments: {} })
    expect(result.isError).toBe(true)
    expect(parseToolPayload(result)).toMatchObject({
      errors: [{ code: 'mcp_builtin_unavailable' }],
    })
    expect(JSON.stringify(result)).not.toContain('catalog-private-value')
  })

  it.each([
    { $ref: '#/catalog-private-value' },
    { type: 'object', required: [42] },
  ])('keeps malformed catalog schemas out of discovery: %j', async (fieldsSchema) => {
    catalog([{ ...template, fields_schema: fieldsSchema }])
    const mcp = await connect()
    const { tools } = await mcp.listTools()
    expect(tools).toHaveLength(9)
    const shortcut = tools.find((tool) => tool.name === 'transloadit_prepare_image')
    const generic = tools.find((tool) => tool.name === 'transloadit_create_assembly')
    expect(shortcut?.inputSchema.properties?.fields).toEqual(
      generic?.inputSchema.properties?.fields,
    )
    const { Ajv } = await import('ajv')
    const validate = new Ajv().compile({
      type: 'object',
      properties: { fields: shortcut?.inputSchema.properties?.fields },
    })
    expect(validate({ fields: { arbitrary: 'unconstrained during discovery' } })).toBe(true)
  })

  it('marks errors from the shared Assembly executor as shortcut failures', async () => {
    catalog()
    nock(endpoint)
      .get(`/templates/${template.id}`)
      .query(true)
      .reply(404, { error: 'TEMPLATE_NOT_FOUND' })
    const mcp = await connect()
    const result = await mcp.callTool({
      name: 'transloadit_prepare_image',
      arguments: { expected_uploads: 1 },
    })
    expect(result.isError).toBe(true)
    expect(parseToolPayload(result)).toMatchObject({
      errors: [{ code: 'mcp_template_not_found' }],
    })
  })

  it('creates an Assembly using template_id and merged typed fields over HTTP', async () => {
    const discovery = catalog()
    const get = nock(endpoint).get(`/templates/${template.id}`).query(true).reply(200, template)
    let receivedBody = ''
    const create = nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/, (body) => {
        receivedBody = String(body)
        return true
      })
      .reply(200, { ok: 'ASSEMBLY_COMPLETED' })
    const mcp = await connect()
    const result = await mcp.callTool({
      name: 'transloadit_prepare_image',
      arguments: { fields: { strip: false }, expected_uploads: 1 },
    })
    expect(parseToolPayload(result)).toMatchObject({ status: 'ok' })
    expect(discovery.isDone()).toBe(true)
    expect(get.isDone()).toBe(true)
    expect(create.isDone()).toBe(true)
    const match = receivedBody.match(/name="params"\r\n\r\n([^\r]+)\r\n/)
    expect(match?.[1]).toBeDefined()
    const params = JSON.parse(match?.[1] ?? '{}')
    expect(params).toMatchObject({
      template_id: template.id,
      fields: { ...template.content.fields, strip: false },
    })
    expect(params).not.toHaveProperty('steps')
  })

  it('uses a permissive caller schema for default-sensitive compositions and validates execution', async () => {
    const composed = {
      ...template,
      fields_schema: { ...template.fields_schema, allOf: [{ required: ['w'] }] },
    }
    catalog([composed])
    const mcp = await connect()
    const { tools } = await mcp.listTools()
    const shortcut = tools.find((tool) => tool.name === 'transloadit_prepare_image')
    const generic = tools.find((tool) => tool.name === 'transloadit_create_assembly')
    expect(shortcut?.inputSchema.properties?.fields).toEqual(
      generic?.inputSchema.properties?.fields,
    )
    catalog([composed])
    nock(endpoint).get(`/templates/${template.id}`).query(true).reply(200, composed)
    const create = nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(200, { ok: 'ASSEMBLY_COMPLETED' })
    const result = await mcp.callTool({
      name: 'transloadit_prepare_image',
      arguments: { fields: {}, expected_uploads: 1 },
    })
    expect(parseToolPayload(result)).toMatchObject({ status: 'ok' })
    expect(create.isDone()).toBe(true)
  })

  it('stops catalog pagination once the requested shortcut contract is found', async () => {
    nock(endpoint)
      .get('/templates')
      .query(true)
      .reply(200, {
        items: [
          template,
          ...Array.from({ length: 99 }, (_, index) => ({ id: `builtin/other-${index}@0.0.1` })),
        ],
        count: 1000,
      })
    const unrelatedPage = nock(endpoint)
      .get('/templates')
      .query(true)
      .reply(503, { error: 'UNAVAILABLE' })
    nock(endpoint).get(`/templates/${template.id}`).query(true).reply(200, template)
    const create = nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(200, { ok: 'ASSEMBLY_COMPLETED' })
    const mcp = await connect()
    const result = await mcp.callTool({
      name: 'transloadit_prepare_image',
      arguments: { expected_uploads: 1 },
    })
    expect(parseToolPayload(result)).toMatchObject({ status: 'ok' })
    expect(create.isDone()).toBe(true)
    expect(unrelatedPage.isDone()).toBe(false)
  })

  it('rejects invalid fields before fetching inputs or creating an Assembly', async () => {
    catalog()
    const mcp = await connect()
    const result = await mcp.callTool({
      name: 'transloadit_prepare_image',
      arguments: {
        fields: { w: 8001 },
        files: [{ kind: 'url', field: 'f', url: 'https://example.com/private' }],
      },
    })
    expect(result.isError).toBe(true)
    expect(parseToolPayload(result)).toMatchObject({
      errors: [{ code: 'mcp_invalid_builtin_fields' }],
    })
  })

  it('uses the catalog contract for optional placeholders instead of generic required-field guessing', async () => {
    const encoding = {
      ...template,
      id: 'builtin/encode-video@0.0.1',
      fields_schema: { type: 'object', properties: { width: { type: ['integer', 'null'] } } },
      content: {
        fields: { preset: 'web/mp4/720p', turbo: true },
        steps: {
          ':original': { robot: '/upload/handle' },
          filter: { robot: '/file/filter', accepts: [['${fields.width}', '!empty', '']] },
        },
      },
    }
    catalog([encoding])
    const get = nock(endpoint).get(`/templates/${encoding.id}`).query(true).reply(200, encoding)
    const create = nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(200, { ok: 'ASSEMBLY_COMPLETED' })
    const mcp = await connect()
    const result = await mcp.callTool({
      name: 'transloadit_encode_video',
      arguments: { expected_uploads: 1 },
    })
    expect(parseToolPayload(result)).toMatchObject({ status: 'ok' })
    expect(get.isDone()).toBe(true)
    expect(create.isDone()).toBe(true)
  })

  it('passes schema metadata and null through the generic list mapper; workspace items omit it', async () => {
    catalog([
      template,
      { id: 'builtin/old@0.0.1', fields_schema: null },
      { id: 'workspace-template' },
    ])
    const mcp = await connect()
    const payload = parseToolPayload(
      await mcp.callTool({ name: 'transloadit_list_templates', arguments: {} }),
    )
    expect(payload.templates).toEqual([
      expect.objectContaining({ fields_schema: template.fields_schema }),
      expect.objectContaining({ fields_schema: null }),
      { id: 'workspace-template' },
    ])
  })

  it('keeps approved names discoverable after a catalog failure and validates later calls', async () => {
    const failed = nock(endpoint)
      .get('/templates')
      .query(true)
      .reply(403, { error: 'INSUFFICIENT_SCOPE' })
    const mcp = await connect()
    const unavailable = await mcp.listTools()
    expect(failed.isDone()).toBe(true)
    expect(unavailable.tools).toHaveLength(17)
    const shortcut = unavailable.tools.find((tool) => tool.name === 'transloadit_prepare_image')
    const generic = unavailable.tools.find((tool) => tool.name === 'transloadit_create_assembly')
    expect(shortcut?.inputSchema.properties?.fields).toEqual(
      generic?.inputSchema.properties?.fields,
    )
    catalog()
    const invalid = await mcp.callTool({
      name: 'transloadit_prepare_image',
      arguments: { fields: { w: 8001 } },
    })
    expect(invalid.isError).toBe(true)
    expect(parseToolPayload(invalid)).toMatchObject({
      errors: [{ code: 'mcp_invalid_builtin_fields' }],
    })
    catalog()
    expect(
      (await mcp.listTools()).tools.some((tool) => tool.name === 'transloadit_prepare_image'),
    ).toBe(true)
  })

  it('bounds stalled catalog discovery and does not retry rate limits', async () => {
    nock(endpoint)
      .get('/templates')
      .query(true)
      .delayConnection(10_000)
      .reply(200, {
        items: [template],
        count: 1,
      })
    const mcp = await connect()
    expect((await mcp.listTools({}, { timeout: 4000 })).tools).toHaveLength(17)
    const limited = nock(endpoint)
      .get('/templates')
      .query(true)
      .reply(429, { error: 'RATE_LIMIT_REACHED' }, { 'retry-after': '10' })
    expect((await mcp.listTools({}, { timeout: 1000 })).tools).toHaveLength(17)
    expect(limited.isDone()).toBe(true)
    catalog()
    expect((await mcp.listTools()).tools).toHaveLength(9)
  })

  it('does not advertise or execute shortcuts with no declared catalog contract', async () => {
    catalog([{ ...template, fields_schema: null }])
    const mcp = await connect()
    expect((await mcp.listTools()).tools).toHaveLength(8)
    catalog([])
    const result = await mcp.callTool({ name: 'transloadit_prepare_image', arguments: {} })
    expect(result.isError).toBe(true)
    expect(parseToolPayload(result)).toMatchObject({
      errors: [{ code: 'mcp_builtin_unavailable' }],
    })
  })

  it('leaves generic Assembly field behavior unchanged without consulting the catalog', async () => {
    const get = nock(endpoint).get(`/templates/${template.id}`).query(true).reply(200, template)
    const create = nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(200, { ok: 'ASSEMBLY_COMPLETED' })
    const mcp = await connect()
    const result = await mcp.callTool({
      name: 'transloadit_create_assembly',
      arguments: { instructions: { template_id: template.id }, fields: { w: '300' } },
    })
    expect(parseToolPayload(result)).toMatchObject({ status: 'ok' })
    expect(get.isDone()).toBe(true)
    expect(create.isDone()).toBe(true)
  })
})
