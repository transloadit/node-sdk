import { z } from 'zod'

import { outputMetaParamSchema, useParamSchema } from './_instructions-primitives.ts'

export const robotImageRemoveBackgroundInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/image/remove-background'),
    select: z
      .enum(['foreground', 'background'])
      .optional()
      .describe('Region to select and keep in the image. The other region is removed.'),
    format: z.enum(['png', 'gif', 'webp']).optional().describe('Format of the generated image.'),
    provider: z
      .enum(['transloadit', 'replicate', 'fal'])
      .optional()
      .describe('Provider to use for removing the background.'),
    output_meta: outputMetaParamSchema.optional(),
    use: useParamSchema.optional(),
  })
  .strict()

export type RobotImageRemoveBackgroundInstructions = z.infer<
  typeof robotImageRemoveBackgroundInstructionsSchema
>
