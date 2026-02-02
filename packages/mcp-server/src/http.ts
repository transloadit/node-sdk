import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { SevLogger } from '@transloadit/sev-logger'
import { isBasicAuthorized, normalizePath, parsePathname } from './http-helpers.ts'
import { createMcpRequestHandler } from './http-request-handler.ts'
import { getMetrics, getMetricsContentType } from './metrics.ts'
import type { TransloaditMcpServerOptions } from './server.ts'
import { createTransloaditMcpServer } from './server.ts'

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

export const createTransloaditMcpHttpHandler = async (
  options: TransloaditMcpHttpOptions = {},
): Promise<TransloaditMcpHttpHandler> => {
  const server = createTransloaditMcpServer(options)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: options.sessionIdGenerator ?? (() => randomUUID()),
    allowedOrigins: options.allowedOrigins,
    allowedHosts: options.allowedHosts,
    enableDnsRebindingProtection: options.enableDnsRebindingProtection,
  })

  await server.connect(transport)

  const expectedPath = options.path ?? defaultPath
  const metricsPath =
    options.metricsPath === false ? undefined : normalizePath(options.metricsPath ?? '/metrics')
  const metricsAuth = options.metricsAuth

  const mcpHandler = createMcpRequestHandler(transport, {
    allowedOrigins: options.allowedOrigins,
    mcpToken: options.mcpToken,
    path: { expectedPath },
    logger: options.logger,
    redactSecrets: [options.mcpToken, options.authKey, options.authSecret],
  })

  const handler = (async (req, res) => {
    if (metricsPath) {
      const pathname = normalizePath(parsePathname(req.url, expectedPath))
      if (pathname === metricsPath) {
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
    }

    await mcpHandler(req, res)
  }) as TransloaditMcpHttpHandler

  handler.close = async () => {
    await transport.close()
  }

  return handler
}
