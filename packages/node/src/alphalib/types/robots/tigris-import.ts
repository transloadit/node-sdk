import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  bucketImportPath,
  createStorageImportExample,
  defineRobot,
  recursiveImport,
  recursiveImportPageNumber,
  recursiveImportPageSize,
  return_file_stubs,
  robotBase,
  robotImport,
  robotImportMeta,
  tigrisBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/tigris/import', 'YOUR_TIGRIS_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from your Tigris bucket',
  purpose_word: 'Tigris',
  purpose_words: 'Import files from Tigris',
  requires_credentials: true,
  title: 'Import files from Tigris',
  name: 'TigrisImportRobot',
}

export const robotTigrisImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(tigrisBase)
  .extend({
    robot: z.literal('/tigris/import'),
    path: bucketImportPath,
    recursive: recursiveImport,
    page_number: recursiveImportPageNumber,
    files_per_page: recursiveImportPageSize,
    return_file_stubs,
    bucket_region: z
      .string()
      .optional()
      .describe('The region of your Tigris bucket. This is optional as it can often be derived.'),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotTigrisImportInstructionsSchema.shape> =
  defineRobot(meta, robotTigrisImportInstructionsSchema)

export const {
  withHiddenFields: robotTigrisImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotTigrisImportInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotTigrisImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotTigrisImportInstructions = Instructions['output']
export type RobotTigrisImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotTigrisImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotTigrisImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotTigrisImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotTigrisImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
