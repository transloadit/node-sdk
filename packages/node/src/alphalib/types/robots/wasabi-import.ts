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
  recursive,
  recursiveImportPageNumber,
  recursiveImportPageSize,
  return_file_stubs,
  robotBase,
  robotImport,
  robotImportMeta,
  wasabiBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/wasabi/import', 'YOUR_WASABI_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from your Wasabi bucket',
  purpose_word: 'Wasabi',
  purpose_words: 'Import files from Wasabi',
  requires_credentials: true,
  title: 'Import files from Wasabi',
  name: 'WasabiImportRobot',
}

export const robotWasabiImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(wasabiBase)
  .extend({
    result: z
      .boolean()
      .optional()
      .describe('Whether the results of this Step should be present in the Assembly Status JSON'),
    robot: z.literal('/wasabi/import'),
    path: bucketImportPath,
    recursive: recursive.describe(`
Setting this to \`true\` will enable importing files from subfolders and sub-subfolders, etc. of the given path.

Please use the pagination parameters \`page_number\` and \`files_per_page\` wisely here.
`),
    page_number: recursiveImportPageNumber,
    files_per_page: recursiveImportPageSize,
    return_file_stubs,
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotWasabiImportInstructionsSchema.shape> =
  defineRobot(meta, robotWasabiImportInstructionsSchema)

export const {
  withHiddenFields: robotWasabiImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotWasabiImportInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotWasabiImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotWasabiImportInstructions = Instructions['output']
export type RobotWasabiImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotWasabiImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotWasabiImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotWasabiImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotWasabiImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
