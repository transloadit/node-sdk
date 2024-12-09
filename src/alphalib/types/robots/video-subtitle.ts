import { z } from 'zod'

import {
  color_with_alpha,
  ffmpegParamSchema,
  ffmpegStackVersionSchema,
  outputMetaParamSchema,
  positionSchema,
  preset,
  useParamSchema,
} from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_free_plans: true,
  allowed_for_url_transform: false,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      subtitled: {
        robot: '/video/subtitle',
        use: {
          steps: [
            { name: ':original', fields: 'input_video', as: 'video' },
            { name: ':original', fields: 'input_srt', as: 'subtitles' },
          ],
        },
        // @ts-expect-error Discuss and resolve interpolation.
        ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
      },
    },
  },
  example_code_description:
    'If you have two file input fields in a form — one for a video and another for an SRT or VTT subtitle, named `input_video` and `input_srt` respectively (with the HTML `name` attribute), hereʼs how to embed the subtitles into the video with Transloadit:',
  minimum_charge: 0,
  old_title: 'The /video/subtitle Robot',
  output_factor: 0.6,
  override_lvl1: 'Video Encoding',
  purpose_sentence: 'adds subtitles and closed captions to videos',
  purpose_verb: 'subtitle',
  purpose_word: 'subtitle',
  purpose_words: 'Add subtitles to videos',
  service_slug: 'video-encoding',
  slot_count: 60,
  title: 'Add subtitles to videos',
  typical_file_size_mb: 80,
  typical_file_type: 'video',
}

export const robotVideoSubtitleInstructionsSchema = z
  .object({
    robot: z.literal('/video/subtitle'),
    use: useParamSchema,
    output_meta: outputMetaParamSchema,
    preset: preset.default('empty').describe(`
Performs conversion using pre-configured settings. By default, no settings are applied and the original settings of the video are preserved.

For a list of video presets, see [video presets](/docs/transcoding/video-encoding/video-presets/).
`),
    subtitles_type: z.enum(['burn', 'external']).default('external').describe(`
Determines if subtitles are added as a separate stream to the video (value \`"external"\`) that then can be switched on and off in your video player, or if they should be burned directly into the video (value \`"burn"\`) so that they become part of the video stream.
`),
    border_style: z.enum(['box', 'outline', 'shadow']).default('outline').describe(`
Specifies the style of the subtitle. Use the \`border_color\` parameter to specify the color of the border.
`),
    border_color: color_with_alpha.default('40000000').describe(`
The color for the subtitle border. The first two hex digits specify the alpha value of the color.
`),
    // TODO: Make font an enum
    font: z.string().default('Arial').describe(`
The font family to use. Also includes boldness and style of the font.

[Here](/docs/supported-formats/fonts/) is a list of all supported fonts.
`),
    font_color: color_with_alpha.default('00FFFFFF').describe(`
The color of the subtitle text. The first two hex digits specify the alpha value of the color.
`),
    font_size: z.number().int().min(1).default(16).describe(`
Specifies the size of the text.
`),
    position: positionSchema.default('bottom').describe(`
Specifies the position of the subtitles.
`),
    ffmpeg_stack: ffmpegStackVersionSchema.optional(),
    ffmpeg: ffmpegParamSchema,
  })
  .strict()
export type RobotVideoSubtitleInstructions = z.infer<typeof robotVideoSubtitleInstructionsSchema>
