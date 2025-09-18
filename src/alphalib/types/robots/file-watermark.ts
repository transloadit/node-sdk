import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

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

export const robotFileWatermarkInstructionsWithHiddenFieldsSchema =
  robotFileWatermarkInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotFileWatermarkInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotFileWatermarkInstructions = z.infer<typeof robotFileWatermarkInstructionsSchema>
export type RobotFileWatermarkInstructionsWithHiddenFields = z.infer<
  typeof robotFileWatermarkInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotFileWatermarkInstructionsSchema = interpolateRobot(
  robotFileWatermarkInstructionsSchema,
)
export type InterpolatableRobotFileWatermarkInstructions =
  InterpolatableRobotFileWatermarkInstructionsInput

export type InterpolatableRobotFileWatermarkInstructionsInput = z.input<
  typeof interpolatableRobotFileWatermarkInstructionsSchema
>

export const interpolatableRobotFileWatermarkInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotFileWatermarkInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotFileWatermarkInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotFileWatermarkInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotFileWatermarkInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotFileWatermarkInstructionsWithHiddenFieldsSchema
>
