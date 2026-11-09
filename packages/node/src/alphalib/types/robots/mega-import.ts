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
  megaBase,
  recursive,
  recursiveImportPageNumber,
  recursiveImportPageSize,
  return_file_stubs,
  robotBase,
  robotImport,
  robotImportMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/mega/import', 'YOUR_MEGA_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from your MEGA S4 Object Storage bucket',
  purpose_word: 'MEGA S4 Object Storage',
  purpose_words: 'Import files from MEGA S4 Object Storage',
  requires_credentials: true,
  title: 'Import files from MEGA S4 Object Storage',
  name: 'MegaImportRobot',
}

export const robotMegaImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(megaBase)
  .extend({
    result: z
      .boolean()
      .optional()
      .describe('Whether the results of this Step should be present in the Assembly Status JSON'),
    robot: z.literal('/mega/import'),
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

export const robotDefinition: RobotDefinition<typeof robotMegaImportInstructionsSchema.shape> =
  defineRobot(meta, robotMegaImportInstructionsSchema)

export const {
  withHiddenFields: robotMegaImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotMegaImportInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotMegaImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotMegaImportInstructions = Instructions['output']
export type RobotMegaImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotMegaImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotMegaImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotMegaImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotMegaImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
