import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  color_with_alpha,
  color_without_alpha,
  interpolateRobot,
  positionSchema,
  robotBase,
  robotFFmpegVideo,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
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
            {
              name: ':original',
              fields: 'input_video',
              as: 'video',
            },
            {
              name: ':original',
              fields: 'input_srt',
              as: 'subtitles',
            },
          ],
        },
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
    },
  },
  example_code_description: `If you have two file input fields in a form — one for a video and another for an SRT or VTT subtitle, named \`input_video\` and \`input_srt\` respectively (with the HTML \`name\` attribute), hereʼs how to embed the subtitles into the video with Transloadit:`,
  minimum_charge: 0,
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
  uses_tools: ['ffmpeg'],
  name: 'VideoSubtitleRobot',
  priceFactor: 1,
  queueSlotCount: 60,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotVideoSubtitleInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegVideo)
  .extend({
    robot: z.literal('/video/subtitle').describe(`
This <dfn>Robot</dfn> supports both SRT and VTT subtitle files.
`),
    subtitles_type: z
      .enum(['burned', 'external', 'burn'])
      .transform((val) => (val === 'burn' ? 'burned' : val))
      .default('external')
      .describe(`
Determines if subtitles are added as a separate stream to the video (value \`"external"\`) that then can be switched on and off in your video player, or if they should be burned directly into the video (value \`"burned"\` or \`"burn"\`) so that they become part of the video stream.
`),
    border_style: z
      .enum(['box', 'outline', 'shadow'])
      .default('outline')
      .describe(`
Specifies the style of the subtitle. Use the \`border_color\` parameter to specify the color of the border.
`),
    border_color: color_with_alpha.default('40000000').describe(`
The color for the subtitle border. The first two hex digits specify the alpha value of the color.
`),
    // TODO: Make font an enum
    font: z
      .string()
      .default('Arial')
      .describe(`
The font family to use. Also includes boldness and style of the font.

[Here](/docs/supported-formats/fonts/) is a list of all supported fonts.
`),
    font_color: color_without_alpha.default('FFFFFF').describe(`
The color of the subtitle text. The first two hex digits specify the alpha value of the color.
`),
    font_size: z
      .number()
      .int()
      .min(1)
      .default(16)
      .describe(`
Specifies the size of the text.
`),
    position: positionSchema.default('bottom').describe(`
Specifies the position of the subtitles.
`),
    language: z
      .string()
      .optional()
      .nullable()
      .describe(`
Specifies the language of the subtitles. Only used if the subtitles are external.
`),
    keep_subtitles: z
      .boolean()
      .default(false)
      .describe(`
Specifies if existing subtitles in the input file should be kept or be replaced by the new subtitle. Only used if the subtitles are external.
`),
  })
  .strict()

export const robotVideoSubtitleInstructionsWithHiddenFieldsSchema =
  robotVideoSubtitleInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotVideoSubtitleInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotVideoSubtitleInstructions = z.infer<typeof robotVideoSubtitleInstructionsSchema>
export type RobotVideoSubtitleInstructionsWithHiddenFields = z.infer<
  typeof robotVideoSubtitleInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotVideoSubtitleInstructionsSchema = interpolateRobot(
  robotVideoSubtitleInstructionsSchema,
)
export type InterpolatableRobotVideoSubtitleInstructions =
  InterpolatableRobotVideoSubtitleInstructionsInput

export type InterpolatableRobotVideoSubtitleInstructionsInput = z.input<
  typeof interpolatableRobotVideoSubtitleInstructionsSchema
>

export const interpolatableRobotVideoSubtitleInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotVideoSubtitleInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotVideoSubtitleInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotVideoSubtitleInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotVideoSubtitleInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotVideoSubtitleInstructionsWithHiddenFieldsSchema
>
