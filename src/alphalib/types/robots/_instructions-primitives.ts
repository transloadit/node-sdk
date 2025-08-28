import type { Replace } from 'type-fest'
import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'

export const robotNames = z.enum([
  'UploadHandleRobot',
  'FileServeRobot',
  'FileWatermarkRobot',
  'FileVerifyRobot',
  'EdglyDeliverRobot',
  'TlcdnDeliverRobot',
  'VideoSubtitleRobot',
  'VideoEncodeRobot',
  'VideoAdaptiveRobot',
  'VideoMergeRobot',
  'VideoConcatRobot',
  'AudioWaveformRobot',
  'AudioEncodeRobot',
  'AudioLoopRobot',
  'AudioConcatRobot',
  'AudioMergeRobot',
  'AudioArtworkRobot',
  'ImageFacedetectRobot',
  'ImageDescribeRobot',
  'ImageOcrRobot',
  'ImageBgremoveRobot',
  'ImageGenerateRobot',
  'DocumentOcrRobot',
  'SpeechTranscribeRobot',
  'VideoThumbsRobot',
  'FileVirusscanRobot',
  'ImageOptimizeRobot',
  'FileCompressRobot',
  'MetaReadRobot',
  'FileDecompressRobot',
  'MetaWriteRobot',
  'DocumentThumbsRobot',
  'DocumentConvertRobot',
  'DocumentMergeRobot',
  'DocumentSplitRobot',
  'DocumentAutorotateRobot',
  'HtmlConvertRobot',
  'ImageResizeRobot',
  'ImageMergeRobot',
  'S3ImportRobot',
  'S3StoreRobot',
  'DigitalOceanImportRobot',
  'DigitalOceanStoreRobot',
  'BackblazeImportRobot',
  'BackblazeStoreRobot',
  'MinioImportRobot',
  'TigrisImportRobot',
  'CloudflareImportRobot',
  'SupabaseImportRobot',
  'MinioStoreRobot',
  'TigrisStoreRobot',
  'CloudflareStoreRobot',
  'SupabaseStoreRobot',
  'WasabiImportRobot',
  'WasabiStoreRobot',
  'SwiftImportRobot',
  'SwiftStoreRobot',
  'GoogleImportRobot',
  'GoogleStoreRobot',
  'DropboxImportRobot',
  'DropboxStoreRobot',
  'HttpImportRobot',
  'SftpImportRobot',
  'SftpStoreRobot',
  'FtpImportRobot',
  'FtpStoreRobot',
  'CloudfilesImportRobot',
  'CloudfilesStoreRobot',
  'AzureImportRobot',
  'AzureStoreRobot',
  'YoutubeStoreRobot',
  'VimeoImportRobot',
  'VimeoStoreRobot',
  'AssemblySavejsonRobot',
  'ScriptRunRobot',
  'FileHashRobot',
  'FileReadRobot',
  'VideoOndemandRobot',
  'FileFilterRobot',
  'TextSpeakRobot',
  'TextTranslateRobot',
  'FilePreviewRobot',
  'TusStoreRobot',
  'ProgressSimulateRobot',
])

export const robotMetaSchema = z.object({
  // Added keys from api2/lib/config.ts:
  name: robotNames,
  priceFactor: z.number(),
  queueSlotCount: z.number(),
  downloadInputFiles: z.boolean().optional(),
  preserveInputFileUrls: z.boolean().optional(),
  minimumCharge: z.number().optional(),
  minimumChargeUsd: z.number().optional(),
  minimumChargeUsdPerSpeechTranscribeMinute: z
    .object({
      aws: z.number(),
      gcp: z.number(),
    })
    .optional(),
  minimumChargeUsdPerDocumentOcrPage: z
    .object({
      aws: z.number(),
      gcp: z.number(),
    })
    .optional(),
  isAllowedForUrlTransform: z.boolean(),
  removeJobResultFilesFromDiskRightAfterStoringOnS3: z.boolean(),
  lazyLoad: z.boolean().optional(),
  installVersionFile: z.string().optional(),
  trackOutputFileSize: z.boolean().optional(),
  isInternal: z.boolean(),
  numDaemons: z.number().optional(),
  importRanges: z.array(z.string()).optional(),
  extraChargeForImageResize: z.number().optional(),

  // Original keys from content repo:
  allowed_for_url_transform: z.boolean(),
  bytescount: z.number(),
  description: z.string().optional(),
  discount_factor: z.number(),
  discount_pct: z.number(),
  // To avoid a cycling dependency back to template.ts, we'll use any for now:
  // example_code: assemblyInstructionsSchema.optional(),
  example_code: z.any().optional(),
  example_code_description: z.string().optional(),
  extended_description: z.string().optional(),
  has_small_icon: z.literal(true).optional(),
  minimum_charge: z.number(),
  minimum_charge_usd: z.union([z.number(), z.record(z.string(), z.number())]).optional(),
  minimum_charge_usd_note: z.string().optional(),
  ogimage: z.string().optional(),
  marketing_intro: z.string().optional(),
  output_factor: z.number(),
  override_lvl1: z.string().optional(),
  purpose_sentence: z.string(),
  purpose_verb: z.enum([
    'auto-rotate',
    'cache & deliver',
    'compress',
    'concatenate',
    'convert',
    'decompress',
    'detect',
    'encode',
    'export',
    'extract',
    'filter',
    'generate',
    'handle',
    'hash',
    'import',
    'loop',
    'merge',
    'optimize',
    'read',
    'recognize',
    'run',
    'scan',
    'serve',
    'speak',
    'subtitle',
    'take',
    'transcode',
    'transcribe',
    'translate',
    'verify',
    'remove',
    'write',
    'stream',
  ]),
  purpose_word: z.string(),
  purpose_words: z.string(),
  requires_credentials: z.literal(true).optional(),
  service_slug: z.enum([
    'artificial-intelligence',
    'audio-encoding',
    'code-evaluation',
    'content-delivery',
    'document-processing',
    'file-compressing',
    'file-exporting',
    'file-filtering',
    'file-importing',
    'handling-uploads',
    'image-manipulation',
    'media-cataloging',
    'video-encoding',
  ]),
  slot_count: z.number(),
  title: z.string(),
  typical_file_size_mb: z.number(),
  typical_file_type: z.enum([
    'audio file',
    'audio or video file',
    'document',
    'file',
    'image',
    'video',
    'webpage',
  ]),
  uses_tools: z.array(z.enum(['ffmpeg', 'imagemagick'])).optional(),
})

