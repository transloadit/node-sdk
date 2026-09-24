import type { StringReplaceAll } from '../utility.ts'

import { z } from 'zod'

import { formatEnglishList } from '../../englishList.ts'
import {
  ecmaWhitespaceCharacterClass,
  zodInputPreservingTransform,
  zodStableJsonDefault,
  zodWithConservativeJsonInputSchema,
  zodWithJsonInputSchema,
} from '../../lib/zodInputSemantics.ts'
import { inheritApiParameterDescription } from '../apiParameterDescription.ts'
import { runtimeStackVersions, stackVersions } from '../stackVersions.ts'

export const robotNames = z.enum([
  'AiChatRobot',
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
  'AudioSplitRobot',
  'BoxImportRobot',
  'BoxStoreRobot',
  'VideoArtworkRobot',
  'ImageFacedetectRobot',
  'ImageDescribeRobot',
  'ImageCopyrightdetectRobot',
  'ImageOcrRobot',
  'ImageBgremoveRobot',
  'ImageUpscaleRobot',
  'ImageGenerateRobot',
  'ImageEnhanceRobot',
  'DocumentOcrRobot',
  'DocumentOptimizeRobot',
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
  'DocumentExtractRobot',
  'DocumentMergeRobot',
  'DocumentSplitRobot',
  'DocumentOptimizeRobot',
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
  'MegaImportRobot',
  'TigrisImportRobot',
  'CloudflareImportRobot',
  'SupabaseImportRobot',
  'MinioStoreRobot',
  'MegaStoreRobot',
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
  'HttpRequestRobot',
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
  'VideoSplitRobot',
  'VideoGenerateRobot',
  'FileFilterRobot',
  'TextSpeakRobot',
  'TextTranslateRobot',
  'FilePreviewRobot',
  'TusStoreRobot',
  'TransloaditImportRobot',
  'TransloaditStoreRobot',
  'ProgressSimulateRobot',
])

const awsGcpMinimumChargeUsdSchema = z.object({
  aws: z.number(),
  gcp: z.number(),
})

export const robotMetaSchema = z.object({
  // Added keys from api2/lib/config.ts:
  name: robotNames,
  priceFactor: z.number(),
  queueSlotCount: z.number(),
  downloadInputFiles: z.boolean().optional(),
  preserveInputFileUrls: z.boolean().optional(),
  minimumCharge: z.number().optional(),
  minimumChargeUsd: z.number().optional(),
  minimumChargeUsdPerSpeechTranscribeMinute: awsGcpMinimumChargeUsdSchema
    .extend({
      replicate: z.literal('variable').optional(),
    })
    .optional(),
  minimumChargeUsdPerDocumentOcrPage: awsGcpMinimumChargeUsdSchema.optional(),
  applyCommunityPlanMediaTrim: z.boolean().optional(),
  isAllowedForUrlTransform: z.boolean(),
  removeJobResultFilesFromDiskRightAfterStoringOnS3: z.boolean(),
  lazyLoad: z.boolean().optional(),
  installVersionFile: z.string().optional(),
  trackOutputFileSize: z.boolean().optional(),
  isInternal: z.boolean(),
  numDaemons: z.number().optional(),
  stage: z.enum(['alpha', 'beta', 'ga', 'deprecated', 'removed']),
  importRanges: z.array(z.string()).optional(),
  extraChargeForImageResize: z.number().optional(),

  // Original keys from content repo:
  description: z.string().optional(),
  // Validate against assembled public Robot schemas at publication, outside this dependency cycle.
  example_code: z.unknown().optional(),
  example_code_description: z.string().optional(),
  extended_description: z.string().optional(),
  has_small_icon: z.literal(true).optional(),
  ogimage: z.string().optional(),
  marketing_intro: z.string().optional(),
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
    'enhance',
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
    'split',
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
  hideCredentialsWarning: z.boolean().optional(),
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
    'image-processing',
    'media-cataloging',
    'video-encoding',
  ]),
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

/** Shared processing metadata; per-Robot exceptions stay explicit. */
export const robotProcessingMeta = {
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  queueSlotCount: 10,
  priceFactor: 1,
  isAllowedForUrlTransform: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'ga',
} satisfies Partial<RobotMetaInput>

/** Shared artificial-intelligence metadata; exceptions stay local. */
export const robotArtificialIntelligenceMeta = {
  ...robotProcessingMeta,
  service_slug: 'artificial-intelligence',
  typical_file_type: 'image',
  trackOutputFileSize: true,
} satisfies Partial<RobotMetaInput>

/** Shared audio-encoding metadata; exceptions stay local. */
export const robotAudioEncodingMeta = {
  ...robotProcessingMeta,
  override_lvl1: 'Audio Encoding',
  service_slug: 'audio-encoding',
  typical_file_size_mb: 3.8,
  typical_file_type: 'audio file',
  priceFactor: 4,
  queueSlotCount: 20,
  trackOutputFileSize: true,
  applyCommunityPlanMediaTrim: true,
} satisfies Partial<RobotMetaInput>

/** Shared document-processing metadata; exceptions stay local. */
export const robotDocumentProcessingMeta = {
  ...robotProcessingMeta,
  override_lvl1: 'Document Processing',
  service_slug: 'document-processing',
  typical_file_size_mb: 0.8,
  typical_file_type: 'document',
  minimumCharge: 1048576,
} satisfies Partial<RobotMetaInput>

/** Shared content-delivery metadata; exceptions stay local. */
export const robotContentDeliveryMeta = {
  ...robotProcessingMeta,
  service_slug: 'content-delivery',
  queueSlotCount: 0,
  downloadInputFiles: false,
  preserveInputFileUrls: true,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: false,
  isInternal: true,
} satisfies Partial<RobotMetaInput>

