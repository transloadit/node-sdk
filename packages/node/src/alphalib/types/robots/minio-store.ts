import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createStorageStoreExample,
  defineRobot,
  minioBase,
  robotBase,
  robotStoreMeta,
  robotUse,
  storageAcl,
  storeFilePath,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/minio/store', 'YOUR_MINIO_CREDENTIALS'),
  example_code_description: 'Export uploaded files to `my_target_folder` in a MinIO bucket:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to MinIO buckets',
  purpose_word: 'MinIO',
  purpose_words: 'Export files to MinIO',
  title: 'Export files to MinIO',
  name: 'MinioStoreRobot',
}

export const robotMinioStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(minioBase)
  .extend({
    robot: z.literal('/minio/store').describe(`
The URL to the result file will be returned in the <dfn>Assembly Status JSON</dfn>.
`),
    path: storeFilePath,
    acl: storageAcl,
    headers: z
      .record(z.string())
      .default({ 'Content-Type': '${file.mime}' })
      .describe(`
An object containing a list of headers to be set for this file in your MinIO bucket, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

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
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotMinioStoreInstructionsSchema.shape> =
  defineRobot(meta, robotMinioStoreInstructionsSchema)

export const {
  withHiddenFields: robotMinioStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotMinioStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotMinioStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotMinioStoreInstructions = Instructions['output']
export type RobotMinioStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotMinioStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotMinioStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotMinioStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotMinioStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
