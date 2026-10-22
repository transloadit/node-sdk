import { z } from 'zod'

export const builtinTemplateDocSchema = z
  .object({
    id: z.string(),
    base: z.string(),
    version: z.string(),
    description: z.string(),
    input: z.enum(['upload', 'remote_url', 'none']),
    required_fields: z.array(z.string()),
    optional_fields: z.array(
      z
        .object({
          name: z.string(),
          default: z.string().optional(),
        })
        .strict(),
    ),
  })
  .strict()

export const builtinTemplateDocsSchema = z.array(builtinTemplateDocSchema)

export type BuiltinTemplateDoc = z.infer<typeof builtinTemplateDocSchema>

/** Standalone catalog JSON Schema, or null when a Builtin has no declared fields contract. */
export const builtinTemplateFieldsSchema = z.record(z.string(), z.unknown()).nullable()

/**
 * Runtime catalog projection used by Builtin clients. API2 supplies descriptions, field schemas
 * and defaults; absent and null schemas remain distinct, and neither declares a usable contract.
 */
export const builtinTemplateCatalogItemSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  fields_schema: builtinTemplateFieldsSchema.optional(),
  content: z.object({ fields: z.record(z.string(), z.unknown()).default({}) }),
})

/** Runtime catalog item after missing fields have been normalized to an empty object. */
export type BuiltinTemplateCatalogItem = z.infer<typeof builtinTemplateCatalogItemSchema>

/**
 * MCP channel approvals: exact reviewed versions and temporarily excluded field values.
 * Membership is explicit; a catalog schema, a new Builtin version, or Storage eligibility does
 * not grant MCP approval. Keep runtime descriptions, schemas and defaults in API2's catalog.
 */
export const mcpBuiltinTemplateManifest: Readonly<
  Record<string, Readonly<Record<string, readonly string[]>>>
> = {
  'builtin/caption-video@0.0.1': {},
  'builtin/capture-webpage@0.0.1': {},
  'builtin/convert-to-pdf@0.0.1': {},
  // Remove only after api2#9960 is deployed and its VP8/turbo output is verified.
  'builtin/encode-video@0.0.1': { preset: ['webm'] },
  'builtin/extract-text@0.0.1': {},
  'builtin/prepare-image@0.0.1': {},
  'builtin/remove-background@0.0.1': {},
  'builtin/transcribe@0.0.1': {},
  'builtin/video-covers@0.0.1': {},
}

/**
 * MCP-approved Builtins whose upload input API2 replaces with `input_url` (api2#10292), with the
 * most URLs each takes. API2 opts Builtins in explicitly (`allowInputImport`) without publishing
 * that in the catalog, so this mirrors its `builtinInputImportTemplateNames` for the approved
 * versions. `caption-video` pairs outputs per original and therefore takes exactly one URL.
 */
export const mcpBuiltinInputUrlMaxCounts: Readonly<Record<string, number>> = {
  'builtin/caption-video@0.0.1': 1,
  'builtin/convert-to-pdf@0.0.1': 10,
  'builtin/encode-video@0.0.1': 10,
  'builtin/extract-text@0.0.1': 10,
  'builtin/prepare-image@0.0.1': 10,
  'builtin/remove-background@0.0.1': 10,
  'builtin/transcribe@0.0.1': 10,
  'builtin/video-covers@0.0.1': 10,
}
