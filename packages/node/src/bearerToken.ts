import { z } from 'zod'

export type BearerTokenAudience = 'mcp' | 'api2' | (string & {})

export type BearerTokenResponse = {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  scope?: string
}

export type MintBearerTokenOptions = {
  endpoint?: string
  aud?: BearerTokenAudience | string
  /**
   * Requested scopes. Must be a subset of the auth key's scope.
   *
   * If omitted, the token inherits the auth key's scope.
   */
  scope?: string[] | string
  timeoutMs?: number
}

export type MintBearerTokenResult =
  | { ok: true; raw: string; data: BearerTokenResponse }
  | { ok: false; error: string }

const tokenErrorSchema = z
  .object({
    error: z.string(),
    message: z.string().optional(),
  })
  .passthrough()

const tokenSuccessSchema = z
  .object({
    access_token: z.string().min(1),
    token_type: z.literal('Bearer').optional(),
    expires_in: z.number(),
    scope: z.string().optional(),
  })
  .passthrough()

const buildBasicAuthHeaderValue = (credentials: { authKey: string; authSecret: string }): string =>
  `Basic ${Buffer.from(`${credentials.authKey}:${credentials.authSecret}`, 'utf8').toString('base64')}`

const isLoopbackHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.')

type TokenBaseResult = { ok: true; baseUrl: URL } | { ok: false; error: string }

const normalizeTokenBaseEndpoint = (raw?: string): TokenBaseResult => {
  const baseRaw = (raw || process.env.TRANSLOADIT_ENDPOINT || 'https://api2.transloadit.com').trim()

  let url: URL
  try {
    url = new URL(baseRaw)
  } catch {
    return {
      ok: false,
      error:
        'Invalid endpoint URL. Use --endpoint https://api2.transloadit.com (or set TRANSLOADIT_ENDPOINT).',
    }
  }

  if (url.username || url.password) {
    return { ok: false, error: 'Endpoint must not include username/password.' }
  }
  if (url.search || url.hash) {
    return { ok: false, error: 'Endpoint must not include query string or hash.' }
  }

  if (url.protocol !== 'https:') {
    if (url.protocol === 'http:' && isLoopbackHost(url.hostname)) {
      // Allowed for local development only.
    } else {
      return {
        ok: false,
        error:
          'Refusing to send credentials to a non-HTTPS endpoint. Use https://... (or http://localhost for local development).',
      }
    }
  }

  // If someone pasted the token URL, normalize it back to the API base to avoid /token/token.
  const pathLower = url.pathname.toLowerCase()
  if (pathLower === '/token' || pathLower === '/token/') {
    url.pathname = '/'
  }

  if (!url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`
  }

  return { ok: true, baseUrl: url }
}

const normalizeScopeInput = (input?: string[] | string): string | undefined => {
  if (input == null) return undefined

  const raw = Array.isArray(input) ? input.join(' ') : String(input)
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  const parts = trimmed.split(/[\s,]+/).map((p) => p.trim())
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of parts) {
    if (!part || seen.has(part)) continue
    seen.add(part)
    out.push(part)
  }

  return out.length > 0 ? out.join(' ') : undefined
}

export async function mintBearerTokenWithCredentials(
  credentials: { authKey: string; authSecret: string },
  options: MintBearerTokenOptions = {},
): Promise<MintBearerTokenResult> {
  const endpointResult = normalizeTokenBaseEndpoint(options.endpoint)
  if (!endpointResult.ok) {
    return { ok: false, error: endpointResult.error }
  }

  const url = new URL('token', endpointResult.baseUrl).toString()
  const aud = (options.aud ?? 'mcp').trim() || 'mcp'
  const scope = normalizeScopeInput(options.scope)
  const timeoutMs = options.timeoutMs ?? 15_000

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    aud,
  })
  if (scope) params.set('scope', scope)

  let res: Response
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    res = await fetch(url, {
      method: 'POST',
      // Never follow redirects with Basic Auth credentials.
      redirect: 'error',
      signal: controller.signal,
      headers: {
        Authorization: buildBasicAuthHeaderValue(credentials),
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        error: `Failed to mint bearer token: request timed out after ${Math.round(timeoutMs / 1000)}s.`,
      }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Failed to mint bearer token: ${message}` }
  } finally {
    clearTimeout(timeout)
  }

  const text = await res.text()
  const trimmed = text.trim()

  let parsedJson: unknown = null
  try {
    parsedJson = trimmed ? JSON.parse(trimmed) : null
  } catch {
    parsedJson = null
  }

  if (res.ok) {
    if (parsedJson == null) {
      return { ok: false, error: 'Token response was not valid JSON.' }
    }

    const parsed = tokenSuccessSchema.safeParse(parsedJson)
    if (!parsed.success) {
      return { ok: false, error: 'Token response did not include an access_token.' }
    }

    const data: BearerTokenResponse = {
      ...parsed.data,
      token_type: parsed.data.token_type ?? 'Bearer',
    }
    return { ok: true, raw: trimmed, data }
  }

  const parsedError = tokenErrorSchema.safeParse(parsedJson)
  if (parsedError.success) {
    return {
      ok: false,
      error: parsedError.data.message
        ? `${parsedError.data.error}: ${parsedError.data.message}`
        : parsedError.data.error,
    }
  }

  return {
    ok: false,
    error: `Token request failed (${res.status}): ${trimmed || res.statusText}`,
  }
}
