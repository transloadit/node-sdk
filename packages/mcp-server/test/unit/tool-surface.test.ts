import type { AddressInfo } from 'node:net'

import { createServer } from 'node:http'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createTransloaditMcpHttpHandler } from '../../src/http.ts'
import { createTransloaditMcpServer } from '../../src/server.ts'
import { toolNames } from '../../src/tool-metadata.ts'
import {
  assemblyResultWidgetMimeType,
  assemblyResultWidgetUri,
} from '../../src/ui/assembly-result-widget.ts'

type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const resourceMetadataUrl = 'https://api2.transloadit.com/.well-known/oauth-protected-resource/mcp'

// Transloadit result buckets plus Cloudflare R2 public buckets, where API2 also stores results.
const resultDomains = ['https://*.transloadit.com', 'https://*.transloadit.net', 'https://*.r2.dev']

// The SDK client strips unknown Tool fields such as `securitySchemes`, so tools/list is read raw.
const parseJsonRpcResult = async (response: Response): Promise<JsonRecord> => {
  const text = await response.text()
  const payload = response.headers.get('content-type')?.includes('text/event-stream')
    ? text
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice('data: '.length))
        .at(-1)
    : text
  if (!payload) throw new Error(`Empty JSON-RPC response: ${text}`)
  const parsed: unknown = JSON.parse(payload)
  if (!isRecord(parsed) || !isRecord(parsed.result)) {
    throw new Error(`Unexpected JSON-RPC response: ${payload}`)
  }
  return parsed.result
}

