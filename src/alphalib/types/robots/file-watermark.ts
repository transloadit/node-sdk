import { z } from 'zod'

import { outputMetaParamSchema, useParamSchema } from './_instructions-primitives.ts'

export const robotFileWatermarkInstructionsSchema = z
  .object({
    robot: z.literal('/file/watermark'),
    randomize: z.boolean().optional(),
    output_meta: outputMetaParamSchema.optional(),
    use: useParamSchema,
  })
  .strict()

export type RobotFileWatermarkInstructions = z.infer<typeof robotFileWatermarkInstructionsSchema>
