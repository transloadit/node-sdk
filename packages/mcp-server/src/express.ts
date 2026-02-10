import { randomUUID } from 'node:crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import type { TransloaditMcpHttpOptions } from './http.ts'
import { isBasicAuthorized } from './http-helpers.ts'
import { createMcpRequestHandler } from './http-request-handler.ts'
import { getMetrics, getMetricsContentType } from './metrics.ts'
import { buildServerCard, serverCardPath } from './server-card.ts'
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
  const metricsPath =
    options.metricsPath === false ? undefined : (options.metricsPath ?? '/metrics')
  const metricsAuth = options.metricsAuth
  const handler = createMcpRequestHandler(transport, {
    allowedOrigins: options.allowedOrigins,
    mcpToken: options.mcpToken,
    path: { expectedPath: routePath, allowRoot: true },
    logger: options.logger,
    redactSecrets: [options.mcpToken, options.authKey, options.authSecret],
  })

  const serverCardJson = JSON.stringify(buildServerCard(routePath))

  router.get(serverCardPath, (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS')
    res.setHeader('Content-Type', 'application/json')
    res.status(200).send(serverCardJson)
  })

  router.all(routePath, (req, res) => {
    void handler(req, res)
  })

  if (metricsPath) {
    router.get(metricsPath, async (req, res) => {
      if (metricsAuth && !isBasicAuthorized(req, metricsAuth)) {
        res.status(401).setHeader('WWW-Authenticate', 'Basic realm="metrics"').send('Unauthorized')
        return
      }
      res.setHeader('Content-Type', getMetricsContentType())
      res.status(200).send(await getMetrics())
    })
    router.head(metricsPath, (req, res) => {
      if (metricsAuth && !isBasicAuthorized(req, metricsAuth)) {
        res.status(401).setHeader('WWW-Authenticate', 'Basic realm="metrics"').end('Unauthorized')
        return
      }
      res.setHeader('Content-Type', getMetricsContentType())
      res.status(200).end()
    })
  }

  return router
}
