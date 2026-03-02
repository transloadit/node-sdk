import type { IncomingMessage, ServerResponse } from 'node:http'
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { SevLogger } from '@transloadit/sev-logger'
import { applyCorsHeaders, isAuthorized, normalizePath, parsePathname } from './http-helpers.ts'
import { buildRedactor, getLogger } from './logger.ts'

type PathPolicy = {
  expectedPath: string
  allowRoot?: boolean
}

type RequestHandlerOptions = {
  allowedOrigins?: string[]
  mcpToken?: string
  path: PathPolicy
  logger?: SevLogger
  redactSecrets?: Array<string | undefined>
}

export const createMcpRequestHandler = (
  transport: StreamableHTTPServerTransport,
  options: RequestHandlerOptions,
) => {
  const expectedPath = normalizePath(options.path.expectedPath)
  const allowRoot = options.path.allowRoot ?? false
  const logger = options.logger ?? getLogger().nest('http')
  const redact = buildRedactor(options.redactSecrets ?? [])

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

    // Bare GETs without the SSE Accept header are not valid MCP requests (the
    // Streamable HTTP spec requires Accept: text/event-stream for GET).  Return
    // a friendly JSON status so directory health-probes (Glama, uptime monitors)
    // see a 200 instead of the SDK's opaque 406.
    const accept = req.headers.accept ?? ''
    if (req.method === 'GET' && !accept.includes('text/event-stream')) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          name: 'Transloadit MCP Server',
          status: 'ok',
          docs: 'https://transloadit.com/docs/sdks/mcp-server/',
        }),
      )
      return
    }

    try {
      const parsedBody = (req as { body?: unknown }).body
      await transport.handleRequest(req, res, parsedBody)
    } catch (error) {
      logger.err('Request failed: %s', redact({ url: req.url, method: req.method, error }))
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  }
}
