import { z } from 'zod'

import { robotImport, robotBase, sftpBase } from './_instructions-primitives.ts'
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

export const robotSftpImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(sftpBase)
  .extend({
    robot: z.literal('/sftp/import'),
    path: z.string().describe(`
The path on your SFTP server where to search for files.
`),
  })
  .strict()

export type RobotSftpImportInstructions = z.infer<typeof robotSftpImportInstructionsSchema>
export type RobotSftpImportInstructionsInput = z.input<typeof robotSftpImportInstructionsSchema>
