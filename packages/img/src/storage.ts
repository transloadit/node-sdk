import type { SmartCdnImageSignRequest } from '@transloadit/utils'

import type { TransloaditImageSource, TransloaditStorageReference } from './imageSource.ts'
import type { StoragePreviewFormats, TransloaditImageModel } from './index.ts'

import { getStorageImageReference, snapshotImageSource } from './imageSource.ts'
import { createTransloaditImageModel } from './index.ts'

/** Default same-origin endpoint shared by the React adapter and download helper. */
export const defaultStorageRoute = '/api/transloadit/media'

/** Structural view of a canonical StoredAsset; validation at ingestion belongs to Types/Zod. */
export interface StorageAssetReceipt extends TransloaditStorageReference {
  readonly path: string
  readonly width?: number
  readonly height?: number
}

/** The image subset of a canonical receipt, with authoritative display geometry. */
export interface StorageImageReceipt
  extends StorageAssetReceipt,
    Pick<TransloaditImageSource, 'thumbhash' | 'has_alpha' | 'hasAlpha'> {
  readonly width: number
  readonly height: number
}

/** App permission checked independently for each requested kind of delivery. */
export type StorageAction = 'preview' | 'original' | 'download'

/** A named, server-owned fillcrop; arbitrary request ratios are never accepted. */
export interface StorageCropProfile {
  aspectRatio: number
  maximumWidth?: number
}

/** Finite rendition policy shared with the client; only the server copy grants permission. */
export interface StorageRenditionPolicy {
  /** Up to 31 widths; an intrinsic capped terminal width is always added. */
  widths?: readonly number[]
  /** Defaults to 3840, additionally capped by source geometry and Built-in bounds. */
  maximumWidth?: number
  formats?: StoragePreviewFormats
  fallbackQuality?: number
  fallbackBackground?: string
  /** Up to eight names, each with a ratio from 1/8 through 8. No crops by default. */
  crops?: Readonly<Record<string, StorageCropProfile>>
}

function dimension(value: number | undefined): void {
  if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 8000))
    throw new TypeError('Policy maximumWidth must be an integer from 1 through 8000')
}

/** Snapshots trusted policy once so later caller mutations cannot widen a route. */
export function snapshotStoragePolicy(policy: StorageRenditionPolicy = {}): StorageRenditionPolicy {
  const widths = policy.widths === undefined ? undefined : [...policy.widths]
  if (widths !== undefined && (widths.length === 0 || widths.length > 31))
    throw new TypeError('Policy widths must contain from 1 through 31 values')
  const maximumWidth = policy.maximumWidth ?? 3840
  dimension(maximumWidth)
  const crops = Object.fromEntries(
    Object.entries(policy.crops ?? {}).map(([name, profile]) => {
      if (
        !/^[a-z][a-z0-9-]{0,31}$/.test(name) ||
        !Number.isFinite(profile.aspectRatio) ||
        profile.aspectRatio < 1 / 8 ||
        profile.aspectRatio > 8
      )
        throw new TypeError(
          'Crop profiles require a simple name and aspectRatio from 1/8 through 8',
        )
      dimension(profile.maximumWidth)
      return [name, { aspectRatio: profile.aspectRatio, maximumWidth: profile.maximumWidth }]
    }),
  )
  if (Object.keys(crops).length > 8)
    throw new TypeError('Policy allows at most eight crop profiles')
  const snapshot = {
    widths,
    maximumWidth,
    crops,
    formats: policy.formats === undefined ? undefined : { ...policy.formats },
    fallbackQuality: policy.fallbackQuality,
    fallbackBackground: policy.fallbackBackground,
  }
  // The existing core remains the single authority for formats, quality, widths and background.
  createStorageModel(
    {
      workspace: 'validation',
      asset_id: 'A'.repeat(22),
      version_id: 'A'.repeat(22),
      path: 'validation',
      width: 8000,
      height: 8000,
    },
    snapshot,
    undefined,
    () => '',
  )
  return snapshot
}

/** Build client URLs and server allowlists through exactly the same core rounding/capping. */
export function createStorageModel(
  src: StorageImageReceipt,
  policy: StorageRenditionPolicy,
  crop: string | undefined,
  resolve: (request: SmartCdnImageSignRequest<undefined>) => string,
): TransloaditImageModel {
  const profile =
    crop === undefined
      ? undefined
      : Object.hasOwn(policy.crops ?? {}, crop)
        ? policy.crops?.[crop]
        : undefined
  if (crop !== undefined && profile === undefined) throw new TypeError('Unknown crop profile')
  return createTransloaditImageModel(
    {
      src,
      expiresAt: undefined,
      widths: policy.widths === undefined ? undefined : [...policy.widths, 8000],
      maximumWidth: Math.min(policy.maximumWidth ?? 3840, profile?.maximumWidth ?? 8000),
      formats: policy.formats,
      fallbackQuality: policy.fallbackQuality,
      fallbackBackground: policy.fallbackBackground,
      cropAspectRatio: profile?.aspectRatio,
    },
    resolve,
  )
}

function validateRoute(route: string): void {
  // A root-relative path inherits application cookies without creating a cross-origin grant flow.
  if (typeof route !== 'string' || !/^\/(?!\/)[^\\?#\p{Cc}\p{Cs}]*$/u.test(route))
    throw new TypeError('route must be a same-origin absolute path without query or fragment')
}

/** Encode only selection, never authoritative geometry, paths, credentials, or CDN parameters. */
export function storageRouteHref(
  src: TransloaditStorageReference,
  action: StorageAction,
  route = defaultStorageRoute,
  rendition?: { w: string; f: string; crop?: string },
): string {
  const { asset_id, version_id } = getStorageImageReference(src)
  validateRoute(route)
  const parameters = new URLSearchParams({ asset_id, version_id, action })
  if (rendition !== undefined) {
    parameters.set('w', rendition.w)
    parameters.set('f', rendition.f)
    if (rendition.crop !== undefined) parameters.set('crop', rendition.crop)
  }
  return `${route}?${parameters}`
}

/** Builds a stable, freshly authorized link to the original bytes or a trusted-filename download. */
export function getStorageAssetHref(
  src: StorageAssetReceipt,
  options: { action: 'original' | 'download'; route?: string },
): string {
  if (options.action !== 'original' && options.action !== 'download')
    throw new TypeError('Original links require action original or download')
  return storageRouteHref(src, options.action, options.route)
}

/** Validate only fields consumed for image delivery, without installing schemas in browsers. */
export function snapshotStorageImage(src: StorageImageReceipt): StorageImageReceipt {
  const source = snapshotImageSource({ src })
  return { ...source, ...getStorageImageReference(source) }
}
