import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import type { SevLogger } from '@transloadit/sev-logger'
import {
  applyCorsHeaders,
  isAuthorized,
  isBasicAuthorized,
  normalizePath,
  parsePathname,
} from './http-helpers.ts'
import { getMetrics, getMetricsContentType } from './metrics.ts'
import type { TransloaditMcpServerOptions } from './server.ts'
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

/** Read the full request body and JSON-parse it so `isInitializeRequest` can inspect the payload. */
function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) {
        resolve(undefined)
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve(undefined)
      }
    })
    req.on('error', reject)
  })
}

export function createTransloaditMcpHttpHandler(
  options: TransloaditMcpHttpOptions = {},
): TransloaditMcpHttpHandler {
  const expectedPath = options.path ?? defaultPath
  const metricsPath =
    options.metricsPath === false ? undefined : normalizePath(options.metricsPath ?? '/metrics')
  const metricsAuth = options.metricsAuth
  const sessionIdGenerator = options.sessionIdGenerator ?? (() => randomUUID())

  // Per-session transport map: each MCP client gets its own transport + server pair.
  const transports = new Map<string, StreamableHTTPServerTransport>()

  const serverCardJson = JSON.stringify(
    buildServerCard(expectedPath, { authKey: options.authKey, authSecret: options.authSecret }),
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
    // a friendly JSON status so directory health-probes see a 200 instead of 406.
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

    // Route request to the correct per-session transport.
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    let transport: StreamableHTTPServerTransport | undefined

    if (sessionId) {
      transport = transports.get(sessionId)
      if (!transport) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Session not found' },
            id: null,
          }),
        )
        return
      }
    }

    // For POST requests without a session, read the body to check for initialization.
    let parsedBody: unknown
    if (req.method === 'POST' && !transport) {
      parsedBody = await readJsonBody(req)
      if (isInitializeRequest(parsedBody)) {
        const newTransport = new StreamableHTTPServerTransport({
          sessionIdGenerator,
          allowedOrigins: options.allowedOrigins,
          allowedHosts: options.allowedHosts,
          enableDnsRebindingProtection: options.enableDnsRebindingProtection,
          onsessioninitialized: (sid) => {
            transports.set(sid, newTransport)
          },
        })

        newTransport.onclose = () => {
          const sid = newTransport.sessionId
          if (sid) {
            transports.delete(sid)
          }
        }

        const server = createTransloaditMcpServer(options)
        await server.connect(newTransport)
        transport = newTransport
      } else {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32600, message: 'Bad Request: No valid session ID provided' },
            id: null,
          }),
        )
        return
      }
    }

    if (!transport) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Bad Request: No valid session ID provided' },
          id: null,
        }),
      )
      return
    }

    try {
      await transport.handleRequest(req, res, parsedBody)
    } catch {
      if (!res.headersSent) {
        res.statusCode = 500
        res.end('Internal Server Error')
      }
    }
  }) as TransloaditMcpHttpHandler

  handler.close = async () => {
    const closePromises = [...transports.values()].map((t) => t.close())
    await Promise.all(closePromises)
    transports.clear()
  }

  return handler
}
