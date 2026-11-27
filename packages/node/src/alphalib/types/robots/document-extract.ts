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
  interpolationSchemaFull,
  robotBase,
  robotDocumentProcessingMeta,
  robotUse,
} from './_instructions-primitives.ts'

const extractTargets = z.enum(['text', 'images'])
const imageFormats = z.enum(['auto', 'original', 'png', 'jpg'])
const ocrProviders = z.enum(['aws', 'gcp'])
const textFormats = z.enum(['txt', 'json', 'md', 'html', 'json_layout'])
/** OCR supports the legacy text formats, without native-layout JSON. */
export const documentExtractOcrTextFormats = textFormats.exclude(['json_layout'])
const textGranularities = z.enum(['document', 'page'])
const textMethods = z.enum(['native', 'ocr', 'auto', 'docling'])

/** Validate OCR dependencies after interpolation-aware parsing at the Assembly Step boundary. */
export function refineDocumentExtractOcr(
  step: {
    robot: string
    extract?: unknown
    text_method?: unknown
    text_format?: unknown
    ocr_provider?: unknown
    password?: unknown
    page_range?: unknown
    text_granularity?: unknown
    image_format?: unknown
    include_image_masks?: unknown
  },
  context: z.RefinementCtx,
  options: { allowInterpolation?: boolean } = {},
): void {
  if (step.robot !== '/document/extract') return
  if (step.text_method === 'docling') {
    for (const key of ['password', 'ocr_provider'] as const) {
      if (
        step[key] !== undefined &&
        step[key] !== '' &&
        !(
          options.allowInterpolation !== false &&
          interpolationSchemaFull.safeParse(step[key]).success
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `The ${key} parameter is not supported with text_method docling.`,
        })
      }
    }
    if (step.image_format === 'original' || step.image_format === 'jpg')
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['image_format'],
        message: 'The docling text_method renders figures as PNG.',
      })
    if (step.include_image_masks === true)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['include_image_masks'],
        message: 'The docling text_method does not retain image masks.',
      })
    return
  }
  if (step.text_method !== 'ocr' && step.text_method !== 'auto') return

  // Image-only extraction never invokes OCR; unresolved targets are checked at runtime.
  const extractsText =
    step.extract === undefined ||
    step.extract === 'text' ||
    (Array.isArray(step.extract) && step.extract.includes('text'))
  if (!extractsText) return

  if (step.text_format === 'json_layout') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['text_format'],
      message: 'The json_layout text_format requires text_method native.',
    })
  }

  if (step.ocr_provider === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ocr_provider'],
      message: 'The ocr_provider parameter is required when text_method is ocr or auto.',
    })
  }

  // Assembly Steps preserve opaque interpolation until the Robot checks the resolved values.
  // Builtin fields can opt out because those values are already resolved at their boundary.
  // Keep these constraints aligned with the matching stepJsonInputSchema branch in template.ts.
  if (
    step.password !== undefined &&
    step.password !== '' &&
    !(
      options.allowInterpolation !== false &&
      interpolationSchemaFull.safeParse(step.password).success
    )
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['password'],
      message:
        'The password parameter is only supported for native text extraction and embedded image extraction.',
    })
  }

  // Defer full page-range interpolation to runtime, consistently with the other unresolved fields.
  if (
    step.page_range !== undefined &&
    !(
      options.allowInterpolation !== false &&
      interpolationSchemaFull.safeParse(step.page_range).success
    )
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['page_range'],
      message: 'The page_range parameter is only supported for native text extraction.',
    })
  }

  if (step.text_granularity === 'page') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['text_granularity'],
      message: 'The page text_granularity is only supported for native text extraction.',
    })
  }
}

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

