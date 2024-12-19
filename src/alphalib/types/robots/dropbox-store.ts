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
        robot: '/dropbox/store',
        use: ':original',
        credentials: 'YOUR_DROPBOX_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: 'Export uploaded files to `my_target_folder` on Dropbox:',
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to Dropbox',
  purpose_verb: 'export',
  purpose_word: 'Dropbox',
  purpose_words: 'Export files to Dropbox',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Dropbox',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotDropboxStoreInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/dropbox/store'),
    use: useParamSchema,
    credentials: z.string().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your access token. You can create your Dropbox Access Token [here](https://www.dropbox.com/developers/apps/create).

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the \`"access_token"\` parameter instead.
`),
    path: z.string().default('${unique_prefix}/${file.url_name}').describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    create_sharing_link: z.boolean().default(false).describe(`
Whether to create a URL to this file for sharing with other people. This will overwrite the file's \`"url"\` property.
`),
  })
  .strict()

export type RobotDropboxStoreInstructions = z.infer<typeof robotDropboxStoreInstructionsSchema>
export type RobotDropboxStoreInstructionsInput = z.input<typeof robotDropboxStoreInstructionsSchema>
