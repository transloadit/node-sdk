import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageImportExample,
  defineRobot,
  ftpBase,
  path,
  robotBase,
  robotImport,
  robotImportMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImportMeta,
  example_code: createStorageImportExample('/ftp/import', 'YOUR_FTP_CREDENTIALS', false),
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  purpose_sentence:
    'imports whole libraries of files from your FTP servers into Transloadit. This Robot relies on password access. For more security, consider our /sftp/import Robot',
  purpose_word: 'FTP servers',
  purpose_words: 'Import files from FTP servers',
  title: 'Import files from FTP servers',
  name: 'FtpImportRobot',
}

export const robotFtpImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(ftpBase)
  .extend({
    robot: z.literal('/ftp/import'),
    path: path.describe(`
The path on your FTP server where to search for files. Files are imported recursively from all sub-directories and sub-sub-directories (and so on) from this path.
`),
    passive_mode: z
      .boolean()
      .default(true)
      .describe(`
Determines if passive mode should be used for the FTP connection.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotFtpImportInstructionsSchema.shape> =
  defineRobot(meta, robotFtpImportInstructionsSchema)

export const {
  withHiddenFields: robotFtpImportInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotFtpImportInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotFtpImportInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotFtpImportInstructions = Instructions['output']
export type RobotFtpImportInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotFtpImportInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotFtpImportInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotFtpImportInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotFtpImportInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
