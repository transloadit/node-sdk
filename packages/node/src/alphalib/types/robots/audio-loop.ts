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
  example_code: createProcessingExample('looped', '/audio/loop', {
    duration: 300,
    ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
  }),
  example_code_description: 'Loop uploaded audio to achieve a target duration of 300 seconds:',
  marketing_intro:
    'Whether you’re producing beats, white-noise, or just empty segments as fillers between audio tracks that you’re to stringing together with [🤖/audio/concat](/docs/robots/audio-concat/), [🤖/audio/loop](/docs/robots/audio-loop/) has got your back.',
  purpose_sentence: 'loops one audio file as often as is required to match a given duration',
  purpose_verb: 'loop',
  purpose_word: 'loop',
  purpose_words: 'Loop audio',
  title: 'Loop audio',
  uses_tools: ['ffmpeg'],
  name: 'AudioLoopRobot',
}

export const robotAudioLoopInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegAudio)
  .extend({
    robot: z.literal('/audio/loop'),
    bitrate: bitrateSchema.optional().describe(robotParameterDocs.audio_bitrate.description),
    sample_rate: sampleRateSchema
      .optional()
      .describe(robotParameterDocs.audio_sample_rate.description),
    duration: z
      .number()
      .default(60)
      .describe(`
Target duration for the whole process in seconds. The <dfn>Robot</dfn> will loop the input audio file for as long as this target duration is not reached yet.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotAudioLoopInstructionsSchema.shape> =
  defineRobot(meta, robotAudioLoopInstructionsSchema)

export const {
  withHiddenFields: robotAudioLoopInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotAudioLoopInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotAudioLoopInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotAudioLoopInstructions = Instructions['output']
export type RobotAudioLoopInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotAudioLoopInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotAudioLoopInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotAudioLoopInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotAudioLoopInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
