import type { SignatureAlgorithm } from './index.ts'
import type { SmartCdnUrlOptions } from './smartCdn.ts'
import type { SmartCdnImageCandidates, SmartCdnImagePolicyOptions } from './smartCdnImage.ts'

import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'

import { finishSmartCdnUrl, prepareSmartCdnUrl } from './smartCdn.ts'
import {
  parseStorageGrantClaims,
  type StorageGrantClaims,
  type StorageGrantScope,
} from './storageGrant.ts'
import { createSmartCdnImageCandidates } from './smartCdnImage.ts'

export type { SignatureAlgorithm } from './index.ts'
export type {
  ParsedSmartCdnUrl,
  ParseSmartCdnUrlOptions,
  SmartCdnUnsignedUrlOptions,
  SmartCdnUrlOptions,
  SmartCdnUrlParams,
} from './smartCdn.ts'
export type {
  SignSmartCdnImageRequest,
  SmartCdnImageCandidate,
  SmartCdnImageCandidates,
  SmartCdnImageFormat,
  SmartCdnImageFormatQuality,
  SmartCdnImageFormats,
  SmartCdnImagePolicyOptions,
  SmartCdnImageSignRequest,
  SmartCdnImageSource,
  SmartCdnImageSourceDimensions,
} from './smartCdnImage.ts'

export { getSmartCdnUrl, parseSmartCdnUrl, stripSmartCdnAuth } from './smartCdn.ts'
export {
  resolveSmartCdnImageFormats,
  resolveSmartCdnImageWidths,
  smartCdnImageMaxDimension,
} from './smartCdnImage.ts'

export type SignatureAlgorithmInput = SignatureAlgorithm | (string & {})

/** Options for deterministic, server-generated Smart CDN image candidates. */
export interface SmartCdnImageCandidatesOptions extends SmartCdnImagePolicyOptions {
  /** Transloadit auth key used to sign every candidate URL. */
  authKey: string
  /** Transloadit auth secret used to sign every candidate URL. */
  authSecret: string
  /** Workspace slug. */
  workspace: string
}

export const signParamsSync = (
  paramsString: string,
  authSecret: string,
  algorithm: SignatureAlgorithmInput = 'sha384',
): string => {
  const signature = createHmac(algorithm, authSecret)
    .update(Buffer.from(paramsString, 'utf-8'))
    .digest('hex')
  return `${algorithm}:${signature}`
}

/** Synchronous Smart CDN URL signer (Node). The root export has an async WebCrypto twin. */
export const getSignedSmartCdnUrl = (opts: SmartCdnUrlOptions): string => {
  const prepared = prepareSmartCdnUrl(opts)
  const signature = createHmac('sha256', opts.authSecret)
    .update(prepared.stringToSign)
    .digest('hex')
  return finishSmartCdnUrl(prepared, signature)
}

/**
 * Builds deterministic signed Smart CDN candidates for server-rendered `<picture>` elements.
 *
 * Pass `sourceDimensions` when known so width descriptors remain truthful without producing a
 * rendition above the backend's width or derived-height limits.
 */
export function getSignedSmartCdnImageCandidates(
  opts: SmartCdnImageCandidatesOptions,
): SmartCdnImageCandidates {
  const authKey = opts.authKey
  const authSecret = opts.authSecret
  const workspace = opts.workspace
  if (typeof authKey !== 'string' || authKey === '') {
    throw new TypeError('authKey is required')
  }
  if (typeof authSecret !== 'string' || authSecret === '') {
    throw new TypeError('authSecret is required')
  }

  return createSmartCdnImageCandidates(opts, (request) =>
    getSignedSmartCdnUrl({
      authKey,
      authSecret,
      expiresAt: request.expiresAt,
      input: request.input,
      template: request.template,
      urlParams: { ...request.urlParams },
      workspace,
    }),
  )
}


// ── storage grants ───────────────────────────────────────────────────────────

export {
  decodeStorageGrant,
  normalizeStorageGrantPrefix,
  parseStorageGrantClaims,
  STORAGE_GRANT_SCOPES,
} from './storageGrant.ts'
export type { StorageGrantClaims, StorageGrantScope } from './storageGrant.ts'

const base64url = (value: Buffer | string): string =>
  (typeof value === 'string' ? Buffer.from(value) : value).toString('base64url')

export type SignStorageGrantOptions = {
  /** The workspace slug ("bucket" in S3 terms). */
  bucket: string
  /** Key prefix to confine the session to. Default: the whole workspace. */
  prefix?: string
  /** Default: read-only. */
  scopes?: StorageGrantScope[]
  /** Who the grant is minted for (informational). */
  sub?: string
  /** Grant lifetime. Default: 900 (15 minutes). */
  expiresInSeconds?: number
  /** Clock override for tests. */
  nowMs?: number
}

/**
 * Mints a storage grant: an HS256 JWT with the v1 claim set, byte-compatible
 * with api2's `StorageGrantManager` (same header, claim order and encoding).
 */
export const signStorageGrant = (
  options: SignStorageGrantOptions,
  secret: string,
): { grant: string; claims: StorageGrantClaims } => {
  const { bucket, prefix = '', scopes = ['read'], sub, expiresInSeconds = 900 } = options
  const iat = Math.floor((options.nowMs ?? Date.now()) / 1000)
  const claims: StorageGrantClaims = {
    v: 1,
    bucket,
    prefix,
    scopes: [...new Set(scopes)],
    ...(sub === undefined ? {} : { sub }),
    iat,
    exp: iat + expiresInSeconds,
  }
  const signingInput = `${base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64url(
    JSON.stringify(claims),
  )}`
  const signature = base64url(createHmac('sha256', secret).update(signingInput).digest())
  return { grant: `${signingInput}.${signature}`, claims }
}

/**
 * Verifies a storage grant: HS256 signature (timing-safe), strict v1 claim
 * shape, and expiry. Throws with a stable message on any failure.
 */
export const verifyStorageGrant = (
  token: string,
  secret: string,
  { nowMs = Date.now() }: { nowMs?: number } = {},
): StorageGrantClaims => {
  const [headerPart, payloadPart, signaturePart, ...rest] = token.split('.')
  if (!headerPart || !payloadPart || !signaturePart || rest.length > 0) {
    throw new Error('Invalid storage grant')
  }
  const expected = createHmac('sha256', secret).update(`${headerPart}.${payloadPart}`).digest()
  const actual = Buffer.from(signaturePart, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('Invalid storage grant signature')
  }
  let header: unknown
  let payload: unknown
  try {
    header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'))
    payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'))
  } catch {
    throw new Error('Invalid storage grant')
  }
  if (
    typeof header !== 'object' ||
    header === null ||
    (header as { alg?: unknown }).alg !== 'HS256'
  ) {
    throw new Error('Invalid storage grant algorithm')
  }
  const claims = parseStorageGrantClaims(payload)
  if (claims === null) throw new Error('Invalid storage grant claims')
  if (claims.exp <= Math.floor(nowMs / 1000)) throw new Error('The storage grant has expired')
  return claims
}
