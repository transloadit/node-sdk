import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  interpolateRobot,
  robotBase,
  robotFFmpegVideo,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      split: {
        robot: '/video/split',
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
    'Split a video into two segments, extracting the first 30 seconds and a segment from 1:00 to 1:30:',
  minimum_charge: 0,
  output_factor: 0.6,
  override_lvl1: 'Video Encoding',
  purpose_sentence: 'splits a video into multiple segments based on an array of from/to durations',
  purpose_verb: 'split',
  purpose_word: 'split',
  purpose_words: 'Split video',
  service_slug: 'video-encoding',
  slot_count: 60,
  title: 'Split video',
  typical_file_size_mb: 80,
  typical_file_type: 'video',
  uses_tools: ['ffmpeg'],
  name: 'VideoSplitRobot',
  priceFactor: 1,
  queueSlotCount: 60,
  isAllowedForUrlTransform: false,
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

export const robotVideoSplitInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegVideo)
  .extend({
    robot: z.literal('/video/split').describe(`
Splits a video into multiple segments based on an array of from/to durations. Each segment produces a separate output file. This is useful for cutting a video into parts, for example to insert ads later via [🤖/video/concat](/docs/robots/video-concat/).
`),
    segments: z
      .array(segmentSchema)
      .min(1)
      .describe(`
An array of objects, each specifying a segment to extract from the input video. Each object must have a \`from\` and \`to\` key indicating the start and end time of the segment.

Times can be specified as numbers (seconds) or as timecode strings (e.g. \`"00:01:30.000"\`).
`),
  })
  .strict()

export const robotVideoSplitInstructionsWithHiddenFieldsSchema =
  robotVideoSplitInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotVideoSplitInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotVideoSplitInstructions = z.infer<typeof robotVideoSplitInstructionsSchema>
export type RobotVideoSplitInstructionsWithHiddenFields = z.infer<
  typeof robotVideoSplitInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotVideoSplitInstructionsSchema = interpolateRobot(
  robotVideoSplitInstructionsSchema,
)
export type InterpolatableRobotVideoSplitInstructions =
  InterpolatableRobotVideoSplitInstructionsInput

export type InterpolatableRobotVideoSplitInstructionsInput = z.input<
  typeof interpolatableRobotVideoSplitInstructionsSchema
>

export const interpolatableRobotVideoSplitInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotVideoSplitInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotVideoSplitInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotVideoSplitInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotVideoSplitInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotVideoSplitInstructionsWithHiddenFieldsSchema
>
