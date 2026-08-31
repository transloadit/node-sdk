import type { SignatureAlgorithm } from './index.ts'
import type { SmartCdnUrlOptions } from './smartCdn.ts'
import type { SmartCdnImageCandidates, SmartCdnImagePolicyOptions } from './smartCdnImage.ts'

import { createHmac } from 'node:crypto'

import { finishSmartCdnUrl, prepareSmartCdnUrl } from './smartCdn.ts'
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
