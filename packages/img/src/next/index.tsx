import type { CSSProperties, ReactNode } from 'react'

import type {
  TransloaditImageCandidate,
  TransloaditImageModel,
  TransloaditImageSourceSet,
} from '../index.ts'

import { preload as preloadResource } from 'react-dom'

import { HydratedTransloaditPicture } from './HydratedTransloaditPicture.tsx'

const transparentPixel =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const mimeTypes = {
  avif: 'image/avif',
  png: 'image/png',
  webp: 'image/webp',
} satisfies Record<TransloaditImageSourceSet['format'], string>

/** Presentation options shared by the signed Server Component and model-only renderer. */
export interface TransloaditImagePresentationProps {
  alt: string
  className?: string
  deferUntilHydrated?: boolean
  fetchPriority?: 'auto' | 'high' | 'low'
  height: number
  loading?: 'eager' | 'lazy'
  media?: string
  /** CSP-compatible placeholder used while `media` is unmatched. Defaults to an inline GIF. */
  mediaPlaceholderSrc?: string
  /** Explicitly handles a display box whose aspect ratio differs from the source image. */
  objectFit?: CSSProperties['objectFit']
  preload?: boolean
  /** Expected rendered widths. Browsers otherwise assume `100vw` for width-based source sets. */
  sizes?: string
  style?: CSSProperties
  width: number
}

/** Props for rendering an already-signed framework-neutral image model. */
export interface TransloaditPictureProps extends TransloaditImagePresentationProps {
  model: TransloaditImageModel
}

function getSourceSet(candidates: readonly TransloaditImageCandidate[]): string {
  if (candidates.length === 0) {
    throw new Error('Cannot render an empty Transloadit image source')
  }
  return candidates.map(({ url, width }) => `${escapeSourceSetUrl(url)} ${width}w`).join(', ')
}

function getMimeType(format: TransloaditImageSourceSet['format']): string {
  return mimeTypes[format]
}

function escapeSourceSetUrl(url: string): string {
  const sourceSet = url
    .replaceAll('\t', '%09')
    .replaceAll('\n', '%0A')
    .replaceAll('\f', '%0C')
    .replaceAll('\r', '%0D')
    .replaceAll(' ', '%20')
  let firstUrlCharacter = 0
  while (sourceSet[firstUrlCharacter] === ',') firstUrlCharacter += 1
  if (firstUrlCharacter === sourceSet.length) return '%2C'.repeat(sourceSet.length)

  let afterLastUrlCharacter = sourceSet.length
  while (sourceSet[afterLastUrlCharacter - 1] === ',') afterLastUrlCharacter -= 1
  return `${'%2C'.repeat(firstUrlCharacter)}${sourceSet.slice(
    firstUrlCharacter,
    afterLastUrlCharacter,
  )}${'%2C'.repeat(sourceSet.length - afterLastUrlCharacter)}`
}

function preloadImage(
  source: TransloaditImageSourceSet,
  sizes: string | undefined,
  fetchPriority?: 'auto' | 'high' | 'low',
): void {
  const firstCandidate = source.candidates[0]
  if (firstCandidate === undefined) {
    throw new Error('Cannot preload an empty Transloadit image source')
  }

  preloadResource(firstCandidate.url, {
    as: 'image',
    fetchPriority,
    imageSizes: sizes,
    imageSrcSet: getSourceSet(source.candidates),
    type: getMimeType(source.format),
  })
}

function OriginalImage({
  alt,
  className,
  fetchPriority,
  height,
  loading,
  objectFit,
  src,
  style,
  width,
}: Pick<
  TransloaditImagePresentationProps,
  'alt' | 'className' | 'fetchPriority' | 'height' | 'loading' | 'objectFit' | 'style' | 'width'
> & {
  src?: string
}): ReactNode {
  return (
    // biome-ignore lint/performance/noImgElement: This package is the image optimizer.
    <img
      alt={alt}
      className={className}
      decoding="async"
      fetchPriority={fetchPriority}
      height={height}
      loading={loading}
      src={src}
      style={objectFit === undefined ? style : { ...style, objectFit }}
      width={width}
    />
  )
}

/**
 * Renders browser-selected responsive candidates with one fallback. `media` keeps an unmatched
 * viewport inert; the caller controls whether its layout still reserves space in that viewport.
 * `deferUntilHydrated` avoids WebKit parser-to-hydration request replay.
 */
export function TransloaditPicture({
  alt,
  className,
  deferUntilHydrated = false,
  fetchPriority,
  height,
  loading,
  media,
  mediaPlaceholderSrc,
  model,
  objectFit,
  preload = false,
  sizes,
  style,
  width,
}: TransloaditPictureProps): ReactNode {
  if (deferUntilHydrated && (loading === 'eager' || preload)) {
    throw new Error('An eager or preloaded Transloadit image cannot be deferred until hydration')
  }
  if (preload && loading === 'lazy') {
    throw new Error('A preloaded Transloadit image cannot use lazy loading')
  }
  if (preload && media !== undefined) {
    // React 19's responsive-preload identity omits media and can silently collapse art direction.
    throw new Error('A media-gated Transloadit image cannot be preloaded')
  }
  const resolvedLoading = loading ?? (preload ? 'eager' : 'lazy')
  if (model.sources.length === 0) {
    throw new Error('Cannot render a Transloadit image without a source')
  }

  const original = (
    <OriginalImage
      alt={alt}
      className={className}
      fetchPriority={fetchPriority}
      height={height}
      loading={resolvedLoading}
      objectFit={objectFit}
      // The default avoids a request and broken-image UI. Strict img-src policies can supply a
      // same-origin transparent asset; a matching <source> takes precedence over either fallback.
      src={media ? (mediaPlaceholderSrc ?? transparentPixel) : model.fallbackUrl}
      style={style}
      width={width}
    />
  )
  const fallback = media ? (
    <picture>
      <source media={media} srcSet={escapeSourceSetUrl(model.fallbackUrl)} />
      {original}
    </picture>
  ) : (
    original
  )

  if (preload) {
    const preferredSource = model.sources[0]
    if (preferredSource === undefined) {
      throw new Error('Cannot preload a Transloadit image without a source')
    }
    preloadImage(preferredSource, sizes, fetchPriority)
  }

  const picture = (
    <picture>
      {model.sources.map((source) => (
        <source
          key={source.format}
          media={media}
          sizes={sizes}
          srcSet={getSourceSet(source.candidates)}
          type={getMimeType(source.format)}
        />
      ))}
      {media ? <source media={media} srcSet={escapeSourceSetUrl(model.fallbackUrl)} /> : null}
      {original}
    </picture>
  )

  return deferUntilHydrated ? (
    <HydratedTransloaditPicture fallback={fallback}>{picture}</HydratedTransloaditPicture>
  ) : (
    picture
  )
}
