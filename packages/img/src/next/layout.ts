import type { CSSProperties } from 'react'

import type { TransloaditImageSource, TransloaditImageSourceProps } from '../imageSource.ts'

import { snapshotImageSource } from '../imageSource.ts'

/** Optional layout convenience; explicit source geometry remains unchanged without a mode. */
export type StorageImageLayoutProps =
  | (TransloaditImageSourceProps & {
      layout?: never
      maxWidth?: never
      fit?: never
      aspectRatio?: never
    })
  | (TransloaditImageSourceProps & {
      layout: 'constrained'
      maxWidth: number
      fit?: never
      aspectRatio?: never
    })
  | {
      layout: 'fixed'
      src: TransloaditImageSource
      width: number
      height: number
      fit?: 'contain' | 'cover'
      maxWidth?: never
      aspectRatio?: never
    }
  | ({
      layout: 'fill'
      src: TransloaditImageSource
      width?: never
      height?: never
      maxWidth?: never
    } & (
      | { fit: 'cover'; aspectRatio: string | number }
      | { fit?: 'contain'; aspectRatio?: string | number }
    ))

interface ResolvedImageLayout {
  source: TransloaditImageSource
  width: number
  height: number
  cropAspectRatio?: number
  fallbackWidth?: number
  maximumWidth?: number
  sizes?: string
  style?: CSSProperties
  widths?: readonly number[]
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
  props: StorageImageLayoutProps & { widths?: readonly number[] },
): ResolvedImageLayout {
  const layout = props.layout
  const source = snapshotImageSource(layout === 'fixed' ? { src: props.src } : props)
  const widths = Array.isArray(props.widths) ? [...props.widths] : props.widths
  const base = { source, width: source.width, height: source.height, widths }
  if (layout === undefined) return base
  if (layout === 'constrained') {
    const maxWidth = boxDimension(props.maxWidth, 'maxWidth')
    return {
      ...base,
      maximumWidth: widths === undefined ? 2 * maxWidth : undefined,
      sizes: `(min-width: ${maxWidth}px) ${maxWidth}px, 100vw`,
      style: { display: 'block', maxWidth, width: '100%', height: 'auto' },
    }
  }
  const fit = props.fit ?? 'contain'
  if (fit !== 'contain' && fit !== 'cover') throw new TypeError('fit must be contain or cover')
  if (layout === 'fixed') {
    const width = boxDimension(props.width, 'width')
    const height = boxDimension(props.height, 'height')
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
    const ratio =
      props.aspectRatio === undefined && fit !== 'cover'
        ? undefined
        : parseAspectRatio(props.aspectRatio)
    return {
      ...base,
      cropAspectRatio: fit === 'cover' ? ratio : undefined,
      style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit },
    }
  }
  throw new TypeError('layout must be constrained, fixed or fill')
}
