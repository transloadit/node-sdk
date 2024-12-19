import { z } from 'zod'

import { credentials, ignore_errors, path, port } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      imported: {
        robot: '/ftp/import',
        credentials: 'YOUR_FTP_CREDENTIALS',
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
    'imports whole libraries of files from your FTP servers into Transloadit. This Robot relies on password access. For more security, consider our /sftp/import Robot',
  purpose_verb: 'import',
  purpose_word: 'FTP servers',
  purpose_words: 'Import files from FTP servers',
  service_slug: 'file-importing',
  slot_count: 20,
  title: 'Import files from FTP servers',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotFtpImportInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/ftp/import'),
    ignore_errors,
    credentials: credentials.describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your FTP host, user and password.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> with their static nature is too unwieldy. If you have this requirement, feel free to use the following parameters instead: \`"host"\`, \`"user"\`, \`"password"\`.
`),
    path: path.describe(`
The path on your FTP server where to search for files. Files are imported recursively from all sub-directories and sub-sub-directories (and so on) from this path.
`),
    port: port.default(21).describe(`
The port to use for the FTP connection.
`),
    passive_mode: z.boolean().default(true).describe(`
Determines if passive mode should be used for the FTP connection.
`),
  })
  .strict()

export type RobotFtpImportInstructions = z.infer<typeof robotFtpImportInstructionsSchema>
export type RobotFtpImportInstructionsInput = z.input<typeof robotFtpImportInstructionsSchema>
