import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  interpolateRobot,
  robotBase,
  robotFFmpegAudio,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      artwork_extracted: {
        robot: '/audio/artwork',
        use: ':original',
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
    },
  },
  example_code_description: 'Extract embedded cover artwork from uploaded audio files:',
  minimum_charge: 0,
  output_factor: 0.8,
  override_lvl1: 'Audio Encoding',
  purpose_sentence:
    'extracts the embedded cover artwork from audio files and allows you to pipe it into other Steps, for example into /image/resize Steps. It can also insert images into audio files as cover artwork',
  purpose_verb: 'extract',
  purpose_word: 'extract/insert artwork',
  purpose_words: 'Extract or insert audio artwork',
  service_slug: 'audio-encoding',
  slot_count: 20,
  title: 'Extract or insert audio artwork',
  typical_file_size_mb: 3.8,
  typical_file_type: 'audio file',
  uses_tools: ['ffmpeg'],
  name: 'AudioArtworkRobot',
  priceFactor: 1,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotAudioArtworkInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegAudio)
  .extend({
    robot: z.literal('/audio/artwork').describe(`
For extraction, this <dfn>Robot</dfn> uses the image format embedded within the audio file — most often, this is JPEG.

If you need the image in a different format, pipe the result of this <dfn>Robot</dfn> into [🤖/image/resize](/docs/robots/image-resize/).

The \`method\` parameter determines whether to extract or insert.
`),
    method: z
      .enum(['extract', 'insert'])
      .default('extract')
      .describe(`
What should be done with the audio file. A value of \`"extract"\` means audio artwork will be extracted. A value of \`"insert"\` means the provided image will be inserted as audio artwork.
`),
    change_format_if_necessary: z
      .boolean()
      .default(false)
      .describe(`
Whether the original file should be transcoded into a new format if there is an issue with the original file.
`),
  })
  .strict()

export const robotAudioArtworkInstructionsWithHiddenFieldsSchema =
  robotAudioArtworkInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotAudioArtworkInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotAudioArtworkInstructions = z.infer<typeof robotAudioArtworkInstructionsSchema>
export type RobotAudioArtworkInstructionsWithHiddenFields = z.infer<
  typeof robotAudioArtworkInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotAudioArtworkInstructionsSchema = interpolateRobot(
  robotAudioArtworkInstructionsSchema,
)
export type InterpolatableRobotAudioArtworkInstructions =
  InterpolatableRobotAudioArtworkInstructionsInput

export type InterpolatableRobotAudioArtworkInstructionsInput = z.input<
  typeof interpolatableRobotAudioArtworkInstructionsSchema
>

export const interpolatableRobotAudioArtworkInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotAudioArtworkInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotAudioArtworkInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotAudioArtworkInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotAudioArtworkInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotAudioArtworkInstructionsWithHiddenFieldsSchema
>
