import { z } from 'zod'

import { robotBase } from './_instructions-primitives.ts'

export const robotProgressSimulateInstructionsSchema = robotBase
  .extend({
    robot: z.literal('/progress/simulate'),
    duration: z.number(),
    emit_progress: z.boolean(),
    predict_output: z.boolean(),
  })
  .strict()
export type RobotProgressSimulateInstructions = z.infer<
  typeof robotProgressSimulateInstructionsSchema
>