describe('tool surface', () => {
  const handler = createTransloaditMcpHttpHandler({
    metricsPath: false,
    resourceMetadataUrl,
    upstreamSecret: 'test-upstream-secret',
  })
  const httpServer = createServer((req, res) => {
    void handler(req, res)
  })
  let url: URL

  const call = async (method: string, params: JsonRecord = {}): Promise<JsonRecord> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
    expect(response.status).toBe(200)
    return parseJsonRpcResult(response)
  }

  const listTools = async (): Promise<JsonRecord[]> => {
    const result = await call('tools/list')
    expect(Array.isArray(result.tools)).toBe(true)
    return (result.tools as unknown[]).filter(isRecord)
  }

  const findTool = (tools: JsonRecord[], name: string): JsonRecord => {
    const tool = tools.find((entry) => entry.name === name)
    if (!tool) throw new Error(`Tool ${name} is not listed`)
    return tool
  }

  beforeAll(async () => {
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
    const { port } = httpServer.address() as AddressInfo
    url = new URL(`http://127.0.0.1:${port}/mcp`)
  })

  afterAll(async () => {
    await handler.close()
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve())),
    )
  })

  it('lists every tool with a title, annotations and security schemes in both places', async () => {
    const tools = await listTools()
    expect(tools.map((tool) => tool.name).sort()).toEqual([...toolNames].sort())

    for (const tool of tools) {
      expect(typeof tool.title, String(tool.name)).toBe('string')
      expect(tool.annotations).toMatchObject({
        readOnlyHint: expect.any(Boolean),
        destructiveHint: expect.any(Boolean),
        openWorldHint: expect.any(Boolean),
      })
      expect(Array.isArray(tool.securitySchemes), String(tool.name)).toBe(true)
      expect(isRecord(tool._meta) ? tool._meta.securitySchemes : undefined).toEqual(
        tool.securitySchemes,
      )
    }
  })

  // The hosted endpoint answers every unauthenticated request with the OAuth challenge, so even
  // the documentation tools are declared oauth2 there, with no scopes.
  it.each([
    ['transloadit_list_robots', [{ type: 'oauth2', scopes: [] }]],
    ['transloadit_get_robot_help', [{ type: 'oauth2', scopes: [] }]],
    ['transloadit_lint_assembly_instructions', [{ type: 'oauth2', scopes: [] }]],
    [
      'transloadit_create_assembly',
      [{ type: 'oauth2', scopes: ['assemblies:write', 'templates:read'] }],
    ],
    ['transloadit_get_assembly_status', [{ type: 'oauth2', scopes: ['assemblies:read'] }]],
    ['transloadit_wait_for_assembly', [{ type: 'oauth2', scopes: ['assemblies:read'] }]],
    ['transloadit_list_templates', [{ type: 'oauth2', scopes: ['templates:read'] }]],
    [
      'transloadit_get_profile',
      [{ type: 'oauth2', scopes: ['assemblies:read', 'templates:read'] }],
    ],
  ])('hosted %s declares %j', async (name, securitySchemes) => {
    const tool = findTool(await listTools(), name)
    expect(tool.securitySchemes).toEqual(securitySchemes)
  })

  it('marks only Assembly creation as open-world and destructive', async () => {
    const tools = await listTools()
    const openWorld = tools.filter(
      (tool) => isRecord(tool.annotations) && tool.annotations.openWorldHint === true,
    )
    expect(openWorld.map((tool) => tool.name)).toEqual(['transloadit_create_assembly'])
    // Export Robots such as /s3/store can overwrite files at the destination.
    const destructive = tools.filter(
      (tool) => isRecord(tool.annotations) && tool.annotations.destructiveHint === true,
    )
    expect(destructive.map((tool) => tool.name)).toEqual(['transloadit_create_assembly'])
    const readOnly = tools.filter(
      (tool) => isRecord(tool.annotations) && tool.annotations.readOnlyHint === true,
    )
    expect(readOnly).toHaveLength(tools.length - 1)
  })

  it('declares ChatGPT file params with exactly the OpenAI file object schema', async () => {
    const tool = findTool(await listTools(), 'transloadit_create_assembly')
    expect(isRecord(tool._meta) ? tool._meta['openai/fileParams'] : undefined).toEqual([
      'attachments',
    ])

    const inputSchema = isRecord(tool.inputSchema) ? tool.inputSchema : {}
    const properties = isRecord(inputSchema.properties) ? inputSchema.properties : {}
    const attachments = isRecord(properties.attachments) ? properties.attachments : {}
    expect(attachments.type).toBe('array')
    expect(attachments.items).toEqual({
      type: 'object',
      properties: {
        download_url: { type: 'string' },
        file_id: { type: 'string' },
        mime_type: { type: 'string' },
        file_name: { type: 'string' },
      },
      required: ['download_url', 'file_id'],
      additionalProperties: false,
    })
    expect(JSON.stringify(properties.files)).toContain('base64')
  })

  it('links the Assembly tools to the result widget with short status strings', async () => {
    const tools = await listTools()
    for (const name of ['transloadit_create_assembly', 'transloadit_wait_for_assembly']) {
      const meta = findTool(tools, name)._meta
      expect(isRecord(meta) ? meta.ui : undefined).toEqual({ resourceUri: assemblyResultWidgetUri })
      expect(isRecord(meta) ? meta['openai/outputTemplate'] : undefined).toBe(
        assemblyResultWidgetUri,
      )
    }
    for (const tool of tools) {
      if (!isRecord(tool._meta)) continue
      for (const key of ['openai/toolInvocation/invoking', 'openai/toolInvocation/invoked']) {
        const value = tool._meta[key]
        if (value === undefined) continue
        expect(typeof value).toBe('string')
        expect(String(value).length).toBeLessThanOrEqual(64)
      }
    }
  })

  it('marks the profile tool for multi-account hosts', async () => {
    const tool = findTool(await listTools(), 'transloadit_get_profile')
    expect(isRecord(tool._meta) ? tool._meta['openai/profile'] : undefined).toBe(true)
    expect(tool.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: false })
    expect(tool.inputSchema).toMatchObject({ type: 'object', additionalProperties: false })
    expect(tool.outputSchema).toMatchObject({ required: ['id'] })
  })

  it('lists and serves the Assembly result widget with a CSP for result origins', async () => {
    const listed = await call('resources/list')
    const resources = (listed.resources as unknown[]).filter(isRecord)
    const widget = resources.find((resource) => resource.uri === assemblyResultWidgetUri)
    expect(widget).toMatchObject({
      mimeType: assemblyResultWidgetMimeType,
      _meta: {
        ui: {
          csp: { connectDomains: resultDomains, resourceDomains: resultDomains },
        },
        'openai/widgetDescription': expect.any(String),
        'openai/widgetCSP': {
          connect_domains: resultDomains,
          resource_domains: resultDomains,
        },
      },
    })

    const read = await call('resources/read', { uri: assemblyResultWidgetUri })
    const contents = (read.contents as unknown[]).filter(isRecord)
    expect(contents).toHaveLength(1)
    const html = String(contents[0]?.text)
    expect(contents[0]).toMatchObject({
      uri: assemblyResultWidgetUri,
      mimeType: assemblyResultWidgetMimeType,
    })
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('ui/notifications/tool-result')
    expect(html).toContain('Save as Template')
    expect(html).not.toMatch(/<script[^>]+src=/)
  })
})

