import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  backblazeBase,
  files_per_page,
  interpolateRobot,
  path,
  recursive,
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
        robot: '/backblaze/import',
        credentials: 'YOUR_BACKBLAZE_CREDENTIALS',
        path: 'path/to/files/',
        recursive: true,
      },
    },
  },
  example_code_description: `Import files from the \`path/to/files\` directory and its subdirectories:`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Importing',
  purpose_sentence: 'imports whole directories of files from your Backblaze bucket',
  purpose_verb: 'import',
  purpose_word: 'Backblaze',
  purpose_words: 'Import files from Backblaze',
  requires_credentials: true,
  service_slug: 'file-importing',
  slot_count: 20,
  title: 'Import files from Backblaze',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'BackblazeImportRobot',
  priceFactor: 6.6666,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
}

export const robotBackblazeImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(backblazeBase)
  .extend({
    robot: z.literal('/backblaze/import'),
    path: path.describe(`
The path in your bucket to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are direct descendants of this directory will be imported. For example: \`images/\`.

Directories are **not** imported recursively. If you want to import files from subdirectories and sub-subdirectories, enable the \`recursive\` parameter.

If you want to import all files from the root directory, please use \`/\` as the value here. In this case, make sure all your objects belong to a path. If you have objects in the root of your bucket that aren't prefixed with \`/\`, you'll receive a 404 \`BACKBLAZE_IMPORT_NOT_FOUND\` error.

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
    recursive: recursive.describe(`
Setting this to \`true\` will enable importing files from subdirectories and sub-subdirectories (etc.) of the given path.

Please use the pagination parameters \`start_file_name\` and \`files_per_page\` wisely here.
`),
    start_file_name: z
      .string()
      .default('')
      .describe(`
The name of the last file from the previous paging call. This tells the <dfn>Robot</dfn> to ignore all files up to and including this file.
`),
    files_per_page: files_per_page.describe(`
The pagination page size. This only works when recursive is \`true\` for now, in order to not break backwards compatibility in non-recursive imports.
`),
  })
  .strict()

export const robotBackblazeImportInstructionsWithHiddenFieldsSchema =
  robotBackblazeImportInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotBackblazeImportInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotBackblazeImportInstructions = z.infer<
  typeof robotBackblazeImportInstructionsSchema
>
export type RobotBackblazeImportInstructionsWithHiddenFields = z.infer<
  typeof robotBackblazeImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotBackblazeImportInstructionsSchema = interpolateRobot(
  robotBackblazeImportInstructionsSchema,
)
export type InterpolatableRobotBackblazeImportInstructions =
  InterpolatableRobotBackblazeImportInstructionsInput

export type InterpolatableRobotBackblazeImportInstructionsInput = z.input<
  typeof interpolatableRobotBackblazeImportInstructionsSchema
>

export const interpolatableRobotBackblazeImportInstructionsWithHiddenFieldsSchema =
  interpolateRobot(robotBackblazeImportInstructionsWithHiddenFieldsSchema)
export type InterpolatableRobotBackblazeImportInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotBackblazeImportInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotBackblazeImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotBackblazeImportInstructionsWithHiddenFieldsSchema
>
