import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  color_with_alpha,
  interpolateRobot,
  robotBase,
  robotFFmpeg,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: false,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      waveformed: {
        robot: '/audio/waveform',
        use: ':original',
        width: 400,
        height: 200,
        outer_color: '0099ccff',
        center_color: '0099ccff',
      },
    },
  },
  example_code_description: `Generate a 400×200 waveform in \`#0099cc\` color from an uploaded audio file:`,
  extended_description: `
Here is an example waveform image:

{% assign hotDemo = collections.demos |find: "url", "/demos/audio-encoding/generate-a-waveform-image-from-an-audio-file/" %}

<img src="{{hotDemo.data.generated_outputs.waveformed["audio-encoding-generate-a-waveform-image-from-an-audio-file-waveformed-joakim_karud-rock_angel-0.png"].ssl_url}}" width="300" alt="Example waveform image">
`,
  minimum_charge: 1048576,
  output_factor: 0.07,
  override_lvl1: 'Audio Encoding',
  purpose_sentence:
    'generates waveform images for your audio files and allows you to change their colors and dimensions',
  purpose_verb: 'generate',
  purpose_word: 'generate waveforms',
  purpose_words: 'Generate waveform images from audio',
  service_slug: 'audio-encoding',
  slot_count: 20,
  title: 'Generate waveform images from audio',
  typical_file_size_mb: 3.8,
  typical_file_type: 'audio file',
  name: 'AudioWaveformRobot',
  priceFactor: 1,
  queueSlotCount: 20,
  minimumCharge: 1048576,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotAudioWaveformInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpeg)
  .extend({
    robot: z.literal('/audio/waveform').describe(`
We recommend that you use an [🤖/audio/encode](/docs/robots/audio-encode/) <dfn>Step</dfn> prior to your waveform <dfn>Step</dfn> to convert audio files to MP3. This way it is guaranteed that [🤖/audio/waveform](/docs/robots/audio-waveform/) accepts your audio file and you can also down-sample large audio files and save some money.

Similarly, if you need the output image in a different format, please pipe the result of this <dfn>Robot</dfn> into [🤖/image/resize](/docs/robots/image-resize/).
`),
    format: z
      .enum(['image', 'json'])
      .default('image')
      .describe(`
The format of the result file. Can be \`"image"\` or \`"json"\`. If \`"image"\` is supplied, a PNG image will be created, otherwise a JSON file.
`),
    width: z
      .number()
      .int()
      .min(1)
      .default(256)
      .describe(`
The width of the resulting image if the format \`"image"\` was selected.
`),
    height: z
      .number()
      .int()
      .min(1)
      .default(64)
      .describe(`
The height of the resulting image if the format \`"image"\` was selected.
`),
    style: z
      .union([z.literal(0), z.literal(1)])
      .default(0)
      .describe(`
Either a value of \`0\` or \`1\`, corresponding to using either the legacy waveform tool, or the new tool respectively, with the new tool offering an improved style. Other Robot parameters still function as described, with either tool.
`),
    antialiasing: z
      .union([z.literal(0), z.literal(1), z.boolean()])
      .default(0)
      .describe(`
Either a value of \`0\` or \`1\`, or \`true\`/\`false\`, corresponding to if you want to enable antialiasing to achieve smoother edges in the waveform graph or not.
`),
    background_color: color_with_alpha.default('#00000000').describe(`
The background color of the resulting image in the "rrggbbaa" format (red, green, blue, alpha), if the format \`"image"\` was selected.
`),
    center_color: color_with_alpha.default('000000ff').describe(`
The color used in the center of the gradient. The format is "rrggbbaa" (red, green, blue, alpha).
`),
    outer_color: color_with_alpha.default('000000ff').describe(`
The color used in the outer parts of the gradient. The format is "rrggbbaa" (red, green, blue, alpha).
`),
  })
  .strict()

export const robotAudioWaveformInstructionsWithHiddenFieldsSchema =
  robotAudioWaveformInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotAudioWaveformInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotAudioWaveformInstructions = z.infer<typeof robotAudioWaveformInstructionsSchema>
export type RobotAudioWaveformInstructionsWithHiddenFields = z.infer<
  typeof robotAudioWaveformInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotAudioWaveformInstructionsSchema = interpolateRobot(
  robotAudioWaveformInstructionsSchema,
)
export type InterpolatableRobotAudioWaveformInstructions =
  InterpolatableRobotAudioWaveformInstructionsInput

export type InterpolatableRobotAudioWaveformInstructionsInput = z.input<
  typeof interpolatableRobotAudioWaveformInstructionsSchema
>

export const interpolatableRobotAudioWaveformInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotAudioWaveformInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotAudioWaveformInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotAudioWaveformInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotAudioWaveformInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotAudioWaveformInstructionsWithHiddenFieldsSchema
>
