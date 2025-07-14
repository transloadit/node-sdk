import { z } from 'zod'

import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'
import type { RobotMetaInput } from './_instructions-primitives.ts'

// @ts-expect-error - FileWatermarkRobot is not ready yet @TODO please supply missing keys
export const meta: RobotMetaInput = {
  name: 'FileWatermarkRobot',
  priceFactor: 4,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

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