/** Shared file-filtering metadata; exceptions stay local. */
export const robotFileFilteringMeta = {
  ...robotProcessingMeta,
  override_lvl1: 'File Filtering',
  service_slug: 'file-filtering',
  trackOutputFileSize: true,
} satisfies Partial<RobotMetaInput>

/** Shared media-cataloging metadata; exceptions stay local. */
export const robotMediaCatalogingMeta = {
  ...robotProcessingMeta,
  override_lvl1: 'Media Cataloging',
  service_slug: 'media-cataloging',
  queueSlotCount: 15,
} satisfies Partial<RobotMetaInput>

/** Shared image-processing metadata; exceptions stay local. */
export const robotImageProcessingMeta = {
  ...robotProcessingMeta,
  override_lvl1: 'Image Processing',
  service_slug: 'image-processing',
  typical_file_size_mb: 0.8,
  typical_file_type: 'image',
} satisfies Partial<RobotMetaInput>

/** Shared code-evaluation metadata; exceptions stay local. */
export const robotCodeEvaluationMeta = {
  ...robotProcessingMeta,
  override_lvl1: 'Code Evaluation',
  service_slug: 'code-evaluation',
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
} satisfies Partial<RobotMetaInput>

/** Shared video-encoding metadata; exceptions stay local. */
export const robotVideoEncodingMeta = {
  ...robotProcessingMeta,
  override_lvl1: 'Video Encoding',
  service_slug: 'video-encoding',
  typical_file_size_mb: 80,
  typical_file_type: 'video',
  queueSlotCount: 60,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  applyCommunityPlanMediaTrim: true,
} satisfies Partial<RobotMetaInput>

/** Shared import metadata; provider-specific prices, queues, and flags override it locally. */
export const robotImportMeta = {
  override_lvl1: 'File Importing',
  purpose_verb: 'import',
  service_slug: 'file-importing',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  priceFactor: 6.6666,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
  stage: 'ga',
} satisfies Partial<RobotMetaInput>

/** Shared store metadata; provider-specific prices, queues, and flags override it locally. */
export const robotStoreMeta = {
  override_lvl1: 'File Exporting',
  purpose_verb: 'export',
  service_slug: 'file-exporting',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  priceFactor: 6.6666,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'ga',
} satisfies Partial<RobotMetaInput>

/** Single-Step processing example; unusual input relationships stay explicit. */
export function createProcessingExample(
  name: string,
  robot: string,
  parameters: Record<string, unknown> = {},
): { steps: Record<string, Record<string, unknown>> } {
  return { steps: { [name]: { robot, use: ':original', ...parameters } } }
}

interface StorageExampleStep {
  robot: string
  credentials: string
  path: string
  recursive?: true
  use?: ':original'
}

interface StorageRobotExample {
  steps: Record<string, StorageExampleStep>
}

/** Standard directory import example; nonrecursive providers omit the flag. */
export function createStorageImportExample(
  robot: string,
  credentials: string,
  recursive = true,
): StorageRobotExample {
  return {
    steps: {
      imported: {
        robot,
        credentials,
        path: 'path/to/files/',
        ...(recursive ? { recursive: true } : {}),
      },
    },
  }
}

