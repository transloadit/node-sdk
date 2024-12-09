import { z } from 'zod'

import { useParamSchema } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_free_plans: true,
  allowed_for_url_transform: false,
  bytescount: 0,
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
        // @ts-expect-error Discuss and resolve interpolation.
        ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
      },
      encoded_720p: {
        robot: '/video/encode',
        use: ':original',
        preset: 'hls/720p',
        // @ts-expect-error Discuss and resolve interpolation.
        ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
      },
      encoded_1080p: {
        robot: '/video/encode',
        use: ':original',
        preset: 'hls/1080p',
        // @ts-expect-error Discuss and resolve interpolation.
        ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
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
  old_title: 'The /video/adaptive Robot',
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
}

export const robotVideoAdaptiveInstructionsSchema = z
  .object({
    robot: z.literal('/video/adaptive'),
    use: useParamSchema,
    technique: z.enum(['dash', 'hls']).default('dash').describe(`
Determines which streaming technique should be used. Currently supports \`"dash"\` for MPEG-Dash and \`"hls"\` for HTTP Live Streaming.
`),
    playlist_name: z.string().optional().describe(`
The filename for the generated manifest/playlist file. The default is \`"playlist.mpd"\` if your \`technique\` is \`"dash"\`, and \`"playlist.m3u8"\` if your \`technique\` is \`"hls"\`.
`),
    segment_duration: z.number().int().default(10).describe(`
The duration for each segment in seconds.
`),
    closed_captions: z.boolean().default(true).describe(`
Determines whether you want closed caption support when using the \`"hls"\` technique.
`),
  })
  .strict()

export type RobotVideoAdaptiveInstructions = z.infer<typeof robotVideoAdaptiveInstructionsSchema>
