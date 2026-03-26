import { randomUUID } from 'node:crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import express from 'express'
import type { TransloaditMcpHttpOptions } from './http.ts'
import { isBasicAuthorized } from './http-helpers.ts'
import { getMetrics, getMetricsContentType } from './metrics.ts'
import { createTransloaditMcpServer } from './server.ts'
import { buildServerCard, serverCardPath } from './server-card.ts'

export type TransloaditMcpExpressOptions = TransloaditMcpHttpOptions & {
  path?: string
}

export const createTransloaditMcpExpressRouter = async (
  options: TransloaditMcpExpressOptions = {},
) => {
  const sessionIdGenerator = options.sessionIdGenerator ?? (() => randomUUID())

  // Per-session transport map: each MCP client gets its own transport + server pair.
  const transports = new Map<string, StreamableHTTPServerTransport>()

  const router = express.Router()
  const routePath = options.path ?? '/mcp'
  const metricsPath =
    options.metricsPath === false ? undefined : (options.metricsPath ?? '/metrics')
  const metricsAuth = options.metricsAuth

  const serverCardJson = JSON.stringify(
    buildServerCard(routePath, { authKey: options.authKey, authSecret: options.authSecret }),
  )

  const sendServerCard = (res: express.Response, includeBody: boolean) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization,Content-Type,Mcp-Session-Id,Last-Event-ID',
    )
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
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization,Content-Type,Mcp-Session-Id,Last-Event-ID',
    )
    res.status(204).end()
  })

  router.get(serverCardPath, (_req, res) => {
    sendServerCard(res, true)
  })

  router.head(serverCardPath, (_req, res) => {
    sendServerCard(res, false)
  })

  router.all(routePath, async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    let transport: StreamableHTTPServerTransport | undefined

    if (sessionId) {
      transport = transports.get(sessionId)
      if (!transport) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session not found' },
          id: null,
        })
        return
      }
    } else if (req.method === 'POST' && isInitializeRequest(req.body)) {
      // New initialization request — create a new transport + server pair.
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator,
        allowedOrigins: options.allowedOrigins,
        allowedHosts: options.allowedHosts,
        enableDnsRebindingProtection: options.enableDnsRebindingProtection,
        onsessioninitialized: (sid) => {
          transports.set(sid, transport!)
        },
      })

      transport.onclose = () => {
        const sid = transport!.sessionId
        if (sid) {
          transports.delete(sid)
        }
      }

      const server = createTransloaditMcpServer(options)
      await server.connect(transport)
    } else if (req.method === 'POST') {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Bad Request: No valid session ID provided' },
        id: null,
      })
      return
    }

    if (!transport) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Bad Request: No valid session ID provided' },
        id: null,
      })
      return
    }

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
