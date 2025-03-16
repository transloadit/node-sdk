import { z } from 'zod'

import {
  color_with_alpha,
  robotFFmpegVideo,
  interpolationSchemaToYieldNumber,
  interpolationSchemaToYieldString,
  percentageSchema,
  positionSchema,
  resize_strategy,
  robotBase,
  robotUse,
  unsafeCoordinatesSchema,
} from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
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
}

export const robotVideoEncodeInstructionsInterpolatedSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegVideo)
  .extend({
    robot: z.literal('/video/encode'),
    resize_strategy: resize_strategy.describe(`
See the [available resize strategies](/docs/transcoding/image-manipulation/image-resize/#resize-strategies).
`),
    zoom: z.boolean().default(true).describe(`
If this is set to \`false\`, smaller videos will not be stretched to the desired width and height. For details about the impact of zooming for your preferred resize strategy, see the list of available [resize strategies](/docs/transcoding/image-manipulation/image-resize/#resize-strategies).
`),
    crop: unsafeCoordinatesSchema.optional().describe(`
Specify an object containing coordinates for the top left and bottom right corners of the rectangle to be cropped from the original video(s). Values can be integers for absolute pixel values or strings for percentage based values.

For example:

\`\`\`json

{
  "x1": 80,
  "y1": 100,
  "x2": "60%",
  "y2": "80%"
}

\`\`\`

This will crop the area from \`(80, 100)\` to \`(600, 800)\` from a 1000×1000 pixels video, which is a square whose width is 520px and height is 700px. If \`crop\` is set, the width and height parameters are ignored, and the \`resize_strategy\` is set to \`crop\` automatically.

You can also use a JSON string of such an object with coordinates in similar fashion: \`"{ "x1": <Integer>, "y1": <Integer>, "x2": <Integer>, "y2": <Integer> }"\`
`),
    background: color_with_alpha.default('#00000000').describe(`
The background color of the resulting video the \`"rrggbbaa"\` format (red, green, blue, alpha) when used with the \`"pad"\` resize strategy. The default color is black.
`),
    rotate: z
      // We can’t use enum.
      // See https://github.com/colinhacks/zod/issues/2686
      .union([
        z.literal(0),
        z.literal(90),
        z.literal(180),
        z.literal(270),
        z.literal(360),
        z.literal(false),
      ])
      .optional().describe(`
Forces the video to be rotated by the specified degree integer. Currently, only multiples of \`90\` are supported. We automatically correct the orientation of many videos when the orientation is provided by the camera. This option is only useful for videos requiring rotation because it was not detected by the camera. If you set \`rotate\` to \`false\` no rotation is performed, even if the metadata contains such instructions.
`),
    hint: z.boolean().default(false).describe(`
Enables hinting for mp4 files, for RTP/RTSP streaming.
`),
    turbo: z.boolean().default(false).describe(`
Splits the video into multiple chunks so that each chunk can be encoded in parallel before all encoded chunks are stitched back together to form the result video. This comes at the expense of extra <dfn>Priority Job Slots</dfn> and may prove to be counter-productive for very small video files.
`),
    chunk_duration: z.number().int().min(1).optional().describe(`
Allows you to specify the duration of each chunk when \`turbo\` is set to \`true\`. This means you can take advantage of that feature while using fewer <dfn>Priority Job Slots</dfn>. For instance, the longer each chunk is, the fewer <dfn>Encoding Jobs</dfn> will need to be used.
`),
    freeze_detect: z.boolean().default(false).describe(`
Examines the transcoding result file for video freeze frames and re-transcodes the video a second time if they are found. This is useful when you are using \`turbo: true\` because freeze frames can sometimes happen there. The re-transcode would then happen without turbo mode.
`),
    watermark_url: z.string().default('').describe(`
A URL indicating a PNG image to be overlaid above this image. You can also [supply the watermark via another Assembly Step](/docs/transcoding/video-encoding/video-encode/#watermark-parameters-video-encode).
`),
    watermark_position: z.union([positionSchema, z.array(positionSchema)]).default('center')
      .describe(`
The position at which the watermark is placed.

An array of possible values can also be specified, in which case one value will be selected at random, such as \`[ "center", "left", "bottom-left", "bottom-right" ]\`.

This setting puts the watermark in the specified corner. To use a specific pixel offset for the watermark, you will need to add the padding to the image itself.
`),
    watermark_x_offset: z.number().int().default(0).describe(`
The x-offset in number of pixels at which the watermark will be placed in relation to the position it has due to \`watermark_position\`.

Values can be both positive and negative and yield different results depending on the \`watermark_position\` parameter. Positive values move the watermark closer to the image's center point, whereas negative values move the watermark further away from the image's center point.
`),
    watermark_y_offset: z.number().int().default(0).describe(`
The y-offset in number of pixels at which the watermark will be placed in relation to the position it has due to \`watermark_position\`.

Values can be both positive and negative and yield different results depending on the \`watermark_position\` parameter. Positive values move the watermark closer to the image's center point, whereas negative values move the watermark further away from the image's center point.
`),
    watermark_size: percentageSchema.optional().describe(`
The size of the watermark, as a percentage, such as \`"50%"\`. How the watermark is resized greatly depends on the \`watermark_resize_strategy\`.
`),
    watermark_resize_strategy: z.enum(['area', 'fit', 'stretch']).default('fit').describe(`
To explain how the resize strategies work, let's assume our target video size is 800×800 pixels and our watermark image is 400×300 pixels. Let's also assume, the \`watermark_size\` parameter is set to \`"25%"\`.

For the \`"fit"\` resize strategy, the watermark is scaled so that the longer side of the watermark takes up 25% of the corresponding video side. And the other side is scaled according to the aspect ratio of the watermark image. So with our watermark, the width is the longer side, and 25% of the video size would be 200px. Hence, the watermark would be resized to 200×150 pixels. If the \`watermark_size\` was set to \`"50%"\`", it would be resized to 400×300 pixels (so just left at its original size).

For the \`"stretch"\` resize strategy, the watermark image is stretched (meaning, it is resized without keeping its aspect ratio in mind) so that both sides take up 25% of the corresponding video side. Since our video is 800×800 pixels, for a watermark size of 25% the watermark would be resized to 200×200 pixels. Its height would appear stretched, because keeping the aspect ratio in mind it would be resized to 200×150 pixels instead.

For the \`"area"\` resize strategy, the watermark is resized (keeping its aspect ratio in check) so that it covers \`"xx%"\` of the video's surface area. The value from \`watermark_size\` is used for the percentage area size.
`),
    watermark_start_time: z.number().default(0).describe(`
The delay in seconds from the start of the video for the watermark to appear. By default the watermark is immediately shown.
`),
    watermark_duration: z.number().default(-1).describe(`
The duration in seconds for the watermark to be shown. Can be used together with \`watermark_start_time\` to create nice effects. The default value is \`-1.0\`, which means that the watermark is shown for the entire duration of the video.
`),
    watermark_opacity: z.number().min(0).max(1).default(1).describe(`
The opacity of the watermark. Valid values are between \`0\` (invisible) and \`1.0\` (full visibility).
`),
    segment: z.boolean().default(false).describe(`
Splits the file into multiple parts, to be used for Apple's [HTTP Live Streaming](https://developer.apple.com/resources/http-streaming/).
`),
    segment_duration: z.number().int().min(1).default(10).describe(`
Specifies the length of each HTTP segment. This is optional, and the default value as recommended by Apple is \`10\`. Do not change this value unless you have a good reason.
`),
    segment_prefix: z.string().default('').describe(`
The prefix used for the naming. For example, a prefix of \`"segment_"\` would produce files named \`"segment_0.ts"\`, \`"segment_1.ts"\` and so on. This is optional, and defaults to the base name of the input file. Also see the related \`segment_name\` parameter.
`),
    segment_name: z.string().default('').describe(`
The name used for the final segment. Available variables are \`\${segment_prefix}\`, \`\${segment_number}\` and \`\${segment_id}\` (which is a UUIDv4 without dashes).
`),
  })
  .strict()

export const robotVideoEncodeInstructionsSchema =
  robotVideoEncodeInstructionsInterpolatedSchema.extend({
    width: robotVideoEncodeInstructionsInterpolatedSchema.shape.width.or(
      interpolationSchemaToYieldNumber,
    ),
    height: robotVideoEncodeInstructionsInterpolatedSchema.shape.height.or(
      interpolationSchemaToYieldNumber,
    ),
    background: robotVideoEncodeInstructionsInterpolatedSchema.shape.background.or(
      interpolationSchemaToYieldString,
    ),
    resize_strategy: robotVideoEncodeInstructionsInterpolatedSchema.shape.resize_strategy.or(
      interpolationSchemaToYieldString,
    ),
  })

export type RobotVideoEncodeInstructions = z.infer<typeof robotVideoEncodeInstructionsSchema>
export type RobotVideoEncodeInstructionsInput = z.input<typeof robotVideoEncodeInstructionsSchema>
