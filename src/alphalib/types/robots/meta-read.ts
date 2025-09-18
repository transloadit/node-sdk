import { z } from 'zod'

import { interpolateRobot, type RobotMetaInput, robotBase } from './_instructions-primitives.ts'

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

export const robotMetaReadInstructionsWithHiddenFieldsSchema =
  robotMetaReadInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotMetaReadInstructionsSchema.shape.result]).optional(),
  })

export const interpolatableRobotMetaReadInstructionsSchema = interpolateRobot(
  robotMetaReadInstructionsSchema,
)
export type InterpolatableRobotMetaReadInstructions = InterpolatableRobotMetaReadInstructionsInput

export type InterpolatableRobotMetaReadInstructionsInput = z.input<
  typeof interpolatableRobotMetaReadInstructionsSchema
>

export const interpolatableRobotMetaReadInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotMetaReadInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotMetaReadInstructionsWithHiddenFields = z.input<
  typeof interpolatableRobotMetaReadInstructionsWithHiddenFieldsSchema
>
