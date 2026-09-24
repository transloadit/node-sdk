import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageStoreExample,
  defineRobot,
  robotBase,
  robotStoreMeta,
  robotUse,
  storageAcl,
  storeFilePath,
  tigrisBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/tigris/store', 'YOUR_TIGRIS_CREDENTIALS'),
  example_code_description: 'Export uploaded files to `my_target_folder` on Tigris:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to Tigris buckets',
  purpose_word: 'Tigris',
  purpose_words: 'Export files to Tigris',
  title: 'Export files to Tigris',
  name: 'TigrisStoreRobot',
}

export const robotTigrisStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(tigrisBase)
  .extend({
    robot: z.literal('/tigris/store').describe(`
The URL to the result file will be returned in the <dfn>Assembly Status JSON</dfn>.
`),
    path: storeFilePath,
    acl: storageAcl,
    headers: z
      .record(z.string())
      .default({ 'Content-Type': '${file.mime}' })
      .describe(`
An object containing a list of headers to be set for this file on Tigris, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    sign_urls_for: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(`
This parameter provides signed URLs in the result JSON (in the \`signed_ssl_url\` property). The number that you set this parameter to is the URL expiry time in seconds.

If this parameter is not used, no URL signing is done.
`),
    bucket_region: z
      .string()
      .optional()
      .describe('The region of your Tigris bucket. This is optional as it can often be derived.'),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotTigrisStoreInstructionsSchema.shape> =
  defineRobot(meta, robotTigrisStoreInstructionsSchema)

export const {
  withHiddenFields: robotTigrisStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotTigrisStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotTigrisStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotTigrisStoreInstructions = Instructions['output']
export type RobotTigrisStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotTigrisStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotTigrisStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotTigrisStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotTigrisStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
