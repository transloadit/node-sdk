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
  storeFilePath,
  supabaseBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/supabase/store', 'YOUR_SUPABASE_CREDENTIALS'),
  example_code_description:
    'Export uploaded files to `my_target_folder` in a Supabase Storage bucket:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to Supabase Storage buckets',
  purpose_word: 'Supabase Storage',
  purpose_words: 'Export files to Supabase Storage',
  title: 'Export files to Supabase Storage',
  name: 'SupabaseStoreRobot',
}

export const robotSupabaseStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(supabaseBase)
  .extend({
    robot: z.literal('/supabase/store'),
    path: storeFilePath,
    headers: z
      .record(z.string())
      .default({ 'Content-Type': '${file.mime}' })
      .describe(`
An object containing a list of headers to be set for this file in your Supabase Storage bucket, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

Object Metadata can be specified using \`x-amz-meta-*\` headers. Note that these headers [do not support non-ASCII metadata values](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata).
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotSupabaseStoreInstructionsSchema.shape> =
  defineRobot(meta, robotSupabaseStoreInstructionsSchema)

export const {
  withHiddenFields: robotSupabaseStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotSupabaseStoreInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotSupabaseStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotSupabaseStoreInstructions = Instructions['output']
export type RobotSupabaseStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotSupabaseStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotSupabaseStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotSupabaseStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotSupabaseStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
