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
  minioBase,
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
  example_code: createStorageImportExample('/minio/import', 'YOUR_MINIO_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  purpose_sentence: 'imports whole directories of files from your MinIO bucket',
  purpose_word: 'MinIO',
  purpose_words: 'Import files from MinIO',
  requires_credentials: true,
  title: 'Import files from MinIO',
  name: 'MinioImportRobot',
}

export const robotMinioImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(minioBase)
  .extend({
    robot: z.literal('/minio/import'),
    path: bucketImportPath,
    recursive: recursiveImport,
    page_number: recursiveImportPageNumber,
    files_per_page: recursiveImportPageSize,
    return_file_stubs,
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotMinioImportInstructionsSchema.shape> =
  defineRobot(meta, robotMinioImportInstructionsSchema)

export const {
  withHiddenFields: robotMinioImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotMinioImportInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotMinioImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotMinioImportInstructions = Instructions['output']
export type RobotMinioImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotMinioImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotMinioImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotMinioImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotMinioImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
