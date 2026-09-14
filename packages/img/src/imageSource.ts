import { validateStoragePath } from '@transloadit/utils'

/** Saved source geometry; structurally compatible with a verified SDK Storage receipt. */
export interface TransloaditImageSource {
  readonly path: string
  readonly width: number
  readonly height: number
  /** Original-byte MD5 from a verified receipt or compatible Storage HEAD ETag. */
  readonly md5hash?: string
  /** Optional base64 ThumbHash, generated from the original bytes by storage store. */
  readonly thumbhash?: string
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
  let md5hash: unknown
  let thumbhash: unknown
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
    md5hash = 'md5hash' in src ? src.md5hash : undefined
    thumbhash = 'thumbhash' in src ? src.thumbhash : undefined
  }
  if (typeof path !== 'string') throw new TypeError('Storage image receipt path must be a string')
  validateStoragePath(path)
  validateDimension(width, 'width')
  validateDimension(height, 'height')
  if (md5hash !== undefined && (typeof md5hash !== 'string' || !/^[a-f0-9]{32}$/i.test(md5hash)))
    throw new TypeError('Storage image md5hash must be a 32-digit hexadecimal checksum')
  return {
    path,
    width,
    height,
    ...(typeof md5hash === 'string' ? { md5hash: md5hash.toLowerCase() } : {}),
    ...(typeof thumbhash === 'string' ? { thumbhash } : {}),
  }
}
