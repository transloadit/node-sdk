import { z } from 'zod'

import { useParamSchema } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
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
  example_code_description: 'Export uploaded files to `my_target_folder` on DigitalOcean Spaces:',
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
}

export const robotDigitaloceanStoreInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/digitalocean/store'),
    use: useParamSchema.optional(),
    credentials: z.string().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your [Template Credentials](/c/template-credentials/) as this parameter's value. They will contain the values for your DigitalOcean Space, Key, Secret and Region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"space"\`, \`"region"\` (for example: \`"fra1"\` or \`"nyc3"\`), \`"key"\`, \`"secret"\`.
`),
    path: z.string().default('${unique_prefix}/${file.url_name}').describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables). The path must not be a directory.
`),
    url_prefix: z.string().default('https://{space}.{region}.digitaloceanspaces.com/').describe(`
The URL prefix used for the returned URL, such as \`"https://my.cdn.com/some/path"\`.
`),
    acl: z.enum(['private', 'public-read']).default('public-read').describe(`
The permissions used for this file.
`),
    headers: z.record(z.string()).default({ 'Content-Type': '${file.mime}' }).describe(`
An object containing a list of headers to be set for this file on DigitalOcean Spaces, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

[Here](https://developers.digitalocean.com/documentation/spaces/#object) you can find a list of available headers.

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    sign_urls_for: z.number().int().min(0).optional().describe(`
This parameter provides signed URLs in the result JSON (in the \`signed_ssl_url\` property). The number that you set this parameter to is the URL expiry time in seconds. If this parameter is not used, no URL signing is done.
`),
  })
  .strict()

export type RobotDigitaloceanStoreInstructions = z.infer<
  typeof robotDigitaloceanStoreInstructionsSchema
>
export type RobotDigitaloceanStoreInstructionsInput = z.input<
  typeof robotDigitaloceanStoreInstructionsSchema
>
