import { z } from 'zod'

import { useParamSchema } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  docs_redirect_from: ['/docs/export-to-your-own-sftp-server/'],
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
  example_code_description: 'Export uploaded files to `my_target_folder` on an SFTP server:',
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
}

export const robotSftpStoreInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/sftp/store'),
    use: useParamSchema.optional(),
    credentials: z.string().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your SFTP host, user and optional custom public key.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"host"\`, \`"port"\`, \`"user"\`, \`"public_key"\` (optional).
`),
    path: z.string().default('${unique_prefix}/${file.url_name}').describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    url_template: z.string().default('http://host/path').describe(`
The URL of the file in the result JSON. This may include any of the following supported [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    ssl_url_template: z.string().default('https://{HOST}/{PATH}').describe(`
  The SSL URL of the file in the result JSON. The following [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables) are supported.
`),
    file_chmod: z
      .string()
      .regex(/([0-7]{3}|auto)/)
      .default('auto').describe(`
This optional parameter controls how an uploaded file's permission bits are set. You can use any string format that the \`chmod\` command would accept, such as \`"755"\`. If you don't specify this option, the file's permission bits aren't changed at all, meaning it's up to your server's configuration (e.g. umask).
      `),
  })
  .strict()

export type RobotSftpStoreInstructions = z.infer<typeof robotSftpStoreInstructionsSchema>
export type RobotSftpStoreInstructionsInput = z.input<typeof robotSftpStoreInstructionsSchema>
