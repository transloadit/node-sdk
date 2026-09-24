import { z } from 'zod'

import { describeApiParameter, describeApiParameterFields } from './apiParameterDescription.ts'

/** Maximum normalized Storage path length supported by the catalog schema. */
export const damPathMaxCodePoints = 512

// A Unicode regexp counts code points and stays portable across the published Zod 3/4 schemas.
const boundedPathSchema = z.string().regex(new RegExp(`^[\\s\\S]{0,${damPathMaxCodePoints}}$`, 'u'))

/** Canonical path and JSON representation of a 128-bit Storage identifier. */
export const damIdPattern = /^[A-Za-z0-9_-]{21}[AQgw]$/u

/** Canonical public Storage asset, version and folder identifier. */
export const damIdSchema = describeApiParameter(
  'damId',
  z.string().regex(damIdPattern),
  'Case-sensitive, canonical 22-character Base64URL DAM identifier.',
)

/** A retained version of a live Workspace asset, independent of its mutable location. */
export const storedAssetSchema = z.object(
  describeApiParameterFields(
    'storedAsset',
    {
      workspace: z.string().min(1),
      asset_id: damIdSchema,
      version_id: damIdSchema,
      path: z.string().min(1),
      size: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      mime: z.string().nullable(),
      md5hash: z
        .string()
        .regex(/^[a-f0-9]{32}$/u)
        .optional(),
      sha256: z
        .string()
        .regex(/^[a-f0-9]{64}$/u)
        .optional(),
      width: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
      height: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
      thumbhash: z
        .string()
        .regex(
          /^(?:[A-Za-z0-9+/]{4}){1,15}(?:[A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)$/u,
        )
        .optional(),
      has_alpha: z.boolean().optional(),
    },
    {
      workspace:
        'Workspace slug that owns this asset. Authenticate for the same Workspace when reading or managing it.',
      asset_id:
        'Stable asset ID. It survives native moves and renames; use it without a version to select the current bytes.',
      version_id:
        'Exact immutable version of this asset. Pair with asset_id to select retained bytes; a missing version never falls back to the current version.',
      path: 'Current mutable location relative to the Workspace. A rename makes the previous path stale; overwriting can change the bytes at this path.',
      size: 'Size of the stored file in bytes.',
      mime: 'MIME type of the stored bytes, or null when unknown.',
      md5hash: 'Lowercase MD5 checksum of the stored bytes, when available.',
      sha256: 'Lowercase SHA-256 checksum of the stored bytes, when available.',
      width: 'Display width in pixels, after applying EXIF orientation, when known.',
      height: 'Display height in pixels, after applying EXIF orientation, when known.',
      thumbhash:
        'Base64-encoded ThumbHash of this version’s displayed pixels, when requested with output_meta.thumbhash on its producing Step. This is image data: apply the same access controls as the original.',
      has_alpha:
        'Whether the image has an alpha channel, even if all its pixels are opaque. Present when ThumbHash extraction succeeds; absence means unknown.',
    },
  ),
)

/** Store, read and recovery share this version-pinned shape, including optional placeholders. */
export type StoredAsset = z.infer<typeof storedAssetSchema>

/** Shared explanations for portable client options and normalized API request fields. */
export const damAssetsListDescriptions = {
  prefix:
    'Only list current asset paths starting with this case-sensitive prefix. The empty default includes the whole Workspace; include a trailing slash to select a directory boundary.',
  cursor:
    'Opaque continuation value from next_cursor in the previous response. Keep the same prefix while paging. Omit for the first page.',
  limit:
    'Maximum number of assets per page. Defaults to 100 and accepts up to 500; follow next_cursor until null.',
} as const

/** Bounded metadata paging; cursors are the last returned, case-sensitive asset path. */
export const damAssetsListOptionsSchema = z.object(
  describeApiParameterFields(
    'storedAssetsList',
    {
      prefix: boundedPathSchema.default(''),
      cursor: boundedPathSchema.min(1).optional(),
      limit: z.number().int().min(1).max(500).default(100),
    },
    damAssetsListDescriptions,
  ),
)

/** An omitted version selects the current version; an explicit version never falls back. */
export const damAssetGetOptionsSchema = z.object({
  version_id: describeApiParameter(
    'storedAssetGetVersionId',
    damIdSchema.optional(),
    'Optional retained version of the selected asset. Omit for the current version. A missing or deleted version returns an error and never falls back to current bytes.',
  ),
})

/** Omit the destination to rename in place; null moves to the Workspace root. */
export const damAssetMoveOptionsSchema = z.object({
  destination_folder_id: damIdSchema.nullable().optional(),
  filename: z
    .string()
    .regex(/^[^/\\\p{Cc}]{1,255}$/u)
    .refine(
      (name) => name.trim() === name && name !== '.' && name !== '..',
      'Use a filename, not a path',
    )
    .optional(),
})

export type MoveStoredAssetOptions = z.input<typeof damAssetMoveOptionsSchema>

/** Native metadata is the same version-pinned shape returned by storing a file. */
export const damAssetFoundResponseSchema = z
  .object({
    message: z.string().min(1),
    ok: z.literal('DAM_ASSET_FOUND'),
    asset: storedAssetSchema,
  })
  .strict()

/** A bounded catalog page; null means there is no next page, even in an empty Workspace. */
export const damAssetsListedResponseSchema = z
  .object({
    workspace: storedAssetSchema.shape.workspace,
    message: z.string().min(1),
    ok: z.literal('DAM_ASSETS_LISTED'),
    assets: z.array(storedAssetSchema),
    next_cursor: z.string().nullable(),
  })
  .strict()

export type StoredAssetsPage = z.infer<typeof damAssetsListedResponseSchema>
export type ListStoredAssetsOptions = z.input<typeof damAssetsListOptionsSchema>
export type GetStoredAssetOptions = z.input<typeof damAssetGetOptionsSchema>
