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
  bytescount: 4,
  discount_factor: 0.25,
  discount_pct: 75,
  example_code: {
    steps: {
      split: {
        robot: '/audio/split',
        use: ':original',
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
        segments: [
          { from: 0, to: 30 },
          { from: 60, to: 90 },
        ],
      },
    },
  },
  example_code_description:
    'Split an audio file into two segments, extracting the first 30 seconds and a segment from 1:00 to 1:30:',
  minimum_charge: 0,
  output_factor: 0.8,
  override_lvl1: 'Audio Encoding',
  purpose_sentence:
    'splits an audio file into multiple segments based on an array of from/to durations',
  purpose_verb: 'split',
  purpose_word: 'split',
  purpose_words: 'Split audio',
  service_slug: 'audio-encoding',
  slot_count: 20,
  title: 'Split audio',
  typical_file_size_mb: 3.8,
  typical_file_type: 'audio file',
  uses_tools: ['ffmpeg'],
  name: 'AudioSplitRobot',
  priceFactor: 4,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'ga',
}

const segmentSchema = z
  .object({
    from: z
      .union([z.number(), z.string()])
      .describe(
        'Start time of the segment in seconds (e.g. `30`) or as a timecode string (e.g. `"00:00:30.000"`).',
      ),
    to: z
      .union([z.number(), z.string()])
      .describe(
        'End time of the segment in seconds (e.g. `60`) or as a timecode string (e.g. `"00:01:00.000"`).',
      ),
  })
  .strict()

export const robotAudioSplitInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegAudio)
  .extend({
    result: z
      .boolean()
      .optional()
      .describe('Whether the results of this Step should be present in the Assembly Status JSON'),
    robot: z.literal('/audio/split').describe(`
Splits an audio file into multiple segments based on an array of from/to durations. Each segment produces a separate output file. This is useful for cutting an audio file into parts, for example to insert ads later via [🤖/audio/concat](/docs/robots/audio-concat/).
`),
    segments: z
      .array(segmentSchema)
      .min(1)
      .describe(`
An array of objects, each specifying a segment to extract from the input audio. Each object must have a \`from\` and \`to\` key indicating the start and end time of the segment.

Times can be specified as numbers (seconds) or as timecode strings (e.g. \`"00:01:30.000"\`).
`),
    bitrate: bitrateSchema.optional().describe(`
Bit rate of the resulting audio file, in bits per second. If not specified will default to the bit rate of the input audio file.
`),
    sample_rate: sampleRateSchema.optional().describe(`
Sample rate of the resulting audio file, in Hertz. If not specified will default to the sample rate of the input audio file.
`),
  })
  .strict()

export const robotAudioSplitInstructionsWithHiddenFieldsSchema =
  robotAudioSplitInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotAudioSplitInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotAudioSplitInstructions = z.infer<typeof robotAudioSplitInstructionsSchema>
export type RobotAudioSplitInstructionsWithHiddenFields = z.infer<
  typeof robotAudioSplitInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotAudioSplitInstructionsSchema = interpolateRobot(
  robotAudioSplitInstructionsSchema,
)
export type InterpolatableRobotAudioSplitInstructions =
  InterpolatableRobotAudioSplitInstructionsInput

export type InterpolatableRobotAudioSplitInstructionsInput = z.input<
  typeof interpolatableRobotAudioSplitInstructionsSchema
>

export const interpolatableRobotAudioSplitInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotAudioSplitInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotAudioSplitInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotAudioSplitInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotAudioSplitInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotAudioSplitInstructionsWithHiddenFieldsSchema
>
