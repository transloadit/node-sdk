import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotImport, sftpBase } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      imported: {
        robot: '/sftp/import',
        credentials: 'YOUR_SFTP_CREDENTIALS',
        path: 'path/to/files/',
      },
    },
  },
  example_code_description: `Import files from the \`path/to/files\` directory and its subdirectories:`,
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
  name: 'SftpImportRobot',
  priceFactor: 6.6666,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
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

export const robotSftpImportInstructionsWithHiddenFieldsSchema =
  robotSftpImportInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotSftpImportInstructionsSchema.shape.result])
      .optional(),
    allowNetwork: z
      .string()
      .optional()
      .describe(`
Network access permission for the SFTP connection. This is used to control which networks the SFTP robot can access.
`),
  })

export type RobotSftpImportInstructions = z.infer<typeof robotSftpImportInstructionsSchema>
export type RobotSftpImportInstructionsWithHiddenFields = z.infer<
  typeof robotSftpImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotSftpImportInstructionsSchema = interpolateRobot(
  robotSftpImportInstructionsSchema,
)
export type InterpolatableRobotSftpImportInstructions =
  InterpolatableRobotSftpImportInstructionsInput

export type InterpolatableRobotSftpImportInstructionsInput = z.input<
  typeof interpolatableRobotSftpImportInstructionsSchema
>

export const interpolatableRobotSftpImportInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotSftpImportInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotSftpImportInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotSftpImportInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotSftpImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotSftpImportInstructionsWithHiddenFieldsSchema
>
