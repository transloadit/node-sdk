import { z } from 'zod'

import { useParamSchema } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  docs_redirect_from: ['/docs/export-to-youtube/'],
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
}

export const robotYoutubeStoreInstructionsSchema = z
  .object({
    robot: z.literal('/youtube/store'),
    use: useParamSchema,
    credentials: z.string().describe(`
The authentication Template credentials used for your YouTube account. You can generate them on the [Template Credentials page](/c/template-credentials/). Simply add the name of your YouTube channel, and you will be redirected to a Google verification page. Accept the presented permissions and you will be good to go.
`),
    title: z.string().max(80).describe(`
The title of the video to be displayed on YouTube.

Note that since the YouTube API requires titles to be within 80 characters, longer titles may be truncated.
`),
    description: z.string().describe(`
The description of the video to be displayed on YouTube. This can be up to 5000 characters, including \`\\n\` for new-lines.
`),
    category: z.enum([
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
    ]).describe(`
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

export type RobotYoutubeStoreInstructions = z.infer<typeof robotYoutubeStoreInstructionsSchema>
