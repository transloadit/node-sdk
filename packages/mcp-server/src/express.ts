import type { TransloaditMcpHttpOptions } from './http.ts'

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'

import {
  applyCorsHeaders,
  corsAllowHeaders,
  isBasicAuthorized,
  rejectMissingBearerToken,
  resolveAllowedOrigins,
} from './http-helpers.ts'
import { getMetrics, getMetricsContentType } from './metrics.ts'
import { createTransloaditMcpServer } from './server.ts'
import { buildServerCard, serverCardPath } from './server-card.ts'

export type TransloaditMcpExpressOptions = TransloaditMcpHttpOptions & {
  path?: string
}

export function createTransloaditMcpExpressRouter(options: TransloaditMcpExpressOptions = {}) {
  const router = express.Router()
  const routePath = options.path ?? '/mcp'
  const metricsPath =
    options.metricsPath === false ? undefined : (options.metricsPath ?? '/metrics')
  const metricsAuth = options.metricsAuth
  // Only hosted mode adds an Origin policy here; embedders keep owning CORS otherwise.
  const hostedOrigins = options.resourceMetadataUrl ? resolveAllowedOrigins(options) : undefined

  const serverCardJson = JSON.stringify(
    buildServerCard(routePath, {
      authKey: options.authKey,
      authSecret: options.authSecret,
      resourceMetadataUrl: options.resourceMetadataUrl,
    }),
  )

  const sendServerCard = (res: express.Response, includeBody: boolean) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', corsAllowHeaders)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (includeBody) {
      res.status(200).send(serverCardJson)
      return
    }
    res.status(200).end()
  }

  router.options(serverCardPath, (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', corsAllowHeaders)
    res.status(204).end()
  })

  router.get(serverCardPath, (_req, res) => {
    sendServerCard(res, true)
  })

  router.head(serverCardPath, (_req, res) => {
    sendServerCard(res, false)
  })

  router.all(routePath, async (req: express.Request, res: express.Response) => {
    if (hostedOrigins) {
      if (!applyCorsHeaders(req, res, hostedOrigins)) return
      if (req.method === 'OPTIONS') {
        res.status(204).end()
        return
      }
      // Any unauthenticated method gets the OAuth challenge, so GET-probing clients find API2.
      if (rejectMissingBearerToken(req, res, options.resourceMetadataUrl)) return
    }

    if (req.method !== 'POST') {
      res.status(405).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      })
      return
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      allowedOrigins: options.allowedOrigins,
      allowedHosts: options.allowedHosts,
      enableDnsRebindingProtection: options.enableDnsRebindingProtection,
    })
    const server = createTransloaditMcpServer(options)
    res.on('close', () => {
      void transport.close()
      void server.close()
    })
    await server.connect(transport)

    await transport.handleRequest(req, res, req.body)
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
