import { expect, test } from 'vitest'
import { createHttpClient, startHttpServer } from './http-server.ts'
import { parseToolPayload } from './mcp-client.ts'

test('streamable http: supports concurrent sessions', async () => {
  const server = await startHttpServer()

  try {
    // Create two independent MCP clients (each sends its own initialize request).
    const session1 = await createHttpClient(server.url)
    const session2 = await createHttpClient(server.url)

    try {
      // Both sessions should be able to call tools independently.
      const [robots1, robots2] = await Promise.all([
        session1.client.callTool({
          name: 'transloadit_list_robots',
          arguments: { limit: 1 },
        }),
        session2.client.callTool({
          name: 'transloadit_list_robots',
          arguments: { limit: 1 },
        }),
      ])

      expect(parseToolPayload(robots1).status).toBe('ok')
      expect(parseToolPayload(robots2).status).toBe('ok')
    } finally {
      await session1.transport.close()
      await session1.client.close()
      await session2.transport.close()
      await session2.client.close()
    }
  } finally {
    await server.close()
  }
})
