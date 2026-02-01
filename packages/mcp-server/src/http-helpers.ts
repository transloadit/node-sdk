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

export const isAuthorized = (req: IncomingMessage, token: string): boolean => {
  const header = req.headers.authorization
  if (!header) {
    return false
  }
  const [type, value] = header.split(' ')
  return type?.toLowerCase() === 'bearer' && value === token
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