/** Standard export example shared by compatible storage providers. */
export function createStorageStoreExample(robot: string, credentials: string): StorageRobotExample {
  return {
    steps: {
      exported: {
        robot,
        use: ':original',
        credentials,
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  }
}

// These schemas can be reproduced with z.string().regex(). However, this causes some issues.
// We use this in combination with unions. Internally Zod normalizes unions. A string schema and
// enums merged in some way. Both are validated. Normally, if a Zod union has errors, all of them
// are surfaced. However, if the regex isn’t match, and none of the enum values overlap, then the
// regex error is raised instead of the union error. As a result, the best error we could give back
// to the user, is that there’s a problem with the interpolation syntax. But really the other error
// is more useful in pretty much every case. To work around this, we use z.custom() instead, as Zod
// can’t normalize that.
const interpolationRegexFull = /^\${.+}$/
export const interpolationSchemaFull = zodWithJsonInputSchema(
  z.custom<`\${${string}}`>(
    (input) => typeof input === 'string' && interpolationRegexFull.test(input),
    'Must be a full interpolation string',
  ),
  z.string().regex(/^\$\{[^\n\r\u2028\u2029]+\}$/u),
)
const interpolationRegexPartial = /\${.+}/
export const interpolationSchemaPartial = zodWithJsonInputSchema(
  z.custom<string>(
    (input) => typeof input === 'string' && interpolationRegexPartial.test(input),
    'Must be a partially interpolatable string',
  ),
  z.string().regex(/\$\{[^\n\r\u2028\u2029]+\}/u),
)

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

function isZodTypeAny(schema: unknown): schema is z.ZodTypeAny {
  return schema instanceof z.ZodType
}

function toFirstPartySchema(schema: unknown): z.ZodFirstPartySchemaTypes {
  if (!isZodTypeAny(schema)) {
    throw new Error('Expected a Zod schema')
  }
  return schema as z.ZodFirstPartySchemaTypes
}

function toInterpolatableSchema<Schema extends z.ZodFirstPartySchemaTypes>(
  schema: z.ZodTypeAny,
): InterpolatableSchema<Schema> {
  return schema as InterpolatableSchema<Schema>
}

function toInterpolatableRobot<Schema extends z.ZodObject<z.ZodRawShape>>(
  schema: z.ZodTypeAny,
): InterpolatableRobot<Schema> {
  return schema as InterpolatableRobot<Schema>
}

function toInterpolatableUnionOptions(options: z.ZodTypeAny[]): z.ZodUnionOptions {
  if (options.length === 0) {
    throw new Error('Union options must not be empty')
  }

  const [head, ...tail] = options
  return [head, ...tail]
}

function interpolateRecursiveWithoutDescriptionRegistration<
  Schema extends z.ZodFirstPartySchemaTypes,
>(schema: Schema): InterpolatableSchema<Schema> {
  const def = schema._def

  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return toInterpolatableSchema(
        z.union([
          interpolationSchemaFull,
          zodInputPreservingTransform(
            z.union([schema, booleanStringSchema]),
            (value) => value === true || value === 'true',
          ),
        ]),
      )
    case z.ZodFirstPartyTypeKind.ZodArray: {
      let replacement = z.array(interpolateRecursive(def.type), def)

      if (def.exactLength != null) {
        replacement = replacement.length(def.exactLength.value, def.exactLength.message)
      }

      if (def.maxLength != null) {
        replacement = replacement.max(def.maxLength.value, def.maxLength.message)
      }

      if (def.minLength != null) {
        replacement = replacement.min(def.minLength.value, def.minLength.message)
      }

      return toInterpolatableSchema(z.union([interpolationSchemaFull, replacement]))
    }
    case z.ZodFirstPartyTypeKind.ZodDefault: {
      const replacement = zodStableJsonDefault(
        toInterpolatableSchema<Schema>(interpolateRecursive(def.innerType)),
        def.defaultValue(),
      )

      return toInterpolatableSchema(
        def.description ? replacement.describe(def.description) : replacement,
      )
    }
    case z.ZodFirstPartyTypeKind.ZodEffects:
      return toInterpolatableSchema(
        z.union(
          [
            def.schema instanceof z.ZodString
              ? interpolationSchemaPartial
              : interpolationSchemaFull,
            schema,
          ],
          def,
        ),
      )
    case z.ZodFirstPartyTypeKind.ZodEnum:
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return toInterpolatableSchema(z.union([interpolationSchemaFull, schema], def))
    case z.ZodFirstPartyTypeKind.ZodNumber:
      if (!(schema instanceof z.ZodNumber)) {
        throw new Error('A ZodNumber definition must belong to a ZodNumber schema')
      }
      return toInterpolatableSchema(
        z.union(
          [
            zodInputPreservingTransform(z.string().regex(/^[0-9]+(\.[0-9]+)?$/u), (value) =>
              Number(value),
            ),
            interpolationSchemaFull,
            zodWithJsonInputSchema(
              zodInputPreservingTransform(schema, (value) => value),
              schema.finite(),
            ),
          ],
          def,
        ),
      )
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return toInterpolatableSchema(
        interpolateRecursive(def.innerType).nullable().describe(def.description),
      )
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const replacement = z.object(
        Object.fromEntries(
          Object.entries(def.shape()).map(([key, nested]) => [
            key,
            interpolateRecursive(toFirstPartySchema(nested)),
          ]),
        ),
        def,
      )
      return toInterpolatableSchema(
        z.union([
          interpolationSchemaFull,
          def.unknownKeys === 'strict'
            ? replacement.strict()
            : def.unknownKeys === 'passthrough'
              ? replacement.passthrough()
              : replacement,
        ]),
      )
    }
    case z.ZodFirstPartyTypeKind.ZodOptional:
      return toInterpolatableSchema(z.optional(interpolateRecursive(def.innerType), def))
    case z.ZodFirstPartyTypeKind.ZodRecord:
      return toInterpolatableSchema(z.record(def.keyType, interpolateRecursive(def.valueType), def))
    case z.ZodFirstPartyTypeKind.ZodString:
      return toInterpolatableSchema(z.union([interpolationSchemaPartial, schema], def))
    case z.ZodFirstPartyTypeKind.ZodTuple: {
      const tuple = z.tuple(def.items.map(interpolateRecursive), def)

      return toInterpolatableSchema(
        z.union([interpolationSchemaFull, def.rest ? tuple.rest(def.rest) : tuple]),
      )
    }
    case z.ZodFirstPartyTypeKind.ZodUnion:
      return toInterpolatableSchema(
        z.union(
          [
            interpolationSchemaFull,
            ...toInterpolatableUnionOptions(def.options.map(interpolateRecursive)),
          ],
          def,
        ),
      )
    default:
      return toInterpolatableSchema(schema)
  }
}

/** Interpolate a schema while preserving stable API-description ownership metadata. */
export function interpolateRecursive<Schema extends z.ZodFirstPartySchemaTypes>(
  schema: Schema,
): InterpolatableSchema<Schema> {
  const interpolated = interpolateRecursiveWithoutDescriptionRegistration(schema)
  return toInterpolatableSchema(inheritApiParameterDescription(schema, interpolated))
}

/**
 * The robot keys specified in this array can’t be interpolated.
 */
const uninterpolatableKeys = ['interpolate', 'robot', 'use'] as const
const uninterpolatableKeySet = new Set<string>(uninterpolatableKeys)
const robotIdentifierDescription =
  'Identifier of the [robot](https://transloadit.com/docs/robots/) to execute'

type InterpolatableRobot<Schema extends z.ZodObject<z.ZodRawShape>> =
  Schema extends z.ZodObject<infer T, infer UnknownKeys, infer Catchall>
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

const robotDocumentationSchemas = new WeakMap<z.ZodTypeAny, z.ZodObject<z.ZodRawShape>>()

/** Recover the public schema before interpolation adds wire-only alternatives and generic copy. */
export function getRobotDocumentationSchema(
  schema: z.ZodObject<z.ZodRawShape>,
): z.ZodObject<z.ZodRawShape> {
  return robotDocumentationSchemas.get(schema) ?? schema
}

export function interpolateRobot<Schema extends z.ZodObject<z.ZodRawShape>>(
  schema: Schema,
): InterpolatableRobot<Schema> {
  const def = schema._def
  const interpolated = toInterpolatableRobot<Schema>(
    z
      .object(
        Object.fromEntries(
          Object.entries(def.shape()).map(([key, nested]) => [
            key,
            uninterpolatableKeySet.has(key)
              ? key === 'robot'
                ? nested.description == null
                  ? nested.describe(robotIdentifierDescription)
                  : nested
                : nested
              : interpolateRecursive(toFirstPartySchema(nested)),
          ]),
        ),
        def,
      )
      .strict(),
  )
  robotDocumentationSchemas.set(interpolated, schema)
  return interpolated
}

