import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { createTransloaditMcpHttpHandler } from '../../src/index.ts'

type HeadersInit = Record<string, string>

export const startHttpServer = async (
  options: Parameters<typeof createTransloaditMcpHttpHandler>[0] = {},
) => {
  const handler = await createTransloaditMcpHttpHandler(options)
  const server = createServer(handler)

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

  const { port } = server.address() as AddressInfo
  const url = new URL(`http://127.0.0.1:${port}${options?.path ?? '/mcp'}`)

  return {
    url,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      })
      await handler.close()
    },
  }
}

export const createHttpClient = async (url: URL, headers: HeadersInit = {}) => {
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: { headers },
  })
  const client = new Client(
    {
      name: 'transloadit-mcp-http-e2e',
      version: '0.1.0',
    },
    {
      capabilities: {},
    },
  )

  await client.connect(transport)

  return { client, transport }
}
