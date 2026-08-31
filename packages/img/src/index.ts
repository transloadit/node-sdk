import type { SignSmartCdnImageRequest, SmartCdnImageFormat } from '@transloadit/utils'

import {
  createSmartCdnImageCandidates,
  resolveSmartCdnImageFormats,
  resolveSmartCdnImageWidths,
  smartCdnImageMaxDimension,
} from '@transloadit/utils'

import { getCanonicalPublicImageUrl, snapshotImageSource } from './imageSource.ts'
import { validateStoragePath } from './storagePath.ts'

export type { SignSmartCdnImageRequest, SmartCdnImageSignRequest } from '@transloadit/utils'

const defaultStoragePreviewTemplate = 'builtin/storage-preview@0.0.1'
const defaultStorageFallbackQuality = 75
const minimumMillisecondTimestamp = 1_000_000_000_000

/** Image formats supported by the responsive HTTP(S)-image Built-in. */
export type UrlImageFormat = SmartCdnImageFormat

/** Image formats emitted as modern Storage preview sources. */
export type StoragePreviewFormat = 'avif' | 'png' | 'webp'

/** At least one URL-image format with its format-specific quality. */
export type UrlImageFormats = {
  [Format in UrlImageFormat]: Readonly<
    Record<Format, number> & Partial<Record<Exclude<UrlImageFormat, Format>, number>>
  >
}[UrlImageFormat]

/** Format-specific qualities supported by the Storage preview Built-in. */
export type StoragePreviewFormats = UrlImageFormats

/** A public HTTP(S) image with known intrinsic dimensions. */
export interface UrlImageSource {
  height: number
  type: 'url'
  url: string
  width: number
}

/** A private file path inside the configured Transloadit Storage workspace. */
export interface StoragePreviewSource {
  path: string
  type: 'storage'
}

/** One signed responsive-image candidate. */
export interface TransloaditImageCandidate {
  url: string
  width: number
}

/** Ordered candidates for one browser-selectable image format. */
export interface TransloaditImageSourceSet {
  candidates: readonly TransloaditImageCandidate[]
  format: StoragePreviewFormat | UrlImageFormat
}

/** Serializable data consumed by framework renderers. */
export interface TransloaditImageModel {
  expiresAt: number
  fallbackUrl: string
  sources: readonly TransloaditImageSourceSet[]
}

interface CommonImageModelOptions {
  expiresAt: number
  /** Requested intrinsic candidate widths. */
  widths: readonly number[]
}

/** Model options for a public HTTP(S) image. */
export interface UrlImageModelOptions extends CommonImageModelOptions {
  fallbackQuality?: never
  /** Browser fallback. Defaults to the source URL and is never sent through Smart CDN. */
  fallbackUrl?: string
  formats?: UrlImageFormats
  source: UrlImageSource
  /** A trusted compatible Template. Defaults to `builtin/serve-image@0.0.1`. */
  template?: string
}

/** Model options for a Transloadit Storage preview. */
export interface StoragePreviewModelOptions extends CommonImageModelOptions {
  /** Encoding quality for the signed JPEG fallback. Defaults to 75. */
  fallbackQuality?: number
  fallbackUrl?: never
  formats?: StoragePreviewFormats
  /** Storage preview aspect-ratio numerator. */
  height: number
  source: StoragePreviewSource
  /** A trusted compatible signed Template. Defaults to `builtin/storage-preview@0.0.1`. */
  template?: string
  /** Storage preview aspect-ratio denominator and conservative JPEG fallback width. */
  width: number
}

/** Options accepted by the framework-neutral image-model builder. */
export type TransloaditImageModelOptions = UrlImageModelOptions | StoragePreviewModelOptions

function validateDimension(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1 || value > smartCdnImageMaxDimension) {
    throw new RangeError(`${name} must be an integer from 1 through ${smartCdnImageMaxDimension}`)
  }
}

