import { z } from 'zod'

import type { RobotMeta } from './_instructions-primitives.ts'
import { outputMetaParamSchema, useParamSchema } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 0,
  discount_factor: 0,
  discount_pct: 100,
  example_code_description: '',
  minimum_charge: 0,
  output_factor: 1,
  purpose_sentence: '',
  purpose_verb: 'export',
  purpose_word: '',
  purpose_words: '',
  service_slug: 'document-processing',
  slot_count: 0,
  title: '',
  typical_file_size_mb: 0,
  typical_file_type: 'document',
}

export const robotDocumentAutorotateInstructionsSchema = z
  .object({
    robot: z.literal('/document/autorotate'),
    output_meta: outputMetaParamSchema.optional(),
    use: useParamSchema,
  })
  .strict()

export type RobotDocumentAutorotateInstructions = z.infer<
  typeof robotDocumentAutorotateInstructionsSchema
>
