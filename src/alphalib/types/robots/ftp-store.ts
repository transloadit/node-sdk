import { z } from 'zod'

import { ftpBase, interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  docs_redirect_from: ['/docs/export-to-your-own-ftp-server/'],
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
  example_code_description: 'Export uploaded files to `my_target_folder` on an FTP server:',
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
}

export const robotFtpStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(ftpBase)
  .extend({
    robot: z.literal('/ftp/store'),
    path: z.string().default('${unique_prefix}/${file.url_name}').describe(`
The path at which the file is to be stored. This can contain any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).

Please note that you might need to include your homedir at the beginning of the path.
`),
    url_template: z.string().default('https://{HOST}/{PATH}').describe(`
The URL of the file in the result JSON. The following [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables) are supported.
`),
    ssl_url_template: z.string().default('https://{HOST}/{PATH}').describe(`
The SSL URL of the file in the result JSON. The following [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables) are supported.
`),
    secure: z.boolean().default(false).describe(`
Determines whether to establish a secure connection to the FTP server using SSL.
`),
  })
  .strict()

export type RobotFtpStoreInstructions = z.infer<typeof robotFtpStoreInstructionsSchema>
export type RobotFtpStoreInstructionsInput = z.input<typeof robotFtpStoreInstructionsSchema>

export const interpolatableRobotFtpStoreInstructionsSchema = interpolateRobot(
  robotFtpStoreInstructionsSchema,
)
export type InterpolatableRobotFtpStoreInstructions = z.input<
  typeof interpolatableRobotFtpStoreInstructionsSchema
>
