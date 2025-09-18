import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  azureBase,
  files_per_page,
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
        robot: '/azure/import',
        credentials: 'YOUR_AZURE_CREDENTIALS',
        path: 'path/to/files/',
      },
    },
  },
  example_code_description: `Import files from the \`path/to/files\` directory and its subdirectories:`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Importing',
  purpose_sentence: 'imports whole directories of files from your Azure container',
  purpose_verb: 'import',
  purpose_word: 'Azure',
  purpose_words: 'Import files from Azure',
  service_slug: 'file-importing',
  requires_credentials: true,
  slot_count: 20,
  title: 'Import files from Azure',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'AzureImportRobot',
  priceFactor: 6.6666,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
}

export const robotAzureImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(azureBase)
  .extend({
    robot: z.literal('/azure/import'),
    path: path.describe(`
The path in your container to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are descendants of this directory are recursively imported. For example: \`images/\`.

If you want to import all files from the root directory, please use \`/\` as the value here.

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
    recursive: recursive.describe(`
  Setting this to \`true\` will enable importing files from subdirectories and sub-subdirectories (etc.) of the given path.
  `),
    next_page_token: next_page_token.describe(`
A string token used for pagination. The returned files of one paginated call have the next page token inside of their meta data, which needs to be used for the subsequent paging call.
`),
    files_per_page: files_per_page.describe(`
The pagination page size.
`),
  })
  .strict()

export const robotAzureImportInstructionsWithHiddenFieldsSchema =
  robotAzureImportInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotAzureImportInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotAzureImportInstructions = z.infer<typeof robotAzureImportInstructionsSchema>
export type RobotAzureImportInstructionsWithHiddenFields = z.infer<
  typeof robotAzureImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotAzureImportInstructionsSchema = interpolateRobot(
  robotAzureImportInstructionsSchema,
)
export type InterpolatableRobotAzureImportInstructions =
  InterpolatableRobotAzureImportInstructionsInput

export type InterpolatableRobotAzureImportInstructionsInput = z.input<
  typeof interpolatableRobotAzureImportInstructionsSchema
>

export const interpolatableRobotAzureImportInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotAzureImportInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotAzureImportInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotAzureImportInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotAzureImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotAzureImportInstructionsWithHiddenFieldsSchema
>
