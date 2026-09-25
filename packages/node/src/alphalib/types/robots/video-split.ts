import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import {
  createProcessingExample,
  defineRobot,
  robotBase,
  robotFFmpegVideo,
  robotUse,
  robotVideoEncodingMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotVideoEncodingMeta,
  example_code: createProcessingExample('split', '/video/split', {
    ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
    segments: [
      { from: 0, to: 30 },
      { from: 60, to: 90 },
    ],
  }),
  example_code_description:
    'Split a video into two segments, extracting the first 30 seconds and a segment from 1:00 to 1:30:',
  purpose_sentence: 'splits a video into multiple segments based on an array of from/to durations',
  purpose_verb: 'split',
  purpose_word: 'split',
  purpose_words: 'Split video',
  title: 'Split video',
  uses_tools: ['ffmpeg'],
  name: 'VideoSplitRobot',
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

export const robotDefinition: RobotDefinition<typeof robotVideoSplitInstructionsSchema.shape> =
  defineRobot(meta, robotVideoSplitInstructionsSchema)

export const {
  withHiddenFields: robotVideoSplitInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotVideoSplitInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotVideoSplitInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotVideoSplitInstructions = Instructions['output']
export type RobotVideoSplitInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotVideoSplitInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotVideoSplitInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotVideoSplitInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotVideoSplitInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
