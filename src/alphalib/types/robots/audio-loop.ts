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
      looped: {
        robot: '/audio/loop',
        use: ':original',
        duration: 300,
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
    },
  },
  example_code_description: 'Loop uploaded audio to achieve a target duration of 300 seconds:',
  marketing_intro:
    'Whether you’re producing beats, white-noise, or just empty segments as fillers between audio tracks that you’re to stringing together with [🤖/audio/concat](/docs/robots/audio-concat/), [🤖/audio/loop](/docs/robots/audio-loop/) has got your back.',
  minimum_charge: 0,
  output_factor: 0.8,
  override_lvl1: 'Audio Encoding',
  purpose_sentence: 'loops one audio file as often as is required to match a given duration',
  purpose_verb: 'loop',
  purpose_word: 'loop',
  purpose_words: 'Loop audio',
  service_slug: 'audio-encoding',
  slot_count: 20,
  title: 'Loop audio',
  typical_file_size_mb: 3.8,
  typical_file_type: 'audio file',
  uses_tools: ['ffmpeg'],
  name: 'AudioLoopRobot',
  priceFactor: 4,
  queueSlotCount: 20,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotAudioLoopInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegAudio)
  .extend({
    robot: z.literal('/audio/loop'),
    bitrate: bitrateSchema.optional().describe(`
Bit rate of the resulting audio file, in bits per second. If not specified will default to the bit rate of the input audio file.
`),
    sample_rate: sampleRateSchema.optional().describe(`
Sample rate of the resulting audio file, in Hertz. If not specified will default to the sample rate of the input audio file.
`),
    duration: z
      .number()
      .default(60)
      .describe(`
Target duration for the whole process in seconds. The <dfn>Robot</dfn> will loop the input audio file for as long as this target duration is not reached yet.
`),
  })
  .strict()

export const robotAudioLoopInstructionsWithHiddenFieldsSchema =
  robotAudioLoopInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotAudioLoopInstructionsSchema.shape.result]).optional(),
  })

export type RobotAudioLoopInstructions = z.infer<typeof robotAudioLoopInstructionsSchema>
export type RobotAudioLoopInstructionsWithHiddenFields = z.infer<
  typeof robotAudioLoopInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotAudioLoopInstructionsSchema = interpolateRobot(
  robotAudioLoopInstructionsSchema,
)
export type InterpolatableRobotAudioLoopInstructions = InterpolatableRobotAudioLoopInstructionsInput

export type InterpolatableRobotAudioLoopInstructionsInput = z.input<
  typeof interpolatableRobotAudioLoopInstructionsSchema
>

export const interpolatableRobotAudioLoopInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotAudioLoopInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotAudioLoopInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotAudioLoopInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotAudioLoopInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotAudioLoopInstructionsWithHiddenFieldsSchema
>
