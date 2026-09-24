import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  cloudfilesBase,
  createStorageImportExample,
  defineRobot,
  path,
  recursiveImportPageNumber,
  recursiveImportPageSize,
  robotBase,
  robotImport,
  robotImportMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/cloudfiles/import', 'YOUR_CLOUDFILES_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  purpose_sentence: 'imports whole directories of files from your Rackspace Cloud Files container',
  purpose_word: 'Rackspace Cloud Files',
  purpose_words: 'Import files from Rackspace Cloud Files',
  requires_credentials: true,
  title: 'Import files from Rackspace Cloud Files',
  name: 'CloudfilesImportRobot',
}

export const robotCloudfilesImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(cloudfilesBase)
  .extend({
    robot: z.literal('/cloudfiles/import'),
    path: path.describe(`
The path in your container to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are direct descendants of this directory will be imported. For example: \`images/\`.

Directories are **not** imported recursively. If you want to import files from subdirectories and sub-subdirectories, enable the \`recursive\` parameter.

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
    recursive: z
      .boolean()
      .default(false)
      .describe(`
Setting this to \`true\` will enable importing files from subdirectories and sub-subdirectories (etc.) of the given path.

Please use the pagination parameters \`page_number\` and \`files_per_page\`wisely here.
`),
    page_number: recursiveImportPageNumber,
    files_per_page: recursiveImportPageSize,
  })
  .strict()

export const robotDefinition: RobotDefinition<
  typeof robotCloudfilesImportInstructionsSchema.shape
> = defineRobot(meta, robotCloudfilesImportInstructionsSchema)

export const {
  withHiddenFields: robotCloudfilesImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotCloudfilesImportInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotCloudfilesImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotCloudfilesImportInstructions = Instructions['output']
export type RobotCloudfilesImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotCloudfilesImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotCloudfilesImportInstructionsInput =
  Instructions['interpolatableInput']
export type InterpolatableRobotCloudfilesImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotCloudfilesImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
