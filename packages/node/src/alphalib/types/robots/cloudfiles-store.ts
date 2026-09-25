import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  cloudfilesBase,
  createStorageStoreExample,
  defineRobot,
  robotBase,
  robotStoreMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/cloudfiles/store', 'YOUR_CLOUDFILES_CREDENTIALS'),
  example_code_description: 'Export uploaded files to `my_target_folder` on Rackspace Cloud Files:',
  extended_description: `
<a id="export-to-rackspace-cloudfiles" aria-hidden="true"></a>

## A note about URLs

If your container is CDN-enabled, the resulting \`file.url\` indicates the path to the file in your
CDN container, or is \`null\` otherwise.

The storage container URL for this file is always available via \`file.meta.storage_url\`.
`,
  purpose_sentence: 'exports encoding results to Rackspace Cloud Files',
  purpose_word: 'Rackspace Cloud Files',
  purpose_words: 'Export files to Rackspace Cloud Files',
  title: 'Export files to Rackspace Cloud Files',
  name: 'CloudfilesStoreRobot',
}

export const robotCloudfilesStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(cloudfilesBase)
  .extend({
    robot: z.literal('/cloudfiles/store'),
    path: z
      .string()
      .default('${unique_prefix}/${file.url_name}')
      .describe(`
The path at which to store the file. This value can also contain [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotCloudfilesStoreInstructionsSchema.shape> =
  defineRobot(meta, robotCloudfilesStoreInstructionsSchema)

export const {
  withHiddenFields: robotCloudfilesStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotCloudfilesStoreInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotCloudfilesStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotCloudfilesStoreInstructions = Instructions['output']
export type RobotCloudfilesStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotCloudfilesStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotCloudfilesStoreInstructionsInput =
  Instructions['interpolatableInput']
export type InterpolatableRobotCloudfilesStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotCloudfilesStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
