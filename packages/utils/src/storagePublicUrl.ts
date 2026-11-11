import type { SmartCdnUrlParams } from './smartCdn.ts'

import { getSmartCdnUrl } from './smartCdn.ts'

const previewFormats = ['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp'] as const
const previewResizeStrategies = ['crop', 'fit', 'fillcrop', 'pad', 'stretch'] as const
const previewPresets = ['auto', 'frame', 'icon'] as const

/** Immutable identity from a verified Storage receipt. A URL never publishes an asset. */
export interface PublicStoredAssetReference {
  workspace: string
  asset_id: string
  version_id: string
}

/** Bounded still-preview controls; omitted values use the public Built-in's defaults. */
export interface PublicStoredAssetPreview {
  width?: number
  height?: number
  quality?: number
  format?: (typeof previewFormats)[number]
  resizeStrategy?: (typeof previewResizeStrategies)[number]
  background?: string
  preset?: (typeof previewPresets)[number]
}

/** Choose original bytes (optionally downloaded) or one still preview, never both. */
export type PublicStoredAssetUrlOptions =
  | { download?: boolean; preview?: never }
  | { preview: PublicStoredAssetPreview; download?: never }

function boundedInteger(value: number | undefined, name: string, maximum: number): void {
  if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > maximum)) {
    throw new RangeError(`${name} must be an integer between 1 and ${maximum}`)
  }
}

/**
 * Build an unsigned, version-pinned URL for an asset under an explicitly published prefix.
 * It does not verify current publication or make a network request. Use signed delivery for
 * private assets. Existing cached bytes cannot be recalled by deleting or unpublishing an asset.
 */
export function getPublicStoredAssetUrl(
  asset: PublicStoredAssetReference,
  options: PublicStoredAssetUrlOptions = {},
): string {
  // Utils is dependency-free and cannot import the Node CLI's Zod catalog schema.
  // Keep this small URL-boundary check local rather than making that schema a browser dependency.
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(asset.workspace)) {
    throw new TypeError('workspace must be a valid Workspace slug')
  }
  const identity = /^[A-Za-z0-9_-]{21}[AQgw]$/u
  if (!identity.test(asset.asset_id) || !identity.test(asset.version_id)) {
    throw new TypeError('asset_id and version_id must be canonical Storage IDs')
  }
  if (Object.keys(options).some((key) => key !== 'download' && key !== 'preview')) {
    throw new TypeError('Unknown public Storage URL option')
  }
  if (options.download !== undefined && typeof options.download !== 'boolean') {
    throw new TypeError('download must be a boolean; public filenames come from Storage')
  }
  const urlParams: SmartCdnUrlParams = { v: asset.version_id }
  let template = 'builtin/public-serve@0.0.3'
  if (options.preview !== undefined) {
    if (options.download !== undefined)
      throw new TypeError('A preview cannot be an original download')
    const preview = options.preview
    const names = ['width', 'height', 'quality', 'format', 'resizeStrategy', 'background', 'preset']
    if (
      preview === null ||
      typeof preview !== 'object' ||
      Array.isArray(preview) ||
      Object.keys(preview).some((key) => !names.includes(key))
    ) {
      throw new TypeError('Unknown public preview option')
    }
    boundedInteger(preview.width, 'width', 4096)
    boundedInteger(preview.height, 'height', 4096)
    boundedInteger(preview.quality, 'quality', 85)
    if (preview.format !== undefined && !previewFormats.includes(preview.format))
      throw new TypeError('Unsupported preview format')
    if (
      preview.resizeStrategy !== undefined &&
      !previewResizeStrategies.includes(preview.resizeStrategy)
    )
      throw new TypeError('Unsupported preview resize strategy')
    if (preview.preset !== undefined && !previewPresets.includes(preview.preset))
      throw new TypeError('Unsupported preview preset')
    if (
      preview.background !== undefined &&
      !/^#[a-fA-F0-9]{6}([a-fA-F0-9]{2})?$/.test(preview.background)
    )
      throw new TypeError('background must be #rrggbb or #rrggbbaa')
    template = 'builtin/public-preview@0.0.4'
    const fields = {
      w: preview.width,
      h: preview.height,
      q: preview.quality,
      f: preview.format,
      r: preview.resizeStrategy,
      bg: preview.background,
      vs: preview.preset,
    }
    for (const [name, value] of Object.entries(fields)) {
      if (value !== undefined) urlParams[name] = value
    }
  } else if (options.download) {
    urlParams.download = '1'
  }
  return getSmartCdnUrl({ workspace: asset.workspace, input: asset.asset_id, template, urlParams })
}