export type RobotMetaInput = z.input<typeof robotMetaSchema>

export const interpolationSchemaFull = z
  .string()
  .regex(/^\${.+}$/, 'Must be a full interpolation string')
export const interpolationSchemaPartial = z
  .string()
  .regex(/\${.+}/, 'Must be a partially interpolatable string')
export const booleanStringSchema = z.enum(['true', 'false'])

type InterpolatableTuple<Schemas extends readonly z.ZodTypeAny[]> = Schemas extends readonly [
  infer Head extends z.ZodTypeAny,
  ...infer Rest extends z.ZodTypeAny[],
]
  ? [InterpolatableSchema<Head>, ...InterpolatableTuple<Rest>]
  : Schemas

type InterpolatableSchema<Schema extends z.ZodTypeAny> = Schema extends z.ZodString
  ? Schema
  : Schema extends
        | z.ZodBoolean
        | z.ZodEffects<z.ZodTypeAny>
        | z.ZodEnum<[string, ...string[]]>
        | z.ZodLiteral<unknown>
        | z.ZodNumber
    ? z.ZodUnion<[z.ZodString, Schema]>
    : Schema extends z.ZodArray<infer T, infer Cardinality>
      ? z.ZodUnion<[z.ZodString, z.ZodArray<InterpolatableSchema<T>, Cardinality>]>
      : Schema extends z.ZodDefault<infer T>
        ? z.ZodDefault<InterpolatableSchema<T>>
        : Schema extends z.ZodNullable<infer T>
          ? z.ZodNullable<InterpolatableSchema<T>>
          : Schema extends z.ZodOptional<infer T>
            ? z.ZodOptional<InterpolatableSchema<T>>
            : Schema extends z.ZodRecord<infer Key, infer Value>
              ? z.ZodRecord<Key, InterpolatableSchema<Value>>
              : Schema extends z.ZodTuple<infer T, infer Rest>
                ? z.ZodUnion<
                    [
                      z.ZodString,
                      z.ZodTuple<
                        InterpolatableTuple<T>,
                        Rest extends z.ZodTypeAny ? InterpolatableSchema<Rest> : null
                      >,
                    ]
                  >
                : Schema extends z.ZodObject<infer T, infer UnknownKeys, infer Catchall>
                  ? z.ZodUnion<
                      [
                        z.ZodString,
                        z.ZodObject<
                          { [Key in keyof T]: InterpolatableSchema<T[Key]> },
                          UnknownKeys,
                          Catchall
                        >,
                      ]
                    >
                  : Schema extends z.ZodUnion<infer T>
                    ? z.ZodUnion<[z.ZodString, ...InterpolatableTuple<T>]>
                    : Schema

