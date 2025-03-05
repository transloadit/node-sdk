import { z } from 'zod'

import {
  bitrateSchema,
  robotFFmpeg,
  preset,
  robotBase,
  robotUse,
  sampleRateSchema,
} from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: false,
  bytescount: 4,
  discount_factor: 0.25,
  discount_pct: 75,
  example_code: {
    steps: {
      concatenated: {
        robot: '/audio/concat',
        use: {
          steps: [
            { name: ':original', fields: 'first_audio_file', as: 'audio_1' },
            { name: ':original', fields: 'second_audio_file', as: 'audio_2' },
            { name: ':original', fields: 'third_audio_file', as: 'audio_3' },
          ],
        },
        ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
      },
    },
  },
  example_code_description:
    'If you have a form with 3 file input fields and want to concatenate the uploaded audios in a specific order, instruct Transloadit using the `name` attribute of each input field. Use this attribute as the value for the `fields` key in the JSON, and set `as` to `audio_[[index]]`. Transloadit will concatenate the files based on the ascending index order:',
  minimum_charge: 0,
  output_factor: 0.8,
  override_lvl1: 'Audio Encoding',
  purpose_sentence: 'concatenates several audio files together',
  purpose_verb: 'concatenate',
  purpose_word: 'concatenate',
  purpose_words: 'Concatenate audio',
  service_slug: 'audio-encoding',
  slot_count: 20,
  title: 'Concatenate audio',
  typical_file_size_mb: 3.8,
  typical_file_type: 'audio file',
  uses_tools: ['ffmpeg'],
}

export const robotAudioConcatInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpeg)
  .extend({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/audio/concat').describe(`
This Robot can concatenate an almost infinite number of audio files.
`),
    preset: preset.optional().describe(`
Performs conversion using pre-configured settings.

If you specify your own FFmpeg parameters using the <dfn>Robot</dfn>'s \`ffmpeg\` parameter and you have not specified a preset, then the default \`mp3\` preset is not applied. This is to prevent you from having to override each of the MP3 preset's values manually.

For a list of audio presets, see [audio presets](/docs/transcoding/audio-encoding/audio-presets/).
`),
    bitrate: bitrateSchema.optional().describe(`
Bit rate of the resulting audio file, in bits per second. If not specified will default to the bit rate of the input audio file.
`),
    sample_rate: sampleRateSchema.optional().describe(`
Sample rate of the resulting audio file, in Hertz. If not specified will default to the sample rate of the input audio file.
`),
    audio_fade_seconds: z.number().default(1).describe(`
When used this adds an audio fade in and out effect between each section of your concatenated audio file. The float value is used, so if you want an audio delay effect of 500 milliseconds between each video section, you would select 0.5. Integer values can also be represented.

This parameter does not add an audio fade effect at the beginning or end of your result audio file. If you want to do so, create an additional [🤖/audio/encode](/docs/transcoding/audio-encoding/audio-encode/) <dfn>Step</dfn> and use our \`ffmpeg\` parameter as shown in this [demo](/demos/audio-encoding/ffmpeg-fade-in-and-out/).
`),
  })
  .strict()
export type RobotAudioConcatInstructions = z.infer<typeof robotAudioConcatInstructionsSchema>
