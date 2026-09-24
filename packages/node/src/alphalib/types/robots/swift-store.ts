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
  storageAcl,
  storeFilePath,
  swiftBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/swift/store', 'YOUR_SWIFT_CREDENTIALS'),
  example_code_description:
    'Export uploaded files to `my_target_folder` in an OpenStack Swift container:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to OpenStack Swift containers',
  purpose_word: 'OpenStack Swift',
  purpose_words: 'Export files to OpenStack Swift',
  title: 'Export files to OpenStack Swift',
  name: 'SwiftStoreRobot',
}

export const robotSwiftStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(swiftBase)
  .extend({
    robot: z.literal('/swift/store').describe(`
The URL to the result file in your OpenStack Swift container will be returned in the <dfn>Assembly Status JSON</dfn>.`),
    path: storeFilePath,
    acl: storageAcl,
    headers: z
      .record(z.string())
      .default({ 'Content-Type': '${file.mime}' })
      .describe(`
An object containing a list of headers to be set for this file in your OpenStack Swift container, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    sign_urls_for: signedSslUrlLifetime,
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotSwiftStoreInstructionsSchema.shape> =
  defineRobot(meta, robotSwiftStoreInstructionsSchema)

export const {
  withHiddenFields: robotSwiftStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotSwiftStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotSwiftStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotSwiftStoreInstructions = Instructions['output']
export type RobotSwiftStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotSwiftStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotSwiftStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotSwiftStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotSwiftStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
