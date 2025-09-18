import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  interpolateRobot,
  robotBase,
  robotFFmpegVideo,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: false,
  bytescount: Number.POSITIVE_INFINITY,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      ':original': {
        robot: '/upload/handle',
      },
      encoded_480p: {
        robot: '/video/encode',
        use: ':original',
        preset: 'hls/480p',
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
      encoded_720p: {
        robot: '/video/encode',
        use: ':original',
        preset: 'hls/720p',
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
      encoded_1080p: {
        robot: '/video/encode',
        use: ':original',
        preset: 'hls/1080p',
        ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
      },
      hls_bundled: {
        robot: '/video/adaptive',
        use: {
          steps: ['encoded_480p', 'encoded_720p', 'encoded_1080p'],
          bundle_steps: true,
        },
        technique: 'hls',
        playlist_name: 'my_playlist.m3u8',
      },
    },
  },
  example_code_description:
    'Implementing HTTP Live Streaming: encode the uploaded video into three versions, then cut them into several segments and generate playlist files containing all the segments:',
  minimum_charge: 0,
  output_factor: 1.2,
  override_lvl1: 'Video Encoding',
  purpose_sentence:
    'encodes videos into HTTP Live Streaming (HLS) and MPEG-Dash supported formats and generates the necessary manifest and playlist files',
  purpose_verb: 'convert',
  purpose_word: 'make adaptive',
  purpose_words: 'Convert videos to HLS and MPEG-Dash',
  service_slug: 'video-encoding',
  slot_count: 60,
  title: 'Convert videos to HLS and MPEG-Dash',
  typical_file_size_mb: 80,
  typical_file_type: 'video',
  name: 'VideoAdaptiveRobot',
  priceFactor: 1,
  queueSlotCount: 60,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotVideoAdaptiveInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegVideo)
  .extend({
    robot: z.literal('/video/adaptive').describe(`
This <dfn>Robot</dfn> accepts all types of video files and audio files. Do not forget to use <dfn>Step</dfn> bundling in your \`use\` parameter to make the <dfn>Robot</dfn> work on several input files at once.

This <dfn>Robot</dfn> is normally used in combination with [🤖/video/encode](/docs/robots/video-encode/). We have implemented video and audio encoding presets specifically for MPEG-Dash and HTTP Live Streaming support. These presets are prefixed with \`"dash/"\` and \`"hls/"\`. [View a HTTP Live Streaming demo here](/demos/video-encoding/implement-http-live-streaming/).

### Required CORS settings for MPEG-Dash and HTTP Live Streaming

Playing back MPEG-Dash Manifest or HLS playlist files requires a proper CORS setup on the server-side. The file-serving server should be configured to add the following header fields to responses:

\`\`\`
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: *
\`\`\`

If the files are stored in an Amazon S3 Bucket, you can use the following [CORS definition](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html) to ensure the CORS header fields are set correctly:

\`\`\`json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
\`\`\`

To set up CORS for your S3 bucket:

1. Visit <https://s3.console.aws.amazon.com/s3/buckets/>
1. Click on your bucket
1. Click "Permissions"
1. Edit "Cross-origin resource sharing (CORS)"

### Storing Segments and Playlist files

The <dfn>Robot</dfn> gives its result files (segments, initialization segments, MPD manifest files and M3U8 playlist files) the right metadata property \`relative_path\`, so that you can store them easily using one of our storage <dfn>Robots</dfn>.

In the \`path\` parameter of the storage <dfn>Robot</dfn> of your choice, use the <dfn>Assembly Variable</dfn> \`\${file.meta.relative_path}\` to store files in the proper paths to make the playlist files work.
`),
    technique: z
      .enum(['dash', 'hls'])
      .default('dash')
      .describe(`
Determines which streaming technique should be used. Currently supports \`"dash"\` for MPEG-Dash and \`"hls"\` for HTTP Live Streaming.
`),
    playlist_name: z
      .string()
      .optional()
      .describe(`
The filename for the generated manifest/playlist file. The default is \`"playlist.mpd"\` if your \`technique\` is \`"dash"\`, and \`"playlist.m3u8"\` if your \`technique\` is \`"hls"\`.
`),
    segment_duration: z
      .number()
      .int()
      .default(10)
      .describe(`
The duration for each segment in seconds.
`),
    closed_captions: z
      .boolean()
      .default(true)
      .describe(`
Determines whether you want closed caption support when using the \`"hls"\` technique.
`),
  })
  .strict()

export const robotVideoAdaptiveInstructionsWithHiddenFieldsSchema =
  robotVideoAdaptiveInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotVideoAdaptiveInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotVideoAdaptiveInstructions = z.infer<typeof robotVideoAdaptiveInstructionsSchema>
export type RobotVideoAdaptiveInstructionsWithHiddenFields = z.infer<
  typeof robotVideoAdaptiveInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotVideoAdaptiveInstructionsSchema = interpolateRobot(
  robotVideoAdaptiveInstructionsSchema,
)
export type InterpolatableRobotVideoAdaptiveInstructions =
  InterpolatableRobotVideoAdaptiveInstructionsInput

export type InterpolatableRobotVideoAdaptiveInstructionsInput = z.input<
  typeof interpolatableRobotVideoAdaptiveInstructionsSchema
>

export const interpolatableRobotVideoAdaptiveInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotVideoAdaptiveInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotVideoAdaptiveInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotVideoAdaptiveInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotVideoAdaptiveInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotVideoAdaptiveInstructionsWithHiddenFieldsSchema
>
