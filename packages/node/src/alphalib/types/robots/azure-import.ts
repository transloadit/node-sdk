import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  azureBase,
  createStorageImportExample,
  defineRobot,
  files_per_page,
  next_page_token,
  path,
  recursive,
  robotBase,
  robotImport,
  robotImportMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/azure/import', 'YOUR_AZURE_CREDENTIALS', false),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from your Azure container',
  purpose_word: 'Azure',
  purpose_words: 'Import files from Azure',
  requires_credentials: true,
  title: 'Import files from Azure',
  name: 'AzureImportRobot',
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

export const robotDefinition: RobotDefinition<typeof robotAzureImportInstructionsSchema.shape> =
  defineRobot(meta, robotAzureImportInstructionsSchema)

export const {
  withHiddenFields: robotAzureImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotAzureImportInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotAzureImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotAzureImportInstructions = Instructions['output']
export type RobotAzureImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotAzureImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotAzureImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotAzureImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotAzureImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
