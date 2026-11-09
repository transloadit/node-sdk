import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  backblazeBase,
  createStorageImportExample,
  defineRobot,
  path,
  recursive,
  recursiveImportPageSize,
  robotBase,
  robotImport,
  robotImportMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/backblaze/import', 'YOUR_BACKBLAZE_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from your Backblaze bucket',
  purpose_word: 'Backblaze',
  purpose_words: 'Import files from Backblaze',
  requires_credentials: true,
  title: 'Import files from Backblaze',
  name: 'BackblazeImportRobot',
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
    files_per_page: recursiveImportPageSize,
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotBackblazeImportInstructionsSchema.shape> =
  defineRobot(meta, robotBackblazeImportInstructionsSchema)

export const {
  withHiddenFields: robotBackblazeImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotBackblazeImportInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotBackblazeImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotBackblazeImportInstructions = Instructions['output']
export type RobotBackblazeImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotBackblazeImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotBackblazeImportInstructionsInput =
  Instructions['interpolatableInput']
export type InterpolatableRobotBackblazeImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotBackblazeImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
