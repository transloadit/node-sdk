import { z } from 'zod'

const provenanceShape = {
  // A paragraph's page-specific continuations share their logical source item identity.
  id: z.string().optional(),
  label: z.string().optional(),
  provenance: z
    .array(
      z.object({
        page: z.number().int().positive(),
        bbox: z.tuple([
          z.number().finite(),
          z.number().finite(),
          z.number().finite(),
          z.number().finite(),
        ]),
      }),
    )
    .optional(),
}

/** Table cells anchored at zero-based rows/columns, preserving merged-cell spans. */
export const documentTableCellSchema = z.object({
  text: z.string(),
  row: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
  row_span: z.number().int().positive(),
  column_span: z.number().int().positive(),
  header: z.boolean(),
})

/** Literal PDF content blocks shared by the native and self-hosted extraction methods. */
export const documentLayoutBlockSchema = z
  .discriminatedUnion('kind', [
    z.object({ ...provenanceShape, kind: z.literal('paragraph'), text: z.string() }),
    z.object({
      ...provenanceShape,
      kind: z.literal('heading'),
      text: z.string(),
      level: z.number().int().min(1).max(6),
    }),
    z.object({
      ...provenanceShape,
      kind: z.literal('list'),
      ordered: z.boolean(),
      start: z.number().int(),
      items: z.array(z.string()),
      // Source markers can be alphabetic, Roman, decimal, or compound identifiers.
      markers: z.array(z.string()).optional(),
    }),
    z.object({
      ...provenanceShape,
      kind: z.literal('table'),
      rows: z.array(z.array(z.string())),
      header: z.boolean(),
      cells: z.array(documentTableCellSchema).optional(),
    }),
    z.object({ ...provenanceShape, kind: z.literal('image'), name: z.string() }),
  ])
  .superRefine((block, context) => {
    if (
      block.kind === 'list' &&
      block.markers !== undefined &&
      block.markers.length !== block.items.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['markers'],
        message: 'Each list item must have a corresponding source marker.',
      })
    }
  })

/** Versioned document extraction output, grouped by original one-based page number. */
export const documentLayoutOutputSchema = z.object({
  schema_version: z.literal(1),
  generator: z.object({ name: z.literal('docling'), document_version: z.string() }).optional(),
  pages: z.array(
    z.object({
      page: z.number().int().positive(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      blocks: z.array(documentLayoutBlockSchema),
    }),
  ),
})

/** A serializable content block; text is literal and image names identify retained results. */
export type DocumentLayoutBlock = z.infer<typeof documentLayoutBlockSchema>

/** The contents of a `json_layout` extraction result. */
export type DocumentLayoutOutput = z.infer<typeof documentLayoutOutputSchema>
