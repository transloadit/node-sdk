import type { RobotMetaInput, RobotSchemaPair } from './_instructions-primitives.ts'

import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import {
  bitrateSchema,
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
      merged: {
        robot: '/audio/merge',
        preset: 'mp3',
        use: {
          steps: [
            {
              name: ':original',
              fields: 'first_audio_file',
              as: 'audio',
            },
            {
              name: ':original',
              fields: 'second_audio_file',
              as: 'audio',
            },
            {
              name: ':original',
              fields: 'third_audio_file',
              as: 'audio',
            },
          ],
        },
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
    },
  },
  example_code_description:
    'If you have a form with 3 file input fields and wish to overlay the uploaded audios, instruct Transloadit using the `name` attribute of each input field. Use this attribute as the value for the `fields` key in the JSON, and set `as` to `audio`:',
  purpose_sentence: 'overlays several audio files on top of each other',
  purpose_verb: 'merge',
  purpose_word: 'merge',
  purpose_words: 'Merge audio files into one',
  title: 'Merge audio files into one',
  uses_tools: ['ffmpeg'],
  name: 'AudioMergeRobot',
}

export const robotAudioMergeInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegAudio)
  .extend({
    robot: z.literal('/audio/merge'),
    bitrate: bitrateSchema.optional().describe(robotParameterDocs.audio_bitrate.description),
    sample_rate: sampleRateSchema
      .optional()
      .describe(robotParameterDocs.audio_sample_rate.description),
    duration: z
      .enum(['first', 'longest', 'shortest'])
      .default('longest')
      .describe(`
Duration of the output file compared to the duration of all merged audio files. Can be \`"first"\` (duration of the first input file), \`"shortest"\` (duration of the shortest audio file) or \`"longest"\` for the duration of the longest input file.
`),
    loop: z
      .boolean()
      .default(false)
      .describe(`
Specifies if any input files that do not match the target duration should be looped to match it. Useful for audio merging where your overlay file is typically much shorter than the main audio file.
`),
    volume: z
      .enum(['average', 'sum'])
      .default('average')
      .describe(`
Valid values are \`"average"\` and \`"sum"\` here. \`"average"\` means each input is scaled 1/n (n is the number of inputs) or \`"sum"\` which means each individual audio stays on the same volume, but since we merge tracks 'on top' of each other, this could result in very loud output.
`),
  })
  .strict()

export const robotAudioMergeInstructionsWithHiddenFieldsSchema = robotAudioMergeInstructionsSchema
  .omit({ use: true })
  .merge(robotUseWithHiddenFields)
  .extend({
    result: z
      .union([z.literal('debug'), robotAudioMergeInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotAudioMergeInstructions = z.infer<typeof robotAudioMergeInstructionsSchema>
export type RobotAudioMergeInstructionsWithHiddenFields = z.infer<
  typeof robotAudioMergeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotAudioMergeInstructionsSchema = interpolateRobot(
  robotAudioMergeInstructionsSchema,
)
export type InterpolatableRobotAudioMergeInstructions =
  InterpolatableRobotAudioMergeInstructionsInput

export type InterpolatableRobotAudioMergeInstructionsInput = z.input<
  typeof interpolatableRobotAudioMergeInstructionsSchema
>

export const interpolatableRobotAudioMergeInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotAudioMergeInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotAudioMergeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotAudioMergeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotAudioMergeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotAudioMergeInstructionsWithHiddenFieldsSchema
>

export const robotDefinition: RobotSchemaPair<
  typeof interpolatableRobotAudioMergeInstructionsSchema,
  typeof interpolatableRobotAudioMergeInstructionsWithHiddenFieldsSchema
> = {
  meta,
  interpolatable: interpolatableRobotAudioMergeInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotAudioMergeInstructionsWithHiddenFieldsSchema,
}
