import type { SignatureAlgorithm } from './index.ts'
import type { SmartCdnUrlOptions } from './smartCdn.ts'

import { createHmac } from 'node:crypto'

import { finishSmartCdnUrl, prepareSmartCdnUrl } from './smartCdn.ts'

export type { SignatureAlgorithm } from './index.ts'
export type {
  ParsedSmartCdnUrl,
  ParseSmartCdnUrlOptions,
  SmartCdnUnsignedUrlOptions,
  SmartCdnUrlOptions,
  SmartCdnUrlParams,
} from './smartCdn.ts'

export { getSmartCdnUrl, parseSmartCdnUrl, stripSmartCdnAuth } from './smartCdn.ts'

export type SignatureAlgorithmInput = SignatureAlgorithm | (string & {})

/** Image formats supported by the responsive-image Built-in. */
export type SmartCdnImageFormat = 'avif' | 'png' | 'webp'

/** One signed Smart CDN rendition at a specific intrinsic width. */
export interface SmartCdnImageCandidate {
  url: string
  width: number
}

/** Ordered candidates for one image format and quality. */
export interface SmartCdnImageSource {
  candidates: readonly SmartCdnImageCandidate[]
  format: SmartCdnImageFormat
  quality: number
}

/** Structured data for rendering a responsive image. */
export interface SmartCdnImageCandidates {
  fallbackUrl: string
  sources: readonly SmartCdnImageSource[]
}

/** Options for deterministic, server-generated Smart CDN image candidates. */
export interface SmartCdnImageCandidatesOptions {
  /** Transloadit auth key used to sign every candidate URL. */
  authKey: string
  /** Transloadit auth secret used to sign every candidate URL. */
  authSecret: string
  /** One absolute expiry in milliseconds since UNIX epoch, shared by every candidate. */
  expiresAt: number
  /** Formats and their quality values. Defaults to AVIF 45 and WebP 75. */
  formats?: Readonly<Partial<Record<SmartCdnImageFormat, number>>>
  /** Absolute HTTP(S) source URL accepted by the responsive-image Template. */
  input: string
  /** Compatible Template override. Defaults to `builtin/serve-image@0.0.1`. */
  template?: string
  /** Up to 32 intrinsic widths. Each value must be an integer from 1 through 8000. */
  widths: readonly number[]
  /** Workspace slug. */
  workspace: string
}

const defaultSmartCdnImageFormats: Readonly<Partial<Record<SmartCdnImageFormat, number>>> = {
  avif: 45,
  webp: 75,
}
const defaultSmartCdnImageTemplate = 'builtin/serve-image@0.0.1'
const smartCdnImageFormats: readonly SmartCdnImageFormat[] = ['avif', 'webp', 'png']
const smartCdnImageMaxDimension = 8000
const smartCdnImageMaxWidths = 32

function isSmartCdnImageFormat(value: string): value is SmartCdnImageFormat {
  return value === 'avif' || value === 'png' || value === 'webp'
}

function validateSmartCdnImageDimension(width: number): void {
  if (!Number.isInteger(width) || width < 1 || width > smartCdnImageMaxDimension) {
    throw new RangeError(`width must be an integer from 1 through ${smartCdnImageMaxDimension}`)
  }
}

function validateSmartCdnImageQuality(quality: number): void {
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new RangeError('quality must be an integer from 1 through 100')
  }
}

function validateSmartCdnImageInput(input: string): void {
  if (typeof input !== 'string' || input.trim() !== input || input.includes('|')) {
    throw new TypeError('input must be a single HTTP or HTTPS URL string')
  }
  if (!URL.canParse(input)) {
    throw new TypeError('input must be an HTTP or HTTPS URL')
  }

  const protocol = new URL(input).protocol
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new TypeError('input must be an HTTP or HTTPS URL')
  }
}

function validateSmartCdnImageFormats(
  formats: Readonly<Partial<Record<SmartCdnImageFormat, number>>>,
): void {
  for (const format of Object.keys(formats)) {
    if (!isSmartCdnImageFormat(format)) {
      throw new TypeError(`Unsupported Smart CDN image format: ${format}`)
    }
  }

  let formatCount = 0
  for (const format of smartCdnImageFormats) {
    const quality = formats[format]
    if (quality == null) {
      continue
    }

    validateSmartCdnImageQuality(quality)
    formatCount += 1
  }

  if (formatCount === 0) {
    throw new TypeError('formats must contain at least one value')
  }
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
 * Width descriptors are only accurate when callers do not request widths above the source image's
 * intrinsic width. The helper deliberately keeps the Built-in in width-only `fit` mode.
 */
export function getSignedSmartCdnImageCandidates(
  opts: SmartCdnImageCandidatesOptions,
): SmartCdnImageCandidates {
  if (typeof opts.authKey !== 'string' || opts.authKey === '') {
    throw new TypeError('authKey is required')
  }
  if (typeof opts.authSecret !== 'string' || opts.authSecret === '') {
    throw new TypeError('authSecret is required')
  }
  if (!Number.isSafeInteger(opts.expiresAt) || opts.expiresAt <= 0) {
    throw new RangeError('expiresAt must be a positive safe integer')
  }
  if (!Array.isArray(opts.widths) || opts.widths.length === 0) {
    throw new TypeError('widths must contain at least one value')
  }
  if (opts.widths.length > smartCdnImageMaxWidths) {
    throw new RangeError(`widths must contain at most ${smartCdnImageMaxWidths} values`)
  }

  validateSmartCdnImageInput(opts.input)
  const widths = [...new Set(opts.widths)]
  if (widths.length > smartCdnImageMaxWidths) {
    throw new RangeError(`widths must contain at most ${smartCdnImageMaxWidths} unique values`)
  }
  for (const width of widths) {
    validateSmartCdnImageDimension(width)
  }

  const formats = opts.formats ?? defaultSmartCdnImageFormats
  validateSmartCdnImageFormats(formats)

  widths.sort((left, right) => left - right)
  const sources: SmartCdnImageSource[] = []
  for (const format of smartCdnImageFormats) {
    const quality = formats[format]
    if (quality == null) {
      continue
    }

    const candidates: SmartCdnImageCandidate[] = []
    for (const width of widths) {
      const url = getSignedSmartCdnUrl({
        authKey: opts.authKey,
        authSecret: opts.authSecret,
        expiresAt: opts.expiresAt,
        input: opts.input,
        template: opts.template ?? defaultSmartCdnImageTemplate,
        urlParams: { f: format, q: quality, r: 'fit', w: width },
        workspace: opts.workspace,
      })
      candidates.push({ url, width })
    }
    sources.push({ candidates, format, quality })
  }

  return { fallbackUrl: opts.input, sources }
}
