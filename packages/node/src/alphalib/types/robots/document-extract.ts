import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { ecmaWhitespaceCharacterClass } from '../../lib/zodInputSemantics.ts'
import {
  createProcessingExample,
  defineRobot,
  robotBase,
  robotDocumentProcessingMeta,
  robotUse,
} from './_instructions-primitives.ts'

const extractTargets = z.enum(['text', 'images'])
const imageFormats = z.enum(['auto', 'original', 'png', 'jpg'])
const ocrProviders = z.enum(['aws', 'gcp'])
const textFormats = z.enum(['txt', 'json'])
const textGranularities = z.enum(['document', 'page'])
const textMethods = z.enum(['native', 'ocr', 'auto'])

export const meta: RobotMetaInput = {
  ...robotDocumentProcessingMeta,
  example_code: createProcessingExample('extracted', '/document/extract', {
    extract: ['text', 'images'],
    text_method: 'native',
  }),
  example_code_description: 'Extract native text and embedded raster images from a PDF document:',
  purpose_sentence: 'extracts text and embedded images from PDF documents',
  purpose_verb: 'extract',
  purpose_word: 'extracts text and images',
  purpose_words: 'Extracts text and embedded images',
  title: 'Extract text and images from documents',
  name: 'DocumentExtractRobot',
  trackOutputFileSize: true,
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
      .regex(
        new RegExp(
          `^${ecmaWhitespaceCharacterClass}*[0-9]+(?:${ecmaWhitespaceCharacterClass}*-${ecmaWhitespaceCharacterClass}*[0-9]+)?(?:${ecmaWhitespaceCharacterClass}*,${ecmaWhitespaceCharacterClass}*[0-9]+(?:${ecmaWhitespaceCharacterClass}*-${ecmaWhitespaceCharacterClass}*[0-9]+)?)*${ecmaWhitespaceCharacterClass}*$`,
          'u',
        ),
      )
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

export const robotDefinition: RobotDefinition<typeof robotDocumentExtractInstructionsSchema.shape> =
  defineRobot(meta, robotDocumentExtractInstructionsSchema)

export const {
  withHiddenFields: robotDocumentExtractInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotDocumentExtractInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotDocumentExtractInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotDocumentExtractInstructions = Instructions['output']
export type RobotDocumentExtractInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotDocumentExtractInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotDocumentExtractInstructionsInput =
  Instructions['interpolatableInput']
export type InterpolatableRobotDocumentExtractInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotDocumentExtractInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
