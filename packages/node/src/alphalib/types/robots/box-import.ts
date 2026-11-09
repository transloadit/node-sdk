import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  boxBase,
  createStorageImportExample,
  defineRobotWithHiddenFields,
  path,
  robotBase,
  robotImport,
  robotImportMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/box/import', 'YOUR_BOX_CREDENTIALS', false),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from your Box',
  purpose_word: 'Box',
  purpose_words: 'Import files from Box',
  requires_credentials: true,
  title: 'Import files from Box',
  name: 'BoxImportRobot',
}

export const robotBoxImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(boxBase)
  .extend({
    robot: z.literal('/box/import'),
    path: path.describe(`
The path in your Box to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are descendants of this directory are recursively imported. For example: \`images/\`.

If you want to import all files from the root directory, please use \`/\` as the value here.

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
  })
  .strict()

const hiddenFields = {
  access_token: z.string().optional(),
  key_file_contents: z.string().optional(),
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotBoxImportInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotBoxImportInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotBoxImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotBoxImportInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotBoxImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotBoxImportInstructions = Instructions['output']
export type RobotBoxImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotBoxImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotBoxImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotBoxImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotBoxImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
