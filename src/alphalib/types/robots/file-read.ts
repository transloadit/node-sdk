import { z } from 'zod'

import { useParamSchema } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 5,
  discount_factor: 0.2,
  discount_pct: 80,
  minimum_charge: 512000,
  output_factor: 1,
  override_lvl1: 'Document Processing',
  purpose_sentence: 'reads file contents from supported file-types',
  purpose_verb: 'read',
  purpose_word: 'read files',
  purpose_words: 'Read file contents',
  service_slug: 'document-processing',
  slot_count: 5,
  title: 'Read file contents',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotFileReadInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/file/read').describe(`
This <dfn>Robot</dfn> accepts any file, and will read the file using UTF-8 encoding. The result is outputted to \`file.meta.content\` to be accessed in later <dfn>Steps</dfn>.

The <dfn>Robot</dfn> currently only accepts files under 500KB.
`),
    use: useParamSchema,
  })
  .strict()

export type RobotFileReadInstructions = z.infer<typeof robotFileReadInstructionsSchema>
