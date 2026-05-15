import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      simulate: {
        robot: '/progress/simulate',
        use: ':original',
        duration: 10,
        output_files: 3,
        emit_progress: true,
        predict_output: true,
      },
    },
  },
  example_code_description: 'Simulate Step progress and output generation for testing:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'Code Evaluation',
  purpose_sentence: 'simulates Step progress and output generation for tests',
  purpose_verb: 'run',
  purpose_word: 'progress simulation',
  purpose_words: 'Simulate Step progress',
  service_slug: 'code-evaluation',
  slot_count: 20,
  title: 'Simulate Step progress',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'ProgressSimulateRobot',
  priceFactor: 1,
  queueSlotCount: 20,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: true,
  stage: 'ga',
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
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
