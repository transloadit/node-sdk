import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      optimized: {
        robot: '/document/optimize',
        use: ':original',
        preset: 'ebook',
      },
    },
  },
  example_code_description: 'Optimize PDF file size using the ebook preset:',
  extended_description: `
This <dfn>Robot</dfn> reduces PDF file sizes. It recompresses images, subsets fonts, and applies various optimizations to reduce file size while maintaining acceptable quality.

## Quality Presets

The Robot supports four quality presets that control the trade-off between file size and quality:

| Preset | DPI | Use Case | Typical Savings |
|--------|-----|----------|-----------------|
| \`screen\` | 72 | Screen viewing, smallest files | ~86% |
| \`ebook\` | 150 | Good balance of quality/size | ~71% |
| \`printer\` | 300 | Print quality | Moderate |
| \`prepress\` | Highest | Press-ready, largest files | Minimal |

## Use Cases

- Reducing storage costs for archived documents
- Faster document delivery and download
- Meeting email attachment size limits
- Mobile-optimized document viewing
`,
  minimum_charge: 2097152,
  output_factor: 0.5,
  override_lvl1: 'Document Processing',
  purpose_sentence: 'reduces the file size of PDF documents',
  purpose_verb: 'optimize',
  purpose_word: 'optimize PDF',
  purpose_words: 'Optimize PDF file size',
  service_slug: 'document-processing',
  slot_count: 10,
  title: 'Reduce PDF file size',
  typical_file_size_mb: 2.0,
  typical_file_type: 'document',
  name: 'DocumentOptimizeRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  minimumCharge: 2097152,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'beta',
}

export const robotDocumentOptimizeInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/document/optimize').describe(`
This Robot reduces PDF file sizes. It recompresses images, subsets fonts, and applies various optimizations to reduce file size while maintaining acceptable quality.

## Quality Presets

The Robot supports four quality presets that control the trade-off between file size and quality:

| Preset | DPI | Use Case | Typical Savings |
|--------|-----|----------|-----------------|
| \`screen\` | 72 | Screen viewing, smallest files | ~86% |
| \`ebook\` | 150 | Good balance of quality/size | ~71% |
| \`printer\` | 300 | Print quality | Moderate |
| \`prepress\` | Highest | Press-ready, largest files | Minimal |
`),
    preset: z
      .enum(['screen', 'ebook', 'printer', 'prepress'])
      .default('ebook')
      .describe(`
The quality preset to use for optimization. Each preset provides a different balance between file size and quality:

- \`screen\` - Lowest quality, smallest file size. Best for screen viewing only. Images are downsampled to 72 DPI.
- \`ebook\` - Good balance of quality and size. Suitable for most purposes. Images are downsampled to 150 DPI.
- \`printer\` - High quality suitable for printing. Images are kept at 300 DPI.
- \`prepress\` - Highest quality for professional printing. Minimal compression applied.
`),
    image_dpi: z
      .number()
      .int()
      .min(36)
      .max(600)
      .optional()
      .describe(`
Target DPI (dots per inch) for embedded images. When specified, this overrides the DPI setting from the preset.

Higher DPI values result in better image quality but larger file sizes. Lower values produce smaller files but may result in pixelated images when printed.

Common values:
- 72 - Screen viewing
- 150 - eBooks and general documents
- 300 - Print quality
- 600 - High-quality print
`),
    compress_fonts: z
      .boolean()
      .default(true)
      .describe(`
Whether to compress embedded fonts. When enabled, fonts are compressed to reduce file size.
`),
    subset_fonts: z
      .boolean()
      .default(true)
      .describe(`
Whether to subset embedded fonts, keeping only the glyphs that are actually used in the document. This can significantly reduce file size for documents that only use a small portion of a font's character set.
`),
    remove_metadata: z
      .boolean()
      .default(false)
      .describe(`
Whether to strip document metadata (title, author, keywords, etc.) from the PDF. This can provide a small reduction in file size and may be useful for privacy.
`),
    linearize: z
      .boolean()
      .default(true)
      .describe(`
Whether to linearize (optimize for Fast Web View) the output PDF. Linearized PDFs can begin displaying in a browser before they are fully downloaded, improving the user experience for web delivery.
`),
    compatibility: z
      .enum(['1.4', '1.5', '1.6', '1.7', '2.0'])
      .default('1.7')
      .describe(`
The PDF version compatibility level. Lower versions have broader compatibility but fewer features. Higher versions support more advanced features but may not open in older PDF readers.

- \`1.4\` - Acrobat 5 compatibility, most widely supported
- \`1.5\` - Acrobat 6 compatibility
- \`1.6\` - Acrobat 7 compatibility
- \`1.7\` - Acrobat 8+ compatibility (default)
- \`2.0\` - PDF 2.0 standard
`),
  })
  .strict()

export const robotDocumentOptimizeInstructionsWithHiddenFieldsSchema =
  robotDocumentOptimizeInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotDocumentOptimizeInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotDocumentOptimizeInstructions = z.infer<
  typeof robotDocumentOptimizeInstructionsSchema
>
export type RobotDocumentOptimizeInstructionsWithHiddenFields = z.infer<
  typeof robotDocumentOptimizeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotDocumentOptimizeInstructionsSchema = interpolateRobot(
  robotDocumentOptimizeInstructionsSchema,
)
export type InterpolatableRobotDocumentOptimizeInstructions =
  InterpolatableRobotDocumentOptimizeInstructionsInput

export type InterpolatableRobotDocumentOptimizeInstructionsInput = z.input<
  typeof interpolatableRobotDocumentOptimizeInstructionsSchema
>

export const interpolatableRobotDocumentOptimizeInstructionsWithHiddenFieldsSchema =
  interpolateRobot(robotDocumentOptimizeInstructionsWithHiddenFieldsSchema)
export type InterpolatableRobotDocumentOptimizeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotDocumentOptimizeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotDocumentOptimizeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotDocumentOptimizeInstructionsWithHiddenFieldsSchema
>
