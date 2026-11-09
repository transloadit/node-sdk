import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageImportExample,
  defineRobot,
  digitalOceanBase,
  path,
  recursiveImport,
  recursiveImportPageNumber,
  recursiveImportPageSize,
  return_file_stubs,
  robotBase,
  robotImport,
  robotImportMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/digitalocean/import', 'YOUR_DIGITALOCEAN_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from DigitalOcean Spaces',
  purpose_word: 'DigitalOcean Spaces',
  purpose_words: 'Import files from DigitalOcean Spaces',
  title: 'Import files from DigitalOcean Spaces',
  name: 'DigitalOceanImportRobot',
}

export const robotDigitaloceanImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(digitalOceanBase)
  .extend({
    robot: z.literal('/digitalocean/import'),
    path: path.describe(`
The path in your bucket to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are direct descendants of this directory will be imported. For example: \`images/\`.

Directories are **not** imported recursively. If you want to import files from subdirectories and sub-subdirectories, enable the \`recursive\` parameter.

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
    recursive: recursiveImport,
    page_number: recursiveImportPageNumber,
    files_per_page: recursiveImportPageSize,
    return_file_stubs,
  })
  .strict()

export const robotDefinition: RobotDefinition<
  typeof robotDigitaloceanImportInstructionsSchema.shape
> = defineRobot(meta, robotDigitaloceanImportInstructionsSchema)

export const {
  withHiddenFields: robotDigitaloceanImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotDigitaloceanImportInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotDigitaloceanImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotDigitaloceanImportInstructions = Instructions['output']
export type RobotDigitaloceanImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotDigitaloceanImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotDigitaloceanImportInstructionsInput =
  Instructions['interpolatableInput']
export type InterpolatableRobotDigitaloceanImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotDigitaloceanImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
