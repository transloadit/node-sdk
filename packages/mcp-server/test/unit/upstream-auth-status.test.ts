import type { AddressInfo } from 'node:net'

import type { TransloaditMcpHttpOptions } from '../../src/http.ts'

import { createServer } from 'node:http'

import nock from 'nock'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTransloaditMcpHttpHandler } from '../../src/http.ts'

const resourceMetadataUrl = 'https://api2.transloadit.com/.well-known/oauth-protected-resource/mcp'
const endpoint = 'https://api2.transloadit.com'

const listTemplatesCall = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: { name: 'transloadit_list_templates', arguments: {} },
})

/**
 * MCP OAuth clients refresh a token only on HTTP 401 and re-scope only on HTTP 403 with
 * `error="insufficient_scope"`, so an upstream rejection of a forwarded token must surface at the
 * HTTP level, not only inside the tool result.
 */
describe('upstream token rejections over HTTP', () => {
  const serverOptions: TransloaditMcpHttpOptions = { metricsPath: false }
  const handler = createTransloaditMcpHttpHandler(serverOptions)
  const httpServer = createServer((req, res) => {
    void handler(req, res)
  })
  let url: URL

  const callListTemplates = (): Promise<Response> =>
    fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer expired-oauth-token',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'Mcp-Protocol-Version': '2025-06-18',
      },
      body: listTemplatesCall,
    })

  beforeEach(async () => {
    delete serverOptions.resourceMetadataUrl
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
    const { port } = httpServer.address() as AddressInfo
    url = new URL(`http://127.0.0.1:${port}/mcp`)
  })

  afterEach(async () => {
    await handler.close()
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve())),
    )
    nock.cleanAll()
  })

  it('answers 401 with an invalid_token challenge when API2 rejects a hosted token', async () => {
    serverOptions.resourceMetadataUrl = resourceMetadataUrl
    nock(endpoint).get('/templates').query(true).reply(401, { error: 'BEARER_TOKEN_EXPIRED' })

    const response = await callListTemplates()
    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toBe(
      `Bearer resource_metadata="${resourceMetadataUrl}", error="invalid_token", error_description="Transloadit rejected the credentials; the token may have expired."`,
    )
  })

  it('answers 403 with the tool scopes when API2 rejects a hosted token for scope', async () => {
    serverOptions.resourceMetadataUrl = resourceMetadataUrl
    nock(endpoint).get('/templates').query(true).reply(403, { error: 'INSUFFICIENT_AUTH_SCOPE' })

    const response = await callListTemplates()
    expect(response.status).toBe(403)
    expect(response.headers.get('www-authenticate')).toBe(
      `Bearer resource_metadata="${resourceMetadataUrl}", error="insufficient_scope", error_description="The connected credentials lack the scope this tool needs.", scope="templates:read"`,
    )
  })

  it('keeps successful hosted calls at 200', async () => {
    serverOptions.resourceMetadataUrl = resourceMetadataUrl
    nock(endpoint).get('/templates').query(true).reply(200, { items: [], count: 0 })

    const response = await callListTemplates()
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('"status":"ok"')
  })

  it('keeps self-hosted rejections as tool errors over HTTP 200', async () => {
    nock(endpoint).get('/templates').query(true).reply(401, { error: 'BEARER_TOKEN_EXPIRED' })

    const response = await callListTemplates()
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('mcp_auth_rejected')
  })
})
