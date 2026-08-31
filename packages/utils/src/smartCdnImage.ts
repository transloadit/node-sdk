const defaultSmartCdnImageFormats: SmartCdnImageFormats = { avif: 45, webp: 75 }
const minimumMillisecondTimestamp = 1_000_000_000_000
const smartCdnImageFormats: readonly SmartCdnImageFormat[] = ['avif', 'webp', 'png']
const smartCdnImageMaxWidths = 32

/** Maximum requested width or height accepted by the responsive-image Built-ins. */
export const smartCdnImageMaxDimension = 8000

/** Image formats supported by the responsive-image Built-in. */
export type SmartCdnImageFormat = 'avif' | 'png' | 'webp'

/** Formats and their format-specific quality values. */
export type SmartCdnImageFormats = Readonly<Partial<Record<SmartCdnImageFormat, number>>>

/** One responsive-image candidate at a specific intrinsic width. */
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

/** One validated format and its encoding quality, in browser preference order. */
export interface SmartCdnImageFormatQuality {
  format: SmartCdnImageFormat
  quality: number
}

/** Structured data for rendering a responsive image. */
export interface SmartCdnImageCandidates {
  fallbackUrl: string
  sources: readonly SmartCdnImageSource[]
}

/** Intrinsic dimensions used to prevent upscaling or an oversized derived height. */
export interface SmartCdnImageSourceDimensions {
  height: number
  width: number
}

/** One rendition request passed to an injected Smart CDN signer. */
export interface SmartCdnImageSignRequest {
  expiresAt: number
  input: string
  template: string
  urlParams: Readonly<Record<string, boolean | number | string>>
}

/** Injected signer that keeps responsive-image policy independent from credentials and runtimes. */
export type SignSmartCdnImageRequest = (request: SmartCdnImageSignRequest) => string

/** Framework-neutral options for deterministic Smart CDN image candidates. */
export interface SmartCdnImagePolicyOptions {
  /** One absolute expiry in milliseconds since UNIX epoch, shared by every candidate. */
  expiresAt: number
  /** Browser-safe fallback URL, kept separate from the Template-specific input value. */
  fallbackUrl: string
  /** Formats and their quality values. Defaults to AVIF 45 and WebP 75. */
  formats?: SmartCdnImageFormats
  /** One source value accepted by the explicitly selected responsive-image Template. */
  input: string
  /** Intrinsic dimensions, when known, used to keep generated output within backend limits. */
  sourceDimensions?: SmartCdnImageSourceDimensions
  /** Trusted Template whose source policy is controlled by the caller's workspace. */
  template: string
  /** Up to 32 intrinsic widths. Each value must be an integer from 1 through 8000. */
  widths: readonly number[]
}

function isSmartCdnImageFormat(value: string): value is SmartCdnImageFormat {
  return value === 'avif' || value === 'png' || value === 'webp'
}

function validatePositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`)
  }
}

function validateSmartCdnImageDimension(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1 || value > smartCdnImageMaxDimension) {
    throw new RangeError(`${name} must be an integer from 1 through ${smartCdnImageMaxDimension}`)
  }
}

function validateSmartCdnImageQuality(quality: number): void {
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new RangeError('quality must be an integer from 1 through 100')
  }
}

function validateSmartCdnImageInput(input: string): void {
  if (typeof input !== 'string' || input === '' || input.trim() !== input || input.includes('|')) {
    throw new TypeError('input must be one non-empty Template input string')
  }
}

function validateSmartCdnImageFallbackUrl(fallbackUrl: string): void {
  if (typeof fallbackUrl !== 'string' || fallbackUrl === '' || fallbackUrl.trim() !== fallbackUrl) {
    throw new TypeError('fallbackUrl must be a non-empty string without surrounding whitespace')
  }
}

function validateSmartCdnImageTemplate(template: string): void {
  if (typeof template !== 'string' || template === '' || template.trim() !== template) {
    throw new TypeError('template must be a non-empty string without surrounding whitespace')
  }
}

/** Resolves and validates format-specific qualities in deterministic browser preference order. */
export function resolveSmartCdnImageFormats(
  formats: SmartCdnImageFormats | undefined,
): SmartCdnImageFormatQuality[] {
  const resolved = formats ?? defaultSmartCdnImageFormats
  for (const format of Object.keys(resolved)) {
    if (!isSmartCdnImageFormat(format)) {
      throw new TypeError(`Unsupported Smart CDN image format: ${format}`)
    }
  }

  const selected: SmartCdnImageFormatQuality[] = []
  for (const format of smartCdnImageFormats) {
    if (!Object.hasOwn(resolved, format)) continue
    const quality = resolved[format]
    if (quality === undefined) continue
    validateSmartCdnImageQuality(quality)
    selected.push({ format, quality })
  }
  if (selected.length === 0) throw new TypeError('formats must contain at least one value')
  return selected
}

function getMaximumCandidateWidth(
  sourceDimensions: SmartCdnImageSourceDimensions | undefined,
): number {
  if (sourceDimensions === undefined) return smartCdnImageMaxDimension

  validatePositiveSafeInteger(sourceDimensions.width, 'sourceDimensions.width')
  validatePositiveSafeInteger(sourceDimensions.height, 'sourceDimensions.height')
  const heightLimitedWidth = Number(
    (BigInt(smartCdnImageMaxDimension) * BigInt(sourceDimensions.width)) /
      BigInt(sourceDimensions.height),
  )
  if (heightLimitedWidth < 1) {
    // Even a one-pixel-wide rendition would exceed the backend height limit; no truthful candidate
    // can preserve this aspect ratio.
    throw new RangeError('sourceDimensions aspect ratio cannot fit within backend dimensions')
  }
  return Math.min(smartCdnImageMaxDimension, sourceDimensions.width, heightLimitedWidth)
}

/** Validates, caps, deduplicates, and sorts requested responsive-image widths. */
export function resolveSmartCdnImageWidths(
  widths: readonly number[],
  maximumWidth = smartCdnImageMaxDimension,
): number[] {
  if (!Array.isArray(widths) || widths.length === 0) {
    throw new TypeError('widths must contain at least one value')
  }
  if (widths.length > smartCdnImageMaxWidths) {
    throw new RangeError(`widths must contain at most ${smartCdnImageMaxWidths} values`)
  }

  validateSmartCdnImageDimension(maximumWidth, 'maximumWidth')
  const candidates = new Set<number>()
  for (const [index, width] of widths.entries()) {
    validateSmartCdnImageDimension(width, `widths[${index}]`)
    candidates.add(Math.min(width, maximumWidth))
  }
  return [...candidates].sort((left, right) => left - right)
}

/**
 * Creates signed responsive-image candidates while leaving credential storage and HMAC choice to
 * the injected signer.
 */
export function createSmartCdnImageCandidates(
  options: SmartCdnImagePolicyOptions,
  sign: SignSmartCdnImageRequest,
): SmartCdnImageCandidates {
  const expiresAt = options.expiresAt
  const fallbackUrl = options.fallbackUrl
  const formatOptions = options.formats
  const formatsSnapshot = formatOptions === undefined ? undefined : { ...formatOptions }
  const input = options.input
  const sourceDimensionOptions = options.sourceDimensions
  const sourceDimensions =
    sourceDimensionOptions === undefined
      ? undefined
      : { height: sourceDimensionOptions.height, width: sourceDimensionOptions.width }
  const template = options.template
  const widthOptions = options.widths
  const widthsSnapshot = Array.isArray(widthOptions) ? [...widthOptions] : widthOptions

  validatePositiveSafeInteger(expiresAt, 'expiresAt')
  if (expiresAt < minimumMillisecondTimestamp) {
    throw new RangeError('expiresAt must be a millisecond timestamp')
  }
  validateSmartCdnImageFallbackUrl(fallbackUrl)
  validateSmartCdnImageInput(input)
  validateSmartCdnImageTemplate(template)
  if (typeof sign !== 'function') throw new TypeError('sign must be a function')

  const formats = resolveSmartCdnImageFormats(formatsSnapshot)
  const widths = resolveSmartCdnImageWidths(
    widthsSnapshot,
    getMaximumCandidateWidth(sourceDimensions),
  )
  const sources: SmartCdnImageSource[] = []

  for (const { format, quality } of formats) {
    sources.push({
      candidates: widths.map((width) => ({
        url: sign({
          expiresAt,
          input,
          template,
          urlParams: { f: format, q: quality, r: 'fit', w: width },
        }),
        width,
      })),
      format,
      quality,
    })
  }

  return { fallbackUrl, sources }
}
