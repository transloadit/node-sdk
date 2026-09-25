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
  signedSslUrlLifetime,
  storeFilePath,
  wasabiBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/wasabi/store', 'YOUR_WASABI_CREDENTIALS'),
  example_code_description: 'Export uploaded files to `my_target_folder` on Wasabi:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to Wasabi buckets',
  purpose_word: 'Wasabi',
  purpose_words: 'Export files to Wasabi',
  title: 'Export files to Wasabi',
  name: 'WasabiStoreRobot',
}

export const robotWasabiStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(wasabiBase)
  .extend({
    robot: z.literal('/wasabi/store').describe(`
The URL to the result file will be returned in the <dfn>Assembly Status JSON</dfn>.
`),
    path: storeFilePath,
    acl: z
      .enum(['private', 'public-read'])
      // API2 already treats an omitted ACL as private; consumer copies follow after this source lands.
      .default('private')
      .describe(`
The permissions used for this file.
`),
    headers: z
      .record(z.string())
      .default({ 'Content-Type': '${file.mime}' })
      .describe(`
An object containing a list of headers to be set for this file in your Wasabi bucket, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    sign_urls_for: signedSslUrlLifetime,
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotWasabiStoreInstructionsSchema.shape> =
  defineRobot(meta, robotWasabiStoreInstructionsSchema)

export const {
  withHiddenFields: robotWasabiStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotWasabiStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotWasabiStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotWasabiStoreInstructions = Instructions['output']
export type RobotWasabiStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotWasabiStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotWasabiStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotWasabiStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotWasabiStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
