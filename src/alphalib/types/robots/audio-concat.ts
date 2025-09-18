import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  bitrateSchema,
  interpolateRobot,
  robotBase,
  robotFFmpegAudio,
  robotUse,
  robotUseWithHiddenFields,
  sampleRateSchema,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: false,
  bytescount: 4,
  discount_factor: 0.25,
  discount_pct: 75,
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
  example_code_description: `If you have a form with 3 file input fields and want to concatenate the uploaded audios in a specific order, instruct Transloadit using the \`name\` attribute of each input field. Use this attribute as the value for the \`fields\` key in the JSON, and set \`as\` to \`audio_[[index]]\`. Transloadit will concatenate the files based on the ascending index order:`,
  minimum_charge: 0,
  output_factor: 0.8,
  override_lvl1: 'Audio Encoding',
  purpose_sentence: 'concatenates several audio files together',
  purpose_verb: 'concatenate',
  purpose_word: 'concatenate',
  purpose_words: 'Concatenate audio',
  service_slug: 'audio-encoding',
  slot_count: 20,
  title: 'Concatenate audio',
  typical_file_size_mb: 3.8,
  typical_file_type: 'audio file',
  uses_tools: ['ffmpeg'],
  name: 'AudioConcatRobot',
  priceFactor: 4,
  queueSlotCount: 20,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotAudioConcatInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegAudio)
  .extend({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/audio/concat').describe(`
This Robot can concatenate an almost infinite number of audio files.
`),
    bitrate: bitrateSchema.optional().describe(`
Bit rate of the resulting audio file, in bits per second. If not specified will default to the bit rate of the input audio file.
`),
    sample_rate: sampleRateSchema.optional().describe(`
Sample rate of the resulting audio file, in Hertz. If not specified will default to the sample rate of the input audio file.
`),
    audio_fade_seconds: z
      .number()
      .default(1)
      .describe(`
When used this adds an audio fade in and out effect between each section of your concatenated audio file. The float value is used, so if you want an audio delay effect of 500 milliseconds between each video section, you would select 0.5. Integer values can also be represented.

This parameter does not add an audio fade effect at the beginning or end of your result audio file. If you want to do so, create an additional [🤖/audio/encode](/docs/robots/audio-encode/) <dfn>Step</dfn> and use our \`ffmpeg\` parameter as shown in this [demo](/demos/audio-encoding/ffmpeg-fade-in-and-out/).
`),
    crossfade: z
      .boolean()
      .default(false)
      .describe(`
When set to \`true\`, this parameter enables crossfading between concatenated audio files using FFmpeg's \`acrossfade\` filter. This creates a smooth transition where the end of one audio file overlaps and blends with the beginning of the next file.

The duration of the crossfade is controlled by the \`audio_fade_seconds\` parameter (defaults to 1 second if \`audio_fade_seconds\` is 0).

Note: This parameter requires at least 2 audio files to concatenate and only works with audio files, not video files.
`),
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
