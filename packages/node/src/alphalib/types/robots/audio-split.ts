import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import {
  bitrateSchema,
  createProcessingExample,
  defineRobot,
  robotAudioEncodingMeta,
  robotBase,
  robotFFmpegAudio,
  robotParameterDocs,
  robotUse,
  sampleRateSchema,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotAudioEncodingMeta,
  example_code: createProcessingExample('split', '/audio/split', {
    ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
    segments: [
      { from: 0, to: 30 },
      { from: 60, to: 90 },
    ],
  }),
  example_code_description:
    'Split an audio file into two segments, extracting the first 30 seconds and a segment from 1:00 to 1:30:',
  purpose_sentence:
    'splits an audio file into multiple segments based on an array of from/to durations',
  purpose_verb: 'split',
  purpose_word: 'split',
  purpose_words: 'Split audio',
  title: 'Split audio',
  uses_tools: ['ffmpeg'],
  name: 'AudioSplitRobot',
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
    bitrate: bitrateSchema.optional().describe(robotParameterDocs.audio_bitrate.description),
    sample_rate: sampleRateSchema
      .optional()
      .describe(robotParameterDocs.audio_sample_rate.description),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotAudioSplitInstructionsSchema.shape> =
  defineRobot(meta, robotAudioSplitInstructionsSchema)

export const {
  withHiddenFields: robotAudioSplitInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotAudioSplitInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotAudioSplitInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotAudioSplitInstructions = Instructions['output']
export type RobotAudioSplitInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotAudioSplitInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotAudioSplitInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotAudioSplitInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotAudioSplitInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