const robotInterpolateBooleanSchema = zodInputPreservingTransform(
  z.union([z.boolean(), booleanStringSchema]),
  (value) => value === true || value === 'true',
)

const robotInterpolateDescription = `
Controls whether Assembly Variables are interpolated for individual instruction fields.

By default, most Robot instruction fields interpolate Assembly Variables. Set this to \`false\` to treat every instruction field as literal text, or set an individual field path to \`false\` to treat only that field as literal text. For Robot-specific fields that are literal by default, set this to \`true\` or set that field path to \`true\` to opt back into interpolation.

Use field names such as \`path\`, or dotted paths such as \`ffmpeg.vf\` for nested objects.
`

export const robotInterpolateSchema = z
  .union([robotInterpolateBooleanSchema, z.record(robotInterpolateBooleanSchema)])
  .describe(robotInterpolateDescription)

/**
 * Fields that are shared by all Transloadit robots.
 */
export const robotOutputMetaSchema = z.union([
  z.record(z.boolean()),
  z.boolean(),
  z.array(z.string()),
])
export type RobotOutputMeta = z.infer<typeof robotOutputMetaSchema>

const robotOutputMetaDescription = `
Allows you to specify a set of metadata that is more expensive on CPU power to calculate, and thus is disabled by default to keep your Assemblies processing fast.

For images, you can add \`"has_transparency": true\` in this object to extract if the image contains transparent parts and \`"dominant_colors": true\` to extract an array of hexadecimal color codes from the image.

For images, you can also add \`"blurhash": true\` to extract a [BlurHash](https://blurha.sh) string — a compact representation of a placeholder for the image, useful for showing a blurred preview while the full image loads.

For images, \`"thumbhash": true\` instead extracts a base64-encoded [ThumbHash](https://evanw.github.io/thumbhash/) into \`meta.thumbhash\`, together with \`meta.has_alpha\` (whether an alpha channel exists, even when fully opaque). It describes EXIF-oriented pixels and uses the first frame of animated images. Extraction is best-effort: images above 40 megapixels, unsupported formats, or a failed/bounded decode produce no placeholder. Successful extraction adds a metadata charge equivalent to 20% of that file's bytes. No ThumbHash surcharge applies when disabled or when no hash is produced.

Set this option on the Step producing the image, such as \`/upload/handle\` for uploaded originals or \`/image/resize\` for processed outputs. Setting it only on \`/transloadit/store\` does not request extraction: storage preserves the producer's metadata. Transloadit Storage persists a generated hash with its immutable version and returns it in stored results and native asset reads. Direct S3 uploads do not generate placeholders. A placeholder contains image information, so protect it with the same access controls as the full image.

For videos, you can add the \`"colorspace": true\` parameter to extract the colorspace of the output video.

For videos, you can also add \`"interlaced": true\` to detect whether the video is interlaced. This combines the cheap ffprobe \`field_order\` flag with a bounded \`idet\` sampling pass over the first frames of the source, exposing \`interlaced\`, \`field_order\`, and a diagnostic \`interlace_detection\` object under \`file.meta\`. This is computationally expensive and billed accordingly.

For audio, you can add \`"mean_volume": true\` to get a single value representing the mean average volume of the audio file.

You can also set this to \`false\` to skip metadata extraction and speed up transcoding.
`

const robotQueueDescription = `Setting the queue to 'batch', manually downgrades the priority of jobs for this step to avoid consuming Priority job slots for jobs that don't need zero queue waiting times`

const robotIgnoreErrorsPhaseDescriptions = `Ignore errors during specific phases of processing.

Setting this to \`["meta"]\` will cause the Robot to ignore errors during metadata extraction.

Setting this to \`["execute"]\` will cause the Robot to ignore errors during the main execution phase.`

export const autoProviderDescription = 'Chooses the best provider based on your request.'

const aiProviderDescription = `${autoProviderDescription}

Select a specific provider to override automatic selection.`

const legacyFfmpegVersions = formatEnglishList(
  runtimeStackVersions.ffmpeg.valid.map((version) => JSON.stringify(version)),
)
const deprecatedFfmpegVersions = formatEnglishList([
  ...new Set(
    Object.keys(runtimeStackVersions.ffmpeg.deprecated).map((version) =>
      JSON.stringify(`${version.split('.')[0]}.x`),
    ),
  ),
])

