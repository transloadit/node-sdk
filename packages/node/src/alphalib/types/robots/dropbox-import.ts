import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageImportExample,
  defineRobot,
  dropboxBase,
  path,
  robotBase,
  robotImport,
  robotImportMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/dropbox/import', 'YOUR_DROPBOX_CREDENTIALS', false),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from your Dropbox',
  purpose_word: 'Dropbox',
  purpose_words: 'Import files from Dropbox',
  requires_credentials: true,
  title: 'Import files from Dropbox',
  name: 'DropboxImportRobot',
}

export const robotDropboxImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(dropboxBase)
  .extend({
    robot: z.literal('/dropbox/import'),
    access_token: z
      .string()
      .optional()
      .describe(`
The Dropbox OAuth access token. We recommend using <dfn>Template Credentials</dfn> via \`credentials\`, but you can use this parameter for dynamic Dropbox credentials.
`),
    refresh_token: z
      .string()
      .optional()
      .describe(`
The Dropbox OAuth refresh token. This is optional and can be used together with \`access_token\` for dynamic Dropbox credentials.
`),
    path: path.describe(`
The path in your Dropbox to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are descendants of this directory are recursively imported. For example: \`images/\`.

If you want to import all files from the root directory, please use \`/\` as the value here.

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotDropboxImportInstructionsSchema.shape> =
  defineRobot(meta, robotDropboxImportInstructionsSchema)

export const {
  withHiddenFields: robotDropboxImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotDropboxImportInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotDropboxImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotDropboxImportInstructions = Instructions['output']
export type RobotDropboxImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotDropboxImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotDropboxImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotDropboxImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotDropboxImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
