import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createProcessingExample,
  defineRobotWithHiddenFields,
  robotBase,
  robotStoreMeta,
  robotUse,
  vimeoBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  hideCredentialsWarning: true,
  example_code: createProcessingExample('exported', '/vimeo/store', {
    credentials: 'YOUR_VIMEO_CREDENTIALS',
    title: 'Transloadit: Video Example',
    description: 'Some nice description',
  }),
  example_code_description: 'Export an uploaded video to Vimeo and set its title and description:',
  has_small_icon: true,
  purpose_sentence: 'exports encoding results to Vimeo',
  purpose_word: 'Vimeo',
  purpose_words: 'Export files to Vimeo',
  title: 'Export files to Vimeo',
  name: 'VimeoStoreRobot',
}

export const robotVimeoStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(vimeoBase)
  .extend({
    robot: z.literal('/vimeo/store').describe(`
## Getting started

Since Vimeo works with OAuth, you will need to generate [Template Credentials](https://transloadit.com/c/template-credentials/) to use this <dfn>Robot</dfn>.

To change the \`title\` or \`description\` per video, we recommend to [inject variables into your Template](/docs/topics/templates/).

> [!Warning]
> Vimeo's API limits the number of concurrent uploads per minute based on your Vimeo account plan. To see how many videos can be uploaded at once based on your plan, click the following [link](https://developer.vimeo.com/guidelines/rate-limiting#table-1).

Note that this <dfn>Robot</dfn> only accepts videos.
`),
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

const hiddenFields = {
  access_token: z
    .string()
    .optional()
    .describe('Legacy authentication field. Use credentials instead.'),
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotVimeoStoreInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotVimeoStoreInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotVimeoStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotVimeoStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotVimeoStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotVimeoStoreInstructions = Instructions['output']
export type RobotVimeoStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotVimeoStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotVimeoStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotVimeoStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotVimeoStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
