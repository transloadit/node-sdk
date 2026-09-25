import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageImportExample,
  defineRobot,
  googleBase,
  next_page_token,
  path,
  recursive,
  recursiveImportPageSize,
  robotBase,
  robotImport,
  robotImportMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/google/import', 'YOUR_GOOGLE_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from Google Cloud Storage',
  purpose_word: 'Google Cloud Storage',
  purpose_words: 'Import files from Google Cloud Storage',
  title: 'Import files from Google Cloud Storage',
  name: 'GoogleImportRobot',
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
    files_per_page: recursiveImportPageSize,
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotGoogleImportInstructionsSchema.shape> =
  defineRobot(meta, robotGoogleImportInstructionsSchema)

export const {
  withHiddenFields: robotGoogleImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotGoogleImportInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotGoogleImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotGoogleImportInstructions = Instructions['output']
export type RobotGoogleImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotGoogleImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotGoogleImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotGoogleImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotGoogleImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
