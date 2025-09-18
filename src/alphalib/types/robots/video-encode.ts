import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  interpolateRobot,
  robotBase,
  robotUse,
  videoEncodeSpecificInstructionsSchema,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: false,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      hevc_encoded: {
        robot: '/video/encode',
        use: ':original',
        preset: 'hevc',
      },
    },
  },
  example_code_description:
    'Transcode uploaded video to [HEVC](https://en.wikipedia.org/wiki/High_Efficiency_Video_Coding) (H.265):',
  minimum_charge: 0,
  output_factor: 0.6,
  override_lvl1: 'Video Encoding',
  purpose_sentence: 'encodes, resizes, applies watermarks to videos and animated GIFs',
  purpose_verb: 'transcode',
  purpose_word: 'transcode/resize/watermark',
  purpose_words: 'Transcode, resize, or watermark videos',
  service_slug: 'video-encoding',
  slot_count: 60,
  title: 'Transcode, resize, or watermark videos',
  typical_file_size_mb: 80,
  typical_file_type: 'video',
  uses_tools: ['ffmpeg'],
  name: 'VideoEncodeRobot',
  priceFactor: 1,
  queueSlotCount: 60,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotVideoEncodeInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(videoEncodeSpecificInstructionsSchema)
  .extend({
    robot: z.literal('/video/encode'),
    font_size: z.number().optional(),
    font_color: z.string().optional(),
    text_background_color: z.string().optional(),
  })
  .strict()

export const robotVideoEncodeInstructionsWithHiddenFieldsSchema =
  robotVideoEncodeInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotVideoEncodeInstructionsSchema.shape.result])
      .optional(),
    chunked_transcoding: z.boolean().optional(),
    realtime: z.boolean().optional(),
  })

export type RobotVideoEncodeInstructions = z.infer<typeof robotVideoEncodeInstructionsSchema>
export type RobotVideoEncodeInstructionsWithHiddenFields = z.infer<
  typeof robotVideoEncodeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotVideoEncodeInstructionsSchema = interpolateRobot(
  robotVideoEncodeInstructionsSchema,
)
export type InterpolatableRobotVideoEncodeInstructions =
  InterpolatableRobotVideoEncodeInstructionsInput

export type InterpolatableRobotVideoEncodeInstructionsInput = z.input<
  typeof interpolatableRobotVideoEncodeInstructionsSchema
>

export const interpolatableRobotVideoEncodeInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotVideoEncodeInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotVideoEncodeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotVideoEncodeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotVideoEncodeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotVideoEncodeInstructionsWithHiddenFieldsSchema
>