describe('result widget domains', () => {
  it('uses configured result domains for the widget CSP', async () => {
    const server = createTransloaditMcpServer({ resultDomains: ['https://cdn.example.com'] })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'result-domains', version: '1.0.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const { contents } = await client.readResource({ uri: assemblyResultWidgetUri })
    expect(contents[0]?._meta).toMatchObject({
      ui: {
        csp: {
          connectDomains: ['https://cdn.example.com'],
          resourceDomains: ['https://cdn.example.com'],
        },
      },
      'openai/widgetCSP': {
        connect_domains: ['https://cdn.example.com'],
        resource_domains: ['https://cdn.example.com'],
      },
    })
    await client.close()
    await server.close()
  })
})

// The SDK client drops Tool fields it does not know, such as the top-level securitySchemes.
const rawToolsListSchema = z.object({ tools: z.array(z.record(z.string(), z.unknown())) })

const connectInMemory = async (
  server: ReturnType<typeof createTransloaditMcpServer>,
): Promise<Client> => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'tool-surface', version: '1.0.0' })
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

const listRawTools = async (
  options: Parameters<typeof createTransloaditMcpServer>[0],
): Promise<JsonRecord[]> => {
  const server = createTransloaditMcpServer(options)
  const client = await connectInMemory(server)
  const { tools } = await client.request({ method: 'tools/list' }, rawToolsListSchema)
  await client.close()
  await server.close()
  return tools
}

const schemesByName = (tools: JsonRecord[]): Record<string, unknown> =>
  Object.fromEntries(tools.map((tool) => [tool.name, tool.securitySchemes]))

describe('security schemes outside hosted mode', () => {
  it('declares the documentation tools noauth and the account tools oauth2 without credentials', async () => {
    const schemes = schemesByName(await listRawTools({}))

    expect(schemes.transloadit_list_robots).toEqual([{ type: 'noauth' }])
    expect(schemes.transloadit_get_robot_help).toEqual([{ type: 'noauth' }])
    expect(schemes.transloadit_lint_assembly_instructions).toEqual([{ type: 'noauth' }])
    expect(schemes.transloadit_create_assembly).toEqual([
      { type: 'oauth2', scopes: ['assemblies:write', 'templates:read'] },
    ])
    expect(schemes.transloadit_list_templates).toEqual([
      { type: 'oauth2', scopes: ['templates:read'] },
    ])
  })

  it('declares every tool noauth when the server holds Auth Key credentials', async () => {
    const tools = await listRawTools({ authKey: 'key', authSecret: 'secret' })

    expect(new Set(tools.map((tool) => JSON.stringify(tool.securitySchemes)))).toEqual(
      new Set([JSON.stringify([{ type: 'noauth' }])]),
    )
  })
})

describe('tools registered after creation', () => {
  it('stay discoverable, with their own securitySchemes mirrored to the top level', async () => {
    const server = createTransloaditMcpServer({})
    server.registerTool(
      'custom_echo',
      {
        description: 'Echo for embedders',
        inputSchema: z.object({ text: z.string() }),
        _meta: { securitySchemes: [{ type: 'noauth' }] },
      },
      ({ text }) => ({ content: [{ type: 'text', text }] }),
    )
    const client = await connectInMemory(server)

    const { tools } = await client.request({ method: 'tools/list' }, rawToolsListSchema)
    const custom = tools.find((tool) => tool.name === 'custom_echo')
    expect(custom).toMatchObject({
      description: 'Echo for embedders',
      securitySchemes: [{ type: 'noauth' }],
    })
    expect(tools).toHaveLength(toolNames.length + 1)
    await client.close()
    await server.close()
  })
})

describe('direct server construction', () => {
  it.each([
    [
      { maxUrlDownloadBytes: Number.NaN },
      'maxUrlDownloadBytes must be a positive integer number of bytes.',
    ],
    [
      { urlDownloadTimeoutMs: 0 },
      'urlDownloadTimeoutMs must be a positive integer number of milliseconds.',
    ],
  ])('refuses %j', (options, message) => {
    expect(() => createTransloaditMcpServer(options)).toThrow(message)
  })
})