For DOCX files, first use \`/document/convert\` with \`format: "pdf"\`, then pass its output to this Robot.

Markdown and HTML output are in beta and aim for readable structure, not a pixel-perfect copy. Native extraction detects paragraphs, larger-font headings, simple lists and aligned tables where possible. Multi-column text can interleave, prose can be mistaken for tables, and merged cells may need adjustment. HTML escapes extracted text and omits source scripts, links and event handlers.

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

This is supported for native extraction and the self-hosted Docling method. The AWS and GCP OCR methods currently work on the full document.
`),
    password: z
      .string()
      .optional()
      .describe(`
Password used to unlock encrypted PDFs for native text extraction and embedded image extraction. The other text methods do not support encrypted PDFs.
`),
    text_method: textMethods.default('native').describe(`
Controls how text is extracted.

- \`"native"\` extracts selectable PDF text locally with Poppler. This is fast, but returns little or no text for scanned PDFs.
- \`"docling"\` uses Transloadit’s self-hosted parser for layout, tables, figures, and OCR on scanned regions, including mixed native/scanned documents. No external document-processing service is used. This opt-in method requires an enabled deployment, supports page selection and page granularity, and does not accept \`password\` or \`ocr_provider\`. Figures are rendered as PNG; original embedded-image encodings and masks are not retained. Recognition and inferred structure can be incorrect.
- \`"ocr"\` delegates to \`/document/ocr\` and requires \`ocr_provider\`.
- \`"auto"\` tries native extraction first, then falls back to OCR when no native text is found, or when the native text is unusable because most of its words are spelled as separate letters (\`s p a c e c r a f t\`), as in the text layer of some old scans. This also requires \`ocr_provider\`.

OCR modes currently cannot be combined with \`password\`.
`),
    ocr_provider: ocrProviders.optional().describe(`
OCR provider to use when \`text_method\` is \`"ocr"\` or \`"auto"\`. Valid values are \`"aws"\` and \`"gcp"\`.
`),
    text_format: textFormats.default('txt').describe(`
Output format for extracted text. Plain text and JSON retain the existing extraction behavior. Markdown and HTML output are in beta and infer basic structure from native text positions and font sizes.

With \`text_method: "docling"\`, all text formats use the self-hosted parser’s reading order and OCR. Its \`json_layout\` also includes page dimensions, block IDs, source labels, top-left-origin bounding boxes in PDF points, and table cells with zero-based offsets and merged-cell spans. HTML preserves spans and Markdown flattens them. Figures are PNG crops referenced by result name. This method accepts up to 64 MiB of input and PDFs containing at most 1,000 pages, including when selecting a page range and fails incomplete conversions. Recognition and inferred structure can be incorrect; confidence scores and field-level citations are not reported.

\`"json_layout"\` returns a JSON file containing \`schema_version: 1\` and a \`pages\` array. Each page has its original one-based \`page\` number and a \`blocks\` array. Block \`kind\` is \`"paragraph"\` (\`text\`), \`"heading"\` (\`text\`, \`level\`), \`"list"\` (\`ordered\`, \`start\`, \`items\`), \`"table"\` (\`rows\`, \`header\`) or \`"image"\` (\`name\`). Text is literal, without Markdown or HTML escaping. Image names match retained extraction results and must be saved alongside the JSON file. Images omitted from rich-text references are also omitted from these blocks. With native extraction, this format uses the same beta layout inference as Markdown and HTML and requires \`text_method: "native"\`. Native output does not report bounding boxes, confidence scores or field-level citations. The existing \`"json"\` format remains text and page text only.

Native Markdown, HTML and \`json_layout\` extraction limits layout data to 8 MiB per input document, summed across its selected page ranges. For larger documents, use separate extraction Steps with fewer pages in each Step’s \`page_range\`.

If native extraction cannot confirm the reading order of bidirectional text, it returns a validation error. Try fewer pages or use \`text_method: "ocr"\` with an OCR provider.

For native extraction, when \`extract\` includes images, Markdown and HTML reference retained image results inline using relative, URL-encoded filenames matching each image result’s \`name\`. Save the text and image results together to resolve the references. Filtered images have no references; repeated images can reference the same deduplicated result. Images covering the whole page, including page scans, are omitted from references when their visible coverage can be confirmed, while remaining available as image results. This also applies to pages without extracted text; use \`text_method: "ocr"\` with an OCR provider to read scanned text. Images with unavailable or inconsistent positions, including retained image masks, are appended after their page’s text. Embedded base64 images are not produced.

When exporting, preserve result names in a shared directory per input document. For example, set \`/s3/store\`’s \`path\` to \`"\${assembly.id}/\${file.original_id}/\${file.name}"\`. Default storage paths using \`\${unique_prefix}/\${file.url_name}\` separate and rename files, so they do not preserve these relative image links.

Some native image encodings cannot be displayed by browsers or Markdown viewers. Raw CCITT and JBIG2 image results are not referenced in Markdown or HTML. Set \`image_format\` to \`"png"\` or \`"jpg"\` for broadly viewable image results that can be referenced, unless they cover the whole page.

OCR Markdown and HTML with \`ocr_provider: "aws"\` infer paragraphs, lists and headings from the positions of the recognized lines and words. With \`ocr_provider: "gcp"\`, which does not report those positions, they preserve readable text with minimal structure detection. In both cases, extracted images are appended in source order, since OCR does not position them.
`),
    text_granularity: textGranularities.default('document').describe(`
Controls text output grouping for native extraction and the self-hosted Docling method.

- \`"document"\` creates one text result for the selected pages.
- \`"page"\` creates one text result per selected page.

Page granularity is supported with \`text_method: "native"\` or \`text_method: "docling"\`.
`),
    keep_page_footers: z
      .boolean()
      .default(false)
      .describe(`
Retain recurring footer text, including page numbers, in native Markdown, HTML and \`json_layout\` output, and AWS OCR Markdown and HTML output. By default, recurring text in the bottom 8% of selected pages is omitted when it appears on at least half of the selected pages, with a minimum of two pages. One-off margin text is retained regardless of this setting.

With \`text_method: "docling"\`, this setting instead retains blocks classified as page headers or footers by the parser, in every text format. This classification can be incorrect and does not require repetition across pages.

For native and cloud OCR extraction, this setting does not change plain text, legacy \`json\` or extracted image results. GCP OCR and OCR results without usable geometry already retain all recognized text.
`),
    keep_page_headers: z
      .boolean()
      .default(false)
      .describe(`
Retain recurring header text in native Markdown, HTML and \`json_layout\` output, and AWS OCR Markdown and HTML output. By default, recurring text in the top 8% of selected pages is omitted when it appears on at least half of the selected pages, with a minimum of two pages. Enable this when recurring headers contain document IDs or other context you need to retain.

With \`text_method: "docling"\`, this setting instead retains blocks classified as page headers or footers by the parser, in every text format. This classification can be incorrect and does not require repetition across pages.

For native and cloud OCR extraction, this setting does not change plain text, legacy \`json\` or extracted image results. GCP OCR and OCR results without usable geometry already retain all recognized text.
`),
    image_format: imageFormats.default('auto').describe(`
Output format for extracted embedded raster images. With \`text_method: "docling"\`, \`auto\` and \`png\` both return rendered PNG figure crops; \`original\` and \`jpg\` are unsupported.

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
