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
        robot: '/image/ocr',
        use: ':original',
        provider: 'gcp',
        format: 'text',
      },
    },
  },
  example_code_description: 'Recognize text in an uploaded image and save it to a text file:',
  extended_description: `
> [!Warning]
> Transloadit aims to be deterministic, but this <dfn>Robot</dfn> uses third-party AI services. The providers (AWS, GCP) will evolve their models over time, giving different responses for the same input images. Avoid relying on exact responses in your tests and application.
`,
  minimum_charge: 1048576,
  output_factor: 0.6,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence: 'recognizes text in images and returns it in a machine-readable format',
  purpose_verb: 'recognize',
  purpose_word: 'recognize text',
  purpose_words: 'Recognize text in images (OCR)',
  service_slug: 'artificial-intelligence',
  slot_count: 10,
  title: 'Recognize text in images',
  typical_file_size_mb: 0.8,
  typical_file_type: 'image',
  name: 'ImageOcrRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  minimumChargeUsd: 0.0013,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotImageOcrInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/ocr').describe(`
With this <dfn>Robot</dfn> you can detect and extract text from images using optical character recognition (OCR).

For example, you can use the results to obtain the content of traffic signs, name tags, package labels and many more. You can also pass the text down to other <dfn>Robots</dfn> to filter images that contain (or do not contain) certain phrases. For images of dense documents, results may vary and be less accurate than for small pieces of text in photos.
`),
    provider: aiProviderSchema.describe(`
Which AI provider to leverage.

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

export const robotImageOcrInstructionsWithHiddenFieldsSchema =
  robotImageOcrInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotImageOcrInstructionsSchema.shape.result]).optional(),
  })

export type RobotImageOcrInstructions = z.infer<typeof robotImageOcrInstructionsSchema>
export type RobotImageOcrInstructionsWithHiddenFields = z.infer<
  typeof robotImageOcrInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotImageOcrInstructionsSchema = interpolateRobot(
  robotImageOcrInstructionsSchema,
)
export type InterpolatableRobotImageOcrInstructions = InterpolatableRobotImageOcrInstructionsInput

export type InterpolatableRobotImageOcrInstructionsInput = z.input<
  typeof interpolatableRobotImageOcrInstructionsSchema
>

export const interpolatableRobotImageOcrInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotImageOcrInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotImageOcrInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotImageOcrInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotImageOcrInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotImageOcrInstructionsWithHiddenFieldsSchema
>
