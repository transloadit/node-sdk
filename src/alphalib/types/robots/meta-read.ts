import { z } from 'zod'

import { interpolateRobot, robotBase, type RobotMetaInput } from './_instructions-primitives.ts'

// @ts-expect-error - MetaReadRobot is not ready yet @TODO please supply missing keys
export const meta: RobotMetaInput = {
  name: 'MetaReadRobot',
  priceFactor: 0,
  queueSlotCount: 15,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: true,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotMetaReadInstructionsSchema = robotBase
  .extend({
    robot: z.literal('/meta/read').describe(`Reads metadata from a file.`),
  })
  .strict()

export type RobotMetaReadInstructions = z.infer<typeof robotMetaReadInstructionsSchema>

export const interpolatableRobotMetaReadInstructionsSchema = interpolateRobot(
  robotMetaReadInstructionsSchema,
)
export type InterpolatableRobotMetaReadInstructions = z.input<
  typeof interpolatableRobotMetaReadInstructionsSchema
>
