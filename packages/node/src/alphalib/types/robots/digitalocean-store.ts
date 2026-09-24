import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageStoreExample,
  defineRobot,
  digitalOceanBase,
  robotBase,
  robotStoreMeta,
  robotUse,
  signedSslUrlLifetime,
  storageAcl,
  storeFilePath,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/digitalocean/store', 'YOUR_DIGITALOCEAN_CREDENTIALS'),
  example_code_description: 'Export uploaded files to `my_target_folder` on DigitalOcean Spaces:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to DigitalOcean Spaces',
  purpose_word: 'DigitalOcean Spaces',
  purpose_words: 'Export files to DigitalOcean Spaces',
  title: 'Export files to DigitalOcean Spaces',
  name: 'DigitalOceanStoreRobot',
}

export const robotDigitaloceanStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(digitalOceanBase)
  .extend({
    robot: z.literal('/digitalocean/store'),
    path: storeFilePath,
    url_prefix: z
      .string()
      .default('https://{space}.{region}.digitaloceanspaces.com/')
      .describe(`
The URL prefix used for the returned URL, such as \`"https://my.cdn.com/some/path"\`.
`),
    acl: storageAcl,
    headers: z
      .record(z.string())
      .default({ 'Content-Type': '${file.mime}' })
      .describe(`
An object containing a list of headers to be set for this file on DigitalOcean Spaces, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

[Here](https://developers.digitalocean.com/documentation/spaces/#object) you can find a list of available headers.

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
    sign_urls_for: signedSslUrlLifetime,
  })
  .strict()

export const robotDefinition: RobotDefinition<
  typeof robotDigitaloceanStoreInstructionsSchema.shape
> = defineRobot(meta, robotDigitaloceanStoreInstructionsSchema)

export const {
  withHiddenFields: robotDigitaloceanStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotDigitaloceanStoreInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotDigitaloceanStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotDigitaloceanStoreInstructions = Instructions['output']
export type RobotDigitaloceanStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotDigitaloceanStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotDigitaloceanStoreInstructionsInput =
  Instructions['interpolatableInput']
export type InterpolatableRobotDigitaloceanStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotDigitaloceanStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
