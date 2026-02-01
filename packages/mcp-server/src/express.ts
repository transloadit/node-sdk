import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import type { TransloaditMcpHttpOptions } from './http.ts'
import { applyCorsHeaders, isAuthorized, normalizePath, parsePathname } from './http-helpers.ts'
import { createTransloaditMcpServer } from './server.ts'

export type TransloaditMcpExpressOptions = TransloaditMcpHttpOptions & {
  path?: string
}

export const createTransloaditMcpExpressRouter = async (
  options: TransloaditMcpExpressOptions = {},
) => {
  const server = createTransloaditMcpServer(options)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: options.sessionIdGenerator ?? (() => randomUUID()),
    allowedOrigins: options.allowedOrigins,
    allowedHosts: options.allowedHosts,
    enableDnsRebindingProtection: options.enableDnsRebindingProtection,
  })

  await server.connect(transport)

  const router = express.Router()
  const routePath = options.path ?? '/mcp'

  router.all(routePath, async (req, res) => {
    const pathname = normalizePath(parsePathname(req.url, routePath))
    const normalizedRoute = normalizePath(routePath)
    if (pathname !== '/' && pathname !== normalizedRoute) {
      res.status(404).send('Not Found')
      return
    }

    if (!applyCorsHeaders(req as IncomingMessage, res, options.allowedOrigins)) {
      return
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    if (options.mcpToken && !isAuthorized(req as IncomingMessage, options.mcpToken)) {
      res.setHeader('WWW-Authenticate', 'Bearer')
      res.status(401).send('Unauthorized')
      return
    }

    try {
      const parsedBody = (req as { body?: unknown }).body
      await transport.handleRequest(req, res, parsedBody)
    } catch (error) {
      res.status(500).send((error as Error).message)
    }
  })

  return router
}
