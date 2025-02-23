import { z } from 'zod'

import { robotBase, robotUse } from './_instructions-primitives.ts'

export const robotFileWatermarkInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/watermark'),
    randomize: z.boolean().optional(),
  })
  .strict()

export type RobotFileWatermarkInstructions = z.infer<typeof robotFileWatermarkInstructionsSchema>
