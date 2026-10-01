import type { AddressInfo } from 'node:net'

import { createServer } from 'node:http'

import { afterEach, describe, expect, it } from 'vitest'

import { createTransloaditMcpHttpHandler } from '../../src/http.ts'
import { matchesOriginPattern } from '../../src/http-helpers.ts'

type RunningServer = { url: URL; close: () => Promise<void> }

const resourceMetadataUrl = 'https://api2.transloadit.com/.well-known/oauth-protected-resource/mcp'

const initializeBody = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'hosted-auth-test', version: '0.0.0' },
  },
})

const start = async (
  options: Parameters<typeof createTransloaditMcpHttpHandler>[0] = {},
): Promise<RunningServer> => {
  const handler = createTransloaditMcpHttpHandler({ metricsPath: false, ...options })
  const server = createServer((req, res) => {
    void handler(req, res)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: new URL(`http://127.0.0.1:${port}/mcp`),
    close: async () => {
      await handler.close()
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    },
  }
}

const post = (url: URL, headers: Record<string, string> = {}): Promise<Response> =>
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: initializeBody,
  })

describe('hosted MCP endpoint auth', () => {
  let running: RunningServer | undefined

  afterEach(async () => {
    await running?.close()
    running = undefined
  })

  it('challenges unauthenticated requests with the protected-resource metadata URL', async () => {
    running = await start({ resourceMetadataUrl })

    const response = await post(running.url)
    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toBe(
      `Bearer resource_metadata="${resourceMetadataUrl}"`,
    )
    expect(response.headers.get('content-type')).toContain('application/json')
    await expect(response.json()).resolves.toMatchObject({
      name: 'Transloadit MCP Server',
      status: 'ok',
      docs: expect.stringContaining('transloadit.com'),
      error: 'unauthorized',
      error_description: expect.stringContaining('OAuth'),
    })
  })

  it('challenges SSE GETs without a bearer token', async () => {
    running = await start({ resourceMetadataUrl })

    const stream = await fetch(running.url, { headers: { Accept: 'text/event-stream' } })
    expect(stream.status).toBe(401)
    expect(stream.headers.get('www-authenticate')).toBe(
      `Bearer resource_metadata="${resourceMetadataUrl}"`,
    )
  })

  it('challenges a bare GET discovery probe and keeps the status fields in the body', async () => {
    running = await start({ resourceMetadataUrl })

    // Codex probes exactly like this before it looks for protected-resource metadata.
    const probe = await fetch(running.url, {
      headers: { Accept: '*/*', 'Mcp-Protocol-Version': '2024-11-05' },
    })
    expect(probe.status).toBe(401)
    expect(probe.headers.get('www-authenticate')).toBe(
      `Bearer resource_metadata="${resourceMetadataUrl}"`,
    )
    await expect(probe.json()).resolves.toMatchObject({
      name: 'Transloadit MCP Server',
      status: 'ok',
      error: 'unauthorized',
    })
  })

  it('serves the bare GET status to authenticated hosted callers', async () => {
    running = await start({ resourceMetadataUrl })

    const probe = await fetch(running.url, { headers: { Authorization: 'Bearer token' } })
    expect(probe.status).toBe(200)
    await expect(probe.json()).resolves.toEqual({
      name: 'Transloadit MCP Server',
      status: 'ok',
      docs: 'https://transloadit.com/docs/sdks/mcp-server/',
    })
  })

  it('keeps the bare GET health probe at 200 outside hosted mode', async () => {
    running = await start()

    const probe = await fetch(running.url)
    expect(probe.status).toBe(200)
    await expect(probe.json()).resolves.toMatchObject({ status: 'ok' })
  })

  it('forwards requests that carry any bearer token to the MCP transport', async () => {
    running = await start({ resourceMetadataUrl })

    const response = await post(running.url, { Authorization: 'Bearer oauth-access-token' })
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('protocolVersion')
  })

  it('keeps the self-hosted static token behavior', async () => {
    running = await start({ mcpToken: 'static-secret' })

    const rejected = await post(running.url, { Authorization: 'Bearer wrong' })
    expect(rejected.status).toBe(401)
    expect(rejected.headers.get('www-authenticate')).toBe('Bearer')

    const accepted = await post(running.url, { Authorization: 'Bearer static-secret' })
    expect(accepted.status).toBe(200)
  })

  it('does not challenge when neither mode is configured', async () => {
    running = await start()

    const response = await post(running.url)
    expect(response.status).toBe(200)
  })

  it('advertises OAuth in the server card when hosted', async () => {
    running = await start({ resourceMetadataUrl })

    const card = await fetch(new URL('/.well-known/mcp/server-card.json', running.url))
    expect(card.status).toBe(200)
    await expect(card.json()).resolves.toMatchObject({
      authentication: { required: true, schemes: ['oauth2', 'bearer'], resourceMetadataUrl },
    })
  })
})

