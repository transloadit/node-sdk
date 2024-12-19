import { z } from 'zod'

import type { RobotMeta } from './_instructions-primitives.ts'
import { useParamSchema } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 20,
  discount_factor: 0.1,
  discount_pct: 90,
  minimum_charge: 0,
  output_factor: 0.05,
  override_lvl1: 'Media Cataloging',
  purpose_sentence: 'merges segment files to generate playlist files for HTTP Live Streaming (HLS)',
  purpose_verb: 'generate',
  purpose_word: 'generate playlists',
  purpose_words: 'Generate media playlists',
  service_slug: 'media-cataloging',
  slot_count: 5,
  title: 'Generate media playlists',
  typical_file_size_mb: 80,
  typical_file_type: 'video',
}

export const robotMediaPlaylistInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/media/playlist').describe(`
🤖/media/playlist is deprecated and will be removed! Please use [🤖/video/adaptive](/docs/transcoding/video-encoding/video-adaptive/) for all your HLS and MPEG-Dash needs instead.
`),
    use: useParamSchema,
    name: z.string().default('playlist.m3u8').describe(`
The final name of the playlist file.
`),
    relative_to: z.string().optional().optional().describe(`
URL prefixes to use in the playlist file. Example: \`"/234p/"\`
`),
    resolution: z.string().optional().describe(`
The resolution reported in the playlist file. Example: \`"416×234"\`. [More info](https://developer.apple.com/library/ios/technotes/tn2224/_index.html#//apple_ref/doc/uid/DTS40009745-CH1-DECIDEONYOURVARIANTS-DEVICE_CAPABILITIES).
`),
    codes: z.string().optional().describe(`
The codecs reported in the playlist file. Example: \`"avc1.42001e,mp4a.40.34"\`. [More info](https://developer.apple.com/library/ios/technotes/tn2224/_index.html#//apple_ref/doc/uid/DTS40009745-CH1-DECIDEONYOURVARIANTS-DEVICE_CAPABILITIES).
`),
    bandwidth: z.union([z.literal('auto'), z.number()]).default('auto').describe(`
The bandwidth reported in the playlist file. Example: \`2560000\`. [More  info](https://developer.apple.com/library/ios/technotes/tn2224/_index.html#//apple_ref/doc/uid/DTS40009745-CH1-DECIDEONYOURVARIANTS-DEVICE_CAPABILITIES). This value is expressed in bits per second.
`),
    closed_captions: z.boolean().default(true).describe(`
When set to false, adds the \`"CLOSED-CAPTIONS=NONE"\` directive to the Playlist file.
`),
    meta_name: z.string().optional().describe(`
The meta name as used for \`NAME\` in the \`#EXT-X-STREAM-INF\` path in playlists. Can be different from the (file)\`name\`.
`),
    protocol: z.enum(['http', 'https']).default('http').describe(`
The URL protocol used for all URLs in playlists.
`),
  })
  .strict()

export type RobotMediaPlaylistInstructions = z.infer<typeof robotMediaPlaylistInstructionsSchema>
