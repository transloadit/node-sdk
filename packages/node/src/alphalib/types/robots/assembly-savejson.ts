import { z } from 'zod'
import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  bytescount: 0,
  discount_factor: 0,
  discount_pct: 100,
  example_code: {
    steps: {
      save_json: {
        robot: '/assembly/savejson',
      },
    },
  },
  example_code_description: 'Save Assembly result data as JSON:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports Assembly status data as JSON',
  purpose_verb: 'export',
  purpose_word: 'Assembly status',
  purpose_words: 'Export Assembly status JSON',
  service_slug: 'file-exporting',
  slot_count: 5,
  title: 'Export Assembly status JSON',
  typical_file_size_mb: 0.1,
  typical_file_type: 'file',
  name: 'AssemblySavejsonRobot',
  priceFactor: 0,
  queueSlotCount: 5,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: true,
  stage: 'ga',
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotAssemblySavejsonInstructionsSchema = robotBase
  .extend({
    robot: z.literal('/assembly/savejson').describe(`
TODO: Add robot description here
`),
  })
  .strict()

export type RobotAssemblySavejsonInstructions = z.infer<
  typeof robotAssemblySavejsonInstructionsSchema
>

export const interpolatableRobotAssemblySavejsonInstructionsSchema = interpolateRobot(
  robotAssemblySavejsonInstructionsSchema,
)
export type InterpolatableRobotAssemblySavejsonInstructions =
  InterpolatableRobotAssemblySavejsonInstructionsInput

export type InterpolatableRobotAssemblySavejsonInstructionsInput = z.input<
  typeof interpolatableRobotAssemblySavejsonInstructionsSchema
>
