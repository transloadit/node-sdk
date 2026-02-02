export type GoldenTemplate = {
  slug: string
  version: string
  description: string
  steps: Record<string, unknown>
}

export const goldenTemplates = {
  '~transloadit/encode-hls-video@0.0.1': {
    slug: '~transloadit/encode-hls-video@0.0.1',
    version: '0.0.1',
    description:
      'Encode an input video into HLS renditions (270p, 360p, 540p) with an adaptive playlist.',
    steps: {
      ':original': {
        robot: '/upload/handle',
      },
      low: {
        robot: '/video/encode',
        use: ':original',
        ffmpeg_stack: 'v7.0.0',
        preset: 'hls-270p',
        result: true,
        turbo: true,
      },
      mid: {
        robot: '/video/encode',
        use: ':original',
        ffmpeg_stack: 'v7.0.0',
        preset: 'hls-360p',
        result: true,
        turbo: true,
      },
      high: {
        robot: '/video/encode',
        use: ':original',
        ffmpeg_stack: 'v7.0.0',
        preset: 'hls-540p',
        result: true,
        turbo: true,
      },
      adaptive: {
        robot: '/video/adaptive',
        use: {
          steps: ['low', 'mid', 'high'],
          bundle_steps: true,
        },
        technique: 'hls',
        playlist_name: 'my_playlist.m3u8',
      },
    },
  },
} satisfies Record<string, GoldenTemplate>
