import { z } from 'zod'

import { interpolateRobot, robotBase } from './_instructions-primitives.ts'

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
