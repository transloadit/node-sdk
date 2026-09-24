import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { zodInputPreservingTransform } from '../../lib/zodInputSemantics.ts'
import { stackVersions } from '../stackVersions.ts'
import {
  color_with_alpha,
  color_without_alpha,
  defineRobot,
  positionSchema,
  robotBase,
  robotFFmpegVideo,
  robotUse,
  robotVideoEncodingMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotVideoEncodingMeta,
  example_code: {
    steps: {
      add_english_subtitles: {
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
              fields: 'input_srt_en',
              as: 'subtitles',
            },
          ],
        },
        language: 'eng',
        name: 'English',
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
      add_german_subtitles: {
        robot: '/video/subtitle',
        use: {
          steps: [
            {
              name: 'add_english_subtitles',
              as: 'video',
            },
            {
              name: ':original',
              fields: 'input_srt_de',
              as: 'subtitles',
            },
          ],
        },
        language: 'deu',
        name: 'Deutsch',
        keep_subtitles: true,
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
    },
  },
  example_code_description:
    'If you have file input fields in a form — one for a video and one for each subtitle language (named `input_video`, `input_srt_en`, and `input_srt_de` via the HTML `name` attribute) — here’s how to add multiple subtitle streams with language tags to the video. Chain multiple `/video/subtitle` Steps with `keep_subtitles` set to `true` so each new stream is added alongside existing ones:',
  purpose_sentence: 'adds subtitles and closed captions to videos',
  purpose_verb: 'subtitle',
  purpose_word: 'subtitle',
  purpose_words: 'Add subtitles to videos',
  title: 'Add subtitles to videos',
  uses_tools: ['ffmpeg'],
  name: 'VideoSubtitleRobot',
}

export const robotVideoSubtitleInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegVideo)
  .extend({
    robot: z.literal('/video/subtitle').describe(`
This <dfn>Robot</dfn> supports both SRT and VTT subtitle files.
`),
    subtitles_type: zodInputPreservingTransform(z.enum(['burned', 'external', 'burn']), (val) =>
      val === 'burn' ? 'burned' : val,
    )
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
    font_color: z
      .union([color_without_alpha, color_with_alpha])
      .default('FFFFFF')
      .describe(`
The color of the subtitle text in \`"rgb"\`, \`"rrggbb"\`, or \`"aarrggbb"\` format. If 8 hex digits are provided, the first two specify the alpha value of the color (\`"00"\` is fully opaque, \`"ff"\` is fully transparent).
`),
    font_size: z
      .number()
      .int()
      .min(1)
      .default(16)
      .describe(`
Specifies the size of the text.
`),
    bold: z
      .boolean()
      .default(false)
      .describe(`
Specifies whether the subtitle text should be bold. Only applies to burned subtitles.
`),
    italic: z
      .boolean()
      .default(false)
      .describe(`
Specifies whether the subtitle text should be italic. Only applies to burned subtitles.
`),
    outline_width: z
      .number()
      .int()
      .min(0)
      .max(10)
      .optional()
      .nullable()
      .describe(`
Specifies the width of the text outline in pixels. Only applies to burned subtitles with \`"outline"\` or \`"box"\` border styles. If not specified, the default width is used.
`),
    position: positionSchema.default('bottom').describe(`
Specifies the position of the subtitles.
`),
    language: z
      .string()
      .optional()
      .nullable()
      .describe(`
Specifies the language of the subtitle stream using a three-letter language code (e.g. \`"eng"\`, \`"deu"\`, \`"spa"\`). Only used if the subtitles are external. When adding multiple subtitle streams, set a different language for each stream so that video players can offer language selection.
`),
    name: z
      .string()
      .optional()
      .nullable()
      .describe(`
Specifies a human-readable name for the subtitle track (e.g. \`"English"\`, \`"Deutsch"\`, \`"Español"\`). Only used if the subtitles are external. This name is displayed in video player subtitle menus alongside the language.
`),
    keep_subtitles: z
      .boolean()
      .default(false)
      .describe(`
Specifies if existing subtitles in the input file should be kept or be replaced by the new subtitle. Only used if the subtitles are external. Set this to \`true\` when chaining multiple \`/video/subtitle\` Steps to add several subtitle streams (e.g. different languages) to the same video.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotVideoSubtitleInstructionsSchema.shape> =
  defineRobot(meta, robotVideoSubtitleInstructionsSchema)

export const {
  withHiddenFields: robotVideoSubtitleInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotVideoSubtitleInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotVideoSubtitleInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotVideoSubtitleInstructions = Instructions['output']
export type RobotVideoSubtitleInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotVideoSubtitleInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotVideoSubtitleInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotVideoSubtitleInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotVideoSubtitleInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
