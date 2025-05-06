import { z } from 'zod'

import {
  azureBase,
  files_per_page,
  robotImport,
  next_page_token,
  path,
  robotBase,
  interpolateRobot,
} from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
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
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
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
    next_page_token: next_page_token.describe(`
A string token used for pagination. The returned files of one paginated call have the next page token inside of their meta data, which needs to be used for the subsequent paging call.
`),
    files_per_page: files_per_page.describe(`
The pagination page size. This only works when recursive is \`true\` for now, in order to not break backwards compatibility in non-recursive imports.
`),
  })
  .strict()

export type RobotAzureImportInstructions = z.infer<typeof robotAzureImportInstructionsSchema>
export type RobotAzureImportInstructionsInput = z.input<typeof robotAzureImportInstructionsSchema>

export const interpolatableRobotAzureImportInstructionsSchema = interpolateRobot(
  robotAzureImportInstructionsSchema,
)
export type InterpolatableRobotAzureImportInstructions = z.input<
  typeof interpolatableRobotAzureImportInstructionsSchema
>
