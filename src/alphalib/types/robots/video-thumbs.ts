import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  color_with_alpha,
  interpolateRobot,
  percentageSchema,
  resize_strategy,
  robotBase,
  robotFFmpeg,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: false,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      thumbnailed: {
        robot: '/video/thumbs',
        use: ':original',
        count: 10,
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
    },
  },
  example_code_description: 'Extract 10 thumbnails from each uploaded video:',
  minimum_charge: 0,
  output_factor: 0.05,
  override_lvl1: 'Video Encoding',
  purpose_sentence: 'extracts any number of images from videos for use as previews',
  purpose_verb: 'extract',
  purpose_word: 'thumbnail',
  purpose_words: 'Extract thumbnails from videos',
  service_slug: 'video-encoding',
  slot_count: 15,
  title: 'Extract thumbnails from videos',
  typical_file_size_mb: 80,
  typical_file_type: 'video',
  uses_tools: ['ffmpeg'],
  name: 'VideoThumbsRobot',
  priceFactor: 10,
  queueSlotCount: 15,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotVideoThumbsInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpeg)
  .extend({
    robot: z.literal('/video/thumbs').describe(`
> [!Note]
> Even though thumbnails are extracted from videos in parallel, we sort the thumbnails before adding them to the Assembly results. So the order in which they appear there reflects the order in which they appear in the video. You can also make sure by checking the <code>thumb_index</code> meta key.
`),
    count: z
      .number()
      .int()
      .min(1)
      .max(999)
      .default(8)
      .describe(`
The number of thumbnails to be extracted. As some videos have incorrect durations, the actual number of thumbnails generated may be less in rare cases. The maximum number of thumbnails we currently allow is 999.

The thumbnails are taken at regular intervals, determined by dividing the video duration by the count. For example, a count of 3 will produce thumbnails at 25%, 50% and 75% through the video.

To extract thumbnails for specific timestamps, use the \`offsets\` parameter.
`),
    offsets: z
      .union([z.array(z.number()), z.array(percentageSchema)])
      .default([])
      .describe(`
An array of offsets representing seconds of the file duration, such as \`[ 2, 45, 120 ]\`. Millisecond durations of a file can also be used by using decimal place values. For example, an offset from 1250 milliseconds would be represented with \`1.25\`. Offsets can also be percentage values such as \`[ "2%", "50%", "75%" ]\`.

This option cannot be used with the \`count\` parameter, and takes precedence if both are specified. Out-of-range offsets are silently ignored.
`),
    format: z
      .enum(['jpeg', 'jpg', 'png'])
      .default('jpeg')
      .describe(`
The format of the extracted thumbnail. Supported values are \`"jpg"\`, \`"jpeg"\` and \`"png"\`. Even if you specify the format to be \`"jpeg"\` the resulting thumbnails will have a \`"jpg"\` file extension.
`),
    width: z
      .number()
      .int()
      .min(1)
      .max(1920)
      .optional()
      .describe(`
The width of the thumbnail, in pixels. Defaults to the original width of the video.
`),
    height: z
      .number()
      .int()
      .min(1)
      .max(1080)
      .optional()
      .describe(`
The height of the thumbnail, in pixels. Defaults to the original height of the video.
`),
    resize_strategy: resize_strategy.describe(`
One of the [available resize strategies](/docs/topics/resize-strategies/).
`),
    background: color_with_alpha.default('#00000000').describe(`
The background color of the resulting thumbnails in the \`"rrggbbaa"\` format (red, green, blue, alpha) when used with the \`"pad"\` resize strategy. The default color is black.
`),
    rotate: z
      .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270), z.literal(360)])
      .default(0)
      .describe(`
Forces the video to be rotated by the specified degree integer. Currently, only multiples of 90 are supported. We automatically correct the orientation of many videos when the orientation is provided by the camera. This option is only useful for videos requiring rotation because it was not detected by the camera.
`),
    input_codec: z
      .string()
      .optional()
      .describe(`
Specifies the input codec to use when decoding the video. This is useful for videos with special codecs that require specific decoders.
`),
  })
  .strict()

export const robotVideoThumbsInstructionsWithHiddenFieldsSchema =
  robotVideoThumbsInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotVideoThumbsInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotVideoThumbsInstructions = z.infer<typeof robotVideoThumbsInstructionsSchema>
export type RobotVideoThumbsInstructionsWithHiddenFields = z.infer<
  typeof robotVideoThumbsInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotVideoThumbsInstructionsSchema = interpolateRobot(
  robotVideoThumbsInstructionsSchema,
)
export type InterpolatableRobotVideoThumbsInstructions =
  InterpolatableRobotVideoThumbsInstructionsInput

export type InterpolatableRobotVideoThumbsInstructionsInput = z.input<
  typeof interpolatableRobotVideoThumbsInstructionsSchema
>

export const interpolatableRobotVideoThumbsInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotVideoThumbsInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotVideoThumbsInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotVideoThumbsInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotVideoThumbsInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotVideoThumbsInstructionsWithHiddenFieldsSchema
>
