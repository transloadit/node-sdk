import { validateStoragePath } from '@transloadit/utils'

/** Workspace-scoped identity of one retained Storage version, independent of its path. */
export interface TransloaditStorageReference {
  readonly workspace: string
  readonly asset_id: string
  readonly version_id: string
}

/** Saved geometry for Storage receipts or customer-controlled HTTP/S3 Template inputs. */
export interface TransloaditImageSource extends Partial<TransloaditStorageReference> {
  readonly path: string
  readonly width: number
  readonly height: number
  /** Original-byte MD5 from a verified receipt or compatible Storage HEAD ETag. */
  readonly md5hash?: string
  /** Optional base64 ThumbHash, extracted by the producing Step on the server. */
  readonly thumbhash?: string
  /** Canonical server spelling: an original alpha channel disables persistent blur backgrounds. */
  readonly has_alpha?: boolean
  /** Legacy catalog spelling; canonical has_alpha takes precedence when present. */
  readonly hasAlpha?: boolean
}

/** Checks the canonical API2 ID spelling without adding a schema library to browser models. */
export function isStorageIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{21}[AQgw]$/u.test(value)
}

/** Require a complete pinned receipt before constructing any Storage delivery URL. */
export function getStorageImageReference(
  source: Partial<TransloaditStorageReference>,
  workspace?: string,
): TransloaditStorageReference {
  const { asset_id, version_id, workspace: receiptWorkspace } = source
  if (
    !isStorageIdentifier(asset_id) ||
    !isStorageIdentifier(version_id) ||
    typeof receiptWorkspace !== 'string' ||
    receiptWorkspace.length === 0
  ) {
    throw new TypeError(
      'Storage needs a version-pinned receipt with workspace, asset_id and version_id. Run transloadit storage receipts sync for this image prefix.',
    )
  }
  if (workspace !== undefined && receiptWorkspace !== workspace) {
    throw new TypeError(
      `Storage receipt belongs to Workspace ${receiptWorkspace}, not ${workspace}`,
    )
  }
  return { asset_id, version_id, workspace: receiptWorkspace }
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
  let hasAlpha: unknown
  let reference: Partial<TransloaditStorageReference> = {}
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
    // Normalize once for every renderer/model, keeping older committed catalogs readable.
    const canonicalAlpha = 'has_alpha' in src ? src.has_alpha : undefined
    hasAlpha =
      typeof canonicalAlpha === 'boolean'
        ? canonicalAlpha
        : 'hasAlpha' in src
          ? src.hasAlpha
          : undefined
    if ('asset_id' in src || 'version_id' in src || 'workspace' in src) {
      const asset_id = 'asset_id' in src ? src.asset_id : undefined
      const version_id = 'version_id' in src ? src.version_id : undefined
      const workspace = 'workspace' in src ? src.workspace : undefined
      if (
        !isStorageIdentifier(asset_id) ||
        !isStorageIdentifier(version_id) ||
        typeof workspace !== 'string' ||
        workspace.length === 0
      ) {
        throw new TypeError(
          'Storage receipt identity is incomplete. Run transloadit storage receipts sync for this image prefix.',
        )
      }
      reference = { asset_id, version_id, workspace }
    }
  }
  if (typeof path !== 'string') throw new TypeError('Storage image receipt path must be a string')
  validateStoragePath(path)
  validateDimension(width, 'width')
  validateDimension(height, 'height')
  if (md5hash !== undefined && (typeof md5hash !== 'string' || !/^[a-f0-9]{32}$/i.test(md5hash)))
    throw new TypeError('Storage image md5hash must be a 32-digit hexadecimal checksum')
  return {
    ...reference,
    path,
    width,
    height,
    ...(typeof md5hash === 'string' ? { md5hash: md5hash.toLowerCase() } : {}),
    ...(typeof thumbhash === 'string' ? { thumbhash } : {}),
    ...(hasAlpha === true ? { hasAlpha: true } : {}),
  }
}
