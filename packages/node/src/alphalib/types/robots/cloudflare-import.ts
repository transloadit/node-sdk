import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  bucketImportPath,
  cloudflareBase,
  createStorageImportExample,
  defineRobot,
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
  example_code: createStorageImportExample('/cloudflare/import', 'YOUR_CLOUDFLARE_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from your Cloudflare R2 bucket',
  purpose_word: 'Cloudflare R2',
  purpose_words: 'Import files from Cloudflare R2',
  requires_credentials: true,
  title: 'Import files from Cloudflare R2',
  name: 'CloudflareImportRobot',
}

export const robotCloudflareImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(cloudflareBase)
  .extend({
    robot: z.literal('/cloudflare/import'),
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

export const robotDefinition: RobotDefinition<
  typeof robotCloudflareImportInstructionsSchema.shape
> = defineRobot(meta, robotCloudflareImportInstructionsSchema)

export const {
  withHiddenFields: robotCloudflareImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotCloudflareImportInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotCloudflareImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotCloudflareImportInstructions = Instructions['output']
export type RobotCloudflareImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotCloudflareImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotCloudflareImportInstructionsInput =
  Instructions['interpolatableInput']
export type InterpolatableRobotCloudflareImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotCloudflareImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
