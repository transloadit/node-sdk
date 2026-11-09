import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageStoreExample,
  defineRobotWithHiddenFields,
  dropboxBase,
  robotBase,
  robotStoreMeta,
  robotUse,
  storePath,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/dropbox/store', 'YOUR_DROPBOX_CREDENTIALS'),
  example_code_description: 'Export uploaded files to `my_target_folder` on Dropbox:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to Dropbox',
  purpose_word: 'Dropbox',
  purpose_words: 'Export files to Dropbox',
  title: 'Export files to Dropbox',
  name: 'DropboxStoreRobot',
}

export const robotDropboxStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(dropboxBase)
  .extend({
    robot: z.literal('/dropbox/store'),
    path: storePath,
    create_sharing_link: z
      .boolean()
      .default(false)
      .describe(`
Whether to create a URL to this file for sharing with other people. This will overwrite the file's \`"url"\` property.
`),
  })
  .strict()

const hiddenFields = {
  access_token: z.string().optional(), // Legacy field for backward compatibility
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotDropboxStoreInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotDropboxStoreInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotDropboxStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotDropboxStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotDropboxStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotDropboxStoreInstructions = Instructions['output']
export type RobotDropboxStoreInstructionsInput = Instructions['input']
export type RobotDropboxStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotDropboxStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotDropboxStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotDropboxStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotDropboxStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
