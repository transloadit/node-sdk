import type { SignSmartCdnImageRequest, SmartCdnImageFormat } from '@transloadit/utils'

import type { TransloaditImageSourceProps } from './imageSource.ts'

import {
  resolveSmartCdnImageFormats,
  resolveSmartCdnImageWidths,
  smartCdnImageMaxDimension,
} from '@transloadit/utils'

import { isOpaqueImageBackground, transparentImageBackground } from './imageBackground.ts'
import { snapshotImageSource } from './imageSource.ts'

export type { SignSmartCdnImageRequest, SmartCdnImageSignRequest } from '@transloadit/utils'

export type { TransloaditImageSource } from './imageSource.ts'

/** Signed Built-in used by default for Transloadit Storage previews. */
export const transloaditStoragePreviewTemplate = 'builtin/storage-preview@0.0.2'
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
  /** Ordered viewport-specific crops; each includes its own JPEG fallback. */
  artDirection?: readonly { media: string; model: TransloaditImageModel }[]
  /** Fixed URL expiry. Omitted when an adapter resolves fresh URLs after browser authorization. */
  expiresAt?: number
  fallbackUrl: string
  sources: readonly TransloaditImageSourceSet[]
}

interface TransloaditImageModelConfiguration {
  /** Optional output width/height ratio; requests a server-side fillcrop instead of padding. */
  cropAspectRatio?: number
  expiresAt: number
  /** Opaque JPEG background as #rrggbb or #rrggbbff. Defaults to white. */
  fallbackBackground?: string
  /** Optional JPEG width, capped by the resolved candidate ladder. */
  fallbackWidth?: number
  /** Encoding quality for the signed JPEG fallback. Defaults to 75. */
  fallbackQuality?: number
  formats?: StoragePreviewFormats
  /** Maximum candidate width, additionally bounded by the source and backend dimensions. */
  maximumWidth?: number
  /** Trusted compatible signed Template. Defaults to `builtin/storage-preview@0.0.2`. */
  template?: string
  /** Requested intrinsic candidate widths. Defaults to a conservative ladder up to the source. */
  widths?: readonly number[]
}

/** Framework-neutral options for a responsive Transloadit Storage preview. */
export type TransloaditImageModelOptions = TransloaditImageModelConfiguration &
  TransloaditImageSourceProps

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
  const { path: src, width, height } = snapshotImageSource(options)
  const expiresAt = options.expiresAt
  const cropAspectRatio = options.cropAspectRatio
  const requestedMaximumWidth = options.maximumWidth
  const requestedFallbackWidth = options.fallbackWidth
  const fallbackBackground = options.fallbackBackground ?? '#ffffff'
  const fallbackQuality = options.fallbackQuality ?? defaultFallbackQuality
  const formats = options.formats === undefined ? undefined : { ...options.formats }
  const template = options.template ?? transloaditStoragePreviewTemplate
  const widthsSnapshot = Array.isArray(options.widths) ? [...options.widths] : options.widths

  validatePositiveSafeInteger(expiresAt, 'expiresAt')
  if (expiresAt < minimumMillisecondTimestamp) {
    throw new RangeError('expiresAt must be a millisecond timestamp')
  }
  if (typeof sign !== 'function') throw new TypeError('sign must be a function')
  validateQuality(fallbackQuality, 'fallbackQuality')
  validateTemplate(template)
  if (!isOpaqueImageBackground(fallbackBackground)) {
    throw new TypeError('fallbackBackground must be an opaque #rrggbb or #rrggbbff color')
  }
  if (
    cropAspectRatio !== undefined &&
    (!Number.isFinite(cropAspectRatio) || cropAspectRatio <= 0)
  ) {
    throw new RangeError('cropAspectRatio must be a positive finite number')
  }
  if (requestedMaximumWidth !== undefined)
    validatePositiveSafeInteger(requestedMaximumWidth, 'maximumWidth')
  if (requestedFallbackWidth !== undefined)
    validatePositiveSafeInteger(requestedFallbackWidth, 'fallbackWidth')

  const ratioWidth = cropAspectRatio ?? width
  const ratioHeight = cropAspectRatio === undefined ? height : 1
  const heightLimitedWidth =
    cropAspectRatio === undefined
      ? Number((BigInt(smartCdnImageMaxDimension) * BigInt(width)) / BigInt(height))
      : Math.floor(smartCdnImageMaxDimension * cropAspectRatio)
  if (heightLimitedWidth < 1) {
    throw new RangeError('display aspect ratio cannot fit within backend dimensions')
  }
  const maximumWidth = Math.min(
    width,
    smartCdnImageMaxDimension,
    heightLimitedWidth,
    cropAspectRatio === undefined ? width : Math.floor(height * cropAspectRatio),
    requestedMaximumWidth ?? width,
  )
  if (maximumWidth < 1) {
    throw new RangeError(
      'source dimensions and cropAspectRatio must allow a crop at least one pixel wide',
    )
  }
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
          bg: transparentImageBackground,
          f: format,
          h: getStorageHeight(candidateWidth, ratioWidth, ratioHeight),
          q: quality,
          r: cropAspectRatio === undefined ? 'pad' : 'fillcrop',
          w: candidateWidth,
        },
      }),
      width: candidateWidth,
    })),
    format,
  }))
  const fallbackWidth = Math.min(requestedFallbackWidth ?? width, Math.max(...widths))
  const fallbackUrl = sign({
    expiresAt,
    input: src,
    template,
    urlParams: {
      bg: fallbackBackground,
      f: 'jpg',
      h: getStorageHeight(fallbackWidth, ratioWidth, ratioHeight),
      q: fallbackQuality,
      r: cropAspectRatio === undefined ? 'pad' : 'fillcrop',
      w: fallbackWidth,
    },
  })

  return { expiresAt, fallbackUrl, sources }
}
