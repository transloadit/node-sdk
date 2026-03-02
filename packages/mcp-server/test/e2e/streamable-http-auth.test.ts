import { expect, test } from 'vitest'
import { createHttpClient, startHttpServer } from './http-server.ts'
import { parseToolPayload } from './mcp-client.ts'

test('streamable http: requires bearer token when configured', async () => {
  const server = await startHttpServer({ mcpToken: 'secret-token' })

  try {
    const response = await fetch(server.url, {
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
    })

    expect(response.status).toBe(401)
  } finally {
    await server.close()
  }
})

test('streamable http: allows authenticated client', async () => {
  const server = await startHttpServer({ mcpToken: 'secret-token' })

  try {
    const { client, transport } = await createHttpClient(server.url, {
      Authorization: 'Bearer secret-token',
    })

    try {
      const tools = await client.listTools()
      expect(tools.tools.length).toBeGreaterThan(0)

      const robots = await client.callTool({
        name: 'transloadit_list_robots',
        arguments: { limit: 1 },
      })

      const payload = parseToolPayload(robots)
      expect(payload.status).toBe('ok')
    } finally {
      await transport.close()
      await client.close()
    }
  } finally {
    await server.close()
  }
})

test('streamable http: returns friendly JSON for bare GET health probes', async () => {
  const server = await startHttpServer()

  try {
    // Bare GET without Accept: text/event-stream (like Glama, uptime monitors)
    const response = await fetch(server.url, { method: 'GET' })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const body = await response.json()
    expect(body).toMatchObject({
      name: 'Transloadit MCP Server',
      status: 'ok',
    })
    expect(body.docs).toContain('transloadit.com')
  } finally {
    await server.close()
  }
})

test('streamable http: passes through GET with SSE Accept header', async () => {
  const server = await startHttpServer()

  try {
    // GET with Accept: text/event-stream should reach the MCP transport
    // (which will reject it for missing session-id, proving it passed through)
    const response = await fetch(server.url, {
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
    })
    expect(response.status).not.toBe(200)
  } finally {
    await server.close()
  }
})

test('streamable http: rejects disallowed origins', async () => {
  const server = await startHttpServer({
    allowedOrigins: ['https://allowed.example'],
  })

  try {
    const response = await fetch(server.url, {
      method: 'POST',
      headers: {
        Origin: 'https://blocked.example',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    })

    expect(response.status).toBe(403)
  } finally {
    await server.close()
  }
})
