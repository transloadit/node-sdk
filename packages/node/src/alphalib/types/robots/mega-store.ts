import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageStoreExample,
  defineRobot,
  megaBase,
  robotBase,
  robotStoreMeta,
  robotUse,
  signedSslUrlLifetime,
  storageAcl,
  storeFilePath,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/mega/store', 'YOUR_MEGA_CREDENTIALS'),
  example_code_description:
    'Export uploaded files to `my_target_folder` in a MEGA S4 Object Storage bucket:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to MEGA S4 Object Storage buckets',
  purpose_word: 'MEGA S4 Object Storage',
  purpose_words: 'Export files to MEGA S4 Object Storage',
  title: 'Export files to MEGA S4 Object Storage',
  name: 'MegaStoreRobot',
}

export const robotMegaStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(megaBase)
  .extend({
    robot: z.literal('/mega/store').describe(`
The URL to the result file will be returned in the <dfn>Assembly Status JSON</dfn>.
`),
    path: storeFilePath,
    acl: storageAcl,
    headers: z
      .record(z.string())
      .default({ 'Content-Type': '${file.mime}' })
      .describe(`
An object containing a list of headers to be set for this file in your MEGA S4 Object Storage bucket, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    sign_urls_for: signedSslUrlLifetime,
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotMegaStoreInstructionsSchema.shape> =
  defineRobot(meta, robotMegaStoreInstructionsSchema)

export const {
  withHiddenFields: robotMegaStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotMegaStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotMegaStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotMegaStoreInstructions = Instructions['output']
export type RobotMegaStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotMegaStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotMegaStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotMegaStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotMegaStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
