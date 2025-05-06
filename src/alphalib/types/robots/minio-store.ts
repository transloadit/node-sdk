import { z } from 'zod'

import { interpolateRobot, minioBase, robotBase, robotUse } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/minio/store',
        use: ':original',
        credentials: 'YOUR_MINIO_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: 'Export uploaded files to `my_target_folder` on MinIO:',
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to MinIO buckets',
  purpose_verb: 'export',
  purpose_word: 'MinIO',
  purpose_words: 'Export files to MinIO',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to MinIO',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotMinioStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(minioBase)
  .extend({
    robot: z.literal('/minio/store').describe(`
The URL to the result file will be returned in the <dfn>Assembly Status JSON</dfn>.
`),
    path: z.string().default('${unique_prefix}/${file.url_name}').describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables). The path must not be a directory.
`),
    acl: z.enum(['private', 'public-read']).default('public-read').describe(`
The permissions used for this file.
`),
    headers: z.record(z.string()).default({ 'Content-Type': '${file.mime}' }).describe(`
An object containing a list of headers to be set for this file on MinIO Spaces, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    sign_urls_for: z.number().int().min(0).optional().describe(`
This parameter provides signed URLs in the result JSON (in the \`signed_ssl_url\` property). The number that you set this parameter to is the URL expiry time in seconds.

If this parameter is not used, no URL signing is done.
`),
  })
  .strict()

export type RobotMinioStoreInstructions = z.infer<typeof robotMinioStoreInstructionsSchema>
export type RobotMinioStoreInstructionsInput = z.input<typeof robotMinioStoreInstructionsSchema>

export const interpolatableRobotMinioStoreInstructionsSchema = interpolateRobot(
  robotMinioStoreInstructionsSchema,
)
export type InterpolatableRobotMinioStoreInstructions = z.input<
  typeof interpolatableRobotMinioStoreInstructionsSchema
>
