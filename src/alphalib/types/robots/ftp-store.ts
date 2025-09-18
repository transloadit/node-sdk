import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { ftpBase, interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/ftp/store',
        use: ':original',
        credentials: 'YOUR_FTP_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: `Export uploaded files to \`my_target_folder\` on an FTP server:`,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence:
    'exports encoding results to your FTP servers. This Robot relies on password access. For more security, consider our /sftp/store Robot',
  purpose_verb: 'export',
  purpose_word: 'FTP servers',
  purpose_words: 'Export files to FTP servers',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to FTP servers',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'FtpStoreRobot',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
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

export const robotFtpStoreInstructionsWithHiddenFieldsSchema =
  robotFtpStoreInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotFtpStoreInstructionsSchema.shape.result]).optional(),
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
  })

export type RobotFtpStoreInstructions = z.infer<typeof robotFtpStoreInstructionsSchema>
export type RobotFtpStoreInstructionsWithHiddenFields = z.infer<
  typeof robotFtpStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotFtpStoreInstructionsSchema = interpolateRobot(
  robotFtpStoreInstructionsSchema,
)
export type InterpolatableRobotFtpStoreInstructions = InterpolatableRobotFtpStoreInstructionsInput

export type InterpolatableRobotFtpStoreInstructionsInput = z.input<
  typeof interpolatableRobotFtpStoreInstructionsSchema
>

export const interpolatableRobotFtpStoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotFtpStoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotFtpStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotFtpStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotFtpStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotFtpStoreInstructionsWithHiddenFieldsSchema
>
