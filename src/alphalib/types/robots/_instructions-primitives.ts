import { z } from 'zod'

import type { templateSchema } from '../template'

export interface RobotMeta {
  allowed_for_url_transform: boolean
  bytescount: number
  description?: string
  discount_factor: number
  discount_pct: number
  docs_redirect_from?: string[]
  example_code?: z.input<typeof templateSchema>
  example_code_description?: string
  extended_description?: string
  has_small_icon?: true
  minimum_charge: number
  ogimage?: string
  output_factor: number
  override_lvl1?: string
  purpose_sentence: string
  purpose_verb:
    | 'cache & deliver'
    | 'compress'
    | 'concatenate'
    | 'concatenate'
    | 'convert'
    | 'decompress'
    | 'detect'
    | 'encode'
    | 'export'
    | 'extract'
    | 'filter'
    | 'generate'
    | 'handle'
    | 'hash'
    | 'import'
    | 'loop'
    | 'merge'
    | 'optimize'
    | 'read'
    | 'recognize'
    | 'run'
    | 'scan'
    | 'serve'
    | 'speak'
    | 'subtitle'
    | 'take'
    | 'transcode'
    | 'transcribe'
    | 'translate'
    | 'verify'
    | 'write'

  purpose_word: string
  purpose_words: string
  redirect_from?: string[]
  requires_credentials?: true
  service_slug:
    | 'artificial-intelligence'
    | 'audio-encoding'
    | 'code-evaluation'
    | 'content-delivery'
    | 'document-processing'
    | 'file-compressing'
    | 'file-exporting'
    | 'file-filtering'
    | 'file-importing'
    | 'handling-uploads'
    | 'image-manipulation'
    | 'media-cataloging'
    | 'video-encoding'

  slot_count: number
  title: string
  typical_file_size_mb: number
  typical_file_type:
    | 'audio file'
    | 'audio or video file'
    | 'document'
    | 'file'
    | 'image'
    | 'video'
    | 'webpage'
}

export const outputMetaParamSchema = z.record(z.boolean()).or(z.boolean()).optional().describe(`
Allows you to specify a set of metadata that is more expensive on CPU power to calculate, and thus is disabled by default to keep your Assemblies processing fast.

For images, you can add \`"has_transparency": true\` in this object to extract if the image contains transparent parts and \`"dominant_colors": true\` to extract an array of hexadecimal color codes from the image.

For videos, you can add the \`"colorspace: true"\` parameter to extract the colorspace of the output video.

For audio, you can add \`"mean_volume": true\` to get a single value representing the mean average volume of the audio file.

You can also set this to \`false\` to skip metadata extraction and speed up transcoding.
`)

export type OutputMetaParam = z.infer<typeof outputMetaParamSchema>

export const useParamSchema = z.union([
  z.string(),
  z.array(z.string()).min(1),
  z
    .object({
      steps: z.array(
        z.union([
          z.string(),
          z
            .object({
              name: z.string(),
              fields: z.string(),
              as: z.string(),
            })
            .strict(),
        ])
      ),
      bundle_steps: z.boolean().optional(),
    })
    .strict(),
]).describe(`
Specifies which Step(s) to use as input.

- You can pick any names for Steps except \`":original"\` (reserved for user uploads handled by Transloadit)
- You can provide several Steps as input with arrays:
  \`\`\`json
  {
    "use": [
      ":original",
      "encoded",
      "resized"
    ]
  }
  \`\`\`

💡That’s likely all you need to know about \`use\`, but you can view [Advanced use cases](/docs/topics/use-parameter/).
`)

export const ffmpegParamSchema = z
  .object({
    'b:a': z.string().or(z.number()).optional(),
    'b:v': z.string().or(z.number()).optional(),
    'c:a': z.string().optional(),
    'c:v': z.string().optional(),
    'codec:a': z.string().optional(),
    'codec:v': z.string().optional(),
    'filter:v': z.string().optional(),
    filter_complex: z.string().optional().or(z.object({})).optional(),
    'level:v': z.string().or(z.number()).optional(),
    'profile:v': z.enum(['baseline', 'main', 'high']).optional(),
    'qscale:a': z.number().optional(),
    'qscale:v': z.number().optional(),
    'x264-params': z.string().optional(),
    'overshoot-pct': z.number().optional(),
    'undershoot-pct': z.number().optional(),
    'row-mt': z.number().optional(),
    'x265-params': z
      .object({
        'vbv-maxrate': z.number().optional(),
        'vbv-bufsize': z.number().optional(),
        'rc-lookahead': z.number().optional(),
        'b-adapt': z.number().optional(),
      })
      .strict()
      .optional(),
    ac: z.number().optional(),
    an: z.boolean().optional(),
    ar: z.number().optional(),
    async: z.number().optional(),
    b: z
      .object({
        v: z.number().optional(),
        a: z.number().optional(),
      })
      .strict()
      .optional(),
    bt: z.number().optional(),
    bufsize: z.string().or(z.number()).optional(),
    codec: z
      .object({
        v: z.string().optional(),
        a: z.string().optional(),
      })
      .strict()
      .optional(),
    coder: z.number().optional(),
    crf: z.number().optional(),
    f: z.string().optional(),
    flags: z.string().optional(),
    g: z.number().optional(),
    i_qfactor: z.string().or(z.number()).optional(),
    keyint_min: z.number().optional(),
    level: z.string().or(z.number()).optional(),
    map: z.array(z.string()).optional(),
    maxrate: z.string().or(z.number()).optional(),
    me_range: z.number().optional(),
    movflags: z.string().optional(),
    partitions: z.string().optional(),
    pix_fmt: z.string().optional(),
    preset: z.string().optional(),
    profile: z.string().optional(),
    qcomp: z.string().or(z.number()).optional(),
    qdiff: z.number().optional(),
    qmax: z.number().optional(),
    qmin: z.number().optional(),
    r: z.number().optional(),
    rc_eq: z.string().optional(),
    refs: z.number().optional(),
    s: z.string().optional(),
    sc_threshold: z.number().optional(),
    sws_flags: z.string().optional(),
    threads: z.number().optional(),
    trellis: z.number().optional(),
    transloaditffpreset: z.literal('empty').optional(),
    vn: z.boolean().optional(),
    x264opts: z.string().optional(),
    vbr: z.string().or(z.number()).optional(),
  })
  .strict().describe(`
A parameter object to be passed to FFmpeg. If a preset is used, the options specified are merged on top of the ones from the preset. For available options, see the [FFmpeg documentation](https://ffmpeg.org/ffmpeg-doc.html). Options specified here take precedence over the preset options.
`)
export type FfmpegParams = z.infer<typeof ffmpegParamSchema>

