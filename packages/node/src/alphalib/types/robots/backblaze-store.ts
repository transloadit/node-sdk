import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  backblazeBase,
  createStorageStoreExample,
  defineRobot,
  robotBase,
  robotStoreMeta,
  robotUse,
  storePath,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/backblaze/store', 'YOUR_BACKBLAZE_CREDENTIALS'),
  example_code_description:
    'Export uploaded files to `my_target_folder` in a Backblaze B2 Cloud Storage bucket:',
  extended_description: `
## Access

Your Backblaze buckets need to have the \`listBuckets\` (to obtain a bucket ID from a bucket name), \`writeFiles\` and \`listFiles\` permissions.
`,
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to Backblaze',
  purpose_word: 'Backblaze',
  purpose_words: 'Export files to Backblaze',
  title: 'Export files to Backblaze',
  name: 'BackblazeStoreRobot',
}

export const robotBackblazeStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(backblazeBase)
  .extend({
    robot: z.literal('/backblaze/store'),
    path: storePath,
    headers: z
      .record(z.string())
      .default({})
      .describe(`
An object containing a list of headers to be set for this file in your Backblaze B2 Cloud Storage bucket, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

[Here](https://www.backblaze.com/b2/docs/b2_upload_file.html) you can find a list of available headers.

Object Metadata can be specified using \`X-Bz-Info-*\` headers.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotBackblazeStoreInstructionsSchema.shape> =
  defineRobot(meta, robotBackblazeStoreInstructionsSchema)

export const {
  withHiddenFields: robotBackblazeStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotBackblazeStoreInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotBackblazeStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotBackblazeStoreInstructions = Instructions['output']
export type RobotBackblazeStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotBackblazeStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotBackblazeStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotBackblazeStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotBackblazeStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