export function interpolateRecursive<Schema extends z.ZodFirstPartySchemaTypes>(
  schema: Schema,
): InterpolatableSchema<Schema> {
  const def = schema._def

  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return z
        .union([interpolationSchemaFull, schema, booleanStringSchema])
        .transform((value) => value === true || value === false) as InterpolatableSchema<Schema>
    case z.ZodFirstPartyTypeKind.ZodArray: {
      let replacement = z.array(interpolateRecursive(def.type), def)

      if (def.exactLength != null) {
        replacement = replacement.min(def.exactLength.value, def.exactLength.message)
      }

      if (def.maxLength != null) {
        replacement = replacement.min(def.maxLength.value, def.maxLength.message)
      }

      if (def.minLength != null) {
        replacement = replacement.min(def.minLength.value, def.minLength.message)
      }

      return z.union([interpolationSchemaFull, replacement]) as InterpolatableSchema<Schema>
    }
    case z.ZodFirstPartyTypeKind.ZodDefault: {
      const replacement = (
        interpolateRecursive(def.innerType) as InterpolatableSchema<Schema>
      ).default(def.defaultValue())

      return (
        def.description ? replacement.describe(def.description) : replacement
      ) as InterpolatableSchema<Schema>
    }
    case z.ZodFirstPartyTypeKind.ZodEffects:
    case z.ZodFirstPartyTypeKind.ZodEnum:
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return z.union([interpolationSchemaFull, schema], def) as InterpolatableSchema<Schema>
    case z.ZodFirstPartyTypeKind.ZodNumber:
      return z.union(
        [
          z
            .string()
            .regex(/^\d+(\.\d+)?$/)
            .transform((value) => Number(value)),
          interpolationSchemaFull,
          schema,
        ],
        def,
      ) as InterpolatableSchema<Schema>
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return interpolateRecursive(def.innerType)
        .nullable()
        .describe(def.description) as InterpolatableSchema<Schema>
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const replacement = z.object(
        Object.fromEntries(
          Object.entries(def.shape()).map(([key, nested]) => [
            key,
            interpolateRecursive(nested as z.ZodFirstPartySchemaTypes),
          ]),
        ),
        def,
      )
      return z.union([
        interpolationSchemaFull,
        def.unknownKeys === 'strict'
          ? replacement.strict()
          : def.unknownKeys === 'passthrough'
            ? replacement.passthrough()
            : replacement,
      ]) as InterpolatableSchema<Schema>
    }
    case z.ZodFirstPartyTypeKind.ZodOptional:
      return z.optional(interpolateRecursive(def.innerType), def) as InterpolatableSchema<Schema>
    case z.ZodFirstPartyTypeKind.ZodRecord:
      return z.record(
        def.keyType,
        interpolateRecursive(def.valueType),
        def,
      ) as InterpolatableSchema<Schema>
    case z.ZodFirstPartyTypeKind.ZodString:
      return z.union([interpolationSchemaPartial, schema], def) as InterpolatableSchema<Schema>
    case z.ZodFirstPartyTypeKind.ZodTuple: {
      const tuple = z.tuple(def.items.map(interpolateRecursive), def)

      return z.union([
        interpolationSchemaFull,
        def.rest ? tuple.rest(def.rest) : tuple,
      ]) as InterpolatableSchema<Schema>
    }
    case z.ZodFirstPartyTypeKind.ZodUnion:
      return z.union(
        [interpolationSchemaFull, ...(def.options.map(interpolateRecursive) as z.ZodUnionOptions)],
        def,
      ) as InterpolatableSchema<Schema>
    default:
      return schema as InterpolatableSchema<Schema>
  }
}

/**
 * The robot keys specified in this array can’t be interpolated.
 */
const uninterpolatableKeys = ['robot', 'use'] as const

type InterpolatableRobot<Schema extends z.ZodObject<z.ZodRawShape>> = Schema extends z.ZodObject<
  infer T,
  infer UnknownKeys,
  infer Catchall
>
  ? z.ZodObject<
      {
        [Key in keyof T]: Key extends (typeof uninterpolatableKeys)[number]
          ? T[Key]
          : InterpolatableSchema<T[Key]>
      },
      UnknownKeys,
      Catchall
    >
  : never

export function interpolateRobot<Schema extends z.ZodObject<z.ZodRawShape>>(
  schema: Schema,
): InterpolatableRobot<Schema> {
  const def = schema._def
  return z
    .object(
      Object.fromEntries(
        Object.entries(def.shape()).map(([key, nested]) => [
          key,
          (uninterpolatableKeys as readonly string[]).includes(key)
            ? nested
            : interpolateRecursive(nested as z.ZodFirstPartySchemaTypes),
        ]),
      ),
      def,
    )
    .strict() as InterpolatableRobot<Schema>
}

/**
 * Fields that are shared by all Transloadit robots.
 */
export type RobotBase = z.infer<typeof robotBase>
export const robotBase = z
  .object({
    output_meta: z
      .union([z.record(z.boolean()), z.boolean(), z.array(z.string())])
      .optional()
      .describe(`
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

    queue: z
      .enum(['batch'])
      .optional()
      .describe(
        `Setting the queue to 'batch', manually downgrades the priority of jobs for this step to avoid consuming Priority job slots for jobs that don't need zero queue waiting times`,
      ),

    force_accept: z
      .boolean()
      .default(false)
      .describe(`Force a Robot to accept a file type it would have ignored.

By default, Robots ignore files they are not familiar with.
[🤖/video/encode](/docs/robots/video-encode/), for
example, will happily ignore input images.

With the \`force_accept\` parameter set to \`true\`, you can force Robots to accept all files thrown at them.
This will typically lead to errors and should only be used for debugging or combatting edge cases.
`),
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
    fields: z
      .array(z.string())
      .optional()
      .describe(`
Array of field names to filter input files by when using steps.
`),
  })
  .strict()

// Hidden fields variants for use parameters
export const useParamObjectWithHiddenFieldsSchema = useParamObjectSchema.extend({
  result: z.union([z.literal('debug'), z.boolean()]).optional(),
})

