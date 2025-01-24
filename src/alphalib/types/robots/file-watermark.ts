import { z } from 'zod'

import { outputMetaParamSchema, useParamSchema } from './_instructions-primitives.ts'

export const robotFileWatermarkInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/file/watermark'),
    randomize: z.boolean().optional(),
    output_meta: outputMetaParamSchema.optional(),
    use: useParamSchema.optional(),
  })
  .strict()

export type RobotFileWatermarkInstructions = z.infer<typeof robotFileWatermarkInstructionsSchema>
