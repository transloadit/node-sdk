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
