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
      mp3_encoded: {
        robot: '/audio/encode',
        use: ':original',
        preset: 'mp3',
        bitrate: 256000,
        // @ts-expect-error Discuss and resolve interpolation.
        ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
      },
    },
  },
  example_code_description: 'Encode uploaded audio to MP3 format at a 256 kbps bitrate:',
  minimum_charge: 0,
  output_factor: 0.8,
  override_lvl1: 'Audio Encoding',
  purpose_sentence:
    'converts audio files into all kinds of formats for you. We provide encoding presets for the most common formats',
  purpose_verb: 'encode',
  purpose_word: 'encode',
  purpose_words: 'Encode audio',
  service_slug: 'audio-encoding',
  slot_count: 20,
  title: 'Encode audio',
  typical_file_size_mb: 3.8,
  typical_file_type: 'audio file',
}

export const robotAudioEncodeInstructionsSchema = z
  .object({
    robot: z.literal('/audio/encode'),
    use: useParamSchema,
    output_meta: outputMetaParamSchema,
    preset: preset.default('mp3').describe(`
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
    ffmpeg_stack: ffmpegStackVersionSchema.optional(),
    ffmpeg: ffmpegParamSchema,
  })
  .strict()
export type RobotAudioEncodeInstructions = z.infer<typeof robotAudioEncodeInstructionsSchema>