export const useParamArrayOfUseParamObjectWithHiddenFieldsSchema = z.array(
  useParamObjectWithHiddenFieldsSchema,
)
export const useParamStepsWithHiddenFieldsSchema = z.union([
  useParamStringSchema,
  useParamArrayOfStringsSchema,
  useParamArrayOfUseParamObjectWithHiddenFieldsSchema,
])
export const useParamObjectOfStepsWithHiddenFieldsSchema = z
  .object({
    steps: useParamStepsWithHiddenFieldsSchema,
    bundle_steps: z.boolean().optional(),
    group_by_original: z.boolean().optional(),
    fields: z
      .array(z.string())
      .optional()
      .describe(`
Array of field names to filter input files by when using steps.
`),
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

> [!Tip]
> That's likely all you need to know about \`use\`, but you can view [Advanced use cases](/docs/topics/use-parameter/).
`,
      )
      .optional(),
  })
  .strict()

export type RobotUseWithHiddenFields = z.infer<typeof robotUseWithHiddenFields>
export const robotUseWithHiddenFields = z
  .object({
    use: z
      .union([useParamStepsWithHiddenFieldsSchema, useParamObjectOfStepsWithHiddenFieldsSchema])
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

> [!Tip]
> That's likely all you need to know about \`use\`, but you can view [Advanced use cases](/docs/topics/use-parameter/).
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
    const num = Number.parseInt(val, 10)
    if (Number.isNaN(num) || val.includes('x')) {
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
    const num = Number.parseInt(val, 10)
    if (Number.isNaN(num) || val.includes('x')) {
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
      'svtav1-params': z
        .object({
          tune: z.number().optional(),
          'enable-qm': z.number().optional(),
          'fast-decode': z.number().optional(),
          'film-grain-denoise': z.number().optional(),
        })
        .strict()
        .optional(),
      ac: z.number().optional(),
      an: z.boolean().optional(),
      ar: z.number().optional(),
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
      preset: z.union([z.string(), z.number()]).optional(),
      profile: z.string().optional(),
      'q:a': z.number().optional(),
      qcomp: z.union([z.string(), z.number()]).optional(),
      qdiff: z.number().optional(),
      qmax: z.number().optional(),
      qmin: z.number().optional(),
      r: z.union([z.number(), z.string()]).nullable().optional(),
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
    .optional()
    .describe(`
A parameter object to be passed to FFmpeg. If a preset is used, the options specified are merged on top of the ones from the preset. For available options, see the [FFmpeg documentation](https://ffmpeg.org/ffmpeg-doc.html). Options specified here take precedence over the preset options.
`),

  ffmpeg_stack: z
    // Any semver in range is allowed and normalized. The enum is used for editor completions.
    .union([z.enum(['v5', 'v6', 'v7']), z.string().regex(/^v?[567](\.\d+)?(\.\d+)?$/)])
    .default('v5.0.0')
    .describe(`
Selects the FFmpeg stack version to use for encoding. These versions reflect real FFmpeg versions. We currently recommend to use "v6.0.0".
`),
})

/**
 * Replace all underscores with hyphens.
 *
 * @param preset
 *   The input preset which may contain underscores.
 * @returns
 *   The hyphenated preset.
 */
function transformPreset<T extends string>(preset: T): Replace<T, '_', '-', { all: true }> {
  return preset.replaceAll('_', '-') as Replace<T, '_', '-', { all: true }>
}

/**
 * Convert a preset with hyphens to any underscore/hyphen combination.
 *
 * @template T
 *   The preset to process.
 */
type ReplacePreset<T extends string> = T extends `${infer T0}-${infer Tail}`
  ? T | `${T0}-${ReplacePreset<Tail>}` | `${T0}_${ReplacePreset<Tail>}`
  : T

/**
 * Generate all possible underscore/hyphen combinations of a preset.
 *
 * @param chunks
 *   A normalized preset split on hyphens.
 * @returns
 *   An iterable that yields all possible combinations.
 */
function* generateCombinations(chunks: string[]): Iterable<string> {
  if (chunks.length === 0) {
    return
  }

  if (chunks.length === 1) {
    yield chunks[0]
  }

  const [head, ...remaining] = chunks
  for (const result of generateCombinations(remaining)) {
    yield `${head}-${result}`
    yield `${head}_${result}`
  }
}

/**
 * Create all possible preset combinations from a list of normalized presets.
 *
 * @param inputs
 *   The hyphenated presets.
 * @returns
 *   An array of all possible combinations.
 */
function createPresets<T extends string>(
  inputs: T[],
): readonly [ReplacePreset<T>, ...ReplacePreset<T>[]] {
  const results: string[] = []
  for (const input of inputs) {
    results.push(...generateCombinations(input.split('-')))
  }

  return [...results].sort() as [ReplacePreset<T>, ...ReplacePreset<T>[]]
}

const audioPresets = createPresets([
  'aac',
  'alac',
  'audio/aac',
  'audio/alac',
  'audio/flac',
  'audio/mp3',
  'audio/ogg',
  'dash-32k-audio',
  'dash-64k-audio',
  'dash-128k-audio',
  'dash-256k-audio',
  'dash/32k-audio',
  'dash/64k-audio',
  'dash/128k-audio',
  'dash/256k-audio',
  'empty',
  'flac',
  'hg-transformers-audio',
  'mp3',
  'ogg',
  'opus',
  'speech',
  'wav',
])

/**
 * A robot that uses FFmpeg to **output** audio.
 */
export type FFmpegAudio = z.infer<typeof robotFFmpegAudio>
export const robotFFmpegAudio = robotFFmpeg
  .extend({
    preset: z
      .enum(audioPresets)
      .transform(transformPreset)
      .optional()
      .describe(`
Performs conversion using pre-configured settings.

If you specify your own FFmpeg parameters using the <dfn>Robot</dfn>'s \`ffmpeg\` parameter and you have not specified a preset, then the default \`mp3\` preset is not applied. This is to prevent you from having to override each of the MP3 preset's values manually.

For a list of audio presets, see [audio presets](/docs/presets/audio/).
`),
  })
  .strict()

/**
 * A robot that uses FFmpeg to **output** video.
 */
export type FFmpegVideo = z.infer<typeof robotFFmpegVideo>
export const robotFFmpegVideo = robotFFmpeg
  .extend({
    width: z
      .number()
      .int()
      .min(1)
      .nullish()
      .describe(`
Width of the new video, in pixels.

If the value is not specified and the \`preset\` parameter is available, the \`preset\`'s [supplied width](/docs/presets/video/) will be implemented.
`),
    height: z
      .number()
      .int()
      .min(1)
      .nullish()
      .describe(`
Height of the new video, in pixels.

If the value is not specified and the \`preset\` parameter is available, the \`preset\`'s [supplied height](/docs/presets/video/) will be implemented.
`),
    preset: z
      .enum([
        ...createPresets([
          'android',
          'android-high',
          'android-low',
          'dash-270p-video',
          'dash-360p-video',
          'dash-480p-video',
          'dash-540p-video',
          'dash-576p-video',
          'dash-720p-video',
          'dash-1080p-video',
          'dash/270p-video',
          'dash/360p-video',
          'dash/480p-video',
          'dash/540p-video',
          'dash/576p-video',
          'dash/720p-video',
          'dash/1080p-video',
          'flash',
          'gif',
          'hevc',
          'hls-270p',
          'hls-360p',
          'hls-480p',
          'hls-540p',
          'hls-576p',
          'hls-720p',
          'hls-1080p',
          'hls/270p',
          'hls/360p',
          'hls/480p',
          'hls/540p',
          'hls/720p',
          'hls/1080p',
          'hls/4k',
          'ipad',
          'ipad-high',
          'ipad-low',
          'iphone',
          'iphone-high',
          'iphone-low',
          'ogv',
          'vod/270p',
          'vod/480p',
          'vod/720p',
          'vod/1080p',
          'vp9',
          'vp9-270p',
          'vp9-360p',
          'vp9-480p',
          'vp9-540p',
          'vp9-576p',
          'vp9-720p',
          'vp9-1080p',
          'web/mp4-x265/240p',
          'web/mp4-x265/360p',
          'web/mp4-x265/480p',
          'web/mp4-x265/720p',
          'web/mp4-x265/1080p',
          'web/mp4-x265/4k',
          'web/mp4-x265/8k',
          'web/mp4/240p',
          'web/mp4/360p',
          'web/mp4/480p',
          'web/mp4/540p',
          'web/mp4/720p',
          'web/mp4/1080p',
          'web/mp4/4k',
          'web/mp4/8k',
          'web/webm-av1/240p',
          'web/webm-av1/360p',
          'web/webm-av1/480p',
          'web/webm-av1/720p',
          'web/webm-av1/1080p',
          'web/webm-av1/4k',
          'web/webm-av1/8k',
          'web/webm/240p',
          'web/webm/360p',
          'web/webm/480p',
          'web/webm/720p',
          'web/webm/1080p',
          'web/webm/4k',
          'web/webm/8k',
          'webm',
          'webm-270p',
          'webm-360p',
          'webm-480p',
          'webm-540p',
          'webm-576p',
          'webm-720p',
          'webm-1080p',
          'wmv',
        ]),
        ...audioPresets,
      ])
      .transform(transformPreset)
      .optional()
      .describe(`
Converts a video according to [pre-configured settings](/docs/presets/video/).

If you specify your own FFmpeg parameters using the <dfn>Robot</dfn>'s and/or do not not want Transloadit to set any encoding setting, starting \`ffmpeg_stack: "${stackVersions.ffmpeg.recommendedVersion}"\`,  you can use the value \`'empty'\` here.
`),
  })
  .strict()

