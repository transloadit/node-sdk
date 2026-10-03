import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'

import {
  readBodyWithinLimit,
  resolveMaxRequestBodyBytes,
  sendBodyTooLarge,
} from './http-helpers.ts'
import { isRecord, parseJson } from './json.ts'

type RequestTransportOptions = {
  resourceMetadataUrl?: string
  allowedHosts?: string[]
  enableDnsRebindingProtection?: boolean
  maxRequestBodyBytes?: number
}

/** A per-request MCP transport plus the function that serves the HTTP request through it. */
export type RequestTransport = {
  transport: Transport
  handle: (req: IncomingMessage, res: ServerResponse, parsedBody: unknown) => Promise<void>
}

type UpstreamChallenge = { status: 401 | 403; header: string }

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
  // The body always arrives pre-parsed, so headers and a fixed base URL are all it needs.
  return new Request(new URL(req.url ?? '/', 'http://localhost'), { method: req.method, headers })
}

const sendParseError = (res: ServerResponse): void => {
  res.statusCode = 400
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Parse error: Invalid JSON' },
      id: null,
    }),
  )
}

/**
 * Returns the JSON-RPC message, reading it within the body limit when no parser consumed the
 * stream yet (an Express app without `express.json()`). `undefined` means a response was sent.
 */
const readMessage = async (
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody: unknown,
  maxBytes: number,
): Promise<{ message: unknown } | undefined> => {
  if (parsedBody !== undefined || req.method !== 'POST' || req.readableEnded) {
    return { message: parsedBody }
  }
  const rawBody = await readBodyWithinLimit(req, maxBytes)
  if (rawBody === undefined) {
    sendBodyTooLarge(res, maxBytes)
    return undefined
  }
  const message = parseJson(rawBody)
  if (message === undefined) {
    sendParseError(res)
    return undefined
  }
  return { message }
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
  message: unknown,
): Promise<void> => {
  const response = await transport.handleRequest(toWebRequest(req), { parsedBody: message })
  const body = await response.text()
  // A client retries the whole HTTP request after re-authorizing, so a batch keeps its 200: the
  // other calls may have succeeded (an Assembly created twice would be charged twice). Its failed
  // items still carry the challenge in `_meta["mcp/www_authenticate"]`.
  const challenge =
    !Array.isArray(message) && response.headers.get('content-type')?.includes('application/json')
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
  const maxBytes = resolveMaxRequestBodyBytes(options)
  if (!options.resourceMetadataUrl) {
    const transport = new StreamableHTTPServerTransport(shared)
    return {
      transport,
      handle: async (req, res, parsedBody) => {
        const read = await readMessage(req, res, parsedBody, maxBytes)
        if (read) await transport.handleRequest(req, res, read.message)
      },
    }
  }
  const transport = new WebStandardStreamableHTTPServerTransport({
    ...shared,
    enableJsonResponse: true,
  })
  return {
    transport,
    handle: async (req, res, parsedBody) => {
      const read = await readMessage(req, res, parsedBody, maxBytes)
      if (read) await relayHostedRequest(transport, req, res, read.message)
    },
  }
}
