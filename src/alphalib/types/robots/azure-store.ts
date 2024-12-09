import { z } from 'zod'

import { useParamSchema } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
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
  example_code_description: 'Export uploaded files to `my_target_folder` on Azure:',
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
}

export const robotAzureStoreInstructionsSchema = z
  .object({
    robot: z.literal('/azure/store'),
    use: useParamSchema,
    credentials: z.string().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your [Template Credentials](/c/template-credentials/) as this parameter's value. They will contain the values for your Azure Container, Account and Key.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"account"\`, \`"key"\`, \`"container"\`.
`),
    path: z.string().default('${unique_prefix}/${file.url_name}').describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    content_type: z.string().optional().describe(`
The content type with which to store the file. By default this will be guessed by Azure.
`),
    content_encoding: z.string().optional().describe(`
The content encoding with which to store the file. By default this will be guessed by Azure.
`),
    content_language: z.string().optional().describe(`
The content language with which to store the file. By default this will be guessed by Azure.
`),
    cache_control: z.string().optional().describe(`
The cache control header with which to store the file.
`),
    // TODO: verify if this is correct.
    metadata: z.record(z.string()).default({}).describe(`
A JavaScript object containing a list of metadata to be set for this file on Azure, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    sas_expires_in: z.number().int().min(0).optional().describe(`
Set this to a number to enable shared access signatures for your stored object. This reflects the number of seconds that the signature will be valid for once the object is stored. Enabling this will attach the shared access signature (SAS) to the result URL of your object.
`),
    sas_permissions: z
      .string()
      .regex(/^[rdw]+$/)
      .min(0)
      .max(3)
      .optional().describe(`
Set this to a combination of \`r\` (read), \`w\` (write) and \`d\` (delete) for your shared access signatures (SAS) permissions.
`),
  })
  .strict()

export type RobotAzureStoreInstructions = z.infer<typeof robotAzureStoreInstructionsSchema>
