import { z } from 'zod'

import { useParamSchema } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  docs_redirect_from: ['/docs/export-to-amazon-s3/'],
  example_code: {
    steps: {
      exported: {
        robot: '/s3/store',
        use: ':original',
        credentials: 'YOUR_AWS_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: 'Export uploaded files to `my_target_folder` in an S3 bucket:',
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to Amazon S3',
  purpose_verb: 'export',
  purpose_word: 'Amazon S3',
  purpose_words: 'Export files to Amazon S3',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Amazon S3',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotS3StoreInstructionsSchema = z
  .object({
    robot: z.literal('/s3/store'),
    use: useParamSchema,
    credentials: z.string().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your S3 bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"bucket_region"\` (for example: \`"us-east-1"\` or \`"eu-west-2"\`), \`"key"\`, \`"secret"\`.
`),
    path: z.string().default('${unique_prefix}/${file.url_name}').describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables). The path must not be a directory.
`),
    url_prefix: z.string().default('http://{bucket}.s3.amazonaws.com/').describe(`
The URL prefix used for the returned URL, such as \`"http://my.cdn.com/some/path/"\`.
`),
    acl: z.enum(['bucket-default', 'private', 'public', 'public-read']).default('public-read')
      .describe(`
The permissions used for this file.

Please keep in mind that the default value \`"public-read"\` can lead to permission errors due to the \`"Block all public access"\` checkbox that is checked by default when creating a new Amazon S3 Bucket in the AWS console.
`),
    check_integrity: z.boolean().default(false).describe(`
Calculate and submit the file's checksum in order for S3 to verify its integrity after uploading, which can help with occasional file corruption issues.

Enabling this option adds to the overall execution time, as integrity checking can be CPU intensive, especially for larger files.
`),
    headers: z.record(z.string()).default({ 'Content-Type': '${file.mime}' }).describe(`
An object containing a list of headers to be set for this file on S3, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables). You can find a list of available headers [here](https://docs.aws.amazon.com/AmazonS3/latest/API/RESTObjectPUT.html).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    tags: z.record(z.string()).default({}).describe(`
A hashmap of x-amz meta tags you can attach to the file during the export.
`),
    host: z.string().default('s3.amazonaws.com').describe(`
The host of the storage service used. This only needs to be set when the storage service used is not Amazon S3, but has a compatible API (such as hosteurope.de). The default protocol used is HTTP, for anything else the protocol needs to be explicitly specified. For example, prefix the host with \`https://\` or \`s3://\` to use either respective protocol.
`),
    no_vhost: z.boolean().default(false).describe(`
Set to \`true\` if you use a custom host and run into access denied errors.
`),
    sign_urls_for: z.number().int().min(0).optional().describe(`
This parameter provides signed URLs in the result JSON (in the \`signed_url\` and \`signed_ssl_url\` properties). The number that you set this parameter to is the URL expiry time in seconds. If this parameter is not used, no URL signing is done.
`),
  })
  .strict()

export type RobotS3StoreInstructions = z.infer<typeof robotS3StoreInstructionsSchema>