export const ffmpegPresetSchema = z
  .object({
    ffmpeg: ffmpegParamSchema,
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
  })
  .strict()

export type FfmpegPreset = z.infer<typeof ffmpegPresetSchema>

export const ffmpegStackVersionSchema = z.enum(['v5.0.0', 'v6.0.0']).default('v5.0.0').describe(`
Selects the FFmpeg stack version to use for encoding. These versions reflect real FFmpeg versions. We currently recommend to use "v6.0.0".
`)

export type FfmpegStackVersion = z.infer<typeof ffmpegStackVersionSchema>

export const ffmpegAudioInstructions = z
  .object({
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
    preset: z.string().optional(),
    ffmpeg: ffmpegParamSchema.optional(),
    ffmpeg_stack: ffmpegStackVersionSchema.optional(),
  })
  .strict()
export type FfmpegAudioInstructions = z.infer<typeof ffmpegAudioInstructions>
export const ffmpegVideoInstructions = z
  .object({
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
    preset: z.string().optional(),
    ffmpeg: ffmpegParamSchema.optional(),
    ffmpeg_stack: ffmpegStackVersionSchema.optional(),
  })
  .strict()
export type FfmpegVideoInstructions = z.infer<typeof ffmpegVideoInstructions>

export const unsafeCoordinatesSchema = z
  .object({
    x1: z.string().or(z.number()).nullable().optional(),
    y1: z.string().or(z.number()).nullable().optional(),
    x2: z.string().or(z.number()).nullable().optional(),
    y2: z.string().or(z.number()).nullable().optional(),
  })
  .strict()
  .or(z.string())
export type UnsafeCoordinates = z.infer<typeof unsafeCoordinatesSchema>

export const parsedCoordinatesSchema = z
  .object({
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
  })
  .strict()
export type ParsedCoordinates = z.infer<typeof parsedCoordinatesSchema>

export const ignore_errors = z.array(z.union([z.boolean(), z.string()])).default([])

export const credentials = z.string()

export const path = z.union([z.string(), z.array(z.string())])

export const next_page_token = z.string().default('')

export const files_per_page = z.number().int().default(1000)

export const page_number = z.number().int().default(1)

export const recursive = z.boolean().default(false)

export const port = z.number().int().min(1).max(65535)

// TODO: Use an enum.
export const preset = z.string()

export const resize_strategy = z
  .enum(['crop', 'fit', 'fillcrop', 'min_fit', 'pad', 'stretch'])
  .default('pad')

export const positionSchema = z.enum([
  'bottom',
  'bottom-left',
  'bottom-right',
  'center',
  'left',
  'right',
  'top',
  'top-left',
  'top-right',
])

export const percentageSchema = z.string().regex(/^\d+%$/)

export const color_with_alpha = z.string().regex(/^[0-9a-fA-F]{8}$/)

export const color_with_optional_alpha = z.string().regex(/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/)

export const color_without_alpha = z.string().regex(/^[0-9a-fA-F]{6}$/)

export const bitrateSchema = z.number().int().min(1)

export const sampleRateSchema = z.number().int().min(1)

export const optimize_priority = z
  .enum(['compression-ratio', 'conversation-speed'])
  .default('compression-ratio')

export const imagemagickStackVersionSchema = z.enum(['v2.0.10', 'v3.0.1']).default('v2.0.10')
export type ImagemagickStackVersion = z.infer<typeof imagemagickStackVersionSchema>

export const colorspaceSchema = z.enum([
  'CMY',
  'CMYK',
  'Gray',
  'HCL',
  'HCLp',
  'HSB',
  'HSI',
  'HSL',
  'HSV',
  'HWB',
  'Jzazbz',
  'Lab',
  'LCHab',
  'LCHuv',
  'LMS',
  'Log',
  'Luv',
  'OHTA',
  'OkLab',
  'OkLCH',
  'Rec601YCbCr',
  'Rec709YCbCr',
  'RGB',
  'scRGB',
  'sRGB',
  'Transparent',
  'Undefined',
  'xyY',
  'XYZ',
  'YCbCr',
  'YCC',
  'YDbDr',
  'YIQ',
  'YPbPr',
  'YUV',
])

// TODO: add before and after images to the description.
export const imageQualitySchema = z.number().int().min(1).max(100).default(92).describe(`
Controls the image compression for JPG and PNG images. Please also take a look at [🤖/image/optimize](/docs/transcoding/image-manipulation/image-optimize/).
`)

export const aiProviderSchema = z.enum(['aws', 'gcp'])

export const granularitySchema = z.enum(['full', 'list']).default('full')
