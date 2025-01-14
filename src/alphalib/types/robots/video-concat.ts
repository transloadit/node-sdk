import { z } from 'zod'

import {
  ffmpegParamSchema,
  ffmpegStackVersionSchema,
  outputMetaParamSchema,
  preset,
  useParamSchema,
} from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: false,
  bytescount: 4,
  discount_factor: 0.25,
  discount_pct: 75,
  example_code: {
    steps: {
      concatenated: {
        robot: '/video/concat',
        use: {
          steps: [
            { name: ':original', fields: 'first_video_file', as: 'video_1' },
            { name: ':original', fields: 'second_video_file', as: 'video_2' },
            { name: ':original', fields: 'third_video_file', as: 'video_3' },
          ],
        },
      },
    },
  },
  example_code_description:
    'If you have a form with 3 file input fields and want to concatenate the uploaded videos in a specific order, instruct Transloadit using the `name` attribute of each input field. Use this attribute as the value for the `fields` key in the JSON, and set `as` to `video_[[index]]`. Transloadit will concatenate the files based on the ascending index order:',
  minimum_charge: 0,
  output_factor: 0.6,
  override_lvl1: 'Video Encoding',
  purpose_sentence: 'concatenates several videos together',
  purpose_verb: 'concatenate',
  purpose_word: 'concatenate',
  purpose_words: 'Concatenate videos',
  service_slug: 'video-encoding',
  slot_count: 60,
  title: 'Concatenate videos',
  typical_file_size_mb: 80,
  typical_file_type: 'video',
}

export const robotVideoConcatInstructionsSchema = z
  .object({
    robot: z.literal('/video/concat').describe(`
**Warning:** All videos you concatenate must have the same dimensions (width and height) and the same streams (audio and video streams), otherwise you will run into errors. If your videos donʼt have the desired dimensions when passing them to [🤖/video/concat](/docs/transcoding/video-encoding/video-concat/), encode them first with [🤖/video/encode](/docs/transcoding/video-encoding/video-encode/). [{.alert .alert-warning}]

Itʼs possible to concatenate a virtually infinite number of video files using [🤖/video/concat](/docs/transcoding/video-encoding/video-concat/).
`),
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    use: useParamSchema,
    output_meta: outputMetaParamSchema,
    preset: preset.default('flash').optional().describe(`
Performs conversion using pre-configured settings.

If you specify your own FFmpeg parameters using the <dfn>Robot</dfn>'s \`ffmpeg\` parameter and you have not specified a preset, then the default \`"flash"\` preset is not applied. This is to prevent you from having to override each of the flash preset's values manually.

For a list of video presets, see [video presets](/docs/transcoding/video-encoding/video-presets/).
`),
    video_fade_seconds: z.number().default(1).describe(`
When used this adds a video fade in and out effect between each section of your concatenated video. The float value is used so if you want a video delay effect of 500 milliseconds between each video section you would select \`0.5\`, however, integer values can also be represented.

This parameter does not add a video fade effect at the beginning or end of your video. If you want to do so, create an additional [🤖/video/encode](/docs/transcoding/video-encoding/video-presets/) Step and use our \`ffmpeg\` parameter as shown in this [demo](/demos/video-encoding/concatenate-fade-effect/).

Please note this parameter is independent of adding audio fades between sections.
`),
    audio_fade_seconds: z.number().default(1).describe(`
When used this adds an audio fade in and out effect between each section of your concatenated video. The float value is used so if you want an audio delay effect of 500 milliseconds between each video section you would select \`0.5\`, however, integer values can also be represented.

This parameter does not add an audio fade effect at the beginning or end of your video. If you want to do so, create an additional [🤖/video/encode](/docs/transcoding/video-encoding/video-presets/) Step and use our \`ffmpeg\` parameter as shown in this [demo](/demos/audio-encoding/ffmpeg-fade-in-and-out/).

Please note this parameter is independent of adding video fades between sections.
`),
    ffmpeg_stack: ffmpegStackVersionSchema.optional(),
    ffmpeg: ffmpegParamSchema.optional(),
  })
  .strict()

export type RobotVideoConcatInstructions = z.infer<typeof robotVideoConcatInstructionsSchema>