export const robotParameterDocs = {
  adaptive_filtering: {
    description: `
Controls the image compression for PNG images. Setting to \`true\` results in smaller file size, while increasing processing time. It is encouraged to keep this option disabled.
`,
  },
  ai_provider: {
    description: aiProviderDescription,
  },
  audio_bitrate: {
    description: `
Bit rate of the resulting audio file, in bits per second. If not specified will default to the bit rate of the input audio file.
`,
  },

  audio_preset: {
    description: `
Performs conversion using pre-configured settings.

If you specify your own FFmpeg parameters using the <dfn>Robot</dfn>'s \`ffmpeg\` parameter and you have not specified a preset, then the default \`mp3\` preset is not applied. This is to prevent you from having to override each of the MP3 preset's values manually.

For a list of audio presets, see [audio presets](/docs/presets/audio/).
`,
  },

  audio_sample_rate: {
    description: `
Sample rate of the resulting audio file, in Hertz. If not specified will default to the sample rate of the input audio file.
`,
  },

  auto_provider: {
    description: autoProviderDescription,
  },
  error_msg: {
    description: `
The error message shown to your users (such as by Uppy) when a file is declined and \`error_on_decline\` is set to \`true\`.
`,
  },

  error_on_decline: {
    description: `
If this is set to \`true\` and one or more files are declined, the Assembly will be stopped and marked with an error.
`,
  },

  ffmpeg: {
    description: `
A parameter object to be passed to FFmpeg. If a preset is used, the options specified are merged on top of the ones from the preset. For available options, see the [FFmpeg documentation](https://ffmpeg.org/ffmpeg-doc.html). Options specified here take precedence over the preset options.
`,
  },
  ffmpeg_stack: {
    description: `
Selects the FFmpeg stack version to use for encoding. We currently recommend using "${stackVersions.ffmpeg.recommendedVersion}". The exact versions ${legacyFfmpegVersions} are legacy values that remain accepted for backward compatibility. Deprecated ${deprecatedFfmpegVersions} values are also accepted.
`,
  },
  force_accept: {
    description: `Force a Robot to accept a file type it would have ignored.

By default, Robots ignore files they are not familiar with.
[🤖/video/encode](/docs/robots/video-encode/), for
example, will happily ignore input images.

With the \`force_accept\` parameter set to \`true\`, you can force Robots to accept all files thrown at them.
This will typically lead to errors and should only be used for debugging or combatting edge cases.
`,
  },
  force_name: {
    description:
      'Custom name for the imported file(s). By default file names are derived from the source.',
  },
  ignore_errors: {
    description: `
${robotIgnoreErrorsPhaseDescriptions}

Setting this to \`true\` is equivalent to \`["meta", "execute"]\` and will ignore errors in both phases.
`,
  },
  import_ignore_errors: {
    description: `
${robotIgnoreErrorsPhaseDescriptions}

Setting this to \`["import"]\` will cause the Robot to ignore errors while importing the source file. The \`"import"\` phase is only available to import Robots.

Setting this to \`true\` is equivalent to \`["meta", "import", "execute"]\` and will ignore errors in all three phases.
`,
  },
  import_on_errors: {
    description: `
Setting this to \`["meta"]\` will still import the file on metadata extraction errors. \`ignore_errors\` is similar, it also ignores the error and makes sure the Robot doesn't stop, but it doesn't import the file.
`,
  },
  interpolate: {
    description: robotInterpolateDescription,
  },
  ocr_format: {
    description: `
In what format to return the extracted text.
- \`"json"\` returns a JSON file.
- \`"meta"\` does not return a file, but stores the data inside Transloadit's file object (under \`\${file.meta.recognized_text}\`, which is an array of strings) that's passed around between encoding <dfn>Steps</dfn>, so that you can use the values to burn the data into videos, filter on them, etc.
- \`"text"\` returns the recognized text as a plain UTF-8 encoded text file.
`,
  },
  ocr_granularity: {
    description: `
Whether to return a full response including coordinates for the text (\`"full"\`), or a flat list of the extracted phrases (\`"list"\`). This parameter has no effect if the \`format\` parameter is set to \`"text"\`.
`,
  },
  ocr_provider: {
    description: `${aiProviderDescription}
AWS supports detection for the following languages: English, Arabic, Russian, German, French, Italian, Portuguese and Spanish. GCP allows for a wider range of languages, with varying levels of support which can be found on the [official documentation](https://cloud.google.com/vision/docs/languages/).
`,
  },
  output_meta: {
    description: robotOutputMetaDescription,
  },
  queue: {
    description: robotQueueDescription,
  },
  result: {
    description: 'Whether the results of this Step should be present in the Assembly Status JSON',
  },
  return_file_stubs: {
    description: `
If set to \`true\`, the Robot will not yet import the actual files but instead return an empty file stub that includes a URL from where the file can be imported by subsequent Robots. This is useful for cases where subsequent Steps need more control over the import process, such as with 🤖/video/ondemand. This parameter should only be set if all subsequent Steps use Robots that support file stubs.
`,
  },
  robot: {
    description: `
Specifies which Robot should process files passed to this Step.

See [all Robots](https://transloadit.com/docs/robots/), each with their own parameters, such as
\`width\` to control how an image is resized. The full list of parameters per Robot can be taken
from the Robot docs.
`,
  },
  seed: {
    description: 'Seed for the random number generator.',
  },

  sort_by: {
    description: `
Controls how bundled inputs are ordered when no explicit numbered alias for the input type is used. Numbered aliases end with a numeric suffix such as \`_1\`.

The default \`"basename"\` keeps the legacy natural basename sorting behavior.

Set this to \`"import_order"\` to preserve the order of array-based import steps when all input files carry complete import order metadata. \`"auto"\` has the same import-order preference with natural basename sorting as fallback.
`,
  },
  use: {
    description: `
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
- You can also tag input Steps with \`as\` to pass semantic intent to robots:
  \`\`\`json
  {
    "use": [
      {
        "name": ":original",
        "as": "image"
      },
      {
        "name": ":original",
        "as": "mask"
      }
    ]
  }
  \`\`\`

> [!Tip]
> That's likely all you need to know about \`use\`, but you can view [Advanced use cases](/docs/topics/use-parameter/).
`,
  },
  user_meta: {
    description: `
Adds custom JSON metadata to each emitted file without changing its contents. Nested objects and arrays are supported.

Inheritance depends on the Robot. Values merge with existing \`user_meta\` on the output file; the current Step replaces matching top-level keys. Assign required keys explicitly when a Robot creates fresh outputs.

In processing Steps, \`\${file.*}\` refers to the first input and \`\${result.*}\` to the emitted file. Values are evaluated per output after the Robot runs, before subsequent metadata extraction and temporary storage. On \`:original\`, values are evaluated per upload before metadata extraction.

Downstream Steps read \`\${file.user_meta.key}\`. See [Custom metadata](https://transloadit.com/docs/topics/assembly-variables/#user-meta) for a complete example and inheritance rules.
`,
  },
  video_background: {
    description: `
The background color of the resulting video in the \`"rrggbbaa"\` format (red, green, blue, alpha) when used with the \`"pad"\` resize strategy. The default color is black.
`,
  },
  video_height: {
    description: `
Height of the new video, in pixels.

If the value is not specified and the \`preset\` parameter is available, the \`preset\`'s [supplied height](/docs/presets/video/) will be implemented.
`,
  },
  video_preset: {
    description: `
Converts a video according to [pre-configured settings](/docs/presets/video/).

You can use the value \`'empty'\` here if you specify your own FFmpeg parameters using the <dfn>Robot</dfn> or do not want Transloadit to set any encoding settings.
`,
  },
  video_width: {
    description: `
Width of the new video, in pixels.

If the value is not specified and the \`preset\` parameter is available, the \`preset\`'s [supplied width](/docs/presets/video/) will be implemented.
`,
  },
} as const

