import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  digitalOceanBase,
  interpolateRobot,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/digitalocean/store',
        use: ':original',
        credentials: 'YOUR_DIGITALOCEAN_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: `Export uploaded files to \`my_target_folder\` on DigitalOcean Spaces:`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to DigitalOcean Spaces',
  purpose_verb: 'export',
  purpose_word: 'DigitalOcean Spaces',
  purpose_words: 'Export files to DigitalOcean Spaces',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to DigitalOcean Spaces',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'DigitalOceanStoreRobot',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotDigitaloceanStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(digitalOceanBase)
  .extend({
    robot: z.literal('/digitalocean/store'),
    path: z
      .string()
      .default('${unique_prefix}/${file.url_name}')
      .describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables). The path must not be a directory.
`),
    url_prefix: z
      .string()
      .default('https://{space}.{region}.digitaloceanspaces.com/')
      .describe(`
The URL prefix used for the returned URL, such as \`"https://my.cdn.com/some/path"\`.
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
An object containing a list of headers to be set for this file on DigitalOcean Spaces, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

[Here](https://developers.digitalocean.com/documentation/spaces/#object) you can find a list of available headers.

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

export const robotDigitaloceanStoreInstructionsWithHiddenFieldsSchema =
  robotDigitaloceanStoreInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotDigitaloceanStoreInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotDigitaloceanStoreInstructions = z.infer<
  typeof robotDigitaloceanStoreInstructionsSchema
>
export type RobotDigitaloceanStoreInstructionsWithHiddenFields = z.infer<
  typeof robotDigitaloceanStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotDigitaloceanStoreInstructionsSchema = interpolateRobot(
  robotDigitaloceanStoreInstructionsSchema,
)
export type InterpolatableRobotDigitaloceanStoreInstructions =
  InterpolatableRobotDigitaloceanStoreInstructionsInput

export type InterpolatableRobotDigitaloceanStoreInstructionsInput = z.input<
  typeof interpolatableRobotDigitaloceanStoreInstructionsSchema
>

export const interpolatableRobotDigitaloceanStoreInstructionsWithHiddenFieldsSchema =
  interpolateRobot(robotDigitaloceanStoreInstructionsWithHiddenFieldsSchema)
export type InterpolatableRobotDigitaloceanStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotDigitaloceanStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotDigitaloceanStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotDigitaloceanStoreInstructionsWithHiddenFieldsSchema
>
