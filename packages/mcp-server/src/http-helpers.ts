import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

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

export const isAuthorized = (req: IncomingMessage, token: string): boolean => {
  const provided = extractBearerToken(req.headers.authorization)
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(token)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
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
    if (!allowedOrigins.includes(origin)) {
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
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id')

  return true
}
