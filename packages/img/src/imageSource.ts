import { validateStoragePath } from './storagePath.ts'

/** Saved source geometry; structurally compatible with a verified SDK Storage receipt. */
export interface TransloaditImageSource {
  readonly path: string
  readonly width: number
  readonly height: number
}

/** A path needs separate dimensions; a receipt owns its dimensions. */
export type TransloaditImageSourceProps =
  | { src: string; width: number; height: number }
  | { src: TransloaditImageSource; width?: never; height?: never }

function validateDimension(value: unknown, name: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`)
  }
}

/** Copies and validates source geometry before attribute getters, suspension or signing. */
export function snapshotImageSource(props: {
  src: unknown
  width?: unknown
  height?: unknown
}): TransloaditImageSource {
  const src = props.src
  let path: unknown
  let width: unknown
  let height: unknown
  if (typeof src === 'string') {
    path = src
    width = props.width
    height = props.height
  } else {
    if (
      typeof src !== 'object' ||
      src === null ||
      Array.isArray(src) ||
      !('path' in src) ||
      !('width' in src) ||
      !('height' in src) ||
      props.width !== undefined ||
      props.height !== undefined
    ) {
      throw new TypeError(
        'Storage image src must be one relative object path or a receipt without separate dimensions',
      )
    }
    path = src.path
    width = src.width
    height = src.height
  }
  if (typeof path !== 'string') throw new TypeError('Storage image receipt path must be a string')
  validateStoragePath(path)
  validateDimension(width, 'width')
  validateDimension(height, 'height')
  return { path, width, height }
}
