import { once } from 'node:events'
import { createServer, request as httpRequest } from 'node:http'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const transportInstances: MockTransport[] = []
const serverInstances: MockServer[] = []

class MockTransport {
  public closed = false

  public constructor() {
    transportInstances.push(this)
  }

  public async handleRequest(): Promise<void> {
    await new Promise<void>(() => {})
  }

  public close(): Promise<void> {
    this.closed = true
    return Promise.resolve()
  }
}

class MockServer {
  public closed = false

  public constructor() {
    serverInstances.push(this)
  }

  public connect(): Promise<void> {
    return Promise.resolve()
  }

  public close(): Promise<void> {
    this.closed = true
    return Promise.resolve()
  }
}

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
  return {
    StreamableHTTPServerTransport: MockTransport,
  }
})

vi.mock('../../src/server.ts', () => {
  return {
    createTransloaditMcpServer: () => new MockServer(),
  }
})

describe('createTransloaditMcpHttpHandler', () => {
  beforeEach(() => {
    transportInstances.length = 0
    serverInstances.length = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('handler.close drains active stateless request transports and servers', async () => {
    const { createTransloaditMcpHttpHandler } = await import('../../src/http.ts')

    const handler = createTransloaditMcpHttpHandler()
    const server = createServer((req, res) => {
      void handler(req, res)
    })

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve)
    })

    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Expected numeric test server address')
    }

    const req = httpRequest({
      host: '127.0.0.1',
      port: address.port,
      method: 'POST',
      path: '/mcp',
      headers: {
        'content-type': 'application/json',
      },
    })
    req.on('error', () => {})
    req.write('{}')
    req.end()

    await vi.waitFor(() => {
      expect(transportInstances).toHaveLength(1)
      expect(serverInstances).toHaveLength(1)
    })

    await handler.close()

    expect(transportInstances[0]?.closed).toBe(true)
    expect(serverInstances[0]?.closed).toBe(true)

    req.destroy()
    server.close()
    await once(server, 'close')
  })
})
