import { validateStoragePathPrefix } from '@transloadit/utils'
import { z } from 'zod'

/** Normalize a public directory, never implicit workspace-wide access. */
export function normalizeStoragePublicPrefix(prefix: string): string {
  if (typeof prefix !== 'string' || prefix === '' || prefix === '/')
    throw new TypeError('A public prefix must name a non-root directory')
  const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`
  validateStoragePathPrefix(normalized, 0, 'public prefix')
  if (normalized.length > 512) throw new TypeError('A public prefix must be at most 512 characters')
  return normalized
}

const prefixSchema = z.string().refine((prefix) => {
  try {
    return normalizeStoragePublicPrefix(prefix) === prefix
  } catch {
    return false
  }
}, 'Expected a normalized public directory')
const publicPrefixSchema = z.object({ prefix: prefixSchema, created_at: z.string() })
export const storagePublicPrefixesSchema = z.object({
  ok: z.literal('STORAGE_PUBLIC_PREFIXES_LISTED'),
  public_prefixes: z.array(publicPrefixSchema),
})
export const storagePublicPrefixDeclaredSchema = publicPrefixSchema.extend({
  ok: z.literal('STORAGE_PUBLIC_PREFIX_DECLARED'),
  created: z.boolean(),
})
export const storagePublicPrefixRevokedSchema = z.object({
  ok: z.literal('STORAGE_PUBLIC_PREFIX_REVOKED'),
  prefix: prefixSchema,
  deleted: z.boolean(),
})

export type StoragePublicPrefixes = z.infer<typeof storagePublicPrefixesSchema>
export type StoragePublicPrefixDeclared = z.infer<typeof storagePublicPrefixDeclaredSchema>
export type StoragePublicPrefixRevoked = z.infer<typeof storagePublicPrefixRevokedSchema>
