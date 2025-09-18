import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse, sftpBase } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/sftp/store',
        use: ':original',
        credentials: 'YOUR_SFTP_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: `Export uploaded files to \`my_target_folder\` on an SFTP server:`,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to your own SFTP server',
  purpose_verb: 'export',
  purpose_word: 'SFTP servers',
  purpose_words: 'Export files to SFTP servers',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to SFTP servers',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'SftpStoreRobot',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotSftpStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(sftpBase)
  .extend({
    robot: z.literal('/sftp/store'),
    path: z
      .string()
      .default('${unique_prefix}/${file.url_name}')
      .describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
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
      .regex(/([0-7]{3}|auto)/)
      .default('auto')
      .describe(`
This optional parameter controls how an uploaded file's permission bits are set. You can use any string format that the \`chmod\` command would accept, such as \`"755"\`. If you don't specify this option, the file's permission bits aren't changed at all, meaning it's up to your server's configuration (e.g. umask).
      `),
  })
  .strict()

export const robotSftpStoreInstructionsWithHiddenFieldsSchema =
  robotSftpStoreInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotSftpStoreInstructionsSchema.shape.result]).optional(),
    allowNetwork: z
      .string()
      .optional()
      .describe(`
Network access permission for the SFTP connection. This is used to control which networks the SFTP robot can access.
`),
  })

export type RobotSftpStoreInstructions = z.infer<typeof robotSftpStoreInstructionsSchema>
export type RobotSftpStoreInstructionsWithHiddenFields = z.infer<
  typeof robotSftpStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotSftpStoreInstructionsSchema = interpolateRobot(
  robotSftpStoreInstructionsSchema,
)
export type InterpolatableRobotSftpStoreInstructions = InterpolatableRobotSftpStoreInstructionsInput

export type InterpolatableRobotSftpStoreInstructionsInput = z.input<
  typeof interpolatableRobotSftpStoreInstructionsSchema
>

export const interpolatableRobotSftpStoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotSftpStoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotSftpStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotSftpStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotSftpStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotSftpStoreInstructionsWithHiddenFieldsSchema
>
