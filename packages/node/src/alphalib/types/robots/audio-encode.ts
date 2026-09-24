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
  example_code: createProcessingExample('mp3_encoded', '/audio/encode', {
    preset: 'mp3',
    bitrate: 256000,
    ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
  }),
  example_code_description: 'Encode uploaded audio to MP3 format at a 256 kbps bitrate:',
  purpose_sentence:
    'converts audio files into all kinds of formats for you. We provide encoding presets for the most common formats',
  purpose_verb: 'encode',
  purpose_word: 'encode',
  purpose_words: 'Encode audio',
  title: 'Encode audio',
  uses_tools: ['ffmpeg'],
  name: 'AudioEncodeRobot',
}

export const robotAudioEncodeInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegAudio)
  .extend({
    result: z
      .boolean()
      .optional()
      .describe('Whether the results of this Step should be present in the Assembly Status JSON'),
    robot: z.literal('/audio/encode'),
    bitrate: bitrateSchema.optional().describe(robotParameterDocs.audio_bitrate.description),
    sample_rate: sampleRateSchema
      .optional()
      .describe(robotParameterDocs.audio_sample_rate.description),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotAudioEncodeInstructionsSchema.shape> =
  defineRobot(meta, robotAudioEncodeInstructionsSchema)

export const {
  withHiddenFields: robotAudioEncodeInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotAudioEncodeInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotAudioEncodeInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotAudioEncodeInstructions = Instructions['output']
export type RobotAudioEncodeInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotAudioEncodeInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotAudioEncodeInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotAudioEncodeInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotAudioEncodeInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
