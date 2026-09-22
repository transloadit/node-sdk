import { z } from 'zod'

/** Maximum normalized Storage path length supported by the catalog schema. */
export const damPathMaxCodePoints = 512

// A Unicode regexp counts code points and stays portable across the published Zod 3/4 schemas.
const boundedPathSchema = z.string().regex(new RegExp(`^[\\s\\S]{0,${damPathMaxCodePoints}}$`, 'u'))

/** Canonical path and JSON representation of a 128-bit Storage identifier. */
export const damIdPattern = /^[A-Za-z0-9_-]{21}[AQgw]$/u

/** Canonical public Storage asset, version and folder identifier. */
export const damIdSchema = z
  .string()
  .regex(damIdPattern)
  .describe('Case-sensitive, canonical 22-character Base64URL Storage identifier.')

/** A retained version of a live Workspace asset, independent of its mutable location. */
export const storedAssetSchema = z.object({
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
    .optional()
    .describe('Base64-encoded ThumbHash of this version’s displayed pixels, when requested with output_meta.thumbhash on its producing Step. This is image data: apply the same access controls as the original.'),
  has_alpha: z.boolean().optional().describe('Whether the image has an alpha channel, even if all its pixels are opaque. Present when ThumbHash extraction succeeds; absence means unknown.'),
})

/** Store, read and recovery share this version-pinned shape, including optional placeholders. */
export type StoredAsset = z.infer<typeof storedAssetSchema>

/** Bounded metadata paging; cursors are the last returned, case-sensitive asset path. */
export const damAssetsListOptionsSchema = z.object({
  prefix: boundedPathSchema.default(''),
  cursor: boundedPathSchema.min(1).optional(),
  limit: z.number().int().min(1).max(500).default(100),
})

/** An omitted version selects the current version; an explicit version never falls back. */
export const damAssetGetOptionsSchema = z.object({ version_id: damIdSchema.optional() })

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
