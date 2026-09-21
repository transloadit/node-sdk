import type { CSSProperties } from 'react'

import type { TransloaditImageSource } from '../imageSource.ts'

import { snapshotImageSource } from '../imageSource.ts'
import { missingImageHint } from './pathHints.ts'

/** Committed rendering receipts indexed by their exact Storage paths. */
export type StorageImageCatalog = Readonly<Record<string, TransloaditImageSource>>

type CatalogSource<Catalog> = TransloaditImageSource | Extract<keyof Catalog, string>

type PresentationSourceProps<Catalog> =
  | (Catalog extends undefined ? { src: string; width: number; height: number } : never)
  | { src: CatalogSource<Catalog>; width?: number; height?: number }

/** Crop ratios selected by viewport width; default is required for all other viewports. */
export type StorageImageAspectRatio =
  | string
  | number
  | Readonly<{ default: string | number } & Record<string, string | number>>

/** All sources are responsive by default; none leaves presentation sizing to the caller. */
export type StorageImageLayoutProps<Catalog extends StorageImageCatalog | undefined = undefined> =
  | (PresentationSourceProps<Catalog> & {
      layout?: 'constrained' | 'none'
      fit?: never
      aspectRatio?: never
      frame?: never
    })
  | {
      layout: 'fixed'
      src: CatalogSource<Catalog>
      width: number
      height: number
      fit?: 'contain' | 'cover'
      aspectRatio?: never
      frame?: never
    }
  | ({
      layout: 'fill'
      src: CatalogSource<Catalog>
      width?: never
      height?: never
      /** Opt out when the app already owns the positioned box and its responsive ratios. */
      frame?: false
    } & (
      | { fit: 'cover'; aspectRatio: StorageImageAspectRatio }
      | { fit?: 'contain'; aspectRatio?: string | number }
    ))

interface ResolvedImageLayout {
  source: TransloaditImageSource
  width: number
  height: number
  cropAspectRatio?: number
  artDirection?: readonly { media: string; cropAspectRatio: number }[]
  fallbackWidth?: number
  maximumWidth?: number
  sizes?: string
  style?: CSSProperties
  widths?: readonly number[]
  frame?: { ratio: number; variants: readonly { media: string; cropAspectRatio: number }[] }
}

function boxDimension(value: number | undefined, name: string): number {
  if (value === undefined || !Number.isSafeInteger(value) || value < 1 || value > 8000) {
    throw new RangeError(`${name} must be an integer from 1 through 8000`)
  }
  return value
}

function parseAspectRatio(value: string | number | undefined): number {
  const pieces = typeof value === 'string' ? value.split('/').map(Number) : [value]
  const [width, height = 1] = pieces
  if (
    pieces.length > 2 ||
    width === undefined ||
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isFinite(width / height)
  ) {
    throw new TypeError('Cover fill requires a positive aspectRatio, for example "9/16"')
  }
  return width / height
}

/** Snapshots intrinsic and box geometry before any caller-owned attribute getter can mutate it. */
export function resolveImageLayout(
  props: StorageImageLayoutProps<StorageImageCatalog> & { widths?: readonly number[] },
  images?: StorageImageCatalog,
): ResolvedImageLayout {
  const input = props.src
  const src =
    typeof input === 'string' && images !== undefined
      ? Object.hasOwn(images, input)
        ? images[input]
        : undefined
      : input
  if (src === undefined)
    throw new TypeError(
      typeof input === 'string'
        ? missingImageHint(input, Object.keys(images ?? {}))
        : 'Storage image src is required',
    )
  const layout = props.layout ?? 'constrained'
  if ((layout === 'fixed' || layout === 'fill') && typeof src === 'string') {
    throw new TypeError(
      `${layout} layout requires a receipt source with intrinsic dimensions${layout === 'fixed' ? '; width and height describe the display box' : ''}`,
    )
  }
  const source = snapshotImageSource(
    typeof src === 'string' ? { src, width: props.width, height: props.height } : { src },
  )
  const presentationWidth = typeof src === 'string' ? undefined : props.width
  const presentationHeight = typeof src === 'string' ? undefined : props.height
  const width =
    presentationWidth === undefined
      ? presentationHeight === undefined
        ? source.width
        : Math.max(1, Math.round((presentationHeight * source.width) / source.height))
      : boxDimension(presentationWidth, 'width')
  const height =
    presentationHeight === undefined
      ? presentationWidth === undefined
        ? source.height
        : Math.max(1, Math.round((presentationWidth * source.height) / source.width))
      : boxDimension(presentationHeight, 'height')
  const widths = Array.isArray(props.widths) ? [...props.widths] : props.widths
  const base = { source, width, height, widths }
  if (layout === 'none') return base
  if (layout === 'constrained') {
    // Explicit display dimensions were validated above; an original may exceed the CDN output cap.
    const maxWidth = Math.min(width, source.width)
    return {
      ...base,
      width: maxWidth,
      height: Math.max(1, Math.round((maxWidth * source.height) / source.width)),
      maximumWidth: widths === undefined ? 2 * maxWidth : undefined,
      sizes: `(min-width: ${maxWidth}px) ${maxWidth}px, 100vw`,
      style: { display: 'block', maxWidth, width: '100%', height: 'auto' },
    }
  }
  const fit = props.fit ?? 'contain'
  if (fit !== 'contain' && fit !== 'cover') throw new TypeError('fit must be contain or cover')
  if (layout === 'fixed') {
    const width = boxDimension(presentationWidth, 'width')
    const height = boxDimension(presentationHeight, 'height')
    return {
      ...base,
      width,
      height,
      cropAspectRatio: fit === 'cover' ? width / height : undefined,
      fallbackWidth: width,
      sizes: `${width}px`,
      style: { display: 'block', height, width, objectFit: fit },
      widths: widths ?? [width, Math.min(8000, 2 * width)],
    }
  }
  if (layout === 'fill') {
    const aspectRatio = props.aspectRatio
    const breakpoints =
      typeof aspectRatio === 'object' && aspectRatio !== null ? aspectRatio : undefined
    if (
      breakpoints !== undefined &&
      (fit !== 'cover' || Array.isArray(breakpoints) || Object.keys(breakpoints).length > 9)
    ) {
      throw new TypeError(
        'Art direction requires fill cover with default and up to eight width breakpoints',
      )
    }
    const artDirection =
      breakpoints === undefined
        ? undefined
        : Object.entries(breakpoints)
            .filter(([media]) => media !== 'default')
            .map(([media, ratio]) => {
              if (!/^\((?:min|max)-width:\s*\d+(?:\.\d+)?(?:px|em|rem)\)$/.test(media))
                throw new TypeError(
                  'Art direction keys must be width breakpoints, for example (max-width: 639px)',
                )
              return { media, cropAspectRatio: parseAspectRatio(ratio) }
            })
    const ratio =
      aspectRatio === undefined && fit !== 'cover'
        ? undefined
        : parseAspectRatio(typeof aspectRatio === 'object' ? breakpoints?.default : aspectRatio)
    return {
      ...base,
      cropAspectRatio: fit === 'cover' ? ratio : undefined,
      artDirection,
      frame:
        props.frame === false || ratio === undefined
          ? undefined
          : { ratio, variants: artDirection ?? [] },
      style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit },
    }
  }
  throw new TypeError('layout must be constrained, fixed, fill or none')
}
