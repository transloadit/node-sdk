import type { AddressInfo } from 'node:net'

import type { TransloaditMcpHttpOptions } from '../../src/http.ts'

import { createServer } from 'node:http'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Transloadit } from '@transloadit/node'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTransloaditMcpHttpHandler } from '../../src/http.ts'

const resourceMetadataUrl = 'https://api2.transloadit.com/.well-known/oauth-protected-resource/mcp'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const wwwAuthenticate = (result: { _meta?: Record<string, unknown> }): string => {
  const values = result._meta?.['mcp/www_authenticate']
  if (!Array.isArray(values) || typeof values[0] !== 'string') {
    throw new Error('Expected _meta["mcp/www_authenticate"] to be a list of header values')
  }
  return values[0]
}

const apiRejection = (statusCode: number): Error =>
  Object.assign(new Error('Rejected'), { response: { statusCode } })

describe('tool auth errors', () => {
  const serverOptions: TransloaditMcpHttpOptions = { metricsPath: false }
  const handler = createTransloaditMcpHttpHandler(serverOptions)
  const httpServer = createServer((req, res) => {
    void handler(req, res)
  })
  let url: URL
  let client: Client

  const connect = async (headers: Record<string, string> = {}): Promise<void> => {
    client = new Client({ name: 'auth-errors', version: '1.0.0' })
    await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers } }))
  }

  beforeEach(async () => {
    delete serverOptions.authKey
    delete serverOptions.authSecret
    delete serverOptions.resourceMetadataUrl
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
    const { port } = httpServer.address() as AddressInfo
    url = new URL(`http://127.0.0.1:${port}/mcp`)
  })

  afterEach(async () => {
    await client?.close()
    await handler.close()
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve())),
    )
    vi.restoreAllMocks()
  })

  it.each([
    'transloadit_create_assembly',
    'transloadit_get_assembly_status',
    'transloadit_wait_for_assembly',
    'transloadit_list_templates',
    'transloadit_get_profile',
  ])('%s asks the host to link an account when no credentials exist', async (name) => {
    await connect()
    const result = await client.callTool({
      name,
      arguments:
        name.endsWith('assembly_status') || name.endsWith('for_assembly')
          ? { assembly_id: '0123456789abcdef0123456789abcdef' }
          : {},
    })
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_missing_auth' }],
    })
    expect(wwwAuthenticate(result)).toMatch(
      /^Bearer error="insufficient_scope", error_description="[^"]+"$/,
    )
  })

  it('includes the resource metadata URL in the challenge when hosted', async () => {
    serverOptions.resourceMetadataUrl = resourceMetadataUrl
    vi.spyOn(Transloadit.prototype, 'listTemplates').mockRejectedValue(apiRejection(401))
    await connect({ Authorization: 'Bearer expired-token' })

    const result = await client.callTool({ name: 'transloadit_list_templates', arguments: {} })
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_auth_rejected' }],
    })
    expect(wwwAuthenticate(result)).toBe(
      `Bearer resource_metadata="${resourceMetadataUrl}", error="invalid_token", error_description="Transloadit rejected the credentials; the token may have expired."`,
    )
  })

  it('reports rejected tokens on Assembly tools without leaking the API response', async () => {
    vi.spyOn(Transloadit.prototype, 'getAssembly').mockRejectedValue(apiRejection(401))
    await connect({ Authorization: 'Bearer expired-token' })

    const result = await client.callTool({
      name: 'transloadit_get_assembly_status',
      arguments: { assembly_id: '0123456789abcdef0123456789abcdef' },
    })
    expect(result.isError).toBe(true)
    expect(wwwAuthenticate(result)).toContain('error="invalid_token"')
    const content = Array.isArray(result.content) ? result.content[0] : undefined
    expect(isRecord(content) ? content.text : undefined).not.toContain('Rejected')
  })

  it('leaves other API failures as ordinary tool errors', async () => {
    vi.spyOn(Transloadit.prototype, 'getAssembly').mockRejectedValue(apiRejection(500))
    await connect({ Authorization: 'Bearer token' })

    const result = await client.callTool({
      name: 'transloadit_get_assembly_status',
      arguments: { assembly_id: '0123456789abcdef0123456789abcdef' },
    })
    expect(result.isError).toBe(true)
    expect(result._meta?.['mcp/www_authenticate']).toBeUndefined()
  })
})

describe('profile tool', () => {
  const handler = createTransloaditMcpHttpHandler({ metricsPath: false })
  const httpServer = createServer((req, res) => {
    void handler(req, res)
  })
  let client: Client

  beforeEach(async () => {
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
    const { port } = httpServer.address() as AddressInfo
    client = new Client({ name: 'profile', version: '1.0.0' })
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
        requestInit: { headers: { Authorization: 'Bearer token' } },
      }),
    )
  })

  afterEach(async () => {
    await client?.close()
    await handler.close()
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve())),
    )
    vi.restoreAllMocks()
  })

  it('returns the Workspace behind the latest Assembly', async () => {
    vi.spyOn(Transloadit.prototype, 'listAssemblies').mockResolvedValue({
      items: [{ id: 'abcdef', account_id: 'ws_1' }],
      count: 1,
    })
    vi.spyOn(Transloadit.prototype, 'getAssembly').mockResolvedValue({
      ok: 'ASSEMBLY_COMPLETED',
      account_id: 'ws_1',
      account_name: 'Acme Media',
      account_slug: 'acme',
    })

    const result = await client.callTool({ name: 'transloadit_get_profile', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(result.structuredContent).toEqual({ id: 'ws_1', name: 'Acme Media', nickname: 'acme' })
  })

  it('falls back to an owned Template when no Assembly exists', async () => {
    vi.spyOn(Transloadit.prototype, 'listAssemblies').mockResolvedValue({ items: [], count: 0 })
    vi.spyOn(Transloadit.prototype, 'listTemplates').mockResolvedValue({
      items: [{ id: 'tpl_1', name: 'resize', content: {}, account_id: 'ws_2' }],
      count: 1,
    })

    const result = await client.callTool({ name: 'transloadit_get_profile', arguments: {} })
    expect(result.structuredContent).toEqual({ id: 'ws_2' })
  })

  it('explains when the Workspace cannot be resolved yet', async () => {
    vi.spyOn(Transloadit.prototype, 'listAssemblies').mockResolvedValue({ items: [], count: 0 })
    vi.spyOn(Transloadit.prototype, 'listTemplates').mockResolvedValue({ items: [], count: 0 })

    const result = await client.callTool({ name: 'transloadit_get_profile', arguments: {} })
    expect(result.structuredContent).toMatchObject({
      status: 'error',
      errors: [{ code: 'mcp_profile_unavailable' }],
    })
  })
})
