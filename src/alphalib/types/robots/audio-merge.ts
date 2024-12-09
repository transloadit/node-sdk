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
      merged: {
        robot: '/audio/merge',
        preset: 'mp3',
        use: {
          steps: [
            { name: ':original', fields: 'first_audio_file', as: 'audio' },
            { name: ':original', fields: 'second_audio_file', as: 'audio' },
            { name: ':original', fields: 'third_audio_file', as: 'audio' },
          ],
        },
        // @ts-expect-error Discuss and resolve interpolation.
        ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
      },
    },
  },
  example_code_description:
    'If you have a form with 3 file input fields and wish to overlay the uploaded audios, instruct Transloadit using the `name` attribute of each input field. Use this attribute as the value for the `fields` key in the JSON, and set `as` to `audio`:',
  minimum_charge: 0,
  output_factor: 0.8,
  override_lvl1: 'Audio Encoding',
  purpose_sentence: 'overlays several audio files on top of each other',
  purpose_verb: 'merge',
  purpose_word: 'merge',
  purpose_words: 'Merge audio files into one',
  service_slug: 'audio-encoding',
  slot_count: 20,
  title: 'Merge audio files into one',
  typical_file_size_mb: 3.8,
  typical_file_type: 'audio file',
}

export const robotAudioMergeInstructionsSchema = z
  .object({
    robot: z.literal('/audio/merge'),
    use: useParamSchema,
    output_meta: outputMetaParamSchema,
    preset: preset.describe(`
Performs conversion using pre-configured settings.

If you specify your own FFmpeg parameters using the <dfn>Robot</dfn>'s \`ffmpeg\` parameter and you have not specified a preset, then the default "mp3" preset is not applied. This is to prevent you from having to override each of the mp3 preset's values manually.

For a list of audio presets, see [audio presets](/docs/transcoding/audio-encoding/audio-presets/).`),
    bitrate: bitrateSchema.optional().describe(`
Bit rate of the resulting audio file, in bits per second. If not specified will default to the bit rate of the input audio file.
`),
    sample_rate: sampleRateSchema.optional().describe(`
Sample rate of the resulting audio file, in Hertz. If not specified will default to the sample rate of the input audio file.
`),
    duration: z.enum(['first', 'longest', 'shortest']).default('longest').describe(`
Duration of the output file compared to the duration of all merged audio files. Can be \`"first"\` (duration of the first input file), \`"shortest"\` (duration of the shortest audio file) or \`"longest"\` for the duration of the longest input file.
`),
    loop: z.boolean().default(false).describe(`
Specifies if any input files that do not match the target duration should be looped to match it. Useful for audio merging where your overlay file is typically much shorter than the main audio file.
`),
    volume: z.enum(['average', 'sum']).default('average').describe(`
Valid values are \`"average"\` and \`"sum"\` here. \`"average"\` means each input is scaled 1/n (n is the number of inputs) or \`"sum"\` which means each individual audio stays on the same volume, but since we merge tracks 'on top' of each other, this could result in very loud output.
`),
    ffmpeg_stack: ffmpegStackVersionSchema.optional(),
    ffmpeg: ffmpegParamSchema,
  })
  .strict()
export type RobotAudioMergeInstructions = z.infer<typeof robotAudioMergeInstructionsSchema>