describe('hosted MCP endpoint origins', () => {
  let running: RunningServer | undefined

  afterEach(async () => {
    await running?.close()
    running = undefined
  })

  it.each([
    'https://chatgpt.com',
    'https://chat.openai.com',
    'https://claude.ai',
    'https://claude.com',
    'https://transloadit.com',
    'https://mcp.transloadit.com',
    'https://transloadit.dev:3001',
    'http://localhost:6274',
    'http://127.0.0.1:5173',
  ])('allows %s in hosted mode', async (origin) => {
    running = await start({ resourceMetadataUrl })

    const response = await post(running.url, { Origin: origin, Authorization: 'Bearer token' })
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(origin)
    expect(response.headers.get('access-control-expose-headers')).toContain('WWW-Authenticate')
  })

  it.each([
    'https://evil.example',
    'https://transloadit.com.evil.example',
    'null',
  ])('rejects %s in hosted mode', async (origin) => {
    running = await start({ resourceMetadataUrl })

    const response = await post(running.url, { Origin: origin, Authorization: 'Bearer token' })
    expect(response.status).toBe(403)
  })

  it('passes requests without an Origin header in hosted mode', async () => {
    running = await start({ resourceMetadataUrl })

    const response = await post(running.url, { Authorization: 'Bearer token' })
    expect(response.status).toBe(200)
  })

  it('lets explicit allowedOrigins replace the hosted defaults', async () => {
    running = await start({ resourceMetadataUrl, allowedOrigins: ['https://allowed.example'] })

    const allowed = await post(running.url, {
      Origin: 'https://allowed.example',
      Authorization: 'Bearer token',
    })
    expect(allowed.status).toBe(200)

    const chatgpt = await post(running.url, {
      Origin: 'https://chatgpt.com',
      Authorization: 'Bearer token',
    })
    expect(chatgpt.status).toBe(403)
  })

  it('keeps the open CORS policy outside hosted mode', async () => {
    running = await start()

    const response = await post(running.url, { Origin: 'https://anything.example' })
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
  })

  it.each([
    ['self-hosted', {}],
    ['hosted', { resourceMetadataUrl }],
  ])('answers %s preflights for every Streamable HTTP request header', async (_mode, options) => {
    running = await start(options)

    const preflight = await fetch(running.url, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:8080',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers':
          'authorization,content-type,mcp-protocol-version,mcp-session-id,last-event-id',
      },
    })
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-headers')).toBe(
      'Authorization,Content-Type,Mcp-Protocol-Version,Mcp-Session-Id,Last-Event-ID',
    )
    expect(preflight.headers.get('access-control-expose-headers')).toBe(
      'Mcp-Session-Id,WWW-Authenticate',
    )
  })
})

describe('matchesOriginPattern', () => {
  it.each([
    ['https://chatgpt.com', 'https://chatgpt.com', true],
    ['https://chatgpt.com', 'https://chat.openai.com', false],
    ['https://api2.transloadit.com', 'https://*.transloadit.com', true],
    ['https://transloadit.com', 'https://*.transloadit.com', false],
    ['https://transloadit.com.evil.example', 'https://*.transloadit.com', false],
    ['https://transloadit.dev:3001', 'https://transloadit.dev:*', true],
    ['https://transloadit.dev', 'https://transloadit.dev:*', true],
    ['http://transloadit.dev:3001', 'https://transloadit.dev:*', false],
    ['http://localhost:6274', 'http://localhost:*', true],
    ['http://[::1]:6274', 'http://[::1]:*', true],
    ['https://chatgpt.com:8443', 'https://chatgpt.com', false],
    ['not a url', 'https://chatgpt.com', false],
  ])('%s against %s is %s', (origin, pattern, expected) => {
    expect(matchesOriginPattern(origin, pattern)).toBe(expected)
  })
})
