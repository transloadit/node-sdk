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
  supabaseBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/supabase/import', 'YOUR_SUPABASE_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from your Supabase Storage bucket',
  purpose_word: 'Supabase Storage',
  purpose_words: 'Import files from Supabase Storage',
  requires_credentials: true,
  title: 'Import files from Supabase Storage',
  name: 'SupabaseImportRobot',
}

export const robotSupabaseImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(supabaseBase)
  .extend({
    robot: z.literal('/supabase/import').describe(`
The URL to the result file will be returned in the <dfn>Assembly Status JSON</dfn>.
`),
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

export const robotDefinition: RobotDefinition<typeof robotSupabaseImportInstructionsSchema.shape> =
  defineRobot(meta, robotSupabaseImportInstructionsSchema)

export const {
  withHiddenFields: robotSupabaseImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotSupabaseImportInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotSupabaseImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotSupabaseImportInstructions = Instructions['output']
export type RobotSupabaseImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotSupabaseImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotSupabaseImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotSupabaseImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotSupabaseImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
