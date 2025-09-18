import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  dropboxBase,
  interpolateRobot,
  path,
  robotBase,
  robotImport,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      imported: {
        robot: '/dropbox/import',
        credentials: 'YOUR_DROPBOX_CREDENTIALS',
        path: 'path/to/files/',
      },
    },
  },
  example_code_description: `Import files from the \`path/to/files\` directory and its subdirectories:`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Importing',
  purpose_sentence: 'imports whole directories of files from your Dropbox',
  purpose_verb: 'import',
  purpose_word: 'Dropbox',
  purpose_words: 'Import files from Dropbox',
  requires_credentials: true,
  service_slug: 'file-importing',
  slot_count: 20,
  title: 'Import files from Dropbox',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'DropboxImportRobot',
  priceFactor: 6.6666,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
}

export const robotDropboxImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(dropboxBase)
  .extend({
    robot: z.literal('/dropbox/import'),
    path: path.describe(`
The path in your Dropbox to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are descendants of this directory are recursively imported. For example: \`images/\`.

If you want to import all files from the root directory, please use \`/\` as the value here.

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
  })
  .strict()

export const robotDropboxImportInstructionsWithHiddenFieldsSchema =
  robotDropboxImportInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotDropboxImportInstructionsSchema.shape.result])
      .optional(),
    access_token: z.string().optional(), // Legacy field for backward compatibility
  })

export type RobotDropboxImportInstructions = z.infer<typeof robotDropboxImportInstructionsSchema>
export type RobotDropboxImportInstructionsWithHiddenFields = z.infer<
  typeof robotDropboxImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotDropboxImportInstructionsSchema = interpolateRobot(
  robotDropboxImportInstructionsSchema,
)
export type InterpolatableRobotDropboxImportInstructions =
  InterpolatableRobotDropboxImportInstructionsInput

export type InterpolatableRobotDropboxImportInstructionsInput = z.input<
  typeof interpolatableRobotDropboxImportInstructionsSchema
>

export const interpolatableRobotDropboxImportInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotDropboxImportInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotDropboxImportInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotDropboxImportInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotDropboxImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotDropboxImportInstructionsWithHiddenFieldsSchema
>
