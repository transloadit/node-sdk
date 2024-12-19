import { z } from 'zod'

import { outputMetaParamSchema } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: false,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      ':original': {
        robot: '/upload/handle',
      },
      exported: {
        robot: '/s3/store',
        use: ':original',
        credentials: 'YOUR_S3_CREDENTIALS',
      },
    },
  },
  example_code_description: 'Handle uploads and export the uploaded files to S3:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'Handling Uploads',
  purpose_sentence:
    'receives uploads that your users throw at you from browser or apps, or that you throw at us programmatically',
  purpose_verb: 'handle',
  purpose_word: 'handle uploads',
  purpose_words: 'Handle uploads',
  service_slug: 'handling-uploads',
  slot_count: 0,
  title: 'Handle uploads',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotUploadHandleInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/upload/handle'),
    output_meta: outputMetaParamSchema,
  })
  .strict()

export type RobotUploadHandleInstructions = z.infer<typeof robotUploadHandleInstructionsSchema>
