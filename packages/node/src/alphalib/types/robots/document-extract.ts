import type { RobotMetaInput } from './_instructions-primitives.ts'

import { z } from 'zod'

import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

const extractTargets = z.enum(['text', 'images'])
const imageFormats = z.enum(['auto', 'original', 'png', 'jpg'])
const ocrProviders = z.enum(['aws', 'gcp'])
const textFormats = z.enum(['txt', 'json'])
const textGranularities = z.enum(['document', 'page'])
const textMethods = z.enum(['native', 'ocr', 'auto'])

export const meta: RobotMetaInput = {
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      extracted: {
        robot: '/document/extract',
        use: ':original',
        extract: ['text', 'images'],
        text_method: 'native',
      },
    },
  },
  example_code_description: 'Extract native text and embedded raster images from a PDF document:',
  minimum_charge: 1048576,
  output_factor: 1,
  override_lvl1: 'Document Processing',
  purpose_sentence: 'extracts text and embedded images from PDF documents',
  purpose_verb: 'extract',
  purpose_word: 'extracts text and images',
  purpose_words: 'Extracts text and embedded images',
  service_slug: 'document-processing',
  slot_count: 10,
  title: 'Extract text and images from documents',
  typical_file_size_mb: 0.8,
  typical_file_type: 'document',
  name: 'DocumentExtractRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  minimumCharge: 1048576,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'beta',
}

export const robotDocumentExtractInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/document/extract').describe(`
Extracts native/selectable text and embedded raster image assets from PDF documents.

This robot does not render full pages. If you need page images, use \`/document/thumbs\`. Vector graphics, charts, and page backgrounds are not always embedded raster images and may therefore not be returned by this robot.
`),
    extract: z
      .union([extractTargets, z.array(extractTargets).min(1)])
      .default(['text', 'images'])
      .describe(`
Selects which assets to extract. Use \`["text"]\`, \`["images"]\`, or \`["text", "images"]\`.
`),
    page_range: z
      .string()
      .regex(/^\s*\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*\s*$/)
      .optional()
      .describe(`
Optional comma-separated page selection, such as \`"1"\`, \`"1-3"\`, or \`"1,3-5"\`. Page numbers start at 1. Ranges are clamped to the detected page count.

At most 1,000 selected pages are allowed per job.

This is supported for native text extraction and embedded image extraction. OCR extraction currently works on the full document.
`),
    password: z
      .string()
      .optional()
      .describe(`
Password used to unlock encrypted PDFs for native text extraction and embedded image extraction. OCR extraction currently does not support encrypted PDFs, so do not combine this with \`text_method: "ocr"\` or \`text_method: "auto"\`.
`),
    text_method: textMethods.default('native').describe(`
Controls how text is extracted.

- \`"native"\` extracts selectable PDF text locally with Poppler. This is fast, but returns little or no text for scanned PDFs.
- \`"ocr"\` delegates to \`/document/ocr\` and requires \`ocr_provider\`.
- \`"auto"\` tries native extraction first, then falls back to OCR when no native text is found. This also requires \`ocr_provider\`.

OCR modes currently cannot be combined with \`password\`.
`),
    ocr_provider: ocrProviders.optional().describe(`
OCR provider to use when \`text_method\` is \`"ocr"\` or \`"auto"\`. Valid values are \`"aws"\` and \`"gcp"\`.
`),
    text_format: textFormats.default('txt').describe(`
Output format for extracted text. Use \`"txt"\` for plain text or \`"json"\` for structured output.
`),
    text_granularity: textGranularities.default('document').describe(`
Controls text output grouping for native extraction.

- \`"document"\` creates one text result for the selected pages.
- \`"page"\` creates one text result per selected page.

Page granularity is currently only supported with \`text_method: "native"\`.
`),
    image_format: imageFormats.default('auto').describe(`
Output format for extracted embedded raster images.

- \`"auto"\` and \`"original"\` preserve the embedded image format where possible.
- \`"png"\` asks Poppler to decode images as PNG.
- \`"jpg"\` converts non-JPEG extracted images through \`/image/resize\`.
`),
    min_image_width: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe(`
Minimum width in pixels for extracted images. Smaller images are ignored. Set to \`0\` to disable this filter.
`),
    min_image_height: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe(`
Minimum height in pixels for extracted images. Smaller images are ignored. Set to \`0\` to disable this filter.
`),
    min_image_bytes: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe(`
Minimum file size in bytes for extracted images. Smaller images are ignored.
`),
    dedupe_images: z
      .boolean()
      .default(true)
      .describe(`
When enabled, identical extracted image files are emitted only once.
`),
    include_image_masks: z
      .boolean()
      .default(false)
      .describe(`
When enabled, the robot also keeps image mask files when Poppler exposes them as separate files.
`),
  })
  .strict()

export const robotDocumentExtractInstructionsWithHiddenFieldsSchema =
  robotDocumentExtractInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotDocumentExtractInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotDocumentExtractInstructions = z.infer<
  typeof robotDocumentExtractInstructionsSchema
>
export type RobotDocumentExtractInstructionsWithHiddenFields = z.infer<
  typeof robotDocumentExtractInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotDocumentExtractInstructionsSchema = interpolateRobot(
  robotDocumentExtractInstructionsSchema,
)
export type InterpolatableRobotDocumentExtractInstructions =
  InterpolatableRobotDocumentExtractInstructionsInput

export type InterpolatableRobotDocumentExtractInstructionsInput = z.input<
  typeof interpolatableRobotDocumentExtractInstructionsSchema
>

export const interpolatableRobotDocumentExtractInstructionsWithHiddenFieldsSchema =
  interpolateRobot(robotDocumentExtractInstructionsWithHiddenFieldsSchema)
export type InterpolatableRobotDocumentExtractInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotDocumentExtractInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotDocumentExtractInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotDocumentExtractInstructionsWithHiddenFieldsSchema
>
