import { z } from 'zod'

import { outputMetaParamSchema, useParamSchema } from './_instructions-primitives.ts'

export const robotImageRemoveBackgroundInstructionsSchema = z
  .object({
    robot: z.literal('/image/remove-background'),
    endpoint: z.string().describe('The URL of the destination Tus server'),
    select: z
      .enum(['foreground', 'background'])
      .optional()
      .describe('Region to select and keep in the image. The other region is removed.'),
    format: z.enum(['png', 'gif', 'webp']).optional().describe('Format of the generated image.'),
    output_meta: outputMetaParamSchema.optional(),
    use: useParamSchema,
  })
  .strict()

export type RobotImageRemoveBackgroundInstructions = z.infer<
  typeof robotImageRemoveBackgroundInstructionsSchema
>