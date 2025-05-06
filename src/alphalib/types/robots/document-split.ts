import { z } from 'zod'

import type { RobotMeta } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code_description: 'Extract single or multiple pages from a PDF document:',
  minimum_charge: 2097152,
  output_factor: 1,
  override_lvl1: 'Document Processing',
  purpose_sentence: 'extracts pages from documents',
  purpose_verb: 'extract',
  purpose_word: 'extracts pages',
  purpose_words: 'Extracts pages',
  service_slug: 'document-processing',
  slot_count: 10,
  title: 'Extract pages from a document',
  typical_file_size_mb: 0.8,
  typical_file_type: 'document',
}

export const robotDocumentSplitInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/document/split'),
    pages: z
      .union([z.string(), z.array(z.string())])
      .describe(
        'The pages to select from the input PDF and to be included in the output PDF. Each entry can be a single page number (e.g. 5), or a range (e.g. `5-10`). Page numbers start at 1.',
      ),
  })
  .strict()

export type RobotDocumentSplitInstructions = z.infer<typeof robotDocumentSplitInstructionsSchema>

export const interpolatableRobotDocumentSplitInstructionsSchema = interpolateRobot(
  robotDocumentSplitInstructionsSchema,
)
export type InterpolatableRobotDocumentSplitInstructions = z.input<
  typeof interpolatableRobotDocumentSplitInstructionsSchema
>
