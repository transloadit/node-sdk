import type { CSSProperties, ReactNode } from 'react'

import type {
  TransloaditImageCandidate,
  TransloaditImageModel,
  TransloaditImageSourceSet,
} from './index.ts'
import type { ImageAttributes, ImageLoadingProps } from './next/imageAttributes.ts'

import { Fragment } from 'react'
import { preload as preloadResource } from 'react-dom'

import { snapshotImageAttributes, snapshotImageLoading } from './next/imageAttributes.ts'
import { StorageImageErrorBoundary } from './next/StorageImageErrorBoundary.tsx'

const mimeTypes = {
  avif: 'image/avif',
  png: 'image/png',
  webp: 'image/webp',
} satisfies Record<TransloaditImageSourceSet['format'], string>

interface ImagePresentationProps extends Omit<ImageAttributes, 'height' | 'width'> {
  alt: string
  /** Optional client-side image-load fallback. Does not replace the server-rendered picture. */
  errorFallback?: ReactNode
  /** @experimental Change after signing in to reset a failed image with stable URLs. */
  retryKey?: string | number
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
  /** A pre-decoded placeholder; this low-level renderer does not import a ThumbHash decoder. */
  blurDataURL?: string
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

function getImageRecoveryKey({ model, retryKey }: TransloaditPictureProps): string {
  const identity = JSON.stringify([model.fallbackUrl, model.sources, model.artDirection, retryKey])
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

/** Renders immediately discoverable, browser-selected candidates with a JPEG fallback. */
export function TransloaditPicture(props: TransloaditPictureProps): ReactNode {
  const { model, objectFit, sizes: explicitSizes } = props
  const { loading, preload = false } = snapshotImageLoading(props)
  const resolvedLoading = loading ?? (preload ? 'eager' : 'lazy')
  let sizes = explicitSizes ?? (resolvedLoading === 'lazy' ? 'auto, 100vw' : '100vw')
  let automaticSizes = /^auto(?:\s*,|\s*$)/i.test(sizes.trimStart())
  if (automaticSizes && resolvedLoading !== 'lazy') {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development')
      console.warn(
        '[Image] auto sizes require lazy loading; using the explicit fallback for this eager image.',
      )
    sizes =
      sizes
        .trimStart()
        .replace(/^auto(?:\s*,\s*|\s*$)/i, '')
        .trim() || '100vw'
    automaticSizes = false
  }
  if (model.sources.length === 0) {
    throw new Error('Cannot render a Transloadit image without a source')
  }

  const attributes = snapshotImageAttributes(props)
  if (preload) attributes.fetchPriority = 'high'
  let blurStyle: CSSProperties | undefined
  if (props.blurDataURL !== undefined) {
    if (
      typeof props.blurDataURL !== 'string' ||
      props.blurDataURL.length > 6000 ||
      !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(props.blurDataURL)
    )
      throw new TypeError('blurDataURL must be a bounded base64 PNG data URL')
    const fit = objectFit ?? attributes.style?.objectFit ?? 'fill'
    // ThumbHash only approximates the source ratio. A retained background must never extend
    // into letterboxing beside loaded pixels; box-filling images cover it without client JS.
    if (fit === 'cover' || fit === 'fill') {
      blurStyle = {
        backgroundImage: `url("${props.blurDataURL}")`,
        backgroundPosition: attributes.style?.objectPosition ?? 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
      }
    } else if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn(
        '[Image] letterboxed image: no blur placeholder. Use the intrinsic aspect ratio or objectFit="cover" for a box-filling image.',
      )
    }
  }
  const artDirection = model.artDirection ?? []
  const original = (
    // biome-ignore lint/performance/noImgElement: This package is the image optimizer.
    <img
      {...attributes}
      alt={attributes.alt}
      decoding={attributes.decoding ?? 'async'}
      loading={resolvedLoading}
      // Without img srcset, only lazy auto sizing is valid here. Fallback lengths stay on source.
      sizes={automaticSizes ? 'auto' : undefined}
      src={model.fallbackUrl}
      style={{
        ...attributes.style,
        ...(objectFit === undefined ? {} : { objectFit }),
        ...blurStyle,
      }}
    />
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
          sizes={sizes}
          srcSet={getSourceSet(source.candidates)}
          type={getMimeType(source.format)}
        />
      ))}
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
      {resolved}
    </>
  )
}
