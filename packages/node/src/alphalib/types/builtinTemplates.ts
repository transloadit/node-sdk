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
