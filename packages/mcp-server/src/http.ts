import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createTransloaditMcpServer } from './server.ts'
import type { TransloaditMcpServerOptions } from './server.ts'
import { applyCorsHeaders, isAuthorized, normalizePath, parsePathname } from './http-helpers.ts'

export type TransloaditMcpHttpOptions = TransloaditMcpServerOptions & {
  allowedOrigins?: string[]
  allowedHosts?: string[]
  enableDnsRebindingProtection?: boolean
  mcpToken?: string
  path?: string
  sessionIdGenerator?: (() => string) | undefined
}

export type TransloaditMcpHttpHandler = ((
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void>) & {
  close: () => Promise<void>
}

const defaultPath = '/mcp'

export const createTransloaditMcpHttpHandler = async (
  options: TransloaditMcpHttpOptions = {},
): Promise<TransloaditMcpHttpHandler> => {
  const server = createTransloaditMcpServer(options)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: options.sessionIdGenerator ?? (() => randomUUID()),
    allowedOrigins: options.allowedOrigins,
    allowedHosts: options.allowedHosts,
    enableDnsRebindingProtection: options.enableDnsRebindingProtection,
  })

  await server.connect(transport)

  const handler = (async (req: IncomingMessage, res: ServerResponse) => {
    const pathname = normalizePath(parsePathname(req.url, defaultPath))
    const expectedPath = normalizePath(options.path ?? defaultPath)
    if (pathname !== expectedPath) {
      res.statusCode = 404
      res.end('Not Found')
      return
    }

    if (!applyCorsHeaders(req, res, options.allowedOrigins)) {
      return
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    if (options.mcpToken && !isAuthorized(req, options.mcpToken)) {
      res.statusCode = 401
      res.setHeader('WWW-Authenticate', 'Bearer')
      res.end('Unauthorized')
      return
    }

    try {
      const parsedBody = (req as { body?: unknown }).body
      await transport.handleRequest(req, res, parsedBody)
    } catch (error) {
      res.statusCode = 500
      res.end((error as Error).message)
    }
  }) as TransloaditMcpHttpHandler

  handler.close = async () => {
    await transport.close()
  }

  return handler
}
