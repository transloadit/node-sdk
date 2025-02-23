import { z } from 'zod'

import type { assemblyInstructionsSchema } from '../template'

export const interpolationSchemaToYieldNumber = z.string().regex(/^[\d.]*\${.+}[\d.]*$/)
export const interpolationSchemaToYieldString = z.string().regex(/\${.+}/)

export interface RobotMeta {
  allowed_for_url_transform: boolean
  bytescount: number
  description?: string
  discount_factor: number
  discount_pct: number
  docs_redirect_from?: string[]
  example_code?: z.input<typeof assemblyInstructionsSchema>
  example_code_description?: string
  extended_description?: string
  has_small_icon?: true
  minimum_charge: number
  ogimage?: string
  marketing_intro?: string
  output_factor: number
  override_lvl1?: string
  purpose_sentence: string
  purpose_verb:
    | 'auto-rotate'
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

/**
 * Fields that are shared by all Transloadit robots.
 */
export type RobotBase = z.infer<typeof robotBase>
export const robotBase = z
  .object({
    output_meta: z.union([z.record(z.boolean()), z.boolean()]).optional().describe(`
Allows you to specify a set of metadata that is more expensive on CPU power to calculate, and thus is disabled by default to keep your Assemblies processing fast.

For images, you can add \`"has_transparency": true\` in this object to extract if the image contains transparent parts and \`"dominant_colors": true\` to extract an array of hexadecimal color codes from the image.

For videos, you can add the \`"colorspace: true"\` parameter to extract the colorspace of the output video.

For audio, you can add \`"mean_volume": true\` to get a single value representing the mean average volume of the audio file.

You can also set this to \`false\` to skip metadata extraction and speed up transcoding.
`),

    result: z
      .boolean()
      .default(false)
      .describe('Whether the results of this Step should be present in the Assembly Status JSON'),
  })
  .strict()

export const useParamObjectSchema = z
  .object({
    name: z.string(),
    fields: z.string().optional(),
    as: z.string().optional(),
  })
  .strict()

export const useParamStringSchema = z.string()
export const useParamArrayOfStringsSchema = z.array(useParamStringSchema)
export const useParamArrayOfUseParamObjectSchema = z.array(useParamObjectSchema)
export const useParamStepsSchema = z.union([
  useParamStringSchema,
  useParamArrayOfStringsSchema,
  useParamArrayOfUseParamObjectSchema,
])
export const useParamObjectOfStepsSchema = z
  .object({
    steps: useParamStepsSchema,
    bundle_steps: z.boolean().optional(),
    group_by_original: z.boolean().optional(),
  })
  .strict()

/**
 * A robot that uses another robot’s output as input.
 */
export type RobotUse = z.infer<typeof robotUse>
export const robotUse = z
  .object({
    use: z
      .union([useParamStepsSchema, useParamObjectOfStepsSchema])
      .describe(
        `
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
`,
      )
      .optional(),
  })
  .strict()

export const complexWidthSchema = z.preprocess((val) => {
  if (typeof val === 'string' && val.startsWith('${')) {
    return val
  }
  if (typeof val === 'string') {
    const num = parseInt(val, 10)
    if (isNaN(num) || val.includes('x')) {
      return val
    }
    return num
  }
  return val
}, z.number().int().min(1).max(7680))

export const complexHeightSchema = z.preprocess((val) => {
  if (typeof val === 'string' && val.startsWith('${')) {
    return val
  }
  if (typeof val === 'string') {
    const num = parseInt(val, 10)
    if (isNaN(num) || val.includes('x')) {
      return val
    }
    return num
  }
  return val
}, z.number().int().min(1).max(4320))

/**
 * A robot that uses FFmpeg.
 */
export type FFmpeg = z.infer<typeof robotFFmpeg>
export const robotFFmpeg = z.object({
  ffmpeg: z
    .object({
      af: z.string().optional(),
      'b:a': z.union([z.string(), z.number()]).optional(),
      'b:v': z.union([z.string(), z.number()]).optional(),
      'c:a': z.string().optional(),
      'c:v': z.string().optional(),
      'codec:a': z.string().optional(),
      'codec:v': z.string().optional(),
      'filter:v': z.string().optional(),
      'filter:a': z.string().optional(),
      bits_per_mb: z.union([z.string(), z.number()]).optional(),
      ss: z.union([z.string(), z.number()]).optional(),
      t: z.union([z.string(), z.number()]).optional(),
      to: z.union([z.string(), z.number()]).optional(),
      vendor: z.string().optional(),
      shortest: z.boolean().nullish(),
      filter_complex: z.union([z.string(), z.record(z.string())]).optional(),
      'level:v': z.union([z.string(), z.number()]).optional(),
      'profile:v': z.union([z.number(), z.enum(['baseline', 'main', 'high'])]).optional(),
      'qscale:a': z.number().optional(),
      'qscale:v': z.number().optional(),
      'x264-params': z.string().optional(),
      'overshoot-pct': z.number().optional(),
      deadline: z.string().optional(),
      'cpu-used': z.string().optional(),
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
      ac: z.union([z.number(), interpolationSchemaToYieldNumber]).optional(),
      an: z.boolean().optional(),
      ar: z.union([z.number(), interpolationSchemaToYieldNumber]).optional(),
      async: z.number().optional(),
      b: z
        .union([
          z
            .object({
              v: z.number().optional(),
              a: z.number().optional(),
            })
            .strict(),
          z.string(),
        ])
        .optional(),
      bt: z.union([z.number(), z.string()]).optional(),
      bufsize: z.union([z.string(), z.number()]).optional(),
      c: z.string().optional(),
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
      i_qfactor: z.union([z.string(), z.number()]).optional(),
      keyint_min: z.number().optional(),
      level: z.union([z.string(), z.number()]).optional(),
      map: z.union([z.string(), z.array(z.string())]).optional(),
      maxrate: z.union([z.string(), z.number()]).optional(),
      me_range: z.number().optional(),
      movflags: z.string().optional(),
      partitions: z.string().optional(),
      pix_fmt: z.string().optional(),
      preset: z.string().optional(),
      profile: z.string().optional(),
      'q:a': z.number().optional(),
      qcomp: z.union([z.string(), z.number()]).optional(),
      qdiff: z.number().optional(),
      qmax: z.number().optional(),
      qmin: z.number().optional(),
      r: z.union([z.number(), interpolationSchemaToYieldNumber]).optional(),
      rc_eq: z.string().optional(),
      refs: z.number().optional(),
      s: z.string().optional(),
      sc_threshold: z.number().optional(),
      sws_flags: z.string().optional(),
      threads: z.number().optional(),
      trellis: z.number().optional(),
      transloaditffpreset: z.literal('empty').optional(),
      vn: z.boolean().optional(),
      vf: z.string().optional(),
      x264opts: z.string().optional(),
      vbr: z.union([z.string(), z.number()]).optional(),
    })
    .passthrough()
    .optional().describe(`
A parameter object to be passed to FFmpeg. If a preset is used, the options specified are merged on top of the ones from the preset. For available options, see the [FFmpeg documentation](https://ffmpeg.org/ffmpeg-doc.html). Options specified here take precedence over the preset options.
`),

  ffmpeg_stack: z
    // Any semver in range is allowed and normalized. The enum is used for editor completions.
    .union([z.enum(['v5', 'v6']), z.string().regex(/^v?[56](\.\d+)?(\.\d+)?$/)])
    .default('v5.0.0').describe(`
Selects the FFmpeg stack version to use for encoding. These versions reflect real FFmpeg versions. We currently recommend to use "v6.0.0".
`),
})

export type FFmpegAudio = z.infer<typeof robotFFmpegAudio>
export const robotFFmpegAudio = robotFFmpeg
  .extend({
    width: z.number().nullish(),
    height: z.number().nullish(),
    preset: z.string().optional(),
  })
  .strict()

export type FFmpegVideo = z.infer<typeof robotFFmpegVideo>
export const robotFFmpegVideo = robotFFmpeg
  .extend({
    width: z.number().nullish(),
    height: z.number().nullish(),
    preset: z.string().optional(),
  })
  .strict()

export const unsafeCoordinatesSchema = z.union([
  z
    .object({
      x1: z.union([z.string(), z.number()]).nullish(),
      y1: z.union([z.string(), z.number()]).nullish(),
      x2: z.union([z.string(), z.number()]).nullish(),
      y2: z.union([z.string(), z.number()]).nullish(),
    })
    .strict(),
  z.string(),
]).describe(`
Coordinates for watermarking.
`)
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

export const color_with_alpha = z.string().regex(/^#?[0-9a-fA-F]{8}$/)

export const color_with_optional_alpha = z.string().regex(/^#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/)

export const color_without_alpha = z.string().regex(/^#?[0-9a-fA-F]{6}$/)

export const bitrateSchema = z.number().int().min(1)

export const sampleRateSchema = z.number().int().min(1)

export const optimize_priority = z
  .enum(['compression-ratio', 'conversion-speed'])
  .default('conversion-speed')

export type ImagemagickRobot = z.infer<typeof robotImagemagick>
export const robotImagemagick = z
  .object({
    imagemagick_stack: z
      // Any semver in range is allowed and normalized. The enum is used for editor completions.
      .union([z.enum(['v3']), z.string().regex(/^v?[23](\.\d+)?(\.\d+)?$/)])
      .default('v3'),
  })
  .strict()

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

export const aiProviderSchema = z.enum(['aws', 'gcp', 'replicate', 'fal', 'transloadit'])

export const granularitySchema = z.enum(['full', 'list']).default('full')

/**
 * A robot that imports data from a source.
 */
export type RobotImport = z.infer<typeof robotImport>
export const robotImport = z
  .object({
    ignore_errors: z
      .union([z.boolean(), z.array(z.enum(['meta', 'import']))])
      .transform((value) => (value === true ? ['meta', 'import'] : value === false ? [] : value))
      .default([]),
  })
  .strict()

export type AzureBase = z.infer<typeof azureBase>
export const azureBase = z
  .object({
    credentials: z.string().optional().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your [Template Credentials](/c/template-credentials/) as this parameter's value. They will contain the values for your Azure Container, Account and Key.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"account"\`, \`"key"\`, \`"container"\`.
`),
    account: z.string().optional(),
    container: z.string().optional(),
    key: z.string().optional(),
  })
  .strict()

export type BackblazeBase = z.infer<typeof backblazeBase>
export const backblazeBase = z
  .object({
    credentials: z.string().optional().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your Backblaze Bucket Name, App Key ID, and App Key.

To create your credential information, head over to Backblaze, sign in to your account, and select "Create a Bucket". Save the name of your bucket, and click on the "App Keys" tab, scroll to the bottom of the page then select “Add a New Application Key”. Allow access to your recently created bucket, select  “Read and Write” as your type of access, and tick the “Allow List All Bucket Names” option.

Now that everything is in place, create your key, and take note of the information you are given so you can input the information into your <dfn>Template Credentials</dfn>.

⚠️ Your App Key will only be viewable once, so make sure you note this down.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"app_key_id"\`, \`"app_key"\`.
`),
    bucket: z.string().optional(),
    app_key_id: z.string().optional(),
    app_key: z.string().optional(),
  })
  .strict()

export type CloudfilesBase = z.infer<typeof cloudfilesBase>
export const cloudfilesBase = z
  .object({
    credentials: z.string().optional().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your [Template Credentials](/c/template-credentials/) as this parameter's value. They will contain the values for your Cloud Files Container, User, Key, Account type and Data center.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"account_type"\` ("us" or "uk"), \`"data_center"\` ("dfw" for Dallas or "ord" for Chicago for example), \`"user"\`, \`"key"\`, \`"container"\`.
`),
    account_type: z.enum(['uk', 'us']).optional(),
    data_center: z.string().optional(),
    user: z.string().optional(),
    key: z.string().optional(),
    container: z.string().optional(),
  })
  .strict()

export type CloudflareBase = z.infer<typeof cloudflareBase>
export const cloudflareBase = z
  .object({
    credentials: z.string().optional().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your cloudflare bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"host"\`, \`"key"\`, \`"secret"\`.
`),
    bucket: z.string().optional(),
    host: z.string().optional(),
    key: z.string().optional(),
    secret: z.string().optional(),
  })
  .strict()

export type DigitalOceanBase = z.infer<typeof digitalOceanBase>
export const digitalOceanBase = z
  .object({
    credentials: z.string().optional().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your [Template Credentials](/c/template-credentials/) as this parameter's value. They will contain the values for your DigitalOcean Space, Key, Secret and Region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"space"\`, \`"region"\` (for example: \`"fra1"\` or \`"nyc3"\`), \`"key"\`, \`"secret"\`.
`),
    space: z.string().optional(),
    region: z.string().optional(),
    key: z.string().optional(),
    secret: z.string().optional(),
  })
  .strict()

export type FtpBase = z.infer<typeof ftpBase>
export const ftpBase = z
  .object({
    credentials: z.string().optional().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your FTP host, user and password.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> with their static nature is too unwieldy. If you have this requirement, feel free to use the following parameters instead: \`"host"\`, \`"user"\`, \`"password"\`.
`),
    host: z.string().optional(),
    port: port.default(21).describe('The port to use for the FTP connection.'),
    user: z.string().optional(),
    password: z.string().optional(),
  })
  .strict()

export type GoogleBase = z.infer<typeof googleBase>
export const googleBase = z
  .object({
    credentials: z.string().optional().describe(`
Create a new [Google service account](https://cloud.google.com/storage/docs/authentication). Set its role to "Storage Object Creator". Choose "JSON" for the key file format and download it to your computer. You will need to upload this file when creating your <dfn>Template Credentials</dfn>.

Go back to your Google credentials project and enable the "Google Cloud Storage JSON API" for it. Wait around ten minutes for the action to propagate through the Google network. Grab the project ID from the dropdown menu in the header bar on the Google site. You will also need it later on.

Now you can set up the \`storage.objects.create\` and \`storage.objects.delete\` permissions. The latter is optional and only required if you intend to overwrite existing paths.

To do this from the Google Cloud console, navigate to "IAM &amp; Admin" and select "Roles". From here, select "+CREATE ROLE", enter a name, set the role launch stage as general availability and set the permissions stated above.

Next, relocate to your storage browser and select the ellipsis on your bucket to edit bucket permissions. From here, select "ADD MEMBER", enter your service account as a new member and select your newly created role.

Then, create your associated [Template Credentials](/c/template-credentials/) in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value.
`),
  })
  .strict()

export type MinioBase = z.infer<typeof minioBase>
export const minioBase = z
  .object({
    credentials: z.string().optional().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your MinIO bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"host"\`, \`"key"\`, \`"secret"\`.
`),
    bucket: z.string().optional(),
    host: z.string().optional(),
    key: z.string().optional(),
    secret: z.string().optional(),
  })
  .strict()

