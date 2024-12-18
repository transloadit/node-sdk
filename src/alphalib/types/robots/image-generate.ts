import { z } from 'zod'

import { outputMetaParamSchema, useParamSchema } from './_instructions-primitives.ts'

export const robotImageGenerateInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/image/generate'),
    prompt: z.string().describe('The prompt describing the desired image content.'),
    format: z
      .enum(['jpeg', 'png', 'gif', 'webp'])
      .optional()
      .describe('Format of the generated image.'),
    output_meta: outputMetaParamSchema.optional(),
    use: useParamSchema,
  })
  .strict()

export type RobotImageGenerateInstructions = z.infer<typeof robotImageGenerateInstructionsSchema>
