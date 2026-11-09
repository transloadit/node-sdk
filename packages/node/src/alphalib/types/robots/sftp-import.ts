import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageImportExample,
  defineRobotWithHiddenFields,
  recursive,
  robotBase,
  robotImport,
  robotImportMeta,
  sftpBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/sftp/import', 'YOUR_SFTP_CREDENTIALS'),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  purpose_sentence:
    'imports whole libraries of files from your SFTP servers into Transloadit. This Robot relies on public key authentication',
  purpose_word: 'SFTP servers',
  purpose_words: 'Import files from SFTP servers',
  title: 'Import files from SFTP servers',
  name: 'SftpImportRobot',
}

export const robotSftpImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(sftpBase)
  .extend({
    robot: z.literal('/sftp/import'),
    path: z.string().describe(`
The path on your SFTP server where to search for files. If the path points to a directory, only direct descendants of this directory are imported by default.
`),
    recursive: recursive.describe(`
Setting this to \`true\` will enable importing files from subdirectories and sub-subdirectories (etc.) of the given path.
`),
  })
  .strict()

const hiddenFields = {
  allowNetwork: z
    .string()
    .optional()
    .describe(`
Network access permission for the SFTP connection. This is used to control which networks the SFTP robot can access.
`),
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotSftpImportInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotSftpImportInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotSftpImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotSftpImportInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotSftpImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotSftpImportInstructions = Instructions['output']
export type RobotSftpImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotSftpImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotSftpImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotSftpImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotSftpImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
