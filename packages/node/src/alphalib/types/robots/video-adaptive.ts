import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import {
  defineRobot,
  robotBase,
  robotFFmpegVideo,
  robotUse,
  robotVideoEncodingMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotVideoEncodingMeta,
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
  purpose_sentence:
    'encodes videos into HTTP Live Streaming (HLS), MPEG-Dash and CMAF supported formats and generates the necessary manifest and playlist files',
  purpose_verb: 'convert',
  purpose_word: 'make adaptive',
  purpose_words: 'Convert videos to HLS, MPEG-Dash and CMAF',
  title: 'Convert videos to HLS, MPEG-Dash and CMAF',
  name: 'VideoAdaptiveRobot',
}

export const robotVideoAdaptiveInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegVideo)
  .extend({
    robot: z.literal('/video/adaptive').describe(`
This <dfn>Robot</dfn> accepts all types of video files and audio files. Do not forget to use <dfn>Step</dfn> bundling in your \`use\` parameter to make the <dfn>Robot</dfn> work on several input files at once.

This <dfn>Robot</dfn> is normally used in combination with [🤖/video/encode](/docs/robots/video-encode/). We have implemented video and audio encoding presets specifically for MPEG-Dash and HTTP Live Streaming support. These presets are prefixed with \`"dash/"\` and \`"hls/"\`. [View a HTTP Live Streaming demo here](/demos/video-encoding/implement-http-live-streaming/).

### CMAF aspect ratios

CMAF aligns near-equal rendition aspect ratios, within 1% of the largest rendition, without re-encoding or changing pixel dimensions. This lets presets such as \`"hls/480p"\` and \`"hls/720p"\` support bitrate switching together.

Renditions with substantially different ratios, such as 4:3 and 16:9, keep their geometry in separate video groups. The Assembly warns because DASH players cannot switch bitrate between these groups. HLS still lists every variant. Use matching rendition ratios when custom FFmpeg options change video geometry or layout.

### Segment alignment

HLS and CMAF video segments split at existing keyframes, so their actual duration can exceed \`segment_duration\`. To align renditions to four-second segments, set \`"ffmpeg": { "force_key_frames": "expr:gte(t,n_forced*4)" }\` in each preceding [🤖/video/encode](/docs/robots/video-encode/) Step. Replace \`4\` with your chosen segment duration and use the same value for every rendition. Set keyframe intervals during encoding; packaging cannot add keyframes to copied streams.

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
    ffmpeg: robotFFmpegVideo.shape.ffmpeg.describe(`
Custom FFmpeg options are supported for the \`"hls"\` and \`"cmaf"\` techniques. Non-empty custom options are rejected for \`"dash"\`, the default technique.

These options apply to the packaging command, which copies the input streams by default. Set encoding options, such as keyframe intervals, in the preceding [🤖/video/encode](/docs/robots/video-encode/) Step.
`),
    ffmpeg_stack: robotFFmpegVideo.shape.ffmpeg_stack
      .removeDefault()
      .default('v7.0.0')
      .describe(`
Selects the FFmpeg stack for packaging. Defaults to \`"v7.0.0"\`. This Robot always uses at least \`"v7.0.0"\`; older stack selections are upgraded automatically.
`),
    preset: robotFFmpegVideo.shape.preset.describe(`
This parameter has no effect on this Robot. Set the encoding preset in the preceding [🤖/video/encode](/docs/robots/video-encode/) Step.
`),
    width: robotFFmpegVideo.shape.width.describe(`
This parameter has no effect on this Robot. Set the rendition width in the preceding [🤖/video/encode](/docs/robots/video-encode/) Step.
`),
    height: robotFFmpegVideo.shape.height.describe(`
This parameter has no effect on this Robot. Set the rendition height in the preceding [🤖/video/encode](/docs/robots/video-encode/) Step.
`),
    technique: z
      .enum(['dash', 'hls', 'cmaf'])
      .default('dash')
      .describe(`
Determines which streaming technique should be used. Supports \`"dash"\` for MPEG-Dash, \`"hls"\` for HTTP Live Streaming and \`"cmaf"\` for FFmpeg-based CMAF output with both MPEG-Dash and HLS manifests that reference the same fMP4 segments.
`),
    playlist_name: z
      .string()
      .optional()
      .describe(`
The filename for the generated manifest/playlist file. The default is \`"playlist.mpd"\` if your \`technique\` is \`"dash"\`, and \`"playlist.m3u8"\` if your \`technique\` is \`"hls"\`.
For \`"cmaf"\`, this value names the MPEG-Dash manifest and defaults to \`"playlist.mpd"\`.
`),
    hls_playlist_name: z
      .string()
      .optional()
      .describe(`
Only used when \`technique\` is \`"cmaf"\`. Defines the filename for the generated HLS master playlist. The default is \`"playlist.m3u8"\`.
`),
    segment_duration: z
      .number()
      .int()
      .optional()
      .describe(`
The duration for each segment in seconds. When omitted, defaults to 4 seconds for MPEG-Dash and CMAF, and 10 seconds for HLS.
`),
    closed_captions: z
      .boolean()
      .default(true)
      .describe(`
Determines whether you want closed caption support when using the \`"hls"\` technique.
`),
    audio_group: z
      .boolean()
      .default(false)
      .describe(`
When set to \`true\` and using the \`"hls"\` technique, audio-only input files are treated as alternate audio renditions instead of standalone stream variants. This enables players to offer audio track selection (e.g. for multiple languages). Audio-only files are listed as \`#EXT-X-MEDIA:TYPE=AUDIO\` entries in the multivariant playlist, and video variants reference them via the \`AUDIO\` attribute.

When enabled, video inputs only include their video stream in the output segments (any muxed audio is excluded). Provide audio separately as audio-only input files.

Each rendition’s \`LANGUAGE\` comes from the first audio stream’s \`language\` tag in its audio-only input file, or \`"und"\` when the tag is missing. Set the tag on [🤖/audio/encode](/docs/robots/audio-encode/) with \`"ffmpeg": {"metadata:s:a:0": "language=deu"}\`, for example.

The first audio-only input in \`use.steps\` order becomes \`DEFAULT=YES\`; the other renditions have \`DEFAULT=NO\`. All audio renditions have \`AUTOSELECT=YES\`. Their \`NAME\` uses the audio stream’s \`title\` tag when present, otherwise its language’s English name (for example, \`"eng"\` becomes “English” and \`"deu"\` becomes “German”). Untagged audio is named “Unknown”; unrecognized language codes are used as the name. Duplicate names receive a numeric suffix.

This option only enables alternate audio renditions with the \`"hls"\` technique and does not change packaging with \`"dash"\` or \`"cmaf"\`. CMAF puts all audio in one adaptation set labeled with the first audio language. Setting \`audio_group: true\` with CMAF, or providing CMAF inputs with more than one known audio language (including tracks muxed in a single video), adds an Assembly warning; packaging continues with the existing CMAF output. For multi-language audio, use \`technique: "hls"\` with \`audio_group: true\`.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotVideoAdaptiveInstructionsSchema.shape> =
  defineRobot(meta, robotVideoAdaptiveInstructionsSchema)

export const {
  withHiddenFields: robotVideoAdaptiveInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotVideoAdaptiveInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotVideoAdaptiveInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotVideoAdaptiveInstructions = Instructions['output']
export type RobotVideoAdaptiveInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotVideoAdaptiveInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotVideoAdaptiveInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotVideoAdaptiveInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotVideoAdaptiveInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
