import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { describeApiParameter } from '../apiParameterDescription.ts'
import { stackVersions } from '../stackVersions.ts'
import {
  createProcessingExample,
  defineRobot,
  robotAudioEncodingMeta,
  robotBase,
  robotFFmpegAudio,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotAudioEncodingMeta,
  example_code: createProcessingExample('artwork_extracted', '/audio/artwork', {
    ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
  }),
  example_code_description: 'Extract embedded cover artwork from uploaded audio files:',
  purpose_sentence:
    'extracts embedded cover artwork from audio files or inserts a new cover image into them. Extracted artwork can be piped into other Steps such as /image/resize. Use `method: "insert"` to embed artwork into audio files like MP3, FLAC, or M4A',
  purpose_verb: 'extract',
  purpose_word: 'extract/insert artwork',
  purpose_words: 'Extract or insert audio artwork',
  title: 'Extract or insert audio artwork',
  uses_tools: ['ffmpeg'],
  name: 'AudioArtworkRobot',
  priceFactor: 1,
}

export const robotAudioArtworkInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegAudio)
  .extend({
    robot: z.literal('/audio/artwork').describe(`
This <dfn>Robot</dfn> extracts or inserts cover artwork in audio files.

For extraction, it uses the image format embedded within the audio file — most often, this is JPEG. If you need the image in a different format, pipe the result into [🤖/image/resize](/docs/robots/image-resize/).

For insertion, provide both an audio file (as \`"audio"\`) and an image file (as \`"image"\`) via the \`use\` parameter, and set \`method\` to \`"insert"\`. The image will be embedded as the cover artwork of the audio file.
`),
    method: z
      .enum(['extract', 'insert'])
      .default('extract')
      .describe(`
What should be done with the audio file. A value of \`"extract"\` means audio artwork will be extracted. A value of \`"insert"\` means the provided image will be inserted as audio artwork.
`),
    change_format_if_necessary: describeApiParameter(
      'audioArtworkChangeFormatIfNecessary',
      z.boolean().default(false),
      `
Whether the original file should be transcoded into a new format if there is an issue with the original file.
`,
    ),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotAudioArtworkInstructionsSchema.shape> =
  defineRobot(meta, robotAudioArtworkInstructionsSchema)

export const {
  withHiddenFields: robotAudioArtworkInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotAudioArtworkInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotAudioArtworkInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotAudioArtworkInstructions = Instructions['output']
export type RobotAudioArtworkInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotAudioArtworkInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotAudioArtworkInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotAudioArtworkInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotAudioArtworkInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
