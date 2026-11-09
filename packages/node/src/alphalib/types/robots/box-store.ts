import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  boxBase,
  createStorageStoreExample,
  defineRobotWithHiddenFields,
  robotBase,
  robotStoreMeta,
  robotUse,
  storePath,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/box/store', 'YOUR_BOX_CREDENTIALS'),
  example_code_description: 'Export uploaded files to `my_target_folder` on Box:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to Box',
  purpose_word: 'Box',
  purpose_words: 'Export files to Box',
  title: 'Export files to Box',
  name: 'BoxStoreRobot',
}

export const robotBoxStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(boxBase)
  .extend({
    robot: z.literal('/box/store'),
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
  access_token: z.string().optional(),
  key_file_contents: z.string().optional(),
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotBoxStoreInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotBoxStoreInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotBoxStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotBoxStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotBoxStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotBoxStoreInstructions = Instructions['output']
export type RobotBoxStoreInstructionsInput = Instructions['input']
export type RobotBoxStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotBoxStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotBoxStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotBoxStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotBoxStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
