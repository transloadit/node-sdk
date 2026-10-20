import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  cloudflareBase,
  createStorageStoreExample,
  defineRobot,
  robotBase,
  robotStoreMeta,
  robotUse,
  signedSslUrlLifetime,
  storeFilePath,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/cloudflare/store', 'YOUR_CLOUDFLARE_CREDENTIALS'),
  example_code_description:
    'Export uploaded files to `my_target_folder` in a Cloudflare R2 bucket:',
  extended_description: `
The URL to the result file will be returned in the <dfn>Assembly Status JSON</dfn>.

## Temporary credentials and permissions

You can use [temporary R2 credentials](https://developers.cloudflare.com/r2/api/s3/temporary-credentials/) by supplying the matching temporary \`key\`, \`secret\`, and \`session_token\`. Use the temporary secret returned or derived with the token, not the parent secret used to mint it. These values can also be stored together in Cloudflare <dfn>Template Credentials</dfn>. For per-Assembly credentials, send all three from your trusted backend; do not expose the parent credentials in browser instructions.

Credentials must remain valid through queuing, processing, upload retries, and verification. The Robot does not refresh them. Signed download URLs cannot outlive the credentials that sign them, even when \`sign_urls_for\` is longer.

When overriding a stored \`key\` or \`secret\` with a different value, supply the matching \`session_token\` inline too; the stored token will not be inherited. When updating Cloudflare Template Credentials, replacing either key or secret without a new token removes the old token. Omitting the token retains it only when the key and secret stay unchanged. You can also explicitly remove it with an empty string or \`null\`; empty tokens are treated as absent on creation too.

For locally signed credentials using explicit R2 \`actions\`, grant \`PutObject\` for small uploads and \`HeadObject\` for the Robot’s mandatory signed HEAD verification. Uploads larger than the default 5 MiB part size use multipart requests: also grant \`CreateMultipartUpload\`, \`UploadPart\`, \`CompleteMultipartUpload\`, and \`AbortMultipartUpload\` for failed-upload cleanup. Grant \`GetObject\` if consumers will use signed download URLs. These are R2 action names, not AWS IAM policy actions.

Scope \`paths.objectPaths\` to the exact destination object key and set \`path\` to that same key. A path ending in \`/\` appends a generated filename and will not match an exact-object grant. Use one output per exact-object key to avoid overwrites. No bucket listing or region-discovery permission is needed.

Strictly write-only credentials cannot pass this Robot’s HEAD verification. For uploads without read verification, use [/s3/store](/docs/robots/s3-store/) with the R2 configuration documented there. A presigned PUT URL is a different credential format and cannot be used as this Robot’s \`host\`.
`,
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to Cloudflare R2 buckets',
  purpose_word: 'Cloudflare R2',
  purpose_words: 'Export files to Cloudflare R2',
  title: 'Export files to Cloudflare R2',
  name: 'CloudflareStoreRobot',
}

export const robotCloudflareStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(cloudflareBase)
  .extend({
    robot: z.literal('/cloudflare/store'),
    path: storeFilePath,
    session_token: z
      .string()
      .optional()
      .describe(`
The session token belonging to the temporary Cloudflare R2 access key ID and secret access key supplied for this upload. It can also be supplied inside Template Credentials. The credentials must remain valid through upload and signed HEAD verification; the Robot does not refresh them.
`),
    headers: z
      .record(z.string())
      .default({ 'Content-Type': '${file.mime}' })
      .describe(`
An object containing a list of headers to be set for this file in your Cloudflare R2 bucket, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    sign_urls_for: signedSslUrlLifetime,
    url_prefix: z
      .string()
      .optional()
      .describe(`
The URL prefix used for accessing files from your Cloudflare R2 bucket. This is typically the custom public URL access host set up in your Cloudflare account.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotCloudflareStoreInstructionsSchema.shape> =
  defineRobot(meta, robotCloudflareStoreInstructionsSchema)

export const {
  withHiddenFields: robotCloudflareStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotCloudflareStoreInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotCloudflareStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotCloudflareStoreInstructions = Instructions['output']
export type RobotCloudflareStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotCloudflareStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotCloudflareStoreInstructionsInput =
  Instructions['interpolatableInput']
export type InterpolatableRobotCloudflareStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotCloudflareStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
