import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { googleBase, interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/google/store',
        use: ':original',
        credentials: 'YOUR_GOOGLE_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: `Export uploaded files to \`my_target_folder\` on Google Storage:`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to Google Storage',
  purpose_verb: 'export',
  purpose_word: 'Google Storage',
  purpose_words: 'Export files to Google Storage',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Google Storage',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'GoogleStoreRobot',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotGoogleStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(googleBase)
  .extend({
    robot: z.literal('/google/store').describe(`
The URL to the exported file in your Google bucket will be presented in the Transloadit <dfn>Assembly Status</dfn> JSON. This <dfn>Robot</dfn> can also be used to export encoded files to Google's Firebase as demonstrated in [this blogpost](/blog/2018/12/2h-youtube-clone/).
`),
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    credentials: z.string().describe(`
Create a new [Google service account](https://cloud.google.com/storage/docs/authentication). Set its role to "Storage Object Creator". Choose "JSON" for the key file format and download it to your computer. You will need to upload this file when creating your <dfn>Template Credentials</dfn>.

Go back to your Google credentials project and enable the "Google Cloud Storage JSON API" for it. Wait around ten minutes for the action to propagate through the Google network. Grab the project ID from the dropdown menu in the header bar on the Google site. You will also need it later on.

Now you can set up the \`storage.objects.create\` and \`storage.objects.delete\` permissions. The latter is optional and only required if you intend to overwrite existing paths.

To do this from the Google Cloud console, navigate to "IAM &amp; Admin" and select "Roles". From here, click "Create Role", enter a name, set the role launch stage to _General availability,_ and set the permissions stated above.

Next, go to Storage browser and select the ellipsis on your bucket to edit bucket permissions. From here, select "Add Member", enter your service account as a new member, and select your newly created role.

Then, create your associated [Template Credentials](/c/template-credentials/) in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value.
`),
    path: z
      .string()
      .default('${unique_prefix}/${file.url_name}')
      .describe(`
The path at which the file is to be stored. This may include any available [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    acl: z
      .enum([
        'authenticated-read',
        'bucket-owner-full-control',
        'private',
        'project-private',
        'public-read',
      ])
      .nullable()
      .default('public-read')
      .describe(`
The permissions used for this file.
`),
    cache_control: z
      .string()
      .optional()
      .describe(`
The \`Cache-Control\` header determines how long browsers are allowed to cache your object for. Values specified with this parameter will be added to the object's metadata under the \`Cache-Control\` header. For more information on valid values, take a look at the [official Google documentation](https://cloud.google.com/storage/docs/metadata#cache-control).
`),
    url_template: z
      .string()
      .default('https://{HOST}/{PATH}')
      .describe(`
The URL of the file in the result JSON. This may include any of the following supported [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
    ssl_url_template: z
      .string()
      .default('https://{HOST}/{PATH}')
      .describe(`
The SSL URL of the file in the result JSON. The following [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables) are supported.
`),
  })
  .strict()

export const robotGoogleStoreInstructionsWithHiddenFieldsSchema =
  robotGoogleStoreInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotGoogleStoreInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotGoogleStoreInstructions = z.infer<typeof robotGoogleStoreInstructionsSchema>
export type RobotGoogleStoreInstructionsWithHiddenFields = z.infer<
  typeof robotGoogleStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotGoogleStoreInstructionsSchema = interpolateRobot(
  robotGoogleStoreInstructionsSchema,
)
export type InterpolatableRobotGoogleStoreInstructions =
  InterpolatableRobotGoogleStoreInstructionsInput

export type InterpolatableRobotGoogleStoreInstructionsInput = z.input<
  typeof interpolatableRobotGoogleStoreInstructionsSchema
>

export const interpolatableRobotGoogleStoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotGoogleStoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotGoogleStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotGoogleStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotGoogleStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotGoogleStoreInstructionsWithHiddenFieldsSchema
>
