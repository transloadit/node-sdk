import { randomUUID } from 'node:crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import type { TransloaditMcpHttpOptions } from './http.ts'
import { createMcpRequestHandler } from './http-request-handler.ts'
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
  const handler = createMcpRequestHandler(transport, {
    allowedOrigins: options.allowedOrigins,
    mcpToken: options.mcpToken,
    path: { expectedPath: routePath, allowRoot: true },
    logger: options.logger,
    redactSecrets: [options.mcpToken, options.authKey, options.authSecret],
  })

  router.all(routePath, (req, res) => {
    void handler(req, res)
  })

  return router
}
