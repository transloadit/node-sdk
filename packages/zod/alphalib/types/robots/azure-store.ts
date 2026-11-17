import { optionalWithV3Semantics } from '../../lib/sdkZodOptional.ts'

import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod/v4'

import {
  zodCodePointLength,
  zodInputPreservingTransform,
  zodWithJsonInputSchema,
} from '../../lib/zodInputSemantics.ts'
import {
  azureBase,
  createStorageStoreExample,
  defineRobotWithHiddenFields,
  robotBase,
  robotStoreMeta,
  robotUse,
  storePath,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createStorageStoreExample('/azure/store', 'YOUR_AZURE_CREDENTIALS'),
  example_code_description: 'Export uploaded files to `my_target_folder` on Azure:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to Microsoft Azure',
  purpose_word: 'Azure',
  purpose_words: 'Export files to Microsoft Azure',
  title: 'Export files to Microsoft Azure',
  name: 'AzureStoreRobot',
}

const azureStoreMetadataValueSchema = zodWithJsonInputSchema(
  zodInputPreservingTransform(z.union([z.string(), z.number(), z.boolean()]), String),
  z.union([z.string(), z.number().finite(), z.boolean()]),
)

export const robotAzureStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(azureBase)
  .extend({
    robot: z.literal('/azure/store'),
    path: storePath,
    content_type: optionalWithV3Semantics(z
      .string()
      )
      .describe(`
The content type with which to store the file. By default this will be guessed by Azure.
`),
    content_encoding: optionalWithV3Semantics(z
      .string()
      )
      .describe(`
The content encoding with which to store the file. By default this will be guessed by Azure.
`),
    content_language: optionalWithV3Semantics(z
      .string()
      )
      .describe(`
The content language with which to store the file. By default this will be guessed by Azure.
`),
    content_disposition: optionalWithV3Semantics(z
      .string()
      )
      .describe(`
The content disposition with which to store the file. By default this will be guessed by Azure.
`),
    cache_control: optionalWithV3Semantics(z
      .string()
      )
      .describe(`
The cache control header with which to store the file.
`),
    metadata: z
      .record(z.string(), azureStoreMetadataValueSchema)
      .default({})
      .describe(`
A JavaScript object containing a list of metadata to be set for this file on Azure, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    sas_expires_in: optionalWithV3Semantics(z
      .number()
      .int()
      .min(0)
      )
      .describe(`
Set this to a number to enable shared access signatures for your stored object. This reflects the number of seconds that the signature will be valid for once the object is stored. Enabling this will attach the shared access signature (SAS) to the result URL of your object.
`),
    sas_permissions: optionalWithV3Semantics(zodCodePointLength(z.string().regex(/^[rdw]+$/u), { max: 3 })
      )
      .describe(`
Set this to a combination of \`r\` (read), \`w\` (write) and \`d\` (delete) for your shared access signatures (SAS) permissions.
`),
  })
  .strict()

const hiddenFields = {
  upload_stack: optionalWithV3Semantics(z.enum(['v1', 'v2'])),
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotAzureStoreInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotAzureStoreInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotAzureStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotAzureStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotAzureStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotAzureStoreInstructions = Instructions['output']
export type RobotAzureStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotAzureStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotAzureStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotAzureStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotAzureStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
