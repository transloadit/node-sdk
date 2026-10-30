import type { RobotMetaInput, RobotSchemaPair } from './_instructions-primitives.ts'

import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import {
  bitrateSchema,
  getConcatFadeDescription,
  inputSortBySchema,
  interpolateRobot,
  robotAudioEncodingMeta,
  robotBase,
  robotFFmpegAudio,
  robotParameterDocs,
  robotUse,
  robotUseWithHiddenFields,
  sampleRateSchema,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotAudioEncodingMeta,
  example_code: {
    steps: {
      concatenated: {
        robot: '/audio/concat',
        use: {
          steps: [
            {
              name: ':original',
              fields: 'first_audio_file',
              as: 'audio_1',
            },
            {
              name: ':original',
              fields: 'second_audio_file',
              as: 'audio_2',
            },
            {
              name: ':original',
              fields: 'third_audio_file',
              as: 'audio_3',
            },
          ],
        },
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
    },
  },
  example_code_description:
    'If you have a form with 3 file input fields and want to concatenate the uploaded audios in a specific order, instruct Transloadit using the `name` attribute of each input field. Use this attribute as the value for the `fields` key in the JSON, and set `as` to `audio_[[index]]`. Transloadit will concatenate the files based on the ascending index order:',
  purpose_sentence: 'concatenates several audio files together',
  purpose_verb: 'concatenate',
  purpose_word: 'concatenate',
  purpose_words: 'Concatenate audio',
  title: 'Concatenate audio',
  uses_tools: ['ffmpeg'],
  name: 'AudioConcatRobot',
}

export const robotAudioConcatInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegAudio)
  .extend({
    result: z
      .boolean()
      .optional()
      .describe('Whether the results of this Step should be present in the Assembly Status JSON'),
    robot: z.literal('/audio/concat').describe(`
This Robot can concatenate an almost infinite number of audio files.
`),
    bitrate: bitrateSchema.optional().describe(robotParameterDocs.audio_bitrate.description),
    sample_rate: sampleRateSchema
      .optional()
      .describe(robotParameterDocs.audio_sample_rate.description),
    audio_fade_seconds: z
      .number()
      .default(0)
      .describe(`
${getConcatFadeDescription('audio')}

When \`crossfade\` is \`true\`, this parameter controls the overlap between inputs instead of these separate fades. To add a fade-in at the beginning of the output, use an additional [audio encoding Step](/docs/robots/audio-encode/) with the \`ffmpeg\` parameter, as shown in the [fade-in and fade-out demo](/demos/audio-encoding/ffmpeg-fade-in-and-out/).
`),
    crossfade: z
      .boolean()
      .default(false)
      .describe(`
When set to \`true\`, this parameter enables crossfading between concatenated audio files using FFmpeg's \`acrossfade\` filter. This creates a smooth transition where the end of one audio file overlaps and blends with the beginning of the next file.

The \`audio_fade_seconds\` parameter controls the overlap duration. Omitting it or setting it to \`0\` uses a 1-second crossfade. Each overlap shortens the output by that duration; this mode does not add a fade-in at the beginning or a fade-out at the end.

Note: This parameter requires at least 2 audio files to concatenate and only works with audio files, not video files.
`),
    sort_by: inputSortBySchema,
  })
  .strict()

export const robotAudioConcatInstructionsWithHiddenFieldsSchema = robotAudioConcatInstructionsSchema
  .omit({ use: true })
  .merge(robotUseWithHiddenFields)
  .extend({
    result: z
      .union([z.literal('debug'), robotAudioConcatInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotAudioConcatInstructions = z.infer<typeof robotAudioConcatInstructionsSchema>
export type RobotAudioConcatInstructionsWithHiddenFields = z.infer<
  typeof robotAudioConcatInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotAudioConcatInstructionsSchema = interpolateRobot(
  robotAudioConcatInstructionsSchema,
)
export type InterpolatableRobotAudioConcatInstructions =
  InterpolatableRobotAudioConcatInstructionsInput

export type InterpolatableRobotAudioConcatInstructionsInput = z.input<
  typeof interpolatableRobotAudioConcatInstructionsSchema
>

export const interpolatableRobotAudioConcatInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotAudioConcatInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotAudioConcatInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotAudioConcatInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotAudioConcatInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotAudioConcatInstructionsWithHiddenFieldsSchema
>

export const robotDefinition: RobotSchemaPair<
  typeof interpolatableRobotAudioConcatInstructionsSchema,
  typeof interpolatableRobotAudioConcatInstructionsWithHiddenFieldsSchema
> = {
  meta,
  interpolatable: interpolatableRobotAudioConcatInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotAudioConcatInstructionsWithHiddenFieldsSchema,
}
