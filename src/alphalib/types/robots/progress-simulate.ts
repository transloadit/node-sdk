import { z } from 'zod'

import { interpolateRobot, robotBase } from './_instructions-primitives.ts'
import type { RobotMetaInput } from './_instructions-primitives.ts'

// @ts-expect-error - ProgressSimulateRobot is not ready yet @TODO please supply missing keys
export const meta: RobotMetaInput = {
  name: 'ProgressSimulateRobot',
  priceFactor: 1,
  queueSlotCount: 20,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: true,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotProgressSimulateInstructionsSchema = robotBase
  .extend({
    robot: z.literal('/progress/simulate'),
    duration: z.number(),
    output_files: z.number(),
    emit_progress: z.boolean(),
    predict_output: z.boolean(),
  })
  .strict()
export type RobotProgressSimulateInstructions = z.infer<
  typeof robotProgressSimulateInstructionsSchema
>

export const interpolatableRobotProgressSimulateInstructionsSchema = interpolateRobot(
  robotProgressSimulateInstructionsSchema,
)
export type InterpolatableRobotProgressSimulateInstructions = z.input<
  typeof interpolatableRobotProgressSimulateInstructionsSchema
>
