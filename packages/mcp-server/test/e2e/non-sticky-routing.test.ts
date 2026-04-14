import { createServer, request as httpRequest } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect, test } from 'vitest'
import { createHttpClient, startHttpServer } from './http-server.ts'
import { parseToolPayload } from './mcp-client.ts'

type RoutedRequest = {
  method: string
  path: string
  headers: Record<string, string | string[] | undefined>
  body: Buffer
}

function readRequest(req: import('node:http').IncomingMessage): Promise<RoutedRequest> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      resolve({
        method: req.method ?? 'GET',
        path: req.url ?? '/',
        headers: req.headers,
        body: Buffer.concat(chunks),
      })
    })
    req.on('error', reject)
  })
}

function proxyToBackend(
  targetPort: number,
  routedRequest: RoutedRequest,
  res: import('node:http').ServerResponse,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const upstream = httpRequest(
      {
        host: '127.0.0.1',
        port: targetPort,
        method: routedRequest.method,
        path: routedRequest.path,
        headers: routedRequest.headers,
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 500, upstreamRes.headers)
        upstreamRes.pipe(res)
        upstreamRes.on('end', resolve)
        upstreamRes.on('error', reject)
      },
    )

    upstream.on('error', reject)
    upstream.end(routedRequest.body)
  })
}

async function startAlternatingProxy(
  ports: [number, number],
): Promise<{ url: URL; close: () => Promise<void> }> {
  let requestCount = 0
  const server = createServer(async (req, res) => {
    try {
      const routedRequest = await readRequest(req)
      const targetPort = ports[requestCount % ports.length] ?? ports[0]
      requestCount += 1
      await proxyToBackend(targetPort, routedRequest, res)
    } catch (error) {
      res.statusCode = 500
      res.end(error instanceof Error ? error.message : String(error))
    }
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

  const { port } = server.address() as AddressInfo
  return {
    url: new URL(`http://127.0.0.1:${port}/mcp`),
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    },
  }
}

test('streamable http: survives non-sticky routing across hosted MCP backends', async () => {
  const backendA = await startHttpServer()
  const backendB = await startHttpServer()
  const proxy = await startAlternatingProxy([
    backendA.url.port ? Number(backendA.url.port) : 0,
    backendB.url.port ? Number(backendB.url.port) : 0,
  ])

  try {
    const { client, transport } = await createHttpClient(proxy.url)

    try {
      const robots = await client.callTool({
        name: 'transloadit_list_robots',
        arguments: { limit: 1 },
      })

      expect(parseToolPayload(robots).status).toBe('ok')
    } finally {
      await transport.close()
      await client.close()
    }
  } finally {
    await proxy.close()
    await backendA.close()
    await backendB.close()
  }
})

test('streamable http: supports concurrent clients through non-sticky routing', async () => {
  const backendA = await startHttpServer()
  const backendB = await startHttpServer()
  const proxy = await startAlternatingProxy([
    backendA.url.port ? Number(backendA.url.port) : 0,
    backendB.url.port ? Number(backendB.url.port) : 0,
  ])

  try {
    const sessions = await Promise.all(
      Array.from({ length: 10 }, async () => createHttpClient(proxy.url)),
    )

    try {
      const results = await Promise.all(
        sessions.map(async ({ client }) =>
          client.callTool({
            name: 'transloadit_list_robots',
            arguments: { limit: 1 },
          }),
        ),
      )

      for (const result of results) {
        expect(parseToolPayload(result).status).toBe('ok')
      }
    } finally {
      await Promise.all(
        sessions.map(async ({ client, transport }) => {
          await transport.close()
          await client.close()
        }),
      )
    }
  } finally {
    await proxy.close()
    await backendA.close()
    await backendB.close()
  }
})
