import { z } from 'zod'

import {
  color_with_alpha,
  ffmpegStackVersionSchema,
  outputMetaParamSchema,
  percentageSchema,
  resize_strategy,
  useParamSchema,
} from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_free_plans: true,
  allowed_for_url_transform: false,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  docs_redirect_from: ['/docs/extracting-thumbnails-from-videos/'],
  example_code: {
    steps: {
      thumbnailed: {
        robot: '/video/thumbs',
        use: ':original',
        count: 10,
        // @ts-expect-error Discuss and resolve interpolation.
        ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
      },
    },
  },
  example_code_description: 'Extract 10 thumbnails from each uploaded video:',
  minimum_charge: 0,
  old_title: 'The /video/thumbs Robot',
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
}

export const robotVideoThumbsInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/video/thumbs'),
    use: useParamSchema,
    output_meta: outputMetaParamSchema,
    count: z.number().int().min(1).max(999).default(8).describe(`
The number of thumbnails to be extracted. As some videos have incorrect durations, the actual number of thumbnails generated may be less in rare cases. The maximum number of thumbnails we currently allow is 999.

The thumbnails are taken at regular intervals, determined by dividing the video duration by the count. For example, a count of 3 will produce thumbnails at 25%, 50% and 75% through the video.

To extract thumbnails for specific timestamps, use the \`offsets\` parameter.
`),
    offsets: z.union([z.array(z.number().int()), z.array(percentageSchema)]).default([]).describe(`
An array of offsets representing seconds of the file duration, such as \`[ 2, 45, 120 ]\`. Millisecond durations of a file can also be used by using decimal place values. For example, an offset from 1250 milliseconds would be represented with \`1.25\`. Offsets can also be percentage values such as \`[ "2%", "50%", "75%" ]\`.

This option cannot be used with the \`count\` parameter, and takes precedence if both are specified. Out-of-range offsets are silently ignored.
`),
    format: z.enum(['jpeg', 'jpg', 'png']).default('jpeg').describe(`
The format of the extracted thumbnail. Supported values are \`"jpg"\`, \`"jpeg"\` and \`"png"\`. Even if you specify the format to be \`"jpeg"\` the resulting thumbnails will have a \`"jpg"\` file extension.
`),
    width: z.number().int().min(1).max(1920).optional().describe(`
The width of the thumbnail, in pixels. Defaults to the original width of the video.
`),
    height: z.number().int().min(1).max(1080).optional().describe(`
The height of the thumbnail, in pixels. Defaults to the original height of the video.
`),
    resize_strategy: resize_strategy.describe(`
One of the [available resize strategies](/docs/transcoding/image-manipulation/image-resize/#resize-strategies).
`),
    background: color_with_alpha.default('#00000000').describe(`
The background color of the resulting thumbnails in the \`"rrggbbaa"\` format (red, green, blue, alpha) when used with the \`"pad"\` resize strategy. The default color is black.
`),
    rotate: z
      .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270), z.literal(360)])
      .default(0),
    ffmpeg_stack: ffmpegStackVersionSchema.describe(`
Forces the video to be rotated by the specified degree integer. Currently, only multiples of 90 are supported. We automatically correct the orientation of many videos when the orientation is provided by the camera. This option is only useful for videos requiring rotation because it was not detected by the camera.
`),
  })
  .strict()

export type RobotVideoThumbsInstructions = z.infer<typeof robotVideoThumbsInstructionsSchema>
