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
  robotFFmpegAudio,
  robotUse,
  robotVideoEncodingMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotVideoEncodingMeta,
  example_code: createProcessingExample('artwork_extracted', '/video/artwork', {
    ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
  }),
  example_code_description: 'Extract embedded cover artwork from uploaded video files:',
  purpose_sentence:
    'extracts embedded cover artwork from video files or inserts a new cover image into them. Extracted artwork can be piped into other Steps such as /image/resize. Use `method: "insert"` to embed artwork into video files like MP4, MOV, or M4V',
  purpose_verb: 'extract',
  purpose_word: 'extract/insert artwork',
  purpose_words: 'Extract or insert video artwork',
  title: 'Extract or insert video artwork',
  typical_file_size_mb: 3.8,
  uses_tools: ['ffmpeg'],
  name: 'VideoArtworkRobot',
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
}

export const robotVideoArtworkInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegAudio)
  .extend({
    robot: z.literal('/video/artwork').describe(`
This <dfn>Robot</dfn> extracts or inserts cover artwork in video files.

For extraction, it uses the image format embedded within the video file — most often, this is JPEG. If you need the image in a different format, pipe the result into [🤖/image/resize](/docs/robots/image-resize/).

For insertion, provide both a video file (as \`"video"\`) and an image file (as \`"image"\`) via the \`use\` parameter, and set \`method\` to \`"insert"\`. The image will be embedded as the cover artwork of the video file.
`),
    method: z
      .enum(['extract', 'insert'])
      .default('extract')
      .describe(`
What should be done with the video file. A value of \`"extract"\` means video artwork will be extracted. A value of \`"insert"\` means the provided image will be inserted as video artwork.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotVideoArtworkInstructionsSchema.shape> =
  defineRobot(meta, robotVideoArtworkInstructionsSchema)

export const {
  withHiddenFields: robotVideoArtworkInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotVideoArtworkInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotVideoArtworkInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotVideoArtworkInstructions = Instructions['output']
export type RobotVideoArtworkInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotVideoArtworkInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotVideoArtworkInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotVideoArtworkInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotVideoArtworkInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
