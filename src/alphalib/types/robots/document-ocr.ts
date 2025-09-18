import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  aiProviderSchema,
  granularitySchema,
  interpolateRobot,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      recognized: {
        robot: '/document/ocr',
        use: ':original',
        provider: 'gcp',
      },
    },
  },
  example_code_description: 'Recognize text in an uploaded document and save it to a JSON file:',
  extended_description: `
> [!Warning]
> Transloadit aims to be deterministic, but this <dfn>Robot</dfn> uses third-party AI services. The providers (AWS, GCP) will evolve their models over time, giving different responses for the same input PDFs. Avoid relying on exact responses in your tests and application.

> [!Note]
> Currently, this <dfn>Robot</dfn> only supports character recognition for PDFs. To use this <dfn>Robot</dfn> with other document formats, use [/document/convert](/docs/robots/document-convert/) first to convert the document into a PDF.
`,
  minimum_charge: 1048576,
  output_factor: 1,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence: 'recognizes text in documents and returns it in a machine-readable format',
  purpose_verb: 'recognize',
  purpose_word: 'recognize text',
  purpose_words: 'Recognize text in documents (OCR)',
  service_slug: 'artificial-intelligence',
  slot_count: 10,
  title: 'Recognize text in documents',
  typical_file_size_mb: 0.8,
  typical_file_type: 'document',
  name: 'DocumentOcrRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  minimumChargeUsdPerDocumentOcrPage: {
    aws: 0.02,
    gcp: 0.015,
  },
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotDocumentOcrInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/document/ocr').describe(`
With this <dfn>Robot</dfn>, you can detect and extract text from PDFs using optical character recognition (OCR).

For example, you can use the results to obtain the content of invoices, legal documents or restaurant menus. You can also pass the text down to other <dfn>Robots</dfn> to filter documents that contain (or do not contain) certain phrases.
`),
    provider: aiProviderSchema.describe(`
Which AI provider to leverage. Valid values are \`"aws"\` and \`"gcp"\`.

Transloadit outsources this task and abstracts the interface so you can expect the same data structures, but different latencies and information being returned. Different cloud vendors have different areas they shine in, and we recommend to try out and see what yields the best results for your use case.

AWS supports detection for the following languages: English, Arabic, Russian, German, French, Italian, Portuguese and Spanish. GCP allows for a wider range of languages, with varying levels of support which can be found on the [official documentation](https://cloud.google.com/vision/docs/languages/).
`),
    granularity: granularitySchema.describe(`
Whether to return a full response including coordinates for the text (\`"full"\`), or a flat list of the extracted phrases (\`"list"\`). This parameter has no effect if the \`format\` parameter is set to \`"text"\`.
`),
    format: z
      .enum(['json', 'meta', 'text'])
      .default('json')
      .describe(`
In what format to return the extracted text.
- \`"json"\` returns a JSON file.
- \`"meta"\` does not return a file, but stores the data inside Transloadit's file object (under \`\${file.meta.recognized_text}\`, which is an array of strings) that's passed around between encoding <dfn>Steps</dfn>, so that you can use the values to burn the data into videos, filter on them, etc.
- \`"text"\` returns the recognized text as a plain UTF-8 encoded text file.
`),
  })
  .strict()

export const robotDocumentOcrInstructionsWithHiddenFieldsSchema =
  robotDocumentOcrInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotDocumentOcrInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotDocumentOcrInstructions = z.infer<typeof robotDocumentOcrInstructionsSchema>
export type RobotDocumentOcrInstructionsWithHiddenFields = z.infer<
  typeof robotDocumentOcrInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotDocumentOcrInstructionsSchema = interpolateRobot(
  robotDocumentOcrInstructionsSchema,
)
export type InterpolatableRobotDocumentOcrInstructions =
  InterpolatableRobotDocumentOcrInstructionsInput

export type InterpolatableRobotDocumentOcrInstructionsInput = z.input<
  typeof interpolatableRobotDocumentOcrInstructionsSchema
>

export const interpolatableRobotDocumentOcrInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotDocumentOcrInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotDocumentOcrInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotDocumentOcrInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotDocumentOcrInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotDocumentOcrInstructionsWithHiddenFieldsSchema
>
