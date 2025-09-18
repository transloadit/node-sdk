import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse, vimeoBase } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/vimeo/store',
        use: ':original',
        credentials: 'YOUR_VIMEO_CREDENTIALS',
        title: 'Transloadit: Video Example',
        description: 'Some nice description',
      },
    },
  },
  example_code_description: 'Export an uploaded video to Vimeo and set its title and description:',
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to vimeo',
  purpose_verb: 'export',
  purpose_word: 'Vimeo',
  purpose_words: 'Export files to Vimeo',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Vimeo',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'VimeoStoreRobot',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotVimeoStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(vimeoBase)
  .extend({
    robot: z.literal('/vimeo/store'),
    title: z.string().describe(`
The title of the video to be displayed on Vimeo.
`),
    description: z.string().describe(`
The description of the video to be displayed on Vimeo.
`),
    acl: z
      .enum(['anybody', 'contacts', 'disable', 'nobody', 'password', 'unlisted', 'users'])
      .default('anybody')
      .describe(`
Controls access permissions for the video. Here are the valid values:

- \`"anybody"\` — anyone can access the video.
- \`"contacts"\` — only those who follow the owner on Vimeo can access the video.
- \`"disable"\` — the video is embeddable, but it's hidden on Vimeo and can't be played.
- \`"nobody"\` — no one except the owner can access the video.
- \`"password"\` — only those with the password can access the video.
- \`"unlisted"\` — only those with the private link can access the video.
- \`"users"\` — only Vimeo members can access the video.
`),
    password: z
      .string()
      .optional()
      .describe(`
The password to access the video if \`acl\` is \`"password"\`.
`),
    showcases: z
      .array(z.string())
      .default([])
      .describe(`
An array of string IDs of showcases that you want to add the video to. The IDs can be found when browsing Vimeo. For example \`https://vimeo.com/manage/showcases/[SHOWCASE_ID]/info\`.
`),
    downloadable: z
      .boolean()
      .default(false)
      .describe(`
Whether or not the video can be downloaded from the Vimeo website.

Only set this to \`true\` if you have unlocked this feature in your Vimeo accounting by upgrading to their "Pro" plan. If you use it while on their Freemium plan, the Vimeo API will return an \`"Invalid parameter supplied"\` error.
`),
    folder_id: z
      .string()
      .nullable()
      .default(null)
      .describe(`
The ID of the folder to which the video is uploaded.

When visiting one of your folders, the URL is similar to \`https://vimeo.com/manage/folders/xxxxxxxx\`. The folder_id would be \`"xxxxxxxx"\`.
`),
    folder_uri: z
      .string()
      .optional()
      .describe(`
Deprecated. Please use \`folder_id\` instead. The URI of the folder to which the video is uploaded.
`),
  })
  .strict()

export const robotVimeoStoreInstructionsWithHiddenFieldsSchema =
  robotVimeoStoreInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotVimeoStoreInstructionsSchema.shape.result])
      .optional(),
    access_token: z
      .string()
      .optional()
      .describe('Legacy authentication field. Use credentials instead.'),
  })

export type RobotVimeoStoreInstructions = z.infer<typeof robotVimeoStoreInstructionsSchema>
export type RobotVimeoStoreInstructionsWithHiddenFields = z.infer<
  typeof robotVimeoStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotVimeoStoreInstructionsSchema = interpolateRobot(
  robotVimeoStoreInstructionsSchema,
)
export type InterpolatableRobotVimeoStoreInstructions =
  InterpolatableRobotVimeoStoreInstructionsInput

export type InterpolatableRobotVimeoStoreInstructionsInput = z.input<
  typeof interpolatableRobotVimeoStoreInstructionsSchema
>

export const interpolatableRobotVimeoStoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotVimeoStoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotVimeoStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotVimeoStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotVimeoStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotVimeoStoreInstructionsWithHiddenFieldsSchema
>
