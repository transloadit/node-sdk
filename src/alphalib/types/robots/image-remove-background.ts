import { z } from 'zod'

import { robotBase, robotUse } from './_instructions-primitives.ts'

export const robotImageRemoveBackgroundInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
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
  })
  .strict()

export type RobotImageRemoveBackgroundInstructions = z.infer<
  typeof robotImageRemoveBackgroundInstructionsSchema
>
