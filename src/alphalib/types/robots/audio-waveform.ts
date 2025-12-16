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
  example_code_description:
    'Generate a 400×200 waveform in `#0099cc` color from an uploaded audio file:',
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
  stage: 'ga',
}

// Base schema with common fields
const robotAudioWaveformInstructionsBaseSchema = robotBase
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

const styleSchema = z.preprocess(
  (val) => {
    // Backwards compatibility: historically this robot used numeric styles 0/1/2.
    // The new API is `style: "v0" | "v1"`. Old v2 values are mapped to v1.
    if (val === 'v1' || val === 1 || val === '1') return 'v1'
    if (val === 'v0' || val === 0 || val === '0') return 'v0'
    return val
  },
  z.enum(['v0', 'v1']).default('v0'),
)

// Unified schema: all parameters exist for both styles, but v1-only parameters only apply when
// `style` is `v1` (they are accepted for v0 but have no effect).
export const robotAudioWaveformInstructionsSchema = robotAudioWaveformInstructionsBaseSchema
  .extend({
    style: styleSchema.describe(`
Waveform style version.

- \`"v0"\`: Legacy waveform generation (default).
- \`"v1"\`: Advanced waveform generation with additional parameters.

For backwards compatibility, numeric values \`0\`, \`1\`, \`2\` are also accepted and mapped to \`"v0"\` (0) and \`"v1"\` (1/2).
`),

    // v1-only parameters (accepted for v0 but have no effect)
    split_channels: z
      .boolean()
      .optional()
      .describe(`
Available when style is \`"v1"\`. If set to \`true\`, outputs multi-channel waveform data or image files, one per channel.
`),
    zoom: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(`
Available when style is \`"v1"\`. Zoom level in samples per pixel. This parameter cannot be used together with \`pixels_per_second\`.
`),
    pixels_per_second: z
      .number()
      .positive()
      .optional()
      .describe(`
Available when style is \`"v1"\`. Zoom level in pixels per second. This parameter cannot be used together with \`zoom\`.
`),
    bits: z
      .union([z.literal(8), z.literal(16)])
      .optional()
      .describe(`
Available when style is \`"v1"\`. Bit depth for waveform data. Can be 8 or 16.
`),
    start: z
      .number()
      .min(0)
      .optional()
      .describe(`
Available when style is \`"v1"\`. Start time in seconds.
`),
    end: z
      .number()
      .min(0)
      .optional()
      .describe(`
Available when style is \`"v1"\`. End time in seconds (0 means end of audio).
`),
    colors: z
      .enum(['audition', 'audacity'])
      .optional()
      .describe(`
Available when style is \`"v1"\`. Color scheme to use. Can be "audition" or "audacity".
`),
    border_color: color_with_alpha.optional().describe(`
Available when style is \`"v1"\`. Border color in "rrggbbaa" format.
`),
    waveform_style: z
      .enum(['normal', 'bars'])
      .optional()
      .describe(`
Available when style is \`"v1"\`. Waveform style. Can be "normal" or "bars".
`),
    bar_width: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(`
Available when style is \`"v1"\`. Width of bars in pixels when waveform_style is "bars".
`),
    bar_gap: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(`
Available when style is \`"v1"\`. Gap between bars in pixels when waveform_style is "bars".
`),
    bar_style: z
      .enum(['square', 'rounded'])
      .optional()
      .describe(`
Available when style is \`"v1"\`. Bar style when waveform_style is "bars".
`),
    axis_label_color: color_with_alpha.optional().describe(`
Available when style is \`"v1"\`. Color for axis labels in "rrggbbaa" format.
`),
    no_axis_labels: z
      .boolean()
      .optional()
      .describe(`
Available when style is \`"v1"\`. If set to \`true\`, renders waveform image without axis labels.
`),
    with_axis_labels: z
      .boolean()
      .optional()
      .describe(`
Available when style is \`"v1"\`. If set to \`true\`, renders waveform image with axis labels.
`),
    amplitude_scale: z
      .number()
      .positive()
      .optional()
      .describe(`
Available when style is \`"v1"\`. Amplitude scale factor.
`),
    compression: z
      .number()
      .int()
      .min(-1)
      .max(9)
      .optional()
      .describe(`
Available when style is \`"v1"\`. PNG compression level: 0 (none) to 9 (best), or -1 (default). Only applicable when format is "image".
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

export type InterpolatableRobotAudioWaveformInstructions = z.input<
  typeof interpolatableRobotAudioWaveformInstructionsSchema
>
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
