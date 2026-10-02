import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'

type RequestTransportOptions = {
  resourceMetadataUrl?: string
  allowedHosts?: string[]
  enableDnsRebindingProtection?: boolean
}

/** A per-request MCP transport plus the function that serves the HTTP request through it. */
export type RequestTransport = {
  transport: Transport
  handle: (req: IncomingMessage, res: ServerResponse, parsedBody: unknown) => Promise<void>
}

type UpstreamChallenge = { status: 401 | 403; header: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/**
 * Finds the challenge a tool attached after API2 rejected the forwarded token. Tool results are
 * the only place that knows, because API2 checks the token when a tool calls it.
 */
const findUpstreamChallenge = (body: string): UpstreamChallenge | undefined => {
  const parsed = parseJson(body)
  const messages = Array.isArray(parsed) ? parsed : [parsed]
  for (const message of messages) {
    if (!isRecord(message) || !isRecord(message.result)) continue
    const { result } = message
    if (result.isError !== true || !isRecord(result._meta)) continue
    const challenges = result._meta['mcp/www_authenticate']
    const header = Array.isArray(challenges)
      ? challenges.find((challenge) => typeof challenge === 'string')
      : undefined
    if (typeof header !== 'string') continue
    if (header.includes('error="invalid_token"')) return { status: 401, header }
    if (header.includes('error="insufficient_scope"')) return { status: 403, header }
  }
  return undefined
}

const toWebRequest = (req: IncomingMessage): Request => {
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    for (const entry of Array.isArray(value) ? value : [value]) headers.append(name, entry)
  }
  // The transport reads only headers and the pre-parsed body, so a fixed base URL is enough.
  return new Request(new URL(req.url ?? '/', 'http://localhost'), { method: req.method, headers })
}

/**
 * Serves a hosted request through the SDK's web-standard transport in JSON mode, so the status is
 * decided after the tool ran: MCP OAuth clients refresh only on HTTP 401 and re-scope only on
 * HTTP 403 `insufficient_scope`, and a tool result over HTTP 200 would keep them retrying a
 * rejected token.
 */
const relayHostedRequest = async (
  transport: WebStandardStreamableHTTPServerTransport,
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody: unknown,
): Promise<void> => {
  const response = await transport.handleRequest(toWebRequest(req), { parsedBody })
  const body = await response.text()
  const challenge = response.headers.get('content-type')?.includes('application/json')
    ? findUpstreamChallenge(body)
    : undefined
  res.statusCode = challenge?.status ?? response.status
  for (const [name, value] of response.headers) res.setHeader(name, value)
  if (challenge) res.setHeader('WWW-Authenticate', challenge.header)
  res.end(body)
}

/**
 * Creates the stateless transport for one HTTP request. Origins are checked before this point by
 * `applyCorsHeaders`, which understands `*.` and `:*` wildcards; the SDK compares origins
 * literally, so it only receives the Host allowlist.
 */
export const createRequestTransport = (options: RequestTransportOptions): RequestTransport => {
  const shared = {
    sessionIdGenerator: undefined,
    allowedHosts: options.allowedHosts,
    enableDnsRebindingProtection: options.enableDnsRebindingProtection,
  }
  if (!options.resourceMetadataUrl) {
    const transport = new StreamableHTTPServerTransport(shared)
    return {
      transport,
      handle: (req, res, parsedBody) => transport.handleRequest(req, res, parsedBody),
    }
  }
  const transport = new WebStandardStreamableHTTPServerTransport({
    ...shared,
    enableJsonResponse: true,
  })
  return {
    transport,
    handle: (req, res, parsedBody) => relayHostedRequest(transport, req, res, parsedBody),
  }
}
