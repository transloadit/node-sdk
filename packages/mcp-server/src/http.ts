import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { SevLogger } from '@transloadit/sev-logger'
import { createMcpRequestHandler } from './http-request-handler.ts'
import type { TransloaditMcpServerOptions } from './server.ts'
import { createTransloaditMcpServer } from './server.ts'

export type TransloaditMcpHttpOptions = TransloaditMcpServerOptions & {
  allowedOrigins?: string[]
  allowedHosts?: string[]
  enableDnsRebindingProtection?: boolean
  mcpToken?: string
  path?: string
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

  const handler = createMcpRequestHandler(transport, {
    allowedOrigins: options.allowedOrigins,
    mcpToken: options.mcpToken,
    path: { expectedPath: options.path ?? defaultPath },
    logger: options.logger,
    redactSecrets: [options.mcpToken, options.authKey, options.authSecret],
  }) as TransloaditMcpHttpHandler

  handler.close = async () => {
    await transport.close()
  }

  return handler
}
