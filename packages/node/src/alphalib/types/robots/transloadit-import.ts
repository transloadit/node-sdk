import type { RobotMetaInput } from './_instructions-primitives.ts'

import { z } from 'zod'

import { interpolateRobot, robotBase, robotImport } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      imported: {
        robot: '/transloadit/import',
        path: 'photos/cat.jpg',
      },
    },
  },
  example_code_description: 'Import a file from Transloadit Storage:',
  has_small_icon: true,
  isAllowedForUrlTransform: true,
  isInternal: false,
  minimum_charge: 0,
  name: 'TransloaditImportRobot',
  output_factor: 1,
  override_lvl1: 'File Importing',
  priceFactor: 10,
  purpose_sentence: 'imports files from Transloadit Storage',
  purpose_verb: 'import',
  purpose_word: 'Transloadit Storage',
  purpose_words: 'Import files from Transloadit Storage',
  queueSlotCount: 10,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
  service_slug: 'file-importing',
  slot_count: 10,
  stage: 'beta',
  title: 'Import files from Transloadit Storage',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotTransloaditImportInstructionsSchema = robotBase
  .merge(robotImport)
  .extend({
    robot: z.literal('/transloadit/import').describe(`
Imports a file from your workspace's Transloadit Storage by its path.
`),
    path: z.string().describe(`
The path of the file in Transloadit Storage, for example \`photos/cat.jpg\`.
`),
  })
  .strict()

export const robotTransloaditImportInstructionsWithHiddenFieldsSchema =
  robotTransloaditImportInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotTransloaditImportInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotTransloaditImportInstructions = z.infer<
  typeof robotTransloaditImportInstructionsSchema
>
export type RobotTransloaditImportInstructionsWithHiddenFields = z.infer<
  typeof robotTransloaditImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotTransloaditImportInstructionsSchema = interpolateRobot(
  robotTransloaditImportInstructionsSchema,
)
export type InterpolatableRobotTransloaditImportInstructions =
  InterpolatableRobotTransloaditImportInstructionsInput

export type InterpolatableRobotTransloaditImportInstructionsInput = z.input<
  typeof interpolatableRobotTransloaditImportInstructionsSchema
>

export const interpolatableRobotTransloaditImportInstructionsWithHiddenFieldsSchema =
  interpolateRobot(robotTransloaditImportInstructionsWithHiddenFieldsSchema)
export type InterpolatableRobotTransloaditImportInstructionsWithHiddenFields =
  InterpolatableRobotTransloaditImportInstructionsWithHiddenFieldsInput
export type InterpolatableRobotTransloaditImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotTransloaditImportInstructionsWithHiddenFieldsSchema
>
