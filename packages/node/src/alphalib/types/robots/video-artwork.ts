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
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      artwork_extracted: {
        robot: '/video/artwork',
        use: ':original',
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
    },
  },
  example_code_description: 'Extract embedded cover artwork from uploaded video files:',
  minimum_charge: 0,
  output_factor: 0.8,
  override_lvl1: 'Video Encoding',
  purpose_sentence:
    'extracts embedded cover artwork from video files or inserts a new cover image into them. Extracted artwork can be piped into other Steps such as /image/resize. Use `method: "insert"` to embed artwork into video files like MP4, MOV, or M4V',
  purpose_verb: 'extract',
  purpose_word: 'extract/insert artwork',
  purpose_words: 'Extract or insert video artwork',
  service_slug: 'video-encoding',
  slot_count: 20,
  title: 'Extract or insert video artwork',
  typical_file_size_mb: 3.8,
  typical_file_type: 'video',
  uses_tools: ['ffmpeg'],
  name: 'VideoArtworkRobot',
  priceFactor: 1,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'ga',
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

export const robotVideoArtworkInstructionsWithHiddenFieldsSchema =
  robotVideoArtworkInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotVideoArtworkInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotVideoArtworkInstructions = z.infer<typeof robotVideoArtworkInstructionsSchema>
export type RobotVideoArtworkInstructionsWithHiddenFields = z.infer<
  typeof robotVideoArtworkInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotVideoArtworkInstructionsSchema = interpolateRobot(
  robotVideoArtworkInstructionsSchema,
)
export type InterpolatableRobotVideoArtworkInstructions =
  InterpolatableRobotVideoArtworkInstructionsInput

export type InterpolatableRobotVideoArtworkInstructionsInput = z.input<
  typeof interpolatableRobotVideoArtworkInstructionsSchema
>

export const interpolatableRobotVideoArtworkInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotVideoArtworkInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotVideoArtworkInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotVideoArtworkInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotVideoArtworkInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotVideoArtworkInstructionsWithHiddenFieldsSchema
>
