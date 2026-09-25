import type { RobotMetaInput } from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createProcessingExample,
  interpolateRobot,
  robotBase,
  robotCodeEvaluationMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotCodeEvaluationMeta,
  example_code: createProcessingExample('simulate', '/progress/simulate', {
    duration: 10,
    output_files: 3,
    emit_progress: true,
    predict_output: true,
  }),
  example_code_description: 'Simulate Step progress and output generation for testing:',
  purpose_sentence: 'simulates Step progress and output generation for tests',
  purpose_verb: 'run',
  purpose_word: 'progress simulation',
  purpose_words: 'Simulate Step progress',
  title: 'Simulate Step progress',
  name: 'ProgressSimulateRobot',
  queueSlotCount: 20,
  isInternal: true,
}

export const robotProgressSimulateInstructionsSchema = robotBase
  .merge(robotUse)
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
export type InterpolatableRobotProgressSimulateInstructions =
  InterpolatableRobotProgressSimulateInstructionsInput

export type InterpolatableRobotProgressSimulateInstructionsInput = z.input<
  typeof interpolatableRobotProgressSimulateInstructionsSchema
>