export type RobotParameterDocId = keyof typeof robotParameterDocs

export const inputSortBySchema = z
  .enum(['auto', 'basename', 'import_order'])
  .default('basename')
  .describe(robotParameterDocs.sort_by.description)

export const robotPathSchema = z
  .string()
  .regex(/^\/[a-z0-9_-]+\/[a-z0-9_-]+$/u)
  .describe(robotParameterDocs.robot.description)

export type RobotBase = z.infer<typeof robotBase>
export const robotBase = z
  .object({
    interpolate: robotInterpolateSchema.optional(),

    output_meta: robotOutputMetaSchema
      .optional()
      .describe(robotParameterDocs.output_meta.description),

    user_meta: z.record(z.unknown()).default({}).describe(robotParameterDocs.user_meta.description),

    result: z.boolean().default(false).describe(robotParameterDocs.result.description),

    queue: z.enum(['batch']).optional().describe(robotParameterDocs.queue.description),

    force_accept: z.boolean().default(false).describe(robotParameterDocs.force_accept.description),

    ignore_errors: zodInputPreservingTransform(
      z.union([z.boolean(), z.array(z.enum(['meta', 'execute']))]),
      (value) => (value === true ? ['meta', 'execute'] : value === false ? [] : value),
    )
      .default([])
      .describe(robotParameterDocs.ignore_errors.description),
  })
  .strict()

/**
 * Standard variants for strict Robot instructions without catchalls. Keep this outside the adapter
 * replaced by the SDK's Zod 4 sync. Inference uses the active Zod version's object types.
 */
export function createRobotSchemaVariants<Shape extends z.ZodRawShape & { result: z.ZodType }>(
  schema: z.ZodObject<Shape>,
) {
  const strictSchema = schema.strict()
  const result: Shape['result'] = schema.shape.result
  const withHiddenFields = strictSchema
    .merge(z.object({ result: z.union([z.literal('debug'), result]).optional() }))
    .strict()
  return {
    schema,
    withHiddenFields,
    interpolatable: interpolateRobot(strictSchema),
    interpolatableWithHiddenFields: interpolateRobot(withHiddenFields),
  }
}

/** Standard strict variants with extra internal fields. */
export function extendRobotSchemaVariants<
  Shape extends z.ZodRawShape & { result: z.ZodType },
  HiddenShape extends z.ZodRawShape,
>(schema: z.ZodObject<Shape>, hiddenFields: HiddenShape) {
  const strictSchema = schema.strict()
  const result: Shape['result'] = schema.shape.result
  const withHiddenFields = strictSchema.extend({
    result: z.union([z.literal('debug'), result]).optional(),
    ...hiddenFields,
  })
  return {
    schema,
    withHiddenFields,
    interpolatable: interpolateRobot(strictSchema),
    interpolatableWithHiddenFields: interpolateRobot(withHiddenFields),
  }
}

/**
 * Named definition types keep the SDK's emitted declarations small. Robot modules explicitly
 * reference their existing schema types instead of emitting another copy of each schema shape.
 */
export type RobotDefinition<Shape extends z.ZodRawShape & { result: z.ZodType }> = ReturnType<
  typeof createRobotSchemaVariants<Shape>
> & { meta: RobotMetaInput }

/** A Robot definition whose internal schema has additional fields. */
export type RobotDefinitionWithHiddenFields<
  Shape extends z.ZodRawShape & { result: z.ZodType },
  HiddenShape extends z.ZodRawShape,
> = ReturnType<typeof extendRobotSchemaVariants<Shape, HiddenShape>> & { meta: RobotMetaInput }

/** Existing schema variants for Robots that require custom construction. */
export interface RobotSchemaPair<PublicSchema, InternalSchema> {
  meta: RobotMetaInput
  interpolatable: PublicSchema
  interpolatableWithHiddenFields: InternalSchema
}

/** Define a strict Robot's schema variants together with its metadata. */
export function defineRobot<Shape extends z.ZodRawShape & { result: z.ZodType }>(
  meta: RobotMetaInput,
  schema: z.ZodObject<Shape>,
): RobotDefinition<Shape> {
  return { meta, ...createRobotSchemaVariants(schema) }
}

/** Define a strict Robot with extra internal fields and its metadata. */
export function defineRobotWithHiddenFields<
  Shape extends z.ZodRawShape & { result: z.ZodType },
  HiddenShape extends z.ZodRawShape,
>(
  meta: RobotMetaInput,
  schema: z.ZodObject<Shape>,
  hiddenFields: HiddenShape,
): RobotDefinitionWithHiddenFields<Shape, HiddenShape> {
  return { meta, ...extendRobotSchemaVariants(schema, hiddenFields) }
}

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
      .describe(robotParameterDocs.use.description)
      .optional(),
  })
  .strict()

export type RobotUseWithHiddenFields = z.infer<typeof robotUseWithHiddenFields>
export const robotUseWithHiddenFields = z
  .object({
    use: z
      .union([useParamStepsWithHiddenFieldsSchema, useParamObjectOfStepsWithHiddenFieldsSchema])
      .describe(robotParameterDocs.use.description)
      .optional(),
  })
  .strict()

