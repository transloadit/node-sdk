import type { IncomingMessage, ServerResponse } from 'node:http'
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { applyCorsHeaders, isAuthorized, normalizePath, parsePathname } from './http-helpers.ts'

type PathPolicy = {
  expectedPath: string
  allowRoot?: boolean
}

type RequestHandlerOptions = {
  allowedOrigins?: string[]
  mcpToken?: string
  path: PathPolicy
}

export const createMcpRequestHandler = (
  transport: StreamableHTTPServerTransport,
  options: RequestHandlerOptions,
) => {
  const expectedPath = normalizePath(options.path.expectedPath)
  const allowRoot = options.path.allowRoot ?? false

  return async (req: IncomingMessage, res: ServerResponse) => {
    const pathname = normalizePath(parsePathname(req.url, expectedPath))
    if (pathname !== expectedPath && (!allowRoot || pathname !== '/')) {
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
    } catch {
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  }
}
