import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageStoreExample,
  defineRobotWithHiddenFields,
  robotBase,
  robotStoreMeta,
  robotUse,
  s3Base,
  storeFilePath,
} from './_instructions-primitives.ts'

const s3StoreAclSchema = z
  .enum(['bucket-default', 'private', 'public', 'public-read'])
  .default('public-read')

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/s3/store', 'YOUR_AWS_CREDENTIALS'),
  example_code_description: 'Export uploaded files to `my_target_folder` in an S3 bucket:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to Amazon S3',
  purpose_word: 'Amazon S3',
  purpose_words: 'Export files to Amazon S3',
  title: 'Export files to Amazon S3',
  name: 'S3StoreRobot',
  priceFactor: 10,
  queueSlotCount: 2,
}

export const robotS3StoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(s3Base)
  .extend({
    // URL rewriting does not fix bucket addressing, and custom paths need not use file.url_name.
    // Keep the bucket warning separate from the old blanket filename-sanitization claim.
    robot: z.literal('/s3/store').describe(`
If you are new to Amazon S3, see our tutorial on [using your own S3 bucket](/docs/faq/how-to-set-up-an-amazon-s3-bucket/).

The URL to the result file in your S3 bucket will be returned in the <dfn>Assembly Status JSON</dfn>. A returned URL does not make a private object public or grant read access. If your S3 bucket has versioning enabled, the version ID of the file will be returned within \`meta.version_id\`.

> [!Warning]
> **Configure private buckets explicitly.** The Robot’s default \`acl\` is still \`"${s3StoreAclSchema.parse(undefined)}"\`. For a private bucket, set \`acl: "bucket-default"\` and do not supply ACL or grant headers. This omits the generated ACL header and works with [Bucket owner enforced Object Ownership](https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html), where ACLs are disabled. Keep S3 Block Public Access enabled. Setting \`acl: "private"\` still sends an ACL and is not equivalent to omitting it.

> [!Warning]
> **Use DNS-compliant bucket names.** Follow AWS’s [bucket naming rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html). The \`url_prefix\` parameter changes returned URLs; it does not change the bucket or its access permissions.

<span id="minimum-s3-iam-permissions" aria-hidden="true"></span>

## Limit access

Use a dedicated AWS identity with access limited to the destination bucket and object prefix. Do not use [AWS root access keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html). Store its access key ID, secret access key, bucket name and region as \`key\`, \`secret\`, \`bucket\` and \`bucket_region\` in <dfn>Template Credentials</dfn>, then reference their name with \`credentials\`. Trusted backend integrations can instead supply those parameters directly; do not expose AWS secrets in browser instructions.

The following is an [identity-based IAM policy](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html), attached to that dedicated identity, not a bucket policy. It intentionally has no \`Principal\`. Replace \`{BUCKET_NAME}\` and use a Robot \`path\` beginning with \`uploads/\`, or adapt both the policy prefix and the path together.

This example covers uploads and failed multipart-upload cleanup with an explicit \`bucket_region\`, \`acl: "bucket-default"\`, no ACL/grant headers, no tags and S3-managed encryption (SSE-S3). Existing bucket policies, organization controls or endpoint policies can still deny access.

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "UploadAndAbortWithinPrefix",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:AbortMultipartUpload"],
      "Resource": "arn:aws:s3:::{BUCKET_NAME}/uploads/*"
    }
  ]
}
\`\`\`

The uploader uses either \`PutObject\` or \`CreateMultipartUpload\`, \`UploadPart\` and \`CompleteMultipartUpload\`; failed multipart uploads can trigger \`AbortMultipartUpload\`. AWS maps the successful upload operations to \`s3:PutObject\`. Write access can **overwrite an existing object key**; it is not add-only. Choose unique object paths and consider versioning for recovery.

Add permissions only for features you use, following AWS’s [operation permission reference](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html):

- Without an explicit \`bucket_region\`, region discovery can require \`s3:GetBucketLocation\` and fallback \`s3:ListBucket\` on the bucket ARN, \`arn:aws:s3:::{BUCKET_NAME}\`, without an object suffix. Supplying the correct region avoids these discovery requests.
- ACL or grant headers require \`s3:PutObjectAcl\`; tags require \`s3:PutObjectTagging\` on the allowed object prefix. \`bucket-default\` does not remove ACL/grant headers you supply in \`headers\`.
- Downloading private results requires separate read authorization. Even a URL generated with \`sign_urls_for\` needs the signing identity to have the appropriate read permissions.

S3 applies its [bucket encryption configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-bucket-encryption.html) when no encryption override is sent. You can request SSE-KMS through \`headers\`, using \`x-amz-server-side-encryption: aws:kms\` and \`x-amz-server-side-encryption-aws-kms-key-id\`. When either bucket default encryption or request headers select [SSE-KMS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html), the uploading identity needs \`kms:GenerateDataKey\` on the relevant key, plus \`kms:Decrypt\` for multipart uploads. For a customer-managed key, grant these permissions with a compatible KMS key policy; the base S3 policy above does not include them. Do not add blanket \`kms:*\` or \`sts:*\` grants.

Short-lived AWS credentials are a matching set of \`key\`, \`secret\` and \`session_token\`. Have a trusted backend obtain and refresh all three, then supply them together when it creates the Assembly. It can pass them directly in Robot instructions or save and update them together through the [Template Credentials API](/docs/api/template-credentials-post/). Keep all three out of browser instructions; replacing only the session token does not refresh expired access keys. This Robot passes the supplied credentials to S3; it does not assume a role or refresh expired credentials. Keep temporary credentials valid for the upload.
`),
    path: storeFilePath,
    url_prefix: z
      .string()
      .default('http://{bucket}.s3.amazonaws.com/')
      .describe(`
The URL prefix used for the returned URL, such as \`"http://my.cdn.com/some/path/"\`.
`),
    acl: s3StoreAclSchema.describe(`
The ACL used for this file. The default remains \`"${s3StoreAclSchema.parse(undefined)}"\`, which can conflict with S3 Block Public Access and disabled ACLs. For modern private buckets, explicitly set \`"bucket-default"\` to omit the generated ACL header, and do not supply ACL/grant headers in \`headers\`. \`"private"\` still sends an ACL.
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
    session_token: z
      .string()
      .optional()
      .describe(`
The session token belonging to the temporary AWS access key ID and secret access key supplied for this upload. The Robot does not assume a role or refresh these credentials; they must remain valid for the upload.
`),
  })
  .strict()

const hiddenFields = {
  skip_region_lookup: z
    .boolean()
    .optional()
    .describe(`
Internal parameter to skip region lookup for testing purposes.
`),
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotS3StoreInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotS3StoreInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotS3StoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotS3StoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotS3StoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotS3StoreInstructions = Instructions['output']
export type RobotS3StoreInstructionsInput = Instructions['input']
export type RobotS3StoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotS3StoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotS3StoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotS3StoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotS3StoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
