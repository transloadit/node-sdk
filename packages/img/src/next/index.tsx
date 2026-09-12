import type { CSSProperties, ReactNode } from 'react'

import type {
  TransloaditImageCandidate,
  TransloaditImageModel,
  TransloaditImageSourceSet,
} from '../index.ts'
import type { ImageAttributes, ImageLoadingProps } from './imageAttributes.ts'

import { Fragment } from 'react'
import { preload as preloadResource } from 'react-dom'

import { HydratedTransloaditPicture } from './HydratedTransloaditPicture.tsx'
import { snapshotImageAttributes, snapshotImageLoading } from './imageAttributes.ts'
import { StorageImageErrorBoundary } from './StorageImageErrorBoundary.tsx'

const transparentPixel =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const mimeTypes = {
  avif: 'image/avif',
  png: 'image/png',
  webp: 'image/webp',
} satisfies Record<TransloaditImageSourceSet['format'], string>

interface ImagePresentationProps extends Omit<ImageAttributes, 'height' | 'width'> {
  alt: string
  deferUntilHydrated?: boolean
  /** Optional client-side image-load fallback. Does not replace the server-rendered picture. */
  errorFallback?: ReactNode
  media?: string
  /** CSP-compatible placeholder used while `media` is unmatched. Defaults to an inline GIF. */
  mediaPlaceholderSrc?: string
  /** Explicitly handles a display box whose aspect ratio differs from the source image. */
  objectFit?: CSSProperties['objectFit']
  /** Expected rendered widths. Browsers otherwise assume `100vw` for width-based source sets. */
  sizes?: string
}

/** Layout and loading without assuming how the caller supplies source dimensions. */
export type TransloaditImageLayoutProps = ImagePresentationProps & ImageLoadingProps

/** Serializable native image attributes and layout shared by both Next.js renderers. */
export type TransloaditImagePresentationProps = TransloaditImageLayoutProps & {
  height: number
  width: number
}

/** Props for rendering an already-signed framework-neutral image model. */
export type TransloaditPictureProps = TransloaditImagePresentationProps & {
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

function getImageRecoveryKey({
  model,
  media,
  mediaPlaceholderSrc,
}: TransloaditPictureProps): string {
  const identity = JSON.stringify([
    model.fallbackUrl,
    model.sources,
    model.artDirection,
    media,
    mediaPlaceholderSrc,
  ])
  // FNV-1a is only a remount identity, never an authorization hash. Keep all candidate URLs out
  // of the Flight key without requiring Node crypto or asynchronous rendering in this component.
  let hash = 0xcbf29ce484222325n
  for (const byte of new TextEncoder().encode(identity)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n)
  }
  return hash.toString(16).padStart(16, '0')
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
  sizes: string,
  { crossOrigin, fetchPriority, referrerPolicy }: ImageAttributes,
): void {
  const firstCandidate = source.candidates[0]
  if (firstCandidate === undefined) {
    throw new Error('Cannot preload an empty Transloadit image source')
  }

  preloadResource(firstCandidate.url, {
    as: 'image',
    crossOrigin,
    fetchPriority,
    imageSizes: sizes,
    imageSrcSet: getSourceSet(source.candidates),
    referrerPolicy,
    type: getMimeType(source.format),
  })
}

/**
 * Renders browser-selected responsive candidates with one fallback. `media` keeps an unmatched
 * viewport inert; the caller controls whether its layout still reserves space in that viewport.
 * `deferUntilHydrated` avoids WebKit parser-to-hydration request replay.
 */
