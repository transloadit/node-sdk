import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { dropboxBase, interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/dropbox/store',
        use: ':original',
        credentials: 'YOUR_DROPBOX_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: `Export uploaded files to \`my_target_folder\` on Dropbox:`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to Dropbox',
  purpose_verb: 'export',
  purpose_word: 'Dropbox',
  purpose_words: 'Export files to Dropbox',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Dropbox',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'DropboxStoreRobot',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotDropboxStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(dropboxBase)
  .extend({
    robot: z.literal('/dropbox/store'),
    path: z
      .string()
      .default('${unique_prefix}/${file.url_name}')
      .describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    create_sharing_link: z
      .boolean()
      .default(false)
      .describe(`
Whether to create a URL to this file for sharing with other people. This will overwrite the file's \`"url"\` property.
`),
  })
  .strict()

export const robotDropboxStoreInstructionsWithHiddenFieldsSchema =
  robotDropboxStoreInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotDropboxStoreInstructionsSchema.shape.result])
      .optional(),
    access_token: z.string().optional(), // Legacy field for backward compatibility
  })

export type RobotDropboxStoreInstructions = z.infer<typeof robotDropboxStoreInstructionsSchema>
export type RobotDropboxStoreInstructionsInput = z.input<typeof robotDropboxStoreInstructionsSchema>
export type RobotDropboxStoreInstructionsWithHiddenFields = z.infer<
  typeof robotDropboxStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotDropboxStoreInstructionsSchema = interpolateRobot(
  robotDropboxStoreInstructionsSchema,
)
export type InterpolatableRobotDropboxStoreInstructions =
  InterpolatableRobotDropboxStoreInstructionsInput

export type InterpolatableRobotDropboxStoreInstructionsInput = z.input<
  typeof interpolatableRobotDropboxStoreInstructionsSchema
>

export const interpolatableRobotDropboxStoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotDropboxStoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotDropboxStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotDropboxStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotDropboxStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotDropboxStoreInstructionsWithHiddenFieldsSchema
>
