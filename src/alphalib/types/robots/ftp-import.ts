import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  ftpBase,
  interpolateRobot,
  path,
  robotBase,
  robotImport,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
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
  example_code_description: `Import files from the \`path/to/files\` directory and its subdirectories:`,
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
  name: 'FtpImportRobot',
  priceFactor: 6.6666,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
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

export const robotFtpImportInstructionsWithHiddenFieldsSchema =
  robotFtpImportInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotFtpImportInstructionsSchema.shape.result]).optional(),
  })

export type RobotFtpImportInstructions = z.infer<typeof robotFtpImportInstructionsSchema>
export type RobotFtpImportInstructionsWithHiddenFields = z.infer<
  typeof robotFtpImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotFtpImportInstructionsSchema = interpolateRobot(
  robotFtpImportInstructionsSchema,
)
export type InterpolatableRobotFtpImportInstructions = InterpolatableRobotFtpImportInstructionsInput

export type InterpolatableRobotFtpImportInstructionsInput = z.input<
  typeof interpolatableRobotFtpImportInstructionsSchema
>

export const interpolatableRobotFtpImportInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotFtpImportInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotFtpImportInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotFtpImportInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotFtpImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotFtpImportInstructionsWithHiddenFieldsSchema
>