export type S3Base = z.infer<typeof s3Base>
export const s3Base = z
  .object({
    credentials: z.string().optional().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your S3 bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"bucket_region"\` (for example: \`"us-east-1"\` or \`"eu-west-2"\`), \`"key"\`, \`"secret"\`.
`),
    bucket: z.string().optional(),
    bucket_region: z.string().optional(),
    key: z.string().optional(),
    secret: z.string().optional(),
  })
  .strict()

export type SftpBase = z.infer<typeof sftpBase>
export const sftpBase = z
  .object({
    credentials: z.string().optional().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your SFTP host, user and optional custom public key.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"host"\`, \`"port"\`, \`"user"\`, \`"public_key"\` (optional).
`),
    host: z.string().optional(),
    port: port.default(21).describe('The port to use for the FTP connection.'),
    user: z.string().optional(),
    public_key: z.string().optional(),
  })
  .strict()

export type SupabaseBase = z.infer<typeof supabaseBase>
export const supabaseBase = z
  .object({
    credentials: z.string().optional().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your Supabase bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"host"\`, \`"key"\`, \`"secret"\`.

If you do use these parameters, make sure to use the **Endpoint** value under \`Storage > S3 Connection\` in the Supabase console for the \`"host"\` value, and the values under **S3 Access Keys** on the same page for your \`"key"\` and \`"secret"\`.
`),
    bucket: z.string().optional(),
    host: z.string().optional(),
    key: z.string().optional(),
    secret: z.string().optional(),
  })
  .strict()

export type SwiftBase = z.infer<typeof swiftBase>
export const swiftBase = z
  .object({
    credentials: z.string().optional().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your Swift bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"host"\`, \`"key"\`, \`"secret"\`.
`),
    bucket: z.string().optional(),
    host: z.string().optional(),
    key: z.string().optional(),
    secret: z.string().optional(),
  })
  .strict()

export type WasabiBase = z.infer<typeof wasabiBase>
export const wasabiBase = z
  .object({
    credentials: z.string().optional().describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your Wasabi bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"host"\`, \`"key"\`, \`"secret"\`.
`),
    bucket: z.string().optional(),
    host: z.string().optional(),
    key: z.string().optional(),
    secret: z.string().optional(),
  })
  .strict()
