import type { IncomingMessage, ServerResponse } from 'node:http'

import { timingSafeEqual } from 'node:crypto'

export const parsePathname = (url: string | undefined, fallback: string): string => {
  try {
    return new URL(url ?? fallback, 'http://localhost').pathname
  } catch {
    return fallback
  }
}

export const normalizePath = (path: string): string =>
  path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path

export const extractBearerToken = (header: string | undefined): string | undefined => {
  if (!header) return undefined
  const match = header.trim().match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()
  return token ? token : undefined
}

export const extractBasicAuth = (
  header: string | undefined,
): { username: string; password: string } | undefined => {
  if (!header) return undefined
  const match = header.trim().match(/^Basic\s+(.+)$/i)
  const token = match?.[1]?.trim()
  if (!token) return undefined
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const separatorIndex = decoded.indexOf(':')
    if (separatorIndex === -1) return undefined
    const username = decoded.slice(0, separatorIndex)
    const password = decoded.slice(separatorIndex + 1)
    if (!username || !password) return undefined
    return { username, password }
  } catch {
    return undefined
  }
}

const timingSafeEqualString = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

export const isAuthorized = (req: IncomingMessage, token: string): boolean => {
  const provided = extractBearerToken(req.headers.authorization)
  if (!provided) return false
  return timingSafeEqualString(provided, token)
}

export const isBasicAuthorized = (
  req: IncomingMessage,
  expected: { username: string; password: string },
): boolean => {
  const provided = extractBasicAuth(req.headers.authorization)
  if (!provided) return false
  return (
    timingSafeEqualString(provided.username, expected.username) &&
    timingSafeEqualString(provided.password, expected.password)
  )
}

/**
 * Browser origins the hosted endpoint accepts when no explicit `allowedOrigins` are configured:
 * the ChatGPT and Claude web apps, Transloadit sites, devdock and loopback. Requests without an
 * `Origin` header (CLIs, servers) are never subject to this list.
 */
export const hostedAllowedOrigins = [
  'https://chatgpt.com',
  'https://chat.openai.com',
  'https://claude.ai',
  'https://claude.com',
  'https://transloadit.com',
  'https://*.transloadit.com',
  'https://transloadit.dev:*',
  'https://*.transloadit.dev:*',
  'http://localhost:*',
  'https://localhost:*',
  'http://127.0.0.1:*',
  'https://127.0.0.1:*',
  'http://[::1]:*',
  'https://[::1]:*',
]

const originPatternRegex =
  /^(?<protocol>https?):\/\/(?<host>\*\.)?(?<hostname>\[[^\]]+\]|[^:/]+)(?::(?<port>\*|\d+))?$/

/**
 * Matches an `Origin` header against an allowlist entry. Entries are exact origins or patterns
 * with a `*.` subdomain wildcard and/or a `:*` any-port suffix.
 */
export const matchesOriginPattern = (origin: string, pattern: string): boolean => {
  if (origin === pattern) return true
  const match = originPatternRegex.exec(pattern)
  if (!match?.groups) return false
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }
  const { protocol, host, hostname, port } = match.groups
  if (url.protocol !== `${protocol}:`) return false
  const originHost = url.hostname.replaceAll(/^\[|\]$/g, '')
  const patternHost = (hostname ?? '').replaceAll(/^\[|\]$/g, '')
  const hostMatches = host
    ? originHost.endsWith(`.${patternHost}`) && originHost.length > patternHost.length + 1
    : originHost === patternHost
  if (!hostMatches) return false
  if (port === '*') return true
  return url.port === (port ?? '')
}

export const isOriginAllowed = (origin: string, allowedOrigins: string[]): boolean =>
  allowedOrigins.some((pattern) => matchesOriginPattern(origin, pattern))

/** Explicit `allowedOrigins` win; hosted mode falls back to the ChatGPT/Claude/Transloadit list. */
export const resolveAllowedOrigins = (options: {
  allowedOrigins?: string[]
  resourceMetadataUrl?: string
}): string[] | undefined => {
  if (options.allowedOrigins && options.allowedOrigins.length > 0) return options.allowedOrigins
  return options.resourceMetadataUrl ? hostedAllowedOrigins : undefined
}

export const applyCorsHeaders = (
  req: IncomingMessage,
  res: ServerResponse,
  allowedOrigins?: string[],
): boolean => {
  const origin = req.headers.origin
  if (!origin) {
    return true
  }

  if (allowedOrigins && allowedOrigins.length > 0) {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      res.statusCode = 403
      res.end('Forbidden')
      return false
    }
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization,Content-Type,Mcp-Session-Id,Last-Event-ID',
  )
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id,WWW-Authenticate')

  return true
}

/**
 * `WWW-Authenticate` value (RFC 6750) that points OAuth clients at the protected-resource
 * metadata and, for rejected requests, names the error so hosts show their linking UI.
 */
export const buildBearerChallenge = (options: {
  resourceMetadataUrl?: string
  error?: { code: string; description: string }
}): string => {
  const parts: string[] = []
  if (options.resourceMetadataUrl) {
    parts.push(`resource_metadata="${options.resourceMetadataUrl}"`)
  }
  if (options.error) {
    parts.push(
      `error="${options.error.code}"`,
      `error_description="${options.error.description.replaceAll('"', "'")}"`,
    )
  }
  return parts.length > 0 ? `Bearer ${parts.join(', ')}` : 'Bearer'
}

/**
 * Self-hosted policy: the request must carry the static `TRANSLOADIT_MCP_TOKEN`. Returns `true`
 * when the 401 was already sent.
 */
export const rejectMissingMcpToken = (
  req: IncomingMessage,
  res: ServerResponse,
  mcpToken: string | undefined,
): boolean => {
  if (!mcpToken || isAuthorized(req, mcpToken)) return false
  res.statusCode = 401
  res.setHeader('WWW-Authenticate', 'Bearer')
  res.end('Unauthorized')
  return true
}

/**
 * Hosted policy: a bearer token only has to be present, because API2 verifies it on every
 * forwarded call. Without one, the 401 points OAuth clients at the protected-resource metadata.
 * Returns `true` when the 401 was already sent.
 */
export const rejectMissingBearerToken = (
  req: IncomingMessage,
  res: ServerResponse,
  resourceMetadataUrl: string | undefined,
): boolean => {
  if (!resourceMetadataUrl || extractBearerToken(req.headers.authorization)) return false
  res.statusCode = 401
  res.setHeader('WWW-Authenticate', buildBearerChallenge({ resourceMetadataUrl }))
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      error: 'unauthorized',
      error_description:
        'This endpoint requires an OAuth bearer token. Discover the authorization server through the resource_metadata URL in the WWW-Authenticate header.',
    }),
  )
  return true
}
