import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { zodCaseInsensitiveEnum, zodCodePointLength } from '../../lib/zodInputSemantics.ts'
import { youtubeCategories } from '../../youtubeCategories.ts'
import {
  createProcessingExample,
  defineRobotWithHiddenFields,
  robotBase,
  robotStoreMeta,
  robotUse,
} from './_instructions-primitives.ts'

const youtubeCategoryValueSchema = z.enum(youtubeCategories)
// Preserve the existing SDK input type for this already-preprocessed field.
const youtubeCategorySchema: z.ZodEffects<
  typeof youtubeCategoryValueSchema,
  z.output<typeof youtubeCategoryValueSchema>,
  unknown
> = zodCaseInsensitiveEnum(youtubeCategoryValueSchema)

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  hideCredentialsWarning: true,
  example_code: createProcessingExample('exported', '/youtube/store', {
    credentials: 'YOUR_YOUTUBE_CREDENTIALS',
    title: 'Transloadit: Video Example',
    description: 'Some nice description',
    category: 'science & technology',
    keywords: 'transloadit, robots, botty',
    visibility: 'private',
  }),
  example_code_description: 'Export an uploaded video to YouTube and set some basic parameters:',
  purpose_sentence: 'exports encoding results to YouTube',
  purpose_word: 'YouTube',
  purpose_words: 'Export files to YouTube',
  title: 'Export files to YouTube',
  name: 'YoutubeStoreRobot',
}

export const robotYoutubeStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/youtube/store').describe(`
## Getting started

Since YouTube works with OAuth, you will need to generate [Template Credentials](/c/template-credentials/) to use this <dfn>Robot</dfn>.

To change the \`title\`, \`description\`, \`category\`, or \`keywords\` per video, we recommend to [inject variables into your Template](/docs/topics/templates/).

Note that this <dfn>Robot</dfn> only accepts videos.

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

If you encounter an error such as "The authenticated user doesn’t have permissions to upload and set custom video thumbnails", you should go to your YouTube account and try adding a custom thumbnail to one of your existing videos. You’ll be prompted to add your phone number. Once you’ve added it, the error should go away.
`),
    credentials: z.string().describe(`
The authentication Template credentials used for your YouTube account. You can generate them on the [Template Credentials page](/c/template-credentials/). Simply add the name of your YouTube channel, and you will be redirected to a Google verification page. Accept the presented permissions and you will be good to go.
`),
    title: zodCodePointLength(z.string(), { max: 80 }).describe(`
The title of the video to be displayed on YouTube.

Note that since the YouTube API requires titles to be within 80 characters, longer titles may be truncated.
`),
    description: z.string().describe(`
The description of the video to be displayed on YouTube. This can be up to 5000 characters, including \`\\n\` for new-lines.
`),
    category: youtubeCategorySchema.describe(`
The category to which this video will be assigned.
`),
    keywords: z.string().describe(`
Tags used to describe the video, separated by commas. These tags will also be displayed on YouTube.
`),
    visibility: z
      .enum(['public', 'private', 'unlisted'])
      .default('public')
      .describe(`
Defines the visibility of the uploaded video.
`),
  })
  .strict()

// Credential alternatives stay optional while Templates and Assembly overrides are merged.
// YoutubeStoreRobot validates the resolved tokens after credential injection.
const hiddenFields = {
  access_token: z.string().optional(),
  credentials: robotYoutubeStoreInstructionsSchema.shape.credentials.optional(),
  refresh_token: z.string().optional(),
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotYoutubeStoreInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotYoutubeStoreInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotYoutubeStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotYoutubeStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotYoutubeStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotYoutubeStoreInstructions = Instructions['output']
export type RobotYoutubeStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotYoutubeStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotYoutubeStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotYoutubeStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotYoutubeStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
