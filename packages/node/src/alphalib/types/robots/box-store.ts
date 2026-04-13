import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { boxBase, interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/box/store',
        use: ':original',
        credentials: 'YOUR_BOX_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: 'Export uploaded files to `my_target_folder` on Box:',
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to Box',
  purpose_verb: 'export',
  purpose_word: 'Box',
  purpose_words: 'Export files to Box',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Box',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'BoxStoreRobot',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'ga',
}

export const robotBoxStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(boxBase)
  .extend({
    robot: z.literal('/box/store'),
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

export const robotBoxStoreInstructionsWithHiddenFieldsSchema =
  robotBoxStoreInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotBoxStoreInstructionsSchema.shape.result]).optional(),
    access_token: z.string().optional(),
    key_file_contents: z.string().optional(),
  })

export type RobotBoxStoreInstructions = z.infer<typeof robotBoxStoreInstructionsSchema>
export type RobotBoxStoreInstructionsInput = z.input<typeof robotBoxStoreInstructionsSchema>
export type RobotBoxStoreInstructionsWithHiddenFields = z.infer<
  typeof robotBoxStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotBoxStoreInstructionsSchema = interpolateRobot(
  robotBoxStoreInstructionsSchema,
)
export type InterpolatableRobotBoxStoreInstructions = InterpolatableRobotBoxStoreInstructionsInput

export type InterpolatableRobotBoxStoreInstructionsInput = z.input<
  typeof interpolatableRobotBoxStoreInstructionsSchema
>

export const interpolatableRobotBoxStoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotBoxStoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotBoxStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotBoxStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotBoxStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotBoxStoreInstructionsWithHiddenFieldsSchema
>