export function TransloaditPicture(props: TransloaditPictureProps): ReactNode {
  const {
    deferUntilHydrated = false,
    loading,
    media,
    mediaPlaceholderSrc,
    model,
    objectFit,
    preload = false,
    sizes: explicitSizes,
  } = props
  if (deferUntilHydrated && (loading === 'eager' || preload)) {
    throw new Error('An eager or preloaded Transloadit image cannot be deferred until hydration')
  }
  snapshotImageLoading(props)
  if (preload && media !== undefined) {
    // React 19's responsive-preload identity omits media and can silently collapse art direction.
    throw new Error('A media-gated Transloadit image cannot be preloaded')
  }
  const resolvedLoading = loading ?? (preload ? 'eager' : 'lazy')
  const sizes = explicitSizes ?? (resolvedLoading === 'lazy' ? 'auto, 100vw' : '100vw')
  const automaticSizes = /^auto(?:\s*,|\s*$)/i.test(sizes.trimStart())
  if (automaticSizes && resolvedLoading !== 'lazy') {
    throw new Error('Automatic image sizes require lazy loading')
  }
  if (model.sources.length === 0) {
    throw new Error('Cannot render a Transloadit image without a source')
  }

  const attributes = snapshotImageAttributes(props)
  const artDirection = model.artDirection ?? []
  if (media !== undefined && artDirection.length > 0)
    throw new Error('Art direction cannot be combined with a media-gated picture')
  const original = (
    // biome-ignore lint/performance/noImgElement: This package is the image optimizer.
    <img
      {...attributes}
      alt={attributes.alt}
      decoding={attributes.decoding ?? 'async'}
      loading={resolvedLoading}
      // Without img srcset, only lazy auto sizing is valid here. Fallback lengths stay on source.
      sizes={automaticSizes ? 'auto' : undefined}
      // The default avoids a request and broken-image UI. Strict img-src policies can supply a
      // same-origin transparent asset; a matching <source> takes precedence over either fallback.
      src={media ? (mediaPlaceholderSrc ?? transparentPixel) : model.fallbackUrl}
      style={objectFit === undefined ? attributes.style : { ...attributes.style, objectFit }}
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

  if (preload && artDirection.length === 0) {
    const preferredSource = model.sources[0]
    if (preferredSource === undefined) {
      throw new Error('Cannot preload a Transloadit image without a source')
    }
    preloadImage(preferredSource, sizes, attributes)
  }

  const preloads =
    preload && artDirection.length > 0
      ? [...artDirection, { media: undefined, model }].map((variant, index) => {
          const preferred = variant.model.sources[0]
          if (preferred === undefined) throw new Error('Cannot preload an empty art direction')
          const prior = artDirection.slice(0, index).map((source) => source.media)
          const unmatched = prior.length === 0 ? undefined : `not (${prior.join(' or ')})`
          const condition =
            variant.media === undefined
              ? unmatched
              : unmatched === undefined
                ? variant.media
                : `${variant.media} and (${unmatched})`
          return (
            <link
              key={variant.media ?? 'default'}
              rel="preload"
              as="image"
              media={condition}
              imageSrcSet={getSourceSet(preferred.candidates)}
              imageSizes={sizes}
              type={getMimeType(preferred.format)}
              crossOrigin={attributes.crossOrigin}
              referrerPolicy={attributes.referrerPolicy}
              fetchPriority={attributes.fetchPriority}
            />
          )
        })
      : null
  const picture = (
    <picture>
      {artDirection.map((variant) => (
        <Fragment key={variant.media}>
          {variant.model.sources.map((source) => (
            <source
              key={source.format}
              media={variant.media}
              sizes={sizes}
              srcSet={getSourceSet(source.candidates)}
              type={getMimeType(source.format)}
            />
          ))}
          <source
            media={variant.media}
            srcSet={escapeSourceSetUrl(variant.model.fallbackUrl)}
            type="image/jpeg"
          />
        </Fragment>
      ))}
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

  const resolved =
    props.errorFallback === undefined ? (
      picture
    ) : (
      <StorageImageErrorBoundary key={getImageRecoveryKey(props)} fallback={props.errorFallback}>
        {picture}
      </StorageImageErrorBoundary>
    )
  return (
    <>
      {preloads}
      {deferUntilHydrated ? (
        <HydratedTransloaditPicture fallback={fallback}>{resolved}</HydratedTransloaditPicture>
      ) : (
        resolved
      )}
    </>
  )
}
