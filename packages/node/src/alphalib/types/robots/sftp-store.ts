import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageStoreExample,
  defineRobotWithHiddenFields,
  robotBase,
  robotStoreMeta,
  robotUse,
  sftpBase,
  storePath,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/sftp/store', 'YOUR_SFTP_CREDENTIALS'),
  example_code_description: 'Export uploaded files to `my_target_folder` on an SFTP server:',
  purpose_sentence: 'exports encoding results to your own SFTP server',
  purpose_word: 'SFTP servers',
  purpose_words: 'Export files to SFTP servers',
  title: 'Export files to SFTP servers',
  name: 'SftpStoreRobot',
}

export const robotSftpStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(sftpBase)
  .extend({
    robot: z.literal('/sftp/store'),
    path: storePath,
    url_template: z
      .string()
      .default('http://host/path')
      .describe(`
The URL of the file in the result JSON. This may include any of the following supported [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    ssl_url_template: z
      .string()
      .default('https://{HOST}/{PATH}')
      .describe(`
  The SSL URL of the file in the result JSON. The following [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables) are supported.
`),
    file_chmod: z
      .string()
      .regex(/([0-7]{3}|auto)/u)
      .default('auto')
      .describe(`
This optional parameter controls how an uploaded file's permission bits are set. You can use any string format that the \`chmod\` command would accept, such as \`"755"\`. If you don't specify this option, the file's permission bits aren't changed at all, meaning it's up to your server's configuration (e.g. umask).
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
  typeof robotSftpStoreInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotSftpStoreInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotSftpStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotSftpStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotSftpStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotSftpStoreInstructions = Instructions['output']
export type RobotSftpStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotSftpStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotSftpStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotSftpStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotSftpStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
