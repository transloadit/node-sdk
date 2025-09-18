import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { azureBase, interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/azure/store',
        use: ':original',
        credentials: 'YOUR_AZURE_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: `Export uploaded files to \`my_target_folder\` on Azure:`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to Microsoft Azure',
  purpose_verb: 'export',
  purpose_word: 'Azure',
  purpose_words: 'Export files to Microsoft Azure',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Microsoft Azure',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'AzureStoreRobot',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotAzureStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(azureBase)
  .extend({
    robot: z.literal('/azure/store'),
    path: z
      .string()
      .default('${unique_prefix}/${file.url_name}')
      .describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    content_type: z
      .string()
      .optional()
      .describe(`
The content type with which to store the file. By default this will be guessed by Azure.
`),
    content_encoding: z
      .string()
      .optional()
      .describe(`
The content encoding with which to store the file. By default this will be guessed by Azure.
`),
    content_language: z
      .string()
      .optional()
      .describe(`
The content language with which to store the file. By default this will be guessed by Azure.
`),
    content_disposition: z
      .string()
      .optional()
      .describe(`
The content disposition with which to store the file. By default this will be guessed by Azure.
`),
    cache_control: z
      .string()
      .optional()
      .describe(`
The cache control header with which to store the file.
`),
    // TODO: verify if this is correct.
    metadata: z
      .record(z.string())
      .default({})
      .describe(`
A JavaScript object containing a list of metadata to be set for this file on Azure, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    sas_expires_in: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(`
Set this to a number to enable shared access signatures for your stored object. This reflects the number of seconds that the signature will be valid for once the object is stored. Enabling this will attach the shared access signature (SAS) to the result URL of your object.
`),
    sas_permissions: z
      .string()
      .regex(/^[rdw]+$/)
      .min(0)
      .max(3)
      .optional()
      .describe(`
Set this to a combination of \`r\` (read), \`w\` (write) and \`d\` (delete) for your shared access signatures (SAS) permissions.
`),
  })
  .strict()

export const robotAzureStoreInstructionsWithHiddenFieldsSchema =
  robotAzureStoreInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotAzureStoreInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotAzureStoreInstructions = z.infer<typeof robotAzureStoreInstructionsSchema>
export type RobotAzureStoreInstructionsWithHiddenFields = z.infer<
  typeof robotAzureStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotAzureStoreInstructionsSchema = interpolateRobot(
  robotAzureStoreInstructionsSchema,
)
export type InterpolatableRobotAzureStoreInstructions =
  InterpolatableRobotAzureStoreInstructionsInput

export type InterpolatableRobotAzureStoreInstructionsInput = z.input<
  typeof interpolatableRobotAzureStoreInstructionsSchema
>

export const interpolatableRobotAzureStoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotAzureStoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotAzureStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotAzureStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotAzureStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotAzureStoreInstructionsWithHiddenFieldsSchema
>
