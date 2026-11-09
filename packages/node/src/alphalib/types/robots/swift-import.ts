import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageImportExample,
  defineRobot,
  path,
  recursiveImport,
  recursiveImportPageNumber,
  recursiveImportPageSize,
  return_file_stubs,
  robotBase,
  robotImport,
  robotImportMeta,
  swiftBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/swift/import', 'YOUR_SWIFT_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from your OpenStack Swift container',
  purpose_word: 'OpenStack Swift',
  purpose_words: 'Import files from OpenStack Swift',
  requires_credentials: true,
  title: 'Import files from OpenStack Swift',
  name: 'SwiftImportRobot',
}

export const robotSwiftImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(swiftBase)
  .extend({
    robot: z.literal('/swift/import'),
    path: path.describe(`
The path in your container to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are direct descendants of this directory will be imported. For example: \`images/\`.

Directories are **not** imported recursively. If you want to import files from subdirectories and sub-subdirectories, enable the \`recursive\` parameter.

If you want to import all files from the root directory, please use \`/\` as the value here. In this case, make sure all your objects belong to a path. If you have objects in the root of your container that aren't prefixed with \`/\`, you'll receive an error: \`A client error (NoSuchKey) occurred when calling the GetObject operation: The specified key does not exist.\`

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
    recursive: recursiveImport,
    page_number: recursiveImportPageNumber,
    files_per_page: recursiveImportPageSize,
    return_file_stubs,
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotSwiftImportInstructionsSchema.shape> =
  defineRobot(meta, robotSwiftImportInstructionsSchema)

export const {
  withHiddenFields: robotSwiftImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotSwiftImportInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotSwiftImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotSwiftImportInstructions = Instructions['output']
export type RobotSwiftImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotSwiftImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotSwiftImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotSwiftImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotSwiftImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
