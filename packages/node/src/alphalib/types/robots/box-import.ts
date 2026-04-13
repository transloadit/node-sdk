import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  boxBase,
  interpolateRobot,
  path,
  robotBase,
  robotImport,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      imported: {
        robot: '/box/import',
        credentials: 'YOUR_BOX_CREDENTIALS',
        path: 'path/to/files/',
      },
    },
  },
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Importing',
  purpose_sentence: 'imports whole directories of files from your Box',
  purpose_verb: 'import',
  purpose_word: 'Box',
  purpose_words: 'Import files from Box',
  requires_credentials: true,
  service_slug: 'file-importing',
  slot_count: 20,
  title: 'Import files from Box',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'BoxImportRobot',
  priceFactor: 6.6666,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
  stage: 'ga',
}

export const robotBoxImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(boxBase)
  .extend({
    robot: z.literal('/box/import'),
    path: path.describe(`
The path in your Box to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are descendants of this directory are recursively imported. For example: \`images/\`.

If you want to import all files from the root directory, please use \`/\` as the value here.

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
  })
  .strict()

export const robotBoxImportInstructionsWithHiddenFieldsSchema =
  robotBoxImportInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotBoxImportInstructionsSchema.shape.result]).optional(),
    access_token: z.string().optional(),
    key_file_contents: z.string().optional(),
  })

export type RobotBoxImportInstructions = z.infer<typeof robotBoxImportInstructionsSchema>
export type RobotBoxImportInstructionsWithHiddenFields = z.infer<
  typeof robotBoxImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotBoxImportInstructionsSchema = interpolateRobot(
  robotBoxImportInstructionsSchema,
)
export type InterpolatableRobotBoxImportInstructions = InterpolatableRobotBoxImportInstructionsInput

export type InterpolatableRobotBoxImportInstructionsInput = z.input<
  typeof interpolatableRobotBoxImportInstructionsSchema
>

export const interpolatableRobotBoxImportInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotBoxImportInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotBoxImportInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotBoxImportInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotBoxImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotBoxImportInstructionsWithHiddenFieldsSchema
>
