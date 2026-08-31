/**
 * The Transloadit Storage grant: a short-lived HS256 JWT an integrator's
 * server mints (or api2's `POST /storage/grants` mints for it) and
 * Companion's S3 provider verifies. This module is the one wire contract —
 * claim shape, decoding, and (in `@transloadit/utils/node`) minting and
 * verification — so the implementations cannot drift apart.
 *
 * Everything in this file is browser-safe: the client may *read* a grant's
 * claims to decide what UI to show, but verification is the server's job.
 */

export const STORAGE_GRANT_SCOPES = ['read', 'write'] as const
export type StorageGrantScope = (typeof STORAGE_GRANT_SCOPES)[number]

export type StorageGrantClaims = {
  v: 1
  /** The workspace slug ("bucket" in S3 terms). */
  bucket: string
  /** Key prefix the session is confined to; may be empty. */
  prefix: string
  scopes: StorageGrantScope[]
  /** Who the grant was minted for (informational). */
  sub?: string
  /** Unix seconds. */
  iat?: number
  /** Unix seconds. */
  exp: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Validates a decoded JWT payload against the grant contract. Returns the
 * claims (scopes deduplicated) or null when the shape is not a v1 grant.
 */
export const parseStorageGrantClaims = (payload: unknown): StorageGrantClaims | null => {
  if (
    !isRecord(payload) ||
    payload.v !== 1 ||
    typeof payload.bucket !== 'string' ||
    payload.bucket.length === 0 ||
    typeof payload.prefix !== 'string' ||
    !Array.isArray(payload.scopes) ||
    !payload.scopes.every(
      (scope): scope is StorageGrantScope =>
        typeof scope === 'string' && (STORAGE_GRANT_SCOPES as readonly string[]).includes(scope),
    ) ||
    typeof payload.exp !== 'number'
  ) {
    return null
  }
  return {
    v: 1,
    bucket: payload.bucket,
    prefix: payload.prefix,
    scopes: [...new Set(payload.scopes)],
    ...(typeof payload.sub === 'string' && { sub: payload.sub }),
    ...(typeof payload.iat === 'number' && { iat: payload.iat }),
    exp: payload.exp,
  }
}

/** Companion's prefix policy: no leading slashes, a trailing slash unless empty. */
export const normalizeStorageGrantPrefix = (prefix: string): string => {
  const cleaned = prefix.replace(/^\/+/, '')
  return cleaned.length === 0 || cleaned.endsWith('/') ? cleaned : `${cleaned}/`
}

const decodeBase64UrlToUtf8 = (input: string): string => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

/**
 * Reads a grant's payload without verifying the signature — for clients that
 * only need to know what the session will be allowed to do. Returns null for
 * anything that does not decode to a v1 grant.
 */
export const decodeStorageGrant = (token: string): StorageGrantClaims | null => {
  try {
    const payload = token.split('.')[1]
    if (payload === undefined || payload.length === 0) return null
    return parseStorageGrantClaims(JSON.parse(decodeBase64UrlToUtf8(payload)))
  } catch {
    return null
  }
}
