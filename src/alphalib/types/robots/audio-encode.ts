import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  bitrateSchema,
  interpolateRobot,
  robotBase,
  robotFFmpegAudio,
  robotUse,
  sampleRateSchema,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: false,
  bytescount: 4,
  discount_factor: 0.25,
  discount_pct: 75,
  example_code: {
    steps: {
      mp3_encoded: {
        robot: '/audio/encode',
        use: ':original',
        preset: 'mp3',
        bitrate: 256000,
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
    },
  },
  example_code_description: 'Encode uploaded audio to MP3 format at a 256 kbps bitrate:',
  minimum_charge: 0,
  output_factor: 0.8,
  override_lvl1: 'Audio Encoding',
  purpose_sentence:
    'converts audio files into all kinds of formats for you. We provide encoding presets for the most common formats',
  purpose_verb: 'encode',
  purpose_word: 'encode',
  purpose_words: 'Encode audio',
  service_slug: 'audio-encoding',
  slot_count: 20,
  title: 'Encode audio',
  typical_file_size_mb: 3.8,
  typical_file_type: 'audio file',
  uses_tools: ['ffmpeg'],
  name: 'AudioEncodeRobot',
  priceFactor: 4,
  queueSlotCount: 20,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotAudioEncodeInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegAudio)
  .extend({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/audio/encode'),
    bitrate: bitrateSchema.optional().describe(`
Bit rate of the resulting audio file, in bits per second. If not specified will default to the bit rate of the input audio file.
`),
    sample_rate: sampleRateSchema.optional().describe(`
Sample rate of the resulting audio file, in Hertz. If not specified will default to the sample rate of the input audio file.
`),
  })
  .strict()

export const robotAudioEncodeInstructionsWithHiddenFieldsSchema =
  robotAudioEncodeInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotAudioEncodeInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotAudioEncodeInstructions = z.infer<typeof robotAudioEncodeInstructionsSchema>
export type RobotAudioEncodeInstructionsWithHiddenFields = z.infer<
  typeof robotAudioEncodeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotAudioEncodeInstructionsSchema = interpolateRobot(
  robotAudioEncodeInstructionsSchema,
)
export type InterpolatableRobotAudioEncodeInstructions =
  InterpolatableRobotAudioEncodeInstructionsInput

export type InterpolatableRobotAudioEncodeInstructionsInput = z.input<
  typeof interpolatableRobotAudioEncodeInstructionsSchema
>

export const interpolatableRobotAudioEncodeInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotAudioEncodeInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotAudioEncodeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotAudioEncodeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotAudioEncodeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotAudioEncodeInstructionsWithHiddenFieldsSchema
>