const complexDimensionNumberSchema = z.number().int().min(1).max(25_000)
const complexDimensionStringSchema = z
  .string()
  .regex(
    new RegExp(
      `^${ecmaWhitespaceCharacterClass}*\\+?0*(?:[1-9][0-9]{0,3}|1[0-9]{4}|2[0-4][0-9]{3}|25000)(?:[^0-9x][^x]*)?$`,
      'u',
    ),
  )
const complexDimensionInputSchema = z.union([
  complexDimensionNumberSchema,
  complexDimensionStringSchema,
])

function normalizeComplexDimension(val: unknown): unknown {
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
}

export const complexWidthSchema = zodWithJsonInputSchema(
  z.preprocess(normalizeComplexDimension, complexDimensionNumberSchema),
  complexDimensionInputSchema,
)

export const complexHeightSchema = zodWithJsonInputSchema(
  z.preprocess(normalizeComplexDimension, complexDimensionNumberSchema),
  complexDimensionInputSchema,
)

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
      'profile:v': z.union([z.number(), z.enum(['baseline', 'main', 'high', 'main10'])]).optional(),
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
    .describe(robotParameterDocs.ffmpeg.description),

  ffmpeg_stack: z
    // Any semver in range is allowed and normalized. The enum is used for editor completions.
    .union([
      z.enum(stackVersions.ffmpeg.suggestedValues),
      z.string().regex(stackVersions.ffmpeg.test),
    ])
    .default(runtimeStackVersions.ffmpeg.default)
    .describe(robotParameterDocs.ffmpeg_stack.description),
})

/**
 * Replace all underscores with hyphens.
 *
 * @param preset
 *   The input preset which may contain underscores.
 * @returns
 *   The hyphenated preset.
 */
function transformPreset<T extends string>(preset: T): StringReplaceAll<T, '_', '-'> {
  return preset.replaceAll('_', '-') as StringReplaceAll<T, '_', '-'>
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
    preset: zodInputPreservingTransform(z.enum(audioPresets), transformPreset)
      .optional()
      .describe(robotParameterDocs.audio_preset.description),
  })
  .strict()

/**
 * A robot that uses FFmpeg to **output** video.
 */
export type FFmpegVideo = z.infer<typeof robotFFmpegVideo>
export const robotFFmpegVideo = robotFFmpeg
  .extend({
    width: z.number().int().min(1).nullish().describe(robotParameterDocs.video_width.description),
    height: z.number().int().min(1).nullish().describe(robotParameterDocs.video_height.description),
    preset: zodInputPreservingTransform(
      z.enum([
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
      ]),
      transformPreset,
    )
      .optional()
      .describe(robotParameterDocs.video_preset.description),
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

export const bucketImportPath = path.describe(`
The path in your bucket to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are direct descendants of this directory will be imported. For example: \`images/\`.

Directories are **not** imported recursively. If you want to import files from subdirectories and sub-subdirectories, enable the \`recursive\` parameter.

If you want to import all files from the root directory, please use \`/\` as the value here. In this case, make sure all your objects belong to a path. If you have objects in the root of your bucket that aren't prefixed with \`/\`, you'll receive an error: \`A client error (NoSuchKey) occurred when calling the GetObject operation: The specified key does not exist.\`

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`)

export const storeFilePath = z
  .string()
  .default('${unique_prefix}/${file.url_name}')
  .describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables). The path must not be a directory.
`)

export const recursiveImportPageNumber = page_number.describe(`
The pagination page number. For now, in order to not break backwards compatibility in non-recursive imports, this only works when recursive is set to \`true\`.

When doing big imports, make sure no files are added or removed from other scripts within your path, otherwise you might get weird results with the pagination.
`)

export const signedSslUrlLifetime = z
  .number()
  .int()
  .min(0)
  .optional()
  .describe(`
This parameter provides signed URLs in the result JSON (in the \`signed_ssl_url\` property). The number that you set this parameter to is the URL expiry time in seconds. If this parameter is not used, no URL signing is done.
`)

export const recursiveImportPageSize = files_per_page.describe(`
The pagination page size. This only works when recursive is \`true\` for now, in order to not break backwards compatibility in non-recursive imports.
`)

const bucketRegion = z
  .string()
  .optional()
  .describe(`
The region where the bucket is located.
`)

export const storePath = z
  .string()
  .default('${unique_prefix}/${file.url_name}')
  .describe(`
The path at which the file is to be stored. This may include any available [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`)

export const storageAcl = z
  .enum(['private', 'public-read'])
  .default('public-read')
  .describe(`
The permissions used for this file.
`)

export const recursiveImport = recursive.describe(`
Setting this to \`true\` will enable importing files from subdirectories and sub-subdirectories (etc.) of the given path.

Please use the pagination parameters \`page_number\` and \`files_per_page\` wisely here.
`)

export const return_file_stubs = z
  .boolean()
  .describe(robotParameterDocs.return_file_stubs.description)
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

export const percentageSchema = z.string().regex(/^[0-9]+%$/u)

const portableHttpUrlPattern = /^[Hh][Tt][Tt][Pp][Ss]?:\/\/(?:[^ ]|[ ])/u

const portableHttpUrlInputSchema = z
  .string()
  .regex(portableHttpUrlPattern, 'Must be an HTTP or HTTPS URL')

