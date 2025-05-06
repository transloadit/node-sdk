import { z } from 'zod'

import type { RobotMeta } from './_instructions-primitives.ts'
import {
  interpolateRobot,
  robotBase,
  robotUse,
  robotFFmpegVideo,
} from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  discount_factor: 1,
  discount_pct: 0,
  bytescount: 1,
  docs_redirect_from: ['/docs/video-ondemand/'],
  example_code: {
    steps: {
      import: {
        robot: '/s3/import',
        path: '${fields.input}',
        credentials: 'YOUR_AWS_CREDENTIALS',
        return_file_stubs: true,
      },
      vod: {
        robot: '/video/ondemand',
        use: 'import',
        variants: {
          '480p': {
            preset: 'hls/480p',
            ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
          },
          '720p': {
            preset: 'hls/720p',
            ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
          },
          '1080p': {
            preset: 'hls/1080p',
            ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
          },
        },
      },
      serve: {
        use: 'vod',
        robot: '/file/serve',
      },
    },
  },
  example_code_description:
    'Enable streaming of a video stored on S3 in three variants (480p, 720p, 1080p) with on-demand encoding:',
  minimum_charge: 0,
  output_factor: 0.6,
  override_lvl1: 'Video Encoding',
  purpose_sentence:
    'generates HTTP Live Streaming (HLS) playlists and segments on-demand for adaptive and cost-efficient playback',
  purpose_verb: 'stream',
  purpose_word: 'stream',
  purpose_words: 'Stream videos with on-demand encoding',
  service_slug: 'video-encoding',
  slot_count: 60,
  title: 'Stream videos with on-demand encoding',
  typical_file_size_mb: 300,
  typical_file_type: 'video',
}

export const robotVideoOndemandInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/video/ondemand'),
    variants: z
      .record(robotFFmpegVideo)
      .describe(
        'Defines the variants the video player can choose from. The keys are the names of the variant as they will appear in the generated playlists and URLs.',
      ),
    enabled_variants: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        'Specifies which variants, defined in the variants parameter, are enabled. Non-enabled variants will not be included in the master playlist.',
      ),
    segment_duration: z
      .number()
      .optional()
      .default(6)
      .describe('The duration of each segment in seconds.'),
    sign_urls_for: z
      .number()
      .optional()
      .default(0)
      .describe(
        'When signing URLs is enabled, the URLs in the generated playlist files will be signed. This parameter specifies the duration (in seconds) that the signed URLs will remain valid.',
      ),
    asset: z
      .string()
      .optional()
      .describe(
        'Controls which file is generated. For example, if the parameter is unset, a master playlist referencing the variants is generated.',
      ),
    asset_param_name: z
      .string()
      .optional()
      .default('asset')
      .describe(
        'Specifies from which URL parameter the asset parameter value is taken and which URL parameter to use when generating playlist files.',
      ),
  })
  .strict()

export type RobotVideoOndemandInstructions = z.infer<typeof robotVideoOndemandInstructionsSchema>

export const interpolatableRobotVideoOndemandInstructionsSchema = interpolateRobot(
  robotVideoOndemandInstructionsSchema,
)
export type InterpolatableRobotVideoOndemandInstructions = z.input<
  typeof interpolatableRobotVideoOndemandInstructionsSchema
>
