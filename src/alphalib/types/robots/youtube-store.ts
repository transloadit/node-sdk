import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  example_code: {
    steps: {
      exported: {
        robot: '/youtube/store',
        use: ':original',
        credentials: 'YOUR_YOUTUBE_CREDENTIALS',
        title: 'Transloadit: Video Example',
        description: 'Some nice description',
        category: 'science & technology',
        keywords: 'transloadit, robots, botty',
        visibility: 'private',
      },
    },
  },
  example_code_description: 'Export an uploaded video to YouTube and set some basic parameters:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to YouTube',
  purpose_verb: 'export',
  purpose_word: 'YouTube',
  purpose_words: 'Export files to YouTube',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to YouTube',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'YoutubeStoreRobot',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotYoutubeStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/youtube/store').describe(`
> [!Note]
> This <dfn>Robot</dfn> only accepts videos.

## Installation

Since YouTube works with OAuth, you will need to generate [Template Credentials](/c/template-credentials/) to use this <dfn>Robot</dfn>.

To change the \`title\`, \`description\`, \`category\`, or \`keywords\` per video, we recommend to [inject variables into your Template](/docs/topics/templates/).

## Adding a thumbnail image to your video

You can add a custom thumbnail to your video on YouTube by using our \`"as"\` syntax for the \`"use"\` parameter to supply both a video and an image to the step:

\`\`\`json
"exported": {
  "use": [
    { "name": "video_encode_step", "as": "video" },
    { "name": "image_resize_step", "as": "image" },
  ],
  ...
},
\`\`\`

If you encounter an error such as "The authenticated user doesnʼt have permissions to upload and set custom video thumbnails", you should go to your YouTube account and try adding a custom thumbnail to one of your existing videos. Youʼll be prompted to add your phone number. Once youʼve added it, the error should go away.
`),
    credentials: z.string().describe(`
The authentication Template credentials used for your YouTube account. You can generate them on the [Template Credentials page](/c/template-credentials/). Simply add the name of your YouTube channel, and you will be redirected to a Google verification page. Accept the presented permissions and you will be good to go.
`),
    title: z
      .string()
      .max(80)
      .describe(`
The title of the video to be displayed on YouTube.

Note that since the YouTube API requires titles to be within 80 characters, longer titles may be truncated.
`),
    description: z.string().describe(`
The description of the video to be displayed on YouTube. This can be up to 5000 characters, including \`\\n\` for new-lines.
`),
    category: z
      .preprocess(
        (val) => (typeof val === 'string' ? val.toLowerCase() : val),
        z.enum([
          'autos & vehicles',
          'comedy',
          'education',
          'entertainment',
          'film & animation',
          'gaming',
          'howto & style',
          'music',
          'news & politics',
          'people & blogs',
          'pets & animals',
          'science & technology',
          'sports',
          'travel & events',
        ]),
      )
      .describe(`
The category to which this video will be assigned.
`),
    keywords: z.string().describe(`
Tags used to describe the video, separated by commas. These tags will also be displayed on YouTube.
`),
    visibility: z.enum(['public', 'private', 'unlisted']).describe(`
Defines the visibility of the uploaded video.
`),
  })
  .strict()

export const robotYoutubeStoreInstructionsWithHiddenFieldsSchema =
  robotYoutubeStoreInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotYoutubeStoreInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotYoutubeStoreInstructions = z.infer<typeof robotYoutubeStoreInstructionsSchema>
export type RobotYoutubeStoreInstructionsWithHiddenFields = z.infer<
  typeof robotYoutubeStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotYoutubeStoreInstructionsSchema = interpolateRobot(
  robotYoutubeStoreInstructionsSchema,
)
export type InterpolatableRobotYoutubeStoreInstructions =
  InterpolatableRobotYoutubeStoreInstructionsInput

export type InterpolatableRobotYoutubeStoreInstructionsInput = z.input<
  typeof interpolatableRobotYoutubeStoreInstructionsSchema
>

export const interpolatableRobotYoutubeStoreInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotYoutubeStoreInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotYoutubeStoreInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotYoutubeStoreInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotYoutubeStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotYoutubeStoreInstructionsWithHiddenFieldsSchema
>
