import type { IncomingMessage, ServerResponse } from 'node:http'

import type { SevLogger } from '@transloadit/sev-logger'

import type { RequestTransport } from './request-transport.ts'
import type { TransloaditMcpServerOptions } from './server.ts'

import {
  applyCorsHeaders,
  assertSingleAuthMode,
  isBasicAuthorized,
  normalizePath,
  parsePathname,
  readBodyWithinLimit,
  rejectMissingBearerToken,
  rejectMissingMcpToken,
  resolveAllowedOrigins,
  resolveMaxRequestBodyBytes,
  sendBodyTooLarge,
  sendServerInfoForBareGet,
} from './http-helpers.ts'
import { getMetrics, getMetricsContentType } from './metrics.ts'
import { createRequestTransport } from './request-transport.ts'
import { createTransloaditMcpServer } from './server.ts'
import { buildServerCard, serverCardPath } from './server-card.ts'

export type TransloaditMcpHttpOptions = TransloaditMcpServerOptions & {
  allowedOrigins?: string[]
  allowedHosts?: string[]
  enableDnsRebindingProtection?: boolean
  mcpToken?: string
  path?: string
  metricsPath?: string | false
  metricsAuth?: { username: string; password: string }
  /** Largest accepted request body; defaults to 1 MiB hosted and 10 MiB self-hosted. */
  maxRequestBodyBytes?: number
  // Ignored on purpose: the hosted HTTP server is stateless and does not mint session IDs.
  sessionIdGenerator?: (() => string) | undefined
  logger?: SevLogger
}

export type TransloaditMcpHttpHandler = ((
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void>) & {
  close: () => Promise<void>
}

const defaultPath = '/mcp'

const parseJson = (text: string): unknown => {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export function createTransloaditMcpHttpHandler(
  options: TransloaditMcpHttpOptions = {},
): TransloaditMcpHttpHandler {
  const activeRequests = new Set<{
    transport: RequestTransport['transport']
    server: Awaited<ReturnType<typeof createTransloaditMcpServer>>
  }>()
  assertSingleAuthMode(options)
  const expectedPath = options.path ?? defaultPath
  const metricsPath =
    options.metricsPath === false ? undefined : normalizePath(options.metricsPath ?? '/metrics')
  const metricsAuth = options.metricsAuth
  const allowedOrigins = resolveAllowedOrigins(options)

  const serverCardJson = JSON.stringify(
    buildServerCard(expectedPath, {
      authKey: options.authKey,
      authSecret: options.authSecret,
      resourceMetadataUrl: options.resourceMetadataUrl,
    }),
  )

  const handler = (async (req, res) => {
    const pathname = normalizePath(parsePathname(req.url, expectedPath))

    if (pathname === serverCardPath) {
      if (!applyCorsHeaders(req, res, options.allowedOrigins)) {
        return
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS')
      if (req.method === 'OPTIONS') {
        res.statusCode = 204
        res.end()
        return
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405
        res.end('Method Not Allowed')
        return
      }
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.end(req.method === 'HEAD' ? undefined : serverCardJson)
      return
    }

    if (metricsPath && pathname === metricsPath) {
      if (metricsAuth && !isBasicAuthorized(req, metricsAuth)) {
        res.statusCode = 401
        res.setHeader('WWW-Authenticate', 'Basic realm="metrics"')
        res.end('Unauthorized')
        return
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405
        res.end('Method Not Allowed')
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', getMetricsContentType())
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      res.end(await getMetrics())
      return
    }

    if (pathname !== normalizePath(expectedPath)) {
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

    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Method not allowed.' },
          id: null,
        }),
      )
      return
    }

    const maxBytes = resolveMaxRequestBodyBytes(options)
    const rawBody = await readBodyWithinLimit(req, maxBytes)
    if (rawBody === undefined) {
      sendBodyTooLarge(res, maxBytes)
      return
    }
    const parsedBody = parseJson(rawBody)
    const { transport, handle } = createRequestTransport(options)
    const server = createTransloaditMcpServer(options)
    const activeRequest = { transport, server }
    activeRequests.add(activeRequest)
    const cleanupActiveRequest = () => {
      activeRequests.delete(activeRequest)
      void transport.close()
      void server.close()
    }
    res.on('close', cleanupActiveRequest)
    await server.connect(transport)

    try {
      await handle(req, res, parsedBody)
    } catch {
      if (!res.headersSent) {
        res.statusCode = 500
        res.end('Internal Server Error')
      }
    } finally {
      activeRequests.delete(activeRequest)
    }
  }) as TransloaditMcpHttpHandler

  handler.close = async () => {
    await Promise.all(
      Array.from(activeRequests, async (activeRequest) => {
        activeRequests.delete(activeRequest)
        const { transport, server } = activeRequest
        await Promise.all([transport.close(), server.close()])
      }),
    )
  }

  return handler
}
