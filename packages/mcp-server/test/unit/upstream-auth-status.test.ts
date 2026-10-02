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

  it('keeps a batch at 200 so a client never replays the calls that already succeeded', async () => {
    serverOptions.resourceMetadataUrl = resourceMetadataUrl
    nock(endpoint).get('/templates').query(true).reply(401, { error: 'BEARER_TOKEN_EXPIRED' })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer expired-oauth-token',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify([
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'transloadit_list_robots', arguments: { limit: 1 } },
        },
        { ...JSON.parse(listTemplatesCall), id: 2 },
      ]),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('www-authenticate')).toBeNull()
    const body = await response.text()
    expect(body).toContain('"status":"ok"')
    expect(body).toContain('mcp_auth_rejected')
  })

  it('reports an Auth Key mismatch as a tool error, not an OAuth challenge', async () => {
    serverOptions.resourceMetadataUrl = resourceMetadataUrl
    nock(endpoint)
      .post(/\/assemblies/)
      .reply(403, {
        error: 'BEARER_TOKEN_AUTH_KEY_MISMATCH',
        message: 'Bearer token auth key mismatch',
      })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer expired-oauth-token',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'transloadit_create_assembly',
          arguments: {
            instructions: {
              auth: { key: 'another-auth-key' },
              steps: { resized: { robot: '/image/resize', width: 1 } },
            },
          },
        },
      }),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('www-authenticate')).toBeNull()
    const body = await response.text()
    expect(body).toContain('mcp_auth_key_mismatch')
    expect(body).not.toContain('mcp/www_authenticate')
  })

  const createAssemblyCall = (): Promise<Response> =>
    fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer expiring-oauth-token',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'transloadit_create_assembly',
          arguments: {
            instructions: { steps: { resized: { robot: '/image/resize', width: 1 } } },
            wait_for_completion: true,
          },
        },
      }),
    })

  it('does not ask for a replay when the token expires after the Assembly was created', async () => {
    serverOptions.resourceMetadataUrl = resourceMetadataUrl
    let createdId: string | undefined
    nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply((uri) => {
        createdId = uri.split('/').at(-1)
        return [
          200,
          {
            ok: 'ASSEMBLY_EXECUTING',
            assembly_id: createdId,
            assembly_ssl_url: `${endpoint}/assemblies/${createdId}`,
          },
        ]
      })
    nock(endpoint)
      .get(/\/assemblies\/[a-f\d]{32}$/)
      .query(true)
      .reply(401, { error: 'BEARER_TOKEN_EXPIRED' })

    const response = await createAssemblyCall()
    expect(response.status).toBe(200)
    expect(response.headers.get('www-authenticate')).toBeNull()
    const body = await response.text()
    expect(body).toContain('mcp_assembly_status_unavailable')
    expect(body).toContain(`${endpoint}/assemblies/${createdId}`)
    expect(body).not.toContain('mcp/www_authenticate')
  })

  it('still challenges when API2 rejects the token on the creation request itself', async () => {
    serverOptions.resourceMetadataUrl = resourceMetadataUrl
    nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(401, { error: 'BEARER_TOKEN_EXPIRED' })

    const response = await createAssemblyCall()
    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toContain('error="invalid_token"')
  })

  it('reports a creation response error itself, not a created-but-unreadable Assembly', async () => {
    serverOptions.resourceMetadataUrl = resourceMetadataUrl
    nock(endpoint)
      .post(/\/assemblies\/[a-f\d]{32}$/)
      .reply(200, {
        error: 'INVALID_SIGNATURE',
        message: 'The given signature does not match ours. This Auth Key requires sha256.',
      })

    const response = await createAssemblyCall()
    const body = await response.text()
    expect(body).toContain('mcp_invalid_signature')
    expect(body).not.toContain('mcp_assembly_status_unavailable')
  })

  it('checks a forwarded token before downloading any URL input', async () => {
    serverOptions.resourceMetadataUrl = resourceMetadataUrl
    nock(endpoint).get('/templates').query(true).reply(401, { error: 'BEARER_TOKEN_INVALID' })
    const download = nock('http://198.51.100.10').get('/big.bin').reply(200, 'payload')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer junk-token-that-api2-rejects',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'transloadit_create_assembly',
          arguments: {
            instructions: { steps: { ':original': { robot: '/upload/handle' } } },
            files: [{ kind: 'url', field: 'file', url: 'http://198.51.100.10/big.bin' }],
          },
        },
      }),
    })
    expect(response.status).toBe(401)
    expect(download.isDone()).toBe(false)
  })

  it('keeps self-hosted rejections as tool errors over HTTP 200', async () => {
    nock(endpoint).get('/templates').query(true).reply(401, { error: 'BEARER_TOKEN_EXPIRED' })

    const response = await callListTemplates()
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('mcp_auth_rejected')
  })
})
