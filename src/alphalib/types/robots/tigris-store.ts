import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse, tigrisBase } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/tigris/store',
        use: ':original',
        credentials: 'YOUR_TIGRIS_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: `Export uploaded files to \`my_target_folder\` on Tigris:`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to Tigris buckets',
  purpose_verb: 'export',
  purpose_word: 'Tigris',
  purpose_words: 'Export files to Tigris',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Tigris',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'TigrisStoreRobot',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotTigrisStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(tigrisBase)
  .extend({
    robot: z.literal('/tigris/store').describe(`
The URL to the result file will be returned in the <dfn>Assembly Status JSON</dfn>.
`),
    path: z
      .string()
      .default('${unique_prefix}/${file.url_name}')
      .describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables). The path must not be a directory.
`),
    acl: z
      .enum(['private', 'public-read'])
      .default('public-read')
      .describe(`
The permissions used for this file.
`),
    headers: z
      .record(z.string())
      .default({ 'Content-Type': '${file.mime}' })
      .describe(`
An object containing a list of headers to be set for this file on Tigris, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    sign_urls_for: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(`
This parameter provides signed URLs in the result JSON (in the \`signed_ssl_url\` property). The number that you set this parameter to is the URL expiry time in seconds.

If this parameter is not used, no URL signing is done.
`),
    bucket_region: z
      .string()
      .optional()
      .describe(`The region of your Tigris bucket. This is optional as it can often be derived.`),
  })
  .strict()

export const robotTigrisStoreInstructionsWithHiddenFieldsSchema =
  robotTigrisStoreInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotTigrisStoreInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotTigrisStoreInstructions = z.infer<typeof robotTigrisStoreInstructionsSchema>
export type RobotTigrisStoreInstructionsWithHiddenFields = z.infer<
  typeof robotTigrisStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotTigrisStoreInstructionsSchema = interpolateRobot(
  robotTigrisStoreInstructionsSchema,
)
export type InterpolatableRobotTigrisStoreInstructions =
  InterpolatableRobotTigrisStoreInstructionsInput

export type InterpolatableRobotTigrisStoreInstructionsInput = z.input<
  typeof interpolatableRobotTigrisStoreInstructionsSchema
>

export const interpolatableRobotTigrisStoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotTigrisStoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotTigrisStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotTigrisStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotTigrisStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotTigrisStoreInstructionsWithHiddenFieldsSchema
>
