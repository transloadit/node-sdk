import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  files_per_page,
  googleBase,
  interpolateRobot,
  next_page_token,
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
        robot: '/google/import',
        credentials: 'YOUR_GOOGLE_CREDENTIALS',
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
  purpose_sentence: 'imports whole directories of files from Google Storage',
  purpose_verb: 'import',
  purpose_word: 'Google Storage',
  purpose_words: 'Import files from Google Storage',
  service_slug: 'file-importing',
  slot_count: 20,
  title: 'Import files from Google Storage',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'GoogleImportRobot',
  priceFactor: 6.6666,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
}

export const robotGoogleImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(googleBase)
  .extend({
    robot: z.literal('/google/import'),
    path: path.describe(`
The path in your bucket to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are direct descendants of this directory will be imported. For example: \`images/\`.

Directories are **not** imported recursively. If you want to import files from subdirectories and sub-subdirectories, enable the \`recursive\` parameter.

If you want to import all files from the root directory, please use \`/\` as the value here. In this case, make sure all your objects belong to a path. If you have objects in the root of your bucket that aren't prefixed with \`/\`, you'll receive a 404 \`GOOGLE_IMPORT_NOT_FOUND\` error.

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
    recursive: recursive.describe(`
Setting this to \`true\` will enable importing files from subdirectories and sub-subdirectories (etc.) of the given path.

Please use the pagination parameters \`start_file_name\` and \`files_per_page\` wisely here.
`),
    next_page_token: next_page_token.describe(`
A string token used for pagination. The returned files of one paginated call have the next page token inside of their meta data, which needs to be used for the subsequent paging call.
`),
    files_per_page: files_per_page.describe(`
The pagination page size. This only works when recursive is \`true\` for now, in order to not break backwards compatibility in non-recursive imports.
`),
  })
  .strict()

export const robotGoogleImportInstructionsWithHiddenFieldsSchema =
  robotGoogleImportInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotGoogleImportInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotGoogleImportInstructions = z.infer<typeof robotGoogleImportInstructionsSchema>
export type RobotGoogleImportInstructionsWithHiddenFields = z.infer<
  typeof robotGoogleImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotGoogleImportInstructionsSchema = interpolateRobot(
  robotGoogleImportInstructionsSchema,
)
export type InterpolatableRobotGoogleImportInstructions =
  InterpolatableRobotGoogleImportInstructionsInput

export type InterpolatableRobotGoogleImportInstructionsInput = z.input<
  typeof interpolatableRobotGoogleImportInstructionsSchema
>

export const interpolatableRobotGoogleImportInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotGoogleImportInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotGoogleImportInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotGoogleImportInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotGoogleImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotGoogleImportInstructionsWithHiddenFieldsSchema
>
