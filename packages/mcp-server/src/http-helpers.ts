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