export const httpUrlSchema = zodWithConservativeJsonInputSchema(
  z
    .string()
    .url()
    .refine((value) => /^https?:\/\//iu.test(value), 'Must be an HTTP or HTTPS URL'),
  portableHttpUrlInputSchema,
)

/** Header restrictions shared by HTTP import and request documentation. */
export const httpHeaderSafetyDescription = `Header names must be valid HTTP tokens. Header values may contain horizontal tabs, but other control characters, including carriage returns and line feeds, are rejected.

In an array of header strings, \`"Header-Name;"\` sends an empty header value. Each entry must be a literal header; reading headers from a file with \`@filename\` is not supported.`

export const color_with_alpha = z.string().regex(/^#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/u)

export const color_without_alpha = z.string().regex(/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/u)

export const videoBackgroundSchema = color_with_alpha
  .default('#00000000')
  .describe(robotParameterDocs.video_background.description)

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

export const optimize_priority = z.enum(['compression-ratio', 'conversion-speed'])

export type ImagemagickRobot = z.infer<typeof robotImagemagick>
export const robotImagemagick = z
  .object({
    imagemagick_stack: z
      // Any semver in range is allowed and normalized. The enum is used for editor completions.
      .union([
        z.enum([stackVersions.imagemagick.recommendedVersion]),
        z.string().regex(stackVersions.imagemagick.test),
      ])
      .default(runtimeStackVersions.imagemagick.default),
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

export const imageAdaptiveFilteringSchema = z
  .boolean()
  .default(false)
  .describe(robotParameterDocs.adaptive_filtering.description)

export const imageQualityValueSchema = z.number().int().min(1).max(100)

// TODO: add before and after images to the description.
export const imageQualitySchema = imageQualityValueSchema.default(92).describe(`
Controls the image compression for JPG and PNG images. Please also take a look at [🤖/image/optimize](/docs/robots/image-optimize/).
`)

export const awsGcpAiProviderSchema = z.enum(['auto', 'aws', 'gcp']).default('auto')

export const aiProviderSchema = z
  .enum(['auto', 'aws', 'gcp', 'replicate', 'fal', 'transloadit'])
  .default('auto')

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
      .describe(robotParameterDocs.force_name.description),
    ignore_errors: zodInputPreservingTransform(
      z.union([z.boolean(), z.array(z.enum(['meta', 'import', 'execute']))]),
      (value) => (value === true ? ['meta', 'import', 'execute'] : value === false ? [] : value),
    )
      .default([])
      .describe(robotParameterDocs.import_ignore_errors.description),
    import_on_errors: z
      .array(z.enum(['meta']))
      .default([])
      .describe(robotParameterDocs.import_on_errors.description),
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

export type BoxBase = z.infer<typeof boxBase>
export const boxBase = z
  .object({
    credentials: z
      .string()
      .optional()
      .describe(`
Create a Box app in the [Box Developer Console](https://app.box.com/developers/console) using **Server Authentication (JWT)**.

Generate a public/private keypair for that app. Box will download a JSON config file (with \`boxAppSettings\` and \`appAuth\`) that includes your JWT private key material.

In your Transloadit account, create [Template Credentials](/c/template-credentials/) of type Box and paste that full JSON file into \`key_file_contents\`. Then set this \`credentials\` parameter to the Template Credentials name.

If your Box enterprise requires it, make sure the app is authorized by an admin before using it in production.
`),
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
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your Cloudflare R2 bucket, Key, Secret and Bucket region.

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

export type MegaBase = z.infer<typeof megaBase>
export const megaBase = z
  .object({
    credentials: z
      .string()
      .optional()
      .describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your MEGA S4 Object Storage bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"bucket_region"\`, \`"key"\`, \`"secret"\`.
`),
    bucket: z.string().optional(),
    bucket_region: bucketRegion,
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
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your S3 \`bucket\`, \`key\`, \`secret\` and \`bucket_region\`.

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
    bucket_region: bucketRegion,
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
  Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your OpenStack Swift container (provided through the \`"bucket"\` parameter), host, Key and Secret.

  While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"host"\`, \`"key"\`, \`"secret"\`.
  `),
    bucket: z.string().optional(),
    host: z
      .string()
      .optional()
      .describe(`
The S3-compatible object storage endpoint for the OpenStack Swift service. This is required when supplying dynamic credentials directly instead of using Template Credentials.
`),
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
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your Tigris bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"host"\`, \`"key"\`, \`"secret"\`.
`),
    bucket: z.string().optional(),
    bucket_region: bucketRegion,
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
    bucket_region: bucketRegion,
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

export type FilterConditionOperator = z.infer<typeof filterConditionOperatorSchema>
export const filterConditionOperatorSchema = z.union([
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
])

export type FilterConditionPart = z.infer<typeof filterConditionPartSchema>
export const filterConditionPartSchema = z.tuple([
  filterExpression,
  filterConditionOperatorSchema,
  filterExpression,
])

export type FilterCondition = z.infer<typeof filterCondition>
export const filterCondition = z.union([z.null(), z.string(), z.array(filterConditionPartSchema)])

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
    background: videoBackgroundSchema,
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
      .union([z.literal(''), httpUrlSchema])
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

export type NormalizedUseStepName = string | undefined

export interface NormalizedUseStep {
  as?: unknown[]
  fields?: unknown[]
  name: NormalizedUseStepName
}

export interface NormalizedUse {
  bundle_steps: boolean
  fields: true | unknown[]
  group_by_original: boolean
  steps: NormalizedUseStep[]
}

/** Public input and output types for a Robot's schema variants. */
export type RobotSchemaVariantTypes<
  Variants extends {
    schema: z.ZodType
    withHiddenFields: z.ZodType
    interpolatable: z.ZodType
    interpolatableWithHiddenFields: z.ZodType
  },
> = {
  output: z.output<Variants['schema']>
  input: z.input<Variants['schema']>
  hiddenOutput: z.output<Variants['withHiddenFields']>
  hiddenInput: z.input<Variants['withHiddenFields']>
  interpolatableOutput: z.output<Variants['interpolatable']>
  interpolatableInput: z.input<Variants['interpolatable']>
  interpolatableHiddenOutput: z.output<Variants['interpolatableWithHiddenFields']>
  interpolatableHiddenInput: z.input<Variants['interpolatableWithHiddenFields']>
}
