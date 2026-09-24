import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageStoreExample,
  defineRobotWithHiddenFields,
  ftpBase,
  robotBase,
  robotStoreMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/ftp/store', 'YOUR_FTP_CREDENTIALS'),
  example_code_description: 'Export uploaded files to `my_target_folder` on an FTP server:',
  purpose_sentence:
    'exports encoding results to your FTP servers. This Robot relies on password access. For more security, consider our /sftp/store Robot',
  purpose_word: 'FTP servers',
  purpose_words: 'Export files to FTP servers',
  title: 'Export files to FTP servers',
  name: 'FtpStoreRobot',
}

export const robotFtpStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(ftpBase)
  .extend({
    robot: z.literal('/ftp/store'),
    path: z
      .string()
      .default('${unique_prefix}/${file.url_name}')
      .describe(`
The path at which the file is to be stored. This can contain any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).

Please note that you might need to include your homedir at the beginning of the path.
`),
    url_template: z
      .string()
      .default('https://{HOST}/{PATH}')
      .describe(`
The URL of the file in the result JSON. The following [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables) are supported.
`),
    ssl_url_template: z
      .string()
      .default('https://{HOST}/{PATH}')
      .describe(`
The SSL URL of the file in the result JSON. The following [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables) are supported.
`),
    secure: z
      .boolean()
      .default(false)
      .describe(`
Determines whether to establish a secure connection to the FTP server using SSL.
`),
  })
  .strict()

const hiddenFields = {
  use_remote_utime: z
    .boolean()
    .optional()
    .describe(`
Use the remote file's modification time instead of the current time when storing the file.
`),
  version: z
    .union([z.string(), z.number()])
    .optional()
    .describe(`
Version identifier for the underlying tool used (2 is ncftp, 1 is ftp).
`),
  allowNetwork: z.string().optional(), // For internal test purposes
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotFtpStoreInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotFtpStoreInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotFtpStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotFtpStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotFtpStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotFtpStoreInstructions = Instructions['output']
export type RobotFtpStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotFtpStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotFtpStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotFtpStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotFtpStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
