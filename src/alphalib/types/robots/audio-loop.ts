import { z } from 'zod'

import {
  bitrateSchema,
  ffmpegParamSchema,
  ffmpegStackVersionSchema,
  outputMetaParamSchema,
  preset,
  sampleRateSchema,
  useParamSchema,
} from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: false,
  bytescount: 4,
  discount_factor: 0.25,
  discount_pct: 75,
  example_code: {
    steps: {
      looped: {
        robot: '/audio/loop',
        use: ':original',
        duration: 300,
        // @ts-expect-error Discuss and resolve interpolation.
        ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
      },
    },
  },
  example_code_description: 'Loop uploaded audio to achieve a target duration of 300 seconds:',
  marketing_intro:
    'Whether you’re producing beats, white-noise, or just empty segments as fillers between audio tracks that you’re to stringing together with [🤖/audio/concat]({{robot_links["/audio/concat"]}}), [🤖/audio/loop]({{robot_links["/audio/loop"]}}) has got your back.',
  minimum_charge: 0,
  output_factor: 0.8,
  override_lvl1: 'Audio Encoding',
  purpose_sentence: 'loops one audio file as often as is required to match a given duration',
  purpose_verb: 'loop',
  purpose_word: 'loop',
  purpose_words: 'Loop audio',
  service_slug: 'audio-encoding',
  slot_count: 20,
  title: 'Loop audio',
  typical_file_size_mb: 3.8,
  typical_file_type: 'audio file',
}

export const robotAudioLoopInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/audio/loop'),
    use: useParamSchema,
    output_meta: outputMetaParamSchema,
    preset: preset.describe(`
Performs conversion using pre-configured settings.

If you specify your own FFmpeg parameters using the <dfn>Robot</dfn>'s \`ffmpeg\` parameter and you have not specified a preset, then the default \`mp3\` preset is not applied. This is to prevent you from having to override each of the \`mp3\` preset's values manually.

For a list of audio presets, see [audio presets](/docs/transcoding/audio-encoding/audio-presets/).
`),
    bitrate: bitrateSchema.optional().describe(`
Bit rate of the resulting audio file, in bits per second. If not specified will default to the bit rate of the input audio file.
`),
    sample_rate: sampleRateSchema.optional().describe(`
Sample rate of the resulting audio file, in Hertz. If not specified will default to the sample rate of the input audio file.
`),
    duration: z.number().default(60).describe(`
Target duration for the whole process in seconds. The <dfn>Robot</dfn> will loop the input audio file for as long as this target duration is not reached yet.
`),
    ffmpeg_stack: ffmpegStackVersionSchema.optional(),
    ffmpeg: ffmpegParamSchema.optional(),
  })
  .strict()
export type RobotAudioLoopInstructions = z.infer<typeof robotAudioLoopInstructionsSchema>
