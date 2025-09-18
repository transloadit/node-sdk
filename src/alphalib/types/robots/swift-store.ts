import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse, swiftBase } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/swift/store',
        use: ':original',
        credentials: 'YOUR_SWIFT_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: `Export uploaded files to \`my_target_folder\` on Swift:`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to OpenStack Swift buckets',
  purpose_verb: 'export',
  purpose_word: 'OpenStack Swift',
  purpose_words: 'Export files to OpenStack/Swift',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to OpenStack Swift Spaces',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'SwiftStoreRobot',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotSwiftStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(swiftBase)
  .extend({
    robot: z.literal('/swift/store').describe(`
The URL to the result file in your OpenStack bucket will be returned in the <dfn>Assembly Status JSON</dfn>.`),
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
An object containing a list of headers to be set for this file on swift Spaces, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    sign_urls_for: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(`
This parameter provides signed URLs in the result JSON (in the \`signed_ssl_url\` property). The number that you set this parameter to is the URL expiry time in seconds. If this parameter is not used, no URL signing is done.
`),
  })
  .strict()

export const robotSwiftStoreInstructionsWithHiddenFieldsSchema =
  robotSwiftStoreInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotSwiftStoreInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotSwiftStoreInstructions = z.infer<typeof robotSwiftStoreInstructionsSchema>
export type RobotSwiftStoreInstructionsWithHiddenFields = z.infer<
  typeof robotSwiftStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotSwiftStoreInstructionsSchema = interpolateRobot(
  robotSwiftStoreInstructionsSchema,
)
export type InterpolatableRobotSwiftStoreInstructions =
  InterpolatableRobotSwiftStoreInstructionsInput

export type InterpolatableRobotSwiftStoreInstructionsInput = z.input<
  typeof interpolatableRobotSwiftStoreInstructionsSchema
>

export const interpolatableRobotSwiftStoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotSwiftStoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotSwiftStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotSwiftStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotSwiftStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotSwiftStoreInstructionsWithHiddenFieldsSchema
>
