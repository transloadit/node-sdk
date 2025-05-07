import { z } from 'zod'

import { interpolateRobot, robotBase, robotUse, wasabiBase } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/wasabi/store',
        use: ':original',
        credentials: 'YOUR_WASABI_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: 'Export uploaded files to `my_target_folder` on Wasabi:',
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to Wasabi buckets',
  purpose_verb: 'export',
  purpose_word: 'Wasabi',
  purpose_words: 'Export files to Wasabi',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Wasabi',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotWasabiStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(wasabiBase)
  .extend({
    robot: z.literal('/wasabi/store').describe(`
The URL to the result file will be returned in the <dfn>Assembly Status JSON</dfn>.
`),
    path: z.string().default('${unique_prefix}/${file.url_name}').describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables). The path must not be a directory.
`),
    acl: z.enum(['private', 'public-read']).default('public-read').describe(`
The permissions used for this file.
`),
    headers: z.record(z.string()).default({ 'Content-Type': '${file.mime}' }).describe(`
An object containing a list of headers to be set for this file on Wasabi Spaces, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    sign_urls_for: z.number().int().min(0).optional().describe(`
This parameter provides signed URLs in the result JSON (in the \`signed_ssl_url\` property). The number that you set this parameter to is the URL expiry time in seconds. If this parameter is not used, no URL signing is done.
`),
  })
  .strict()

export type RobotWasabiStoreInstructions = z.infer<typeof robotWasabiStoreInstructionsSchema>
export type RobotWasabiStoreInstructionsInput = z.input<typeof robotWasabiStoreInstructionsSchema>

export const interpolatableRobotWasabiStoreInstructionsSchema = interpolateRobot(
  robotWasabiStoreInstructionsSchema,
)
export type InterpolatableRobotWasabiStoreInstructions = z.input<
  typeof interpolatableRobotWasabiStoreInstructionsSchema
>
