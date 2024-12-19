import { z } from 'zod'

import { credentials, ignore_errors, port } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  docs_redirect_from: ['/docs/import-files-over-sftp/'],
  example_code: {
    steps: {
      imported: {
        robot: '/sftp/import',
        credentials: 'YOUR_SFTP_CREDENTIALS',
        path: 'path/to/files/',
      },
    },
  },
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Importing',
  purpose_sentence:
    'imports whole libraries of files from your SFTP servers into Transloadit. This Robot relies on public key authentication',
  purpose_verb: 'import',
  purpose_word: 'SFTP servers',
  purpose_words: 'Import files from SFTP servers',
  service_slug: 'file-importing',
  slot_count: 20,
  title: 'Import files from SFTP servers',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotSftpImportInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/sftp/import'),
    ignore_errors,
    credentials: credentials.describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your SFTP host, user and optional custom public key.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"host"\`, \`"port"\`, \`"user"\`, \`"public_key"\` (optional).
`),
    path: z.string().describe(`
The path on your SFTP server where to search for files.
`),
    port: port.default(22).describe(`
The port to use for the connection.
`),
  })
  .strict()

export type RobotSftpImportInstructions = z.infer<typeof robotSftpImportInstructionsSchema>
export type RobotSftpImportInstructionsInput = z.input<typeof robotSftpImportInstructionsSchema>
