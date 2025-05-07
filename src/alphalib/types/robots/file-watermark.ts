import { z } from 'zod'

import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const robotFileWatermarkInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/watermark'),
    randomize: z.boolean().optional(),
  })
  .strict()

export type RobotFileWatermarkInstructions = z.infer<typeof robotFileWatermarkInstructionsSchema>

export const interpolatableRobotFileWatermarkInstructionsSchema = interpolateRobot(
  robotFileWatermarkInstructionsSchema,
)
export type InterpolatableRobotFileWatermarkInstructions = z.input<
  typeof interpolatableRobotFileWatermarkInstructionsSchema
>