export const unsafeCoordinatesSchema = z
  .union([
    z
      .object({
        x1: z.union([z.string(), z.number()]).nullish(),
        y1: z.union([z.string(), z.number()]).nullish(),
        x2: z.union([z.string(), z.number()]).nullish(),
        y2: z.union([z.string(), z.number()]).nullish(),
      })
      .strict(),
    z.string(),
  ])
  .describe(`
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

export const return_file_stubs = z
  .boolean()
  .describe(
    `
If set to \`true\`, the Robot will not yet import the actual files but instead return an empty file stub that includes a URL from where the file can be imported by subsequent Robots. This is useful for cases where subsequent Steps need more control over the import process, such as with 🤖/video/ondemand. This parameter should only be set if all subsequent Steps use Robots that support file stubs.
`,
  )
  .default(false)

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

export const color_with_alpha = z.string().regex(/^#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/)

export const color_without_alpha = z.string().regex(/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/)

// Extended color schemas that also support named colors (for robots that support them)
export const color_with_alpha_with_named = z.union([
  color_with_alpha, // Extend the base hex color schema
  z.enum([
    'transparent',
    'none',
    'black',
    'white',
    'red',
    'green',
    'blue',
    'yellow',
    'cyan',
    'magenta',
    'gray',
    'grey',
    'opaque',
  ]), // Named colors
])

export const color_without_alpha_with_named = z.union([
  color_without_alpha, // Extend the base hex color schema
  z.enum([
    'transparent',
    'none',
    'black',
    'white',
    'red',
    'green',
    'blue',
    'yellow',
    'cyan',
    'magenta',
    'gray',
    'grey',
    'opaque',
  ]), // Named colors
])

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
export const imageQualitySchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .default(92)
  .describe(`
Controls the image compression for JPG and PNG images. Please also take a look at [🤖/image/optimize](/docs/robots/image-optimize/).
`)

export const aiProviderSchema = z.enum(['aws', 'gcp', 'replicate', 'fal', 'transloadit'])

export const granularitySchema = z.enum(['full', 'list']).default('full')

/**
 * A robot that imports data from a source.
 */
export type RobotImport = z.infer<typeof robotImport>
export const robotImport = z
  .object({
    force_name: z
      .union([z.string(), z.array(z.string())])
      .nullable()
      .default(null)
      .describe(
        'Custom name for the imported file(s). By default file names are derived from the source.',
      ),
    ignore_errors: z
      .union([z.boolean(), z.array(z.enum(['meta', 'import']))])
      .transform((value) => (value === true ? ['meta', 'import'] : value === false ? [] : value))
      .default([]),
  })
  .strict()

export type AzureBase = z.infer<typeof azureBase>
export const azureBase = z
  .object({
    credentials: z
      .string()
      .optional()
      .describe(`
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
    credentials: z
      .string()
      .optional()
      .describe(`
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
    credentials: z
      .string()
      .optional()
      .describe(`
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
    credentials: z
      .string()
      .optional()
      .describe(`
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
    credentials: z
      .string()
      .optional()
      .describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your [Template Credentials](/c/template-credentials/) as this parameter's value. They will contain the values for your DigitalOcean Space, Key, Secret and Region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"space"\`, \`"region"\` (for example: \`"fra1"\` or \`"nyc3"\`), \`"key"\`, \`"secret"\`.
`),
    space: z.string().optional(),
    region: z.string().optional(),
    key: z.string().optional(),
    secret: z.string().optional(),
  })
  .strict()

export type DropboxBase = z.infer<typeof dropboxBase>
export const dropboxBase = z
  .object({
    credentials: z
      .string()
      .optional()
      .describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your Dropbox access token.
`),
  })
  .strict()

export type VimeoBase = z.infer<typeof vimeoBase>
export const vimeoBase = z
  .object({
    credentials: z
      .string()
      .optional()
      .describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your Vimeo access token.
`),
  })
  .strict()

export type FtpBase = z.infer<typeof ftpBase>
export const ftpBase = z
  .object({
    credentials: z
      .string()
      .optional()
      .describe(`
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
    credentials: z
      .string()
      .optional()
      .describe(`
Create a new [Google service account](https://cloud.google.com/storage/docs/authentication). Set its role to "Storage Object Creator". Choose "JSON" for the key file format and download it to your computer. You will need to upload this file when creating your <dfn>Template Credentials</dfn>.

Go back to your Google credentials project and enable the "Google Cloud Storage JSON API" for it. Wait around ten minutes for the action to propagate through the Google network. Grab the project ID from the dropdown menu in the header bar on the Google site. You will also need it later on.

Now you can set up the \`storage.objects.create\` and \`storage.objects.delete\` permissions. The latter is optional and only required if you intend to overwrite existing paths.

To do this from the Google Cloud console, navigate to "IAM &amp; Admin" and select "Roles". From here, click "Create Role", enter a name, set the role launch stage to _General availability,_ and set the permissions stated above.

Next, go to Storage browser and select the ellipsis on your bucket to edit bucket permissions. From here, select "Add Member", enter your service account as a new member, and select your newly created role.

Then, create your associated [Template Credentials](/c/template-credentials/) in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value.
`),
  })
  .strict()

export type MinioBase = z.infer<typeof minioBase>
export const minioBase = z
  .object({
    credentials: z
      .string()
      .optional()
      .describe(`
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
    credentials: z
      .string()
      .optional()
      .describe(`
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
    credentials: z
      .string()
      .optional()
      .describe(`
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
    credentials: z
      .string()
      .optional()
      .describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your Supabase bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"host"\`, \`"key"\`, \`"secret"\`.

If you do use these parameters, make sure to use the **Endpoint** value under \`Storage > S3 Connection\` in the Supabase console for the \`"host"\` value, and the values under **S3 Access Keys** on the same page for your \`"key"\` and \`"secret"\`.
`),
    bucket: z.string().optional(),
    bucket_region: z
      .string()
      .optional()
      .describe(`
The region where the bucket is located.
`),
    host: z.string().optional(),
    key: z.string().optional(),
    secret: z.string().optional(),
  })
  .strict()

export type SwiftBase = z.infer<typeof swiftBase>
export const swiftBase = z
  .object({
    credentials: z
      .string()
      .optional()
      .describe(`
  Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your Swift bucket, Key, Secret and Bucket region.

  While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"host"\`, \`"key"\`, \`"secret"\`.
  `),
    bucket: z.string().optional(),
    bucket_region: z
      .string()
      .optional()
      .describe(`
The region where the bucket is located.
`),
    host: z.string().optional(),
    key: z.string().optional(),
    secret: z.string().optional(),
  })
  .strict()

export type TigrisBase = z.infer<typeof tigrisBase>
export const tigrisBase = z
  .object({
    credentials: z
      .string()
      .optional()
      .describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your MinIO bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"host"\`, \`"key"\`, \`"secret"\`.
`),
    bucket: z.string().optional(),
    bucket_region: z
      .string()
      .optional()
      .describe(`
The region where the bucket is located.
`),
    host: z.string().optional(),
    key: z.string().optional(),
    secret: z.string().optional(),
  })
  .strict()

export type WasabiBase = z.infer<typeof wasabiBase>
export const wasabiBase = z
  .object({
    credentials: z
      .string()
      .optional()
      .describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your Wasabi bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"host"\`, \`"key"\`, \`"secret"\`.
`),
    bucket: z.string().optional(),
    bucket_region: z
      .string()
      .optional()
      .describe(`
The region where the bucket is located.
`),
    host: z.string().optional(),
    key: z.string().optional(),
    secret: z.string().optional(),
  })
  .strict()

export type FilterExpression = z.infer<typeof filterExpression>
export const filterExpression = z.union([
  z.string(),
  z.number(),
  z.null(),
  z.array(z.union([z.string(), z.number(), z.null()])),
])

export type FilterCondition = z.infer<typeof filterCondition>
export const filterCondition = z.union([
  z.null(),
  z.string(),
  z.array(
    z.tuple([
      filterExpression,
      z.union([
        z.literal('=').describe('Equals without type check'),
        z.literal('==').describe('Equals without type check'),
        z.literal('===').describe('Strict equals with type check'),
        z.literal('<').describe('Less than'),
        z.literal('>').describe('Greater than'),
        z.literal('<=').describe('Less or equal'),
        z.literal('>=').describe('Greater or equal'),
        z.literal('!=').describe('Simple inequality check without type check'),
        z.literal('!==').describe('Strict inequality check with type check'),
        z
          .literal('regex')
          .describe(
            'Case-insensitive regular expression based on [RE2](https://github.com/google/re2) `.match()`',
          ),
        z
          .literal('!regex')
          .describe(
            'Case-insensitive regular expression based on [RE2](https://github.com/google/re2) `!.match()`',
          ),
        z
          .literal('includes')
          .describe(
            'Check if the right element is included in the array, which is represented by the left element',
          ),
        z
          .literal('!includes')
          .describe(
            'Check if the right element is not included in the array, which is represented by the left element',
          ),
        z
          .literal('empty')
          .describe(
            'Check if the left element is an empty array, an object without properties, an empty string, the number zero or the boolean false. Leave the third element of the array to be an empty string. It won’t be evaluated.',
          ),
        z
          .literal('!empty')
          .describe(
            'Check if the left element is an array with members, an object with at least one property, a non-empty string, a number that does not equal zero or the boolean true. Leave the third element of the array to be an empty string. It won’t be evaluated.',
          ),
      ]),
      filterExpression,
    ]),
  ),
])

/**
 * Parameters specific to the /video/encode robot. Useful for typing robots that pass files to /video/encode.
 */
export const videoEncodeSpecificInstructionsSchema = robotFFmpegVideo
  .extend({
    resize_strategy: resize_strategy.describe(`
See the [available resize strategies](/docs/topics/resize-strategies/).
`),
    zoom: z
      .boolean()
      .default(true)
      .describe(`
If this is set to \`false\`, smaller videos will not be stretched to the desired width and height. For details about the impact of zooming for your preferred resize strategy, see the list of available [resize strategies](/docs/topics/resize-strategies/).
`),
    crop: unsafeCoordinatesSchema.optional().describe(`
Specify an object containing coordinates for the top left and bottom right corners of the rectangle to be cropped from the original video(s). Values can be integers for absolute pixel values or strings for percentage based values.

For example:

\`\`\`json
{
  "x1": 80,
  "y1": 100,
  "x2": "60%",
  "y2": "80%"
}
\`\`\`

This will crop the area from \`(80, 100)\` to \`(600, 800)\` from a 1000×1000 pixels video, which is a square whose width is 520px and height is 700px. If \`crop\` is set, the width and height parameters are ignored, and the \`resize_strategy\` is set to \`crop\` automatically.

You can also use a JSON string of such an object with coordinates in similar fashion:

\`\`\`json
"{\\"x1\\": <Integer>, \\"y1\\": <Integer>, \\"x2\\": <Integer>, \\"y2\\": <Integer>}"
\`\`\`
`),
    background: color_with_alpha.default('#00000000').describe(`
The background color of the resulting video the \`"rrggbbaa"\` format (red, green, blue, alpha) when used with the \`"pad"\` resize strategy. The default color is black.
`),
    rotate: z
      // We can’t use enum.
      // See https://github.com/colinhacks/zod/issues/2686
      .union([
        z.literal(0),
        z.literal(90),
        z.literal(180),
        z.literal(270),
        z.literal(360),
        z.literal(false),
      ])
      .optional()
      .describe(`
Forces the video to be rotated by the specified degree integer. Currently, only multiples of \`90\` are supported. We automatically correct the orientation of many videos when the orientation is provided by the camera. This option is only useful for videos requiring rotation because it was not detected by the camera. If you set \`rotate\` to \`false\` no rotation is performed, even if the metadata contains such instructions.
`),
    hint: z
      .boolean()
      .default(false)
      .describe(`
Enables hinting for mp4 files, for RTP/RTSP streaming.
`),
    turbo: z
      .boolean()
      .default(false)
      .describe(`
Splits the video into multiple chunks so that each chunk can be encoded in parallel before all encoded chunks are stitched back together to form the result video. This comes at the expense of extra <dfn>Priority Job Slots</dfn> and may prove to be counter-productive for very small video files.
`),
    chunk_duration: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(`
Allows you to specify the duration of each chunk when \`turbo\` is set to \`true\`. This means you can take advantage of that feature while using fewer <dfn>Priority Job Slots</dfn>. For instance, the longer each chunk is, the fewer <dfn>Encoding Jobs</dfn> will need to be used.
`),
    watermark_url: z
      .string()
      .default('')
      .describe(`
A URL indicating a PNG image to be overlaid above this image. You can also [supply the watermark via another Assembly Step](/docs/topics/use-parameter/#supplying-the-watermark-via-an-assembly-step).
`),
    watermark_position: z
      .union([positionSchema, z.array(positionSchema)])
      .default('center')
      .describe(`
The position at which the watermark is placed.

An array of possible values can also be specified, in which case one value will be selected at random, such as \`[ "center", "left", "bottom-left", "bottom-right" ]\`.

This setting puts the watermark in the specified corner. To use a specific pixel offset for the watermark, you will need to add the padding to the image itself.
`),
    watermark_x_offset: z
      .number()
      .int()
      .default(0)
      .describe(`
The x-offset in number of pixels at which the watermark will be placed in relation to the position it has due to \`watermark_position\`.

Values can be both positive and negative and yield different results depending on the \`watermark_position\` parameter. Positive values move the watermark closer to the image's center point, whereas negative values move the watermark further away from the image's center point.
`),
    watermark_y_offset: z
      .number()
      .int()
      .default(0)
      .describe(`
The y-offset in number of pixels at which the watermark will be placed in relation to the position it has due to \`watermark_position\`.

Values can be both positive and negative and yield different results depending on the \`watermark_position\` parameter. Positive values move the watermark closer to the image's center point, whereas negative values move the watermark further away from the image's center point.
`),
    watermark_size: percentageSchema.optional().describe(`
The size of the watermark, as a percentage, such as \`"50%"\`. How the watermark is resized greatly depends on the \`watermark_resize_strategy\`.
`),
    watermark_resize_strategy: z
      .enum(['area', 'fit', 'stretch'])
      .default('fit')
      .describe(`
To explain how the resize strategies work, let's assume our target video size is 800×800 pixels and our watermark image is 400×300 pixels. Let's also assume, the \`watermark_size\` parameter is set to \`"25%"\`.

For the \`"fit"\` resize strategy, the watermark is scaled so that the longer side of the watermark takes up 25% of the corresponding video side. And the other side is scaled according to the aspect ratio of the watermark image. So with our watermark, the width is the longer side, and 25% of the video size would be 200px. Hence, the watermark would be resized to 200×150 pixels. If the \`watermark_size\` was set to \`"50%"\`", it would be resized to 400×300 pixels (so just left at its original size).

For the \`"stretch"\` resize strategy, the watermark image is stretched (meaning, it is resized without keeping its aspect ratio in mind) so that both sides take up 25% of the corresponding video side. Since our video is 800×800 pixels, for a watermark size of 25% the watermark would be resized to 200×200 pixels. Its height would appear stretched, because keeping the aspect ratio in mind it would be resized to 200×150 pixels instead.

For the \`"area"\` resize strategy, the watermark is resized (keeping its aspect ratio in check) so that it covers \`"xx%"\` of the video's surface area. The value from \`watermark_size\` is used for the percentage area size.
`),
    watermark_start_time: z
      .number()
      .default(0)
      .describe(`
The delay in seconds from the start of the video for the watermark to appear. By default the watermark is immediately shown.
`),
    watermark_duration: z
      .number()
      .default(-1)
      .describe(`
The duration in seconds for the watermark to be shown. Can be used together with \`watermark_start_time\` to create nice effects. The default value is \`-1.0\`, which means that the watermark is shown for the entire duration of the video.
`),
    watermark_opacity: z
      .number()
      .min(0)
      .max(1)
      .default(1)
      .describe(`
The opacity of the watermark. Valid values are between \`0\` (invisible) and \`1.0\` (full visibility).
`),
    segment: z
      .boolean()
      .default(false)
      .describe(`
Splits the file into multiple parts, to be used for Apple's [HTTP Live Streaming](https://developer.apple.com/resources/http-streaming/).
`),
    segment_duration: z
      .number()
      .int()
      .min(1)
      .default(10)
      .describe(`
Specifies the length of each HTTP segment. This is optional, and the default value as recommended by Apple is \`10\`. Do not change this value unless you have a good reason.
`),
    segment_prefix: z
      .string()
      .default('')
      .describe(`
The prefix used for the naming. For example, a prefix of \`"segment_"\` would produce files named \`"segment_0.ts"\`, \`"segment_1.ts"\` and so on. This is optional, and defaults to the base name of the input file. Also see the related \`segment_name\` parameter.
`),
    segment_name: z
      .string()
      .default('')
      .describe(`
The name used for the final segment. Available variables are \`\${segment_prefix}\`, \`\${segment_number}\` and \`\${segment_id}\` (which is a UUIDv4 without dashes).
`),
    segment_time_delta: z
      .number()
      .optional()
      .describe(`
Delta to apply to segment duration. This is optional and allows fine-tuning of segment boundaries.
`),
  })
  .strict()
