import type { IncomingMessage, ServerResponse } from 'node:http'

import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { SevLogger } from '@transloadit/sev-logger'

import {
  applyCorsHeaders,
  normalizePath,
  parsePathname,
  rejectMissingBearerToken,
  rejectMissingMcpToken,
  resolveAllowedOrigins,
  sendServerInfoForBareGet,
} from './http-helpers.ts'
import { buildRedactor, getLogger } from './logger.ts'

type PathPolicy = {
  expectedPath: string
  allowRoot?: boolean
}

type RequestHandlerOptions = {
  allowedOrigins?: string[]
  mcpToken?: string
  resourceMetadataUrl?: string
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
  const allowedOrigins = resolveAllowedOrigins(options)

  return async (req: IncomingMessage, res: ServerResponse) => {
    const pathname = normalizePath(parsePathname(req.url, expectedPath))
    if (pathname !== expectedPath && (!allowRoot || pathname !== '/')) {
      res.statusCode = 404
      res.end('Not Found')
      return
    }

    if (!applyCorsHeaders(req, res, allowedOrigins)) {
      return
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    if (rejectMissingMcpToken(req, res, options.mcpToken)) {
      return
    }

    if (rejectMissingBearerToken(req, res, options.resourceMetadataUrl)) {
      return
    }

    if (sendServerInfoForBareGet(req, res)) {
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
