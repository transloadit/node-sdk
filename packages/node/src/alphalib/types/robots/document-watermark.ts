import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { zodCodePointLength } from '../../lib/zodInputSemantics.ts'
import {
  createProcessingExample,
  defineRobot,
  positionSchema,
  robotBase,
  robotDocumentProcessingMeta,
  robotUse,
} from './_instructions-primitives.ts'

/** Text and appearance shared by the public Robot and its isolated PDF processor. */
export const documentWatermarkOptionsSchema = z.object({
  text: zodCodePointLength(z.string(), { min: 1, max: 2000 }).describe(`
The text to place on every page. Use Assembly Variables such as \`\${fields.watermark}\` to personalize each request. Newlines create multiple lines of text. Characters must be available in the selected font; unsupported characters return an error.
`),
  font: z
    .enum(['DejaVu Sans', 'DejaVu Serif', 'DejaVu Sans Mono'])
    .default('DejaVu Sans')
    .describe('The embedded font used for the watermark.'),
  font_size: z
    .number()
    .min(1)
    .max(500)
    .default(36)
    .describe(
      'The maximum font size in PDF points. Text is reduced to fit within the page margins.',
    ),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/u)
    .default('#808080')
    .describe('The watermark color as a six-digit hexadecimal RGB value.'),
  opacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.25)
    .describe('The watermark opacity, from 0 (fully transparent) to 1 (fully opaque).'),
  position: positionSchema
    .default('center')
    .describe('The position within the visible page, accounting for page rotation and cropping.'),
  x_offset: z
    .number()
    .finite()
    .default(0)
    .describe(`
Horizontal offset from \`position\`, in PDF points (72 points = 1 inch). Positive values move right, except for right-aligned positions, where they move left. Negative values reverse that direction. Offsets follow the visible page axes, independent of the text rotation.
`),
  y_offset: z
    .number()
    .finite()
    .default(0)
    .describe(`
Vertical offset from \`position\`, in PDF points (72 points = 1 inch). Positive values move down, except for bottom-aligned positions, where they move up. Negative values reverse that direction. Offsets follow the visible page axes, independent of the text rotation.
`),
  rotation: z
    .number()
    .min(-360)
    .max(360)
    .default(45)
    .describe(
      'The counterclockwise rotation of the text in degrees, relative to the visible page.',
    ),
  margin: z
    .number()
    .min(0)
    .max(1000)
    .default(24)
    .describe(
      'The inset from the visible page edges, in PDF points, used to position and fit the watermark before applying x_offset and y_offset.',
    ),
})

/** Adds personalized text without rendering the original PDF pages to images. */
export const meta: RobotMetaInput = {
  ...robotDocumentProcessingMeta,
  example_code: createProcessingExample('watermarked', '/document/watermark', {
    text: '${fields.watermark}',
  }),
  example_code_description: 'Place request-specific text on every page of a PDF:',
  purpose_sentence: 'adds personalized text watermarks to every page of a PDF',
  purpose_verb: 'write',
  purpose_word: 'watermark PDF',
  purpose_words: 'Watermark PDF documents',
  title: 'Add text watermarks to PDF documents',
  name: 'DocumentWatermarkRobot',
  trackOutputFileSize: true,
  stage: 'beta',
}

export const robotDocumentWatermarkInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(documentWatermarkOptionsSchema)
  .extend({
    robot: z.literal('/document/watermark').describe(`
Adds text to every page of an existing PDF while retaining the original page content as PDF content. Existing selectable text remains selectable. Page sizes, crop boxes, and page rotation are retained.

Text is embedded into the page content. This provides a visible watermark, not copy protection or redaction.

## Coordinate placement

Use \`x_offset\` and \`y_offset\` to move the watermark relative to \`position\`, like the watermark offsets in /image/resize and /video/encode. Offsets use PDF points rather than pixels and support fractional values. They are applied after fitting the text; offsets that move text outside the visible page can clip it.

For coordinates measured from the visible page's top-left corner, set \`position: "top-left"\`, \`margin: 0\`, and \`rotation: 0\`. For example, these settings place the watermark's bounding box 72 points from the left edge and 144 points from the top edge on every page, including rotated and cropped pages:

\`\`\`json
{
  "robot": "/document/watermark",
  "use": ":original",
  "text": "Licensed to \${fields.name}",
  "position": "top-left",
  "margin": 0,
  "rotation": 0,
  "x_offset": 72,
  "y_offset": 144
}
\`\`\`

Only unencrypted PDFs are supported. Modifying a digitally signed PDF invalidates its existing signatures. This Robot does not preserve PDF/A conformance or document certification.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<
  typeof robotDocumentWatermarkInstructionsSchema.shape
> = defineRobot(meta, robotDocumentWatermarkInstructionsSchema)

export const {
  withHiddenFields: robotDocumentWatermarkInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotDocumentWatermarkInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotDocumentWatermarkInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotDocumentWatermarkInstructions = Instructions['output']
export type RobotDocumentWatermarkInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotDocumentWatermarkInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotDocumentWatermarkInstructionsInput =
  Instructions['interpolatableInput']
export type InterpolatableRobotDocumentWatermarkInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotDocumentWatermarkInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
