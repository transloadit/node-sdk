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
