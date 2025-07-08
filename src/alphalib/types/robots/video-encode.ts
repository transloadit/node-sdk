import { z } from 'zod'

import {
  robotBase,
  robotUse,
  interpolateRobot,
  videoEncodeSpecificInstructionsSchema,
} from './_instructions-primitives.ts'
import type { RobotMetaInput } from './_instructions-primitives.ts'

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
  })
  .strict()

export type RobotVideoEncodeInstructions = z.infer<typeof robotVideoEncodeInstructionsSchema>
export type RobotVideoEncodeInstructionsInput = z.input<typeof robotVideoEncodeInstructionsSchema>

export const interpolatableRobotVideoEncodeInstructionsSchema = interpolateRobot(
  robotVideoEncodeInstructionsSchema,
)
export type InterpolatableRobotVideoEncodeInstructions = z.input<
  typeof interpolatableRobotVideoEncodeInstructionsSchema
>
