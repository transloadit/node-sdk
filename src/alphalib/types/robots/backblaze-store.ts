import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { backblazeBase, interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/backblaze/store',
        use: ':original',
        credentials: 'YOUR_BACKBLAZE_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: `Export uploaded files to \`my_target_folder\` on Backblaze:`,
  extended_description: `
## Access

Your Backblaze buckets need to have the \`listBuckets\` (to obtain a bucket ID from a bucket name), \`writeFiles\` and \`listFiles\` permissions.
`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to Backblaze',
  purpose_verb: 'export',
  purpose_word: 'Backblaze',
  purpose_words: 'Export files to Backblaze',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Backblaze',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'BackblazeStoreRobot',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotBackblazeStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(backblazeBase)
  .extend({
    robot: z.literal('/backblaze/store'),
    path: z
      .string()
      .default('${unique_prefix}/${file.url_name}')
      .describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    headers: z
      .record(z.string())
      .default({})
      .describe(`
An object containing a list of headers to be set for this file on backblaze, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

[Here](https://www.backblaze.com/b2/docs/b2_upload_file.html) you can find a list of available headers.

Object Metadata can be specified using \`X-Bz-Info-*\` headers.
`),
  })
  .strict()

export const robotBackblazeStoreInstructionsWithHiddenFieldsSchema =
  robotBackblazeStoreInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotBackblazeStoreInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotBackblazeStoreInstructions = z.infer<typeof robotBackblazeStoreInstructionsSchema>
export type RobotBackblazeStoreInstructionsWithHiddenFields = z.infer<
  typeof robotBackblazeStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotBackblazeStoreInstructionsSchema = interpolateRobot(
  robotBackblazeStoreInstructionsSchema,
)
export type InterpolatableRobotBackblazeStoreInstructions =
  InterpolatableRobotBackblazeStoreInstructionsInput

export type InterpolatableRobotBackblazeStoreInstructionsInput = z.input<
  typeof interpolatableRobotBackblazeStoreInstructionsSchema
>

export const interpolatableRobotBackblazeStoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotBackblazeStoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotBackblazeStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotBackblazeStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotBackblazeStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotBackblazeStoreInstructionsWithHiddenFieldsSchema
>
