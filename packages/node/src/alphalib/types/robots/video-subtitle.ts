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

const subtitleColorSchema = z.union([color_without_alpha, color_with_alpha])
const subtitleColorDescription = `Use \`"rgb"\`, \`"rrggbb"\`, or \`"aarrggbb"\` format, optionally prefixed with \`#\`. Three-digit colors are expanded to six digits. Colors without alpha are fully opaque. For eight-digit colors, the first two digits specify transparency (\`"00"\` is fully opaque, \`"ff"\` is fully transparent).`

/** Appearance defaults for the social caption preset, before customer overrides. */
export const videoSubtitleSocialStyle = {
  // Static Poppins faces are included by API2's shared fontsConf google-fonts package.
  font: 'Poppins',
  // ASS includes the font's ascent and descent; Poppins capitals occupy about 40% of it.
  font_size: 54,
  bold: true,
  outline_width: 2,
}

export const meta: RobotMetaInput = {
  ...robotVideoEncodingMeta,
  example_code: {
    steps: {
      transcript: {
        robot: '/speech/transcribe',
        use: ':original',
        provider: 'aws',
        format: 'json',
        source_language: 'en-US',
      },
      captioned: {
        robot: '/video/subtitle',
        use: {
          steps: [
            { name: ':original', as: 'video' },
            { name: 'transcript', as: 'subtitles' },
          ],
        },
        subtitles_type: 'burned',
        preset: 'empty',
        style: 'social',
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
    },
  },
  example_code_description:
    'Transcribe an uploaded video into timestamped words, then burn in uppercase social captions with the spoken word highlighted. Captions normally contain up to three words, breaking at sentence endings and pauses longer than 0.4 seconds. Social phrasing can use one extra word to keep a short phrase together or avoid a sentence-final orphan:',
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
This <dfn>Robot</dfn> supports SRT, VTT, ASS, and the timestamped JSON output of \`/speech/transcribe\` with \`"format": "json"\`. Pass the video as \`"video"\` and the transcript as \`"subtitles"\` in the \`use\` parameter. JSON words are grouped into captions and converted to ASS for burned word highlighting, or plain SRT cues for external subtitle streams. External JSON cues preserve casing and punctuation. Provider segments do not control caption breaks. SRT and VTT timing is preserved.

Without a \`preset\` or custom \`ffmpeg\` options, the legacy \`"flash"\` preset produces FLV output. With this default, burned subtitles use MP3 audio; external subtitles copy the input audio. Set \`"preset": "empty"\` to keep the input container, such as MP4 for an MP4 input.
`),
    subtitles_type: zodInputPreservingTransform(z.enum(['burned', 'external', 'burn']), (val) =>
      val === 'burn' ? 'burned' : val,
    )
      .default('external')
      .describe(`
Determines if subtitles are added as a separate stream to the video (value \`"external"\`) that then can be switched on and off in your video player, or if they should be burned directly into the video (value \`"burned"\` or \`"burn"\`) so that they become part of the video stream.
`),
    style: z
      .enum(['social'])
      .optional()
      .describe(`
Applies a ready-made appearance for burned subtitles: heavy Poppins text, a thick outline, and a soft black shadow. JSON captions render in uppercase in the lower third. By default, JSON font sizing uses the shorter side of the video and fits each caption within the safe width, preferring one line and using at most two. Words are never split. Each caption grows from 85% to full size over 120 milliseconds, then its words stay in place while the highlight changes color. The transcript file is preserved. Existing styling parameters override the preset; an explicit \`font_size\` disables automatic fitting. ASS files retain their own styles. With timestamped JSON from \`/speech/transcribe\`, the active word is highlighted until the next word or caption starts; other words use \`font_color\`. Trailing commas and periods are omitted from social JSON captions; question marks and exclamation marks are preserved. Word highlighting and grouping require JSON input.
`),
    highlight_color: subtitleColorSchema.default('FFD60A').describe(`
The accent color of the active word in JSON subtitles. Only applies to burned JSON subtitles. With \`"style": "social"\`, the previous word stays highlighted through short gaps until the next word or caption starts. Without the social style, gaps use \`font_color\` for the entire caption.

${subtitleColorDescription}
`),
    max_words_per_caption: z
      .number()
      .int()
      .min(1)
      .default(3)
      .describe(`
The target maximum number of timestamped JSON words shown in a caption. Captions break earlier at sentence-ending punctuation or pauses longer than 0.4 seconds. With \`"style": "social"\`, a trailing English function word such as “by,” “to,” or “the” moves to the next caption when possible. Short phrases such as “line of code” can stay together, and a sentence-final single word can join the previous caption. These adjustments allow at most one extra word per caption, without crossing sentence endings or long pauses. Single-word captions are preserved when the limit is 1. A caption stays visible until the next caption starts when the pause is at most 0.4 seconds, and disappears at its last word’s end during longer pauses. Does not change SRT, VTT, or ASS cues.
`),
    border_style: z
      .enum(['box', 'outline', 'shadow'])
      .default('outline')
      .describe(`
Specifies the style of the subtitle. Use the \`border_color\` parameter to specify the color of the border.
`),
    border_color: subtitleColorSchema.default('000000').describe(`
The color for the subtitle border. The default is opaque black. Only applies to burned subtitles.

${subtitleColorDescription}
`),
    // Preserve omitted appearance fields so parsing cannot override the selected style's defaults.
    // TODO: Make font an enum
    font: z
      .string()
      .optional()
      .describe(`
The font family to use. Also includes boldness and style of the font. The default is Arial. With \`"style": "social"\`, the default is ${videoSubtitleSocialStyle.font}, using its ExtraBold weight for JSON captions. An explicit font overrides the style.

[Here](/docs/supported-formats/fonts/) is a list of all supported fonts.
`),
    font_color: subtitleColorSchema.default('FFFFFF').describe(`
The color of the subtitle text. Only applies to burned subtitles.

${subtitleColorDescription}
`),
    font_size: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(`
Specifies the size of the text in the 288-pixel subtitle coordinate space, scaled with the video height. The default is 16. With \`"style": "social"\`, the default is ${videoSubtitleSocialStyle.font_size}. For social JSON captions, an omitted value scales this default with the shorter side of the video, increases it by 18% for portrait video, and shrinks captions as needed to fit at most two lines. Poppins capital letters are about 7.5% of the shorter side before fitting, or about 9% for portrait video. An explicit value keeps height-relative sizing and disables automatic fitting.
`),
    bold: z
      .boolean()
      .optional()
      .describe(`
Specifies whether the subtitle text should be bold. Only applies to burned subtitles. The default is \`false\`. With \`"style": "social"\`, the default is \`${videoSubtitleSocialStyle.bold}\`; an explicit \`false\` overrides the style.
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
Specifies the width of the text outline in the 288-pixel subtitle coordinate space, scaled with the video height. Numeric strings such as \`"4"\` are also accepted. Only applies to burned subtitles with \`"outline"\` or \`"box"\` border styles. If omitted or \`null\`, the default width is used (2 with \`"style": "social"\`, proportional to the final fitted font size for social JSON captions).
`),
    position: positionSchema.default('bottom').describe(`
Specifies the position of the subtitles. With \`"style": "social"\`, the default bottom position places JSON captions in the lower third, with extra bottom clearance on portrait video. An explicit value overrides the style.
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