function validatePositiveSafeInteger(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`)
  }
}

function validateTemplate(template: string): void {
  if (typeof template !== 'string' || template === '' || template.trim() !== template) {
    throw new TypeError('template must be a non-empty string without surrounding whitespace')
  }
}

function validateFallbackUrl(fallbackUrl: string): void {
  if (typeof fallbackUrl !== 'string' || fallbackUrl === '' || fallbackUrl.trim() !== fallbackUrl) {
    throw new TypeError('fallbackUrl must be a non-empty string without surrounding whitespace')
  }
}

function validateQuality(quality: number, name: string): void {
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new RangeError(`${name} must be an integer from 1 through 100`)
  }
}

function getCanonicalPublicUrl(source: UrlImageSource): string {
  validatePositiveSafeInteger(source.width, 'source.width')
  validatePositiveSafeInteger(source.height, 'source.height')
  return getCanonicalPublicImageUrl(source.url)
}

function getStorageHeight(candidateWidth: number, width: number, height: number): number {
  const candidateHeight = Math.max(1, Math.round((candidateWidth * height) / width))
  validateDimension(candidateHeight, 'candidate height')
  return candidateHeight
}

function createUrlImageModel(
  options: UrlImageModelOptions,
  sign: SignSmartCdnImageRequest,
): TransloaditImageModel {
  const sourceUrl = getCanonicalPublicUrl(options.source)
  if (options.fallbackUrl !== undefined) validateFallbackUrl(options.fallbackUrl)
  if (options.template !== undefined) validateTemplate(options.template)
  const model = createSmartCdnImageCandidates(
    {
      expiresAt: options.expiresAt,
      formats: options.formats,
      input: sourceUrl,
      sourceDimensions: { height: options.source.height, width: options.source.width },
      template: options.template,
      widths: options.widths,
    },
    sign,
  )

  return {
    expiresAt: options.expiresAt,
    fallbackUrl: options.fallbackUrl ?? sourceUrl,
    sources: model.sources.map(({ candidates, format }) => ({ candidates, format })),
  }
}

function createStoragePreviewModel(
  options: StoragePreviewModelOptions,
  sign: SignSmartCdnImageRequest,
): TransloaditImageModel {
  const path = options.source.path
  validateStoragePath(path)
  if (options.template !== undefined) validateTemplate(options.template)
  const heightLimitedWidth = Number(
    (BigInt(smartCdnImageMaxDimension) * BigInt(options.width)) / BigInt(options.height),
  )
  if (heightLimitedWidth < 1) {
    throw new RangeError('display aspect ratio cannot fit within backend dimensions')
  }
  const maximumWidth = Math.min(smartCdnImageMaxDimension, heightLimitedWidth)
  const widths = resolveSmartCdnImageWidths(options.widths, maximumWidth)
  const formats = resolveSmartCdnImageFormats(options.formats)
  const template = options.template ?? defaultStoragePreviewTemplate
  const fallbackQuality = options.fallbackQuality ?? defaultStorageFallbackQuality
  validateQuality(fallbackQuality, 'fallbackQuality')
  const sources = formats.map(({ format, quality }) => ({
    candidates: widths.map((width) => ({
      url: sign({
        expiresAt: options.expiresAt,
        input: path,
        template,
        urlParams: {
          f: format,
          h: getStorageHeight(width, options.width, options.height),
          q: quality,
          r: 'pad',
          w: width,
        },
      }),
      width,
    })),
    format,
  }))
  const fallbackWidth = Math.min(options.width, maximumWidth)
  const fallbackUrl = sign({
    expiresAt: options.expiresAt,
    input: path,
    template,
    urlParams: {
      f: 'jpg',
      h: getStorageHeight(fallbackWidth, options.width, options.height),
      q: fallbackQuality,
      r: 'pad',
      w: fallbackWidth,
    },
  })

  return { expiresAt: options.expiresAt, fallbackUrl, sources }
}

/**
 * Creates a signed, serializable responsive-image model without coupling policy to a framework or
 * credential store. HTTP(S) sources are public-only; private inputs use the Storage source.
 */
export function createTransloaditImageModel(
  options: UrlImageModelOptions,
  sign: SignSmartCdnImageRequest,
): TransloaditImageModel
export function createTransloaditImageModel(
  options: StoragePreviewModelOptions,
  sign: SignSmartCdnImageRequest,
): TransloaditImageModel
export function createTransloaditImageModel(
  options: TransloaditImageModelOptions,
  sign: SignSmartCdnImageRequest,
): TransloaditImageModel
export function createTransloaditImageModel(
  options: TransloaditImageModelOptions,
  sign: SignSmartCdnImageRequest,
): TransloaditImageModel {
  const expiresAt = options.expiresAt
  const fallbackQuality = options.fallbackQuality
  const fallbackUrl = options.fallbackUrl
  const formats = options.formats === undefined ? undefined : { ...options.formats }
  const height: unknown = 'height' in options ? options.height : undefined
  const template = options.template
  const width: unknown = 'width' in options ? options.width : undefined
  const widths = Array.isArray(options.widths) ? [...options.widths] : options.widths

  validatePositiveSafeInteger(expiresAt, 'expiresAt')
  if (expiresAt < minimumMillisecondTimestamp) {
    throw new RangeError('expiresAt must be a millisecond timestamp')
  }
  if (typeof sign !== 'function') throw new TypeError('sign must be a function')

  const source = snapshotImageSource(options.source)
  if (source.type === 'url') {
    if (fallbackQuality !== undefined) {
      throw new TypeError('fallbackQuality is only supported for Storage image sources')
    }
    return createUrlImageModel(
      {
        expiresAt,
        fallbackUrl,
        formats,
        source,
        template,
        widths,
      },
      sign,
    )
  }
  if (fallbackUrl !== undefined) {
    throw new TypeError('fallbackUrl is only supported for public URL image sources')
  }
  validatePositiveSafeInteger(width, 'width')
  validatePositiveSafeInteger(height, 'height')
  return createStoragePreviewModel(
    {
      expiresAt,
      fallbackQuality,
      formats,
      height,
      source,
      template,
      width,
      widths,
    },
    sign,
  )
}
