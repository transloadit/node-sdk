import type { SignSmartCdnImageRequest, SmartCdnImageFormat } from '@transloadit/utils'

import {
  resolveSmartCdnImageFormats,
  resolveSmartCdnImageWidths,
  smartCdnImageMaxDimension,
} from '@transloadit/utils'

import { validateStoragePath } from './storagePath.ts'

export type { SignSmartCdnImageRequest, SmartCdnImageSignRequest } from '@transloadit/utils'

/** Signed Built-in used by default for Transloadit Storage previews. */
export const transloaditStoragePreviewTemplate = 'builtin/storage-preview@0.0.1'
const defaultFallbackQuality = 75
const defaultResponsiveImageWidths: readonly number[] = [320, 640, 960, 1280, 1920, 2560, 3840]
const minimumMillisecondTimestamp = 1_000_000_000_000

/** Image formats emitted as modern Transloadit Storage preview sources. */
export type StoragePreviewFormat = SmartCdnImageFormat

/** At least one Storage preview format with its format-specific quality. */
export type StoragePreviewFormats = {
  [Format in StoragePreviewFormat]: Readonly<
    Record<Format, number> & Partial<Record<Exclude<StoragePreviewFormat, Format>, number>>
  >
}[StoragePreviewFormat]

/** One signed responsive-image candidate. */
export interface TransloaditImageCandidate {
  url: string
  width: number
}

/** Ordered candidates for one browser-selectable image format. */
export interface TransloaditImageSourceSet {
  candidates: readonly TransloaditImageCandidate[]
  format: StoragePreviewFormat
}

/** Serializable data consumed by framework renderers. */
export interface TransloaditImageModel {
  /** Fixed URL expiry. Omitted when an adapter resolves fresh URLs after browser authorization. */
  expiresAt?: number
  fallbackUrl: string
  sources: readonly TransloaditImageSourceSet[]
}

/** Framework-neutral options for a responsive Transloadit Storage preview. */
export interface TransloaditImageModelOptions {
  expiresAt: number
  /** Encoding quality for the signed JPEG fallback. Defaults to 75. */
  fallbackQuality?: number
  formats?: StoragePreviewFormats
  /** Storage preview aspect-ratio numerator. */
  height: number
  /** Relative object path inside the configured Transloadit Storage workspace. */
  src: string
  /** Trusted compatible signed Template. Defaults to `builtin/storage-preview@0.0.1`. */
  template?: string
  /** Storage preview aspect-ratio denominator and conservative JPEG fallback width. */
  width: number
  /** Requested intrinsic candidate widths. Defaults to a conservative ladder up to the source. */
  widths?: readonly number[]
}

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

function validateQuality(quality: number, name: string): void {
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new RangeError(`${name} must be an integer from 1 through 100`)
  }
}

function getStorageHeight(candidateWidth: number, width: number, height: number): number {
  const candidateHeight = Math.max(1, Math.round((candidateWidth * height) / width))
  validateDimension(candidateHeight, 'candidate height')
  return candidateHeight
}

function getResponsiveImageWidths(
  widths: readonly number[] | undefined,
  maximumWidth: number,
): readonly number[] {
  if (widths !== undefined) return widths
  return [...defaultResponsiveImageWidths.filter((width) => width < maximumWidth), maximumWidth]
}

/** Creates one signed, serializable responsive preview of a Transloadit Storage object. */
export function createTransloaditImageModel(
  options: TransloaditImageModelOptions,
  sign: SignSmartCdnImageRequest,
): TransloaditImageModel {
  const expiresAt = options.expiresAt
  const fallbackQuality = options.fallbackQuality ?? defaultFallbackQuality
  const formats = options.formats === undefined ? undefined : { ...options.formats }
  const height = options.height
  const src = options.src
  const template = options.template ?? transloaditStoragePreviewTemplate
  const width = options.width
  const widthsSnapshot = Array.isArray(options.widths) ? [...options.widths] : options.widths

  validatePositiveSafeInteger(expiresAt, 'expiresAt')
  if (expiresAt < minimumMillisecondTimestamp) {
    throw new RangeError('expiresAt must be a millisecond timestamp')
  }
  if (typeof sign !== 'function') throw new TypeError('sign must be a function')
  validatePositiveSafeInteger(width, 'width')
  validatePositiveSafeInteger(height, 'height')
  validateQuality(fallbackQuality, 'fallbackQuality')
  validateStoragePath(src)
  validateTemplate(template)

  const heightLimitedWidth = Number(
    (BigInt(smartCdnImageMaxDimension) * BigInt(width)) / BigInt(height),
  )
  if (heightLimitedWidth < 1) {
    throw new RangeError('display aspect ratio cannot fit within backend dimensions')
  }
  const maximumWidth = Math.min(width, smartCdnImageMaxDimension, heightLimitedWidth)
  const widths = resolveSmartCdnImageWidths(
    getResponsiveImageWidths(widthsSnapshot, maximumWidth),
    maximumWidth,
  )
  const sources = resolveSmartCdnImageFormats(formats).map(({ format, quality }) => ({
    candidates: widths.map((candidateWidth) => ({
      url: sign({
        expiresAt,
        input: src,
        template,
        urlParams: {
          f: format,
          h: getStorageHeight(candidateWidth, width, height),
          q: quality,
          r: 'pad',
          w: candidateWidth,
        },
      }),
      width: candidateWidth,
    })),
    format,
  }))
  const fallbackWidth = Math.min(width, maximumWidth)
  const fallbackUrl = sign({
    expiresAt,
    input: src,
    template,
    urlParams: {
      f: 'jpg',
      h: getStorageHeight(fallbackWidth, width, height),
      q: fallbackQuality,
      r: 'pad',
      w: fallbackWidth,
    },
  })

  return { expiresAt, fallbackUrl, sources }
}
