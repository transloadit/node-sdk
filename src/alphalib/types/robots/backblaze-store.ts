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
        robot: '/backblaze/store',
        use: ':original',
        credentials: 'YOUR_BACKBLAZE_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: 'Export uploaded files to `my_target_folder` on Backblaze:',
  extended_description: `
## Access

Your Backblaze buckets need to have the \`listBuckets\` (to obtain a bucket ID from a bucket name), \`writeFiles\` and \`listFiles\` permissions.
`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to Backblaze',
  purpose_verb: 'export',
  purpose_word: 'Backblaze',
  purpose_words: 'Export files to Backblaze',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Backblaze',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotBackblazeStoreInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/backblaze/store'),
    use: useParamSchema,
    credentials: z.string().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your Backblaze Bucket Name, App Key ID, and App Key.

To create your credential information, head over to Backblaze, sign in to your account, and select "Create a Bucket". Save the name of your bucket, and click on the "App Keys" tab, scroll to the bottom of the page then select “Add a New Application Key”. Allow access to your recently created bucket, select  “Read and Write” as your type of access, and tick the “Allow List All Bucket Names” option.

Now that everything is in place, create your key, and take note of the information you are given so you can input the information into your <dfn>Template Credentials</dfn>.

⚠️ Your App Key will only be viewable once, so make sure you note this down.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"app_key_id"\`, \`"app_key"\`.
`),
    path: z.string().default('${unique_prefix}/${file.url_name}').describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    headers: z.record(z.string()).default({}).describe(`
An object containing a list of headers to be set for this file on backblaze, such as \`{ FileURL: "\${file.url_name}" }\`. This can also include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).

[Here](https://www.backblaze.com/b2/docs/b2_upload_file.html) you can find a list of available headers.

Object Metadata can be specified using \`X-Bz-Info-*\` headers.
`),
  })
  .strict()

export type RobotBackblazeStoreInstructions = z.infer<typeof robotBackblazeStoreInstructionsSchema>
export type RobotBackblazeStoreInstructionsInput = z.input<
  typeof robotBackblazeStoreInstructionsSchema
>
