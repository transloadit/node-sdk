import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse, s3Base } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
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
  example_code_description: `Export uploaded files to \`my_target_folder\` in an S3 bucket:`,
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
  name: 'S3StoreRobot',
  priceFactor: 10,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotS3StoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(s3Base)
  .extend({
    robot: z.literal('/s3/store').describe(`
If you are new to Amazon S3, see our tutorial on [using your own S3 bucket](/docs/faq/how-to-set-up-an-amazon-s3-bucket/).

The URL to the result file in your S3 bucket will be returned in the <dfn>Assembly Status JSON</dfn>. If your S3 bucket has versioning enabled, the version ID of the file will be returned within \`meta.version_id\`

> [!Warning]
> **Avoid permission errors.** By default, \`acl\` is set to \`"public"\`. AWS S3 has a bucket setting called "Block new public ACLs and uploading public objects". Set this to <strong>False</strong> in your bucket if you intend to leave \`acl\` as \`"public"\`. Otherwise, you’ll receive permission errors in your Assemblies despite your S3 credentials being configured correctly.

> [!Warning]
> **Use DNS-compliant bucket names.** Your bucket name [must be DNS-compliant](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html) and must not contain uppercase letters. Any non-alphanumeric characters in the file names will be replaced with an underscore, and spaces will be replaced with dashes. If your existing S3 bucket contains uppercase letters or is otherwise not DNS-compliant, rewrite the result URLs using the <dfn>Robot</dfn>’s \`url_prefix\` parameter.

<span id="minimum-s3-iam-permissions" aria-hidden="true"></span>

## Limit access

You will also need to add permissions to your bucket so that Transloadit can access it properly. Here is an example IAM policy that you can use. Following the [principle of least privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege), it contains the **minimum required permissions** to export a file to your S3 bucket using Transloadit. You may require more permissions (especially viewing permissions) depending on your application.

Please change \`{BUCKET_NAME}\` in the values for \`Sid\` and \`Resource\` accordingly. Also, this policy will grant the minimum required permissions to all your users. We advise you to create a separate Amazon IAM user, and use its User ARN (can be found in the "Summary" tab of a user [here](https://console.aws.amazon.com/iam/home#users)) for the \`Principal\` value. More information about this can be found [here](https://docs.aws.amazon.com/AmazonS3/latest/dev/AccessPolicyLanguage_UseCases_s3_a.html).

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowTransloaditToStoreFilesIn{BUCKET_NAME}Bucket",
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:ListBucket", "s3:PutObject", "s3:PutObjectAcl"],
      "Resource": ["arn:aws:s3:::{BUCKET_NAME}", "arn:aws:s3:::{BUCKET_NAME}/*"]
    }
  ]
}
\`\`\`

The \`Sid\` value is just an identifier for you to recognize the rule later. You can name it anything you like.

The policy needs to be separated into two parts, because the \`ListBucket\` action requires permissions on the bucket while the other actions require permissions on the objects in the bucket. When targeting the objects there's a trailing slash and an asterisk in the \`Resource\` parameter, whereas when the policy targets the bucket, the slash and the asterisk are omitted.

Please note that if you give the <dfn>Robot</dfn>'s \`acl\` parameter a value of \`"bucket-default"\`, then you do not need the \`"s3:PutObjectAcl"\` permission in your bucket policy.

In order to build proper result URLs we need to know the region in which your S3 bucket resides. For this we require the \`GetBucketLocation\` permission. Figuring out your bucket's region this way will also slow down your Assemblies. To make this much faster and to also not require the \`GetBucketLocation\` permission, we have added the \`bucket_region\` parameter to the /s3/store and /s3/import Robots. We recommend using them at all times.

Please keep in mind that if you use bucket encryption you may also need to add \`"sts:*"\` and \`"kms:*"\` to the bucket policy. Please read [here](https://docs.aws.amazon.com/kms/latest/developerguide/kms-api-permissions-reference.html) and [here](https://aws.amazon.com/blogs/security/how-to-restrict-amazon-s3-bucket-access-to-a-specific-iam-role/) in case you run into trouble with our example bucket policy.
`),
    path: z
      .string()
      .default('${unique_prefix}/${file.url_name}')
      .describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables). The path must not be a directory.
`),
    url_prefix: z
      .string()
      .default('http://{bucket}.s3.amazonaws.com/')
      .describe(`
The URL prefix used for the returned URL, such as \`"http://my.cdn.com/some/path/"\`.
`),
    acl: z
      .enum(['bucket-default', 'private', 'public', 'public-read'])
      .default('public-read')
      .describe(`
The permissions used for this file.

Please keep in mind that the default value \`"public-read"\` can lead to permission errors due to the \`"Block all public access"\` checkbox that is checked by default when creating a new Amazon S3 Bucket in the AWS console.
`),
    check_integrity: z
      .boolean()
      .default(false)
      .describe(`
Calculate and submit the file's checksum in order for S3 to verify its integrity after uploading, which can help with occasional file corruption issues.

Enabling this option adds to the overall execution time, as integrity checking can be CPU intensive, especially for larger files.
`),
    headers: z
      .record(z.string())
      .default({ 'Content-Type': '${file.mime}' })
      .describe(`
An object containing a list of headers to be set for this file on S3, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables). You can find a list of available headers [here](https://docs.aws.amazon.com/AmazonS3/latest/API/RESTObjectPUT.html).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    tags: z
      .record(z.string())
      .default({})
      .describe(`
Object tagging allows you to categorize storage. You can associate up to 10 tags with an object. Tags that are associated with an object must have unique tag keys.
`),
    host: z
      .string()
      .default('s3.amazonaws.com')
      .describe(`
The host of the storage service used. This only needs to be set when the storage service used is not Amazon S3, but has a compatible API (such as hosteurope.de). The default protocol used is HTTP, for anything else the protocol needs to be explicitly specified. For example, prefix the host with \`https://\` or \`s3://\` to use either respective protocol.
`),
    no_vhost: z
      .boolean()
      .default(false)
      .describe(`
Set to \`true\` if you use a custom host and run into access denied errors.
`),
    sign_urls_for: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(`
This parameter provides signed URLs in the result JSON (in the \`signed_url\` and \`signed_ssl_url\` properties). The number that you set this parameter to is the URL expiry time in seconds. If this parameter is not used, no URL signing is done.
`),
  })
  .strict()

export const robotS3StoreInstructionsWithHiddenFieldsSchema = robotS3StoreInstructionsSchema.extend(
  {
    result: z.union([z.literal('debug'), robotS3StoreInstructionsSchema.shape.result]).optional(),
    skip_region_lookup: z
      .boolean()
      .optional()
      .describe(`
Internal parameter to skip region lookup for testing purposes.
`),
  },
)

export type RobotS3StoreInstructions = z.infer<typeof robotS3StoreInstructionsSchema>
export type RobotS3StoreInstructionsInput = z.input<typeof robotS3StoreInstructionsSchema>
export type RobotS3StoreInstructionsWithHiddenFields = z.infer<
  typeof robotS3StoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotS3StoreInstructionsSchema = interpolateRobot(
  robotS3StoreInstructionsSchema,
)
export type InterpolatableRobotS3StoreInstructions = InterpolatableRobotS3StoreInstructionsInput

export type InterpolatableRobotS3StoreInstructionsInput = z.input<
  typeof interpolatableRobotS3StoreInstructionsSchema
>

export const interpolatableRobotS3StoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotS3StoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotS3StoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotS3StoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotS3StoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotS3StoreInstructionsWithHiddenFieldsSchema
>
