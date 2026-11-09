import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { expressionEvaluationUsageMebibytes } from '../templateValues.ts'
import {
  createProcessingExample,
  defineRobot,
  robotBase,
  robotDocumentProcessingMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotDocumentProcessingMeta,
  example_code: createProcessingExample('extracted_pages', '/document/split', {
    pages: ['1', '3-5'],
  }),
  example_code_description: 'Extract single or multiple pages from a PDF document:',
  purpose_sentence: 'extracts pages from documents',
  purpose_verb: 'extract',
  purpose_word: 'extracts pages',
  purpose_words: 'Extracts pages',
  title: 'Extract pages from a document',
  name: 'DocumentSplitRobot',
  trackOutputFileSize: true,
}

export const robotDocumentSplitInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/document/split').describe(`
By default, this Robot returns one PDF containing the selected pages and keeps the input file name. If \`pages\` is omitted, that PDF contains every page.

Set \`split: true\` to return separate PDFs. Without \`pages\`, each page becomes its own PDF. With \`pages\`, each entry becomes one PDF: \`pages: ["1", "2-3"]\` returns a one-page PDF and a two-page PDF. For an input named \`document.pdf\`, these files are named \`document_page_1.pdf\` and \`document_pages_2-3.pdf\`. Repeated selections receive an additional numeric suffix to keep file names unique, such as \`document_page_1_2.pdf\`.

Page numbers start at 1. When the page count is known, ranges are clamped to it and selections entirely beyond it are skipped. Split file names use the resulting page or range. An empty \`pages\` array is invalid in split mode; omit \`pages\` to split every page. If all selections exceed the page count, processing fails with a validation error.
`),
    pages: z
      .union([z.string(), z.array(z.string())])
      .describe(
        `The pages to select from the input PDF. Each entry can be a single page number (e.g. \`5\`) or a range (e.g. \`5-10\`). Page numbers start at 1. Accepts an array or a comma-separated string. By default, all selected pages are combined into one PDF; with \`split: true\`, each entry produces a separate PDF. If omitted, selects all pages.

For a PDF with at least three pages, \`pages: ["\${file.meta.page_count - 2}-\${file.meta.page_count}"]\` selects the last three pages. Each dynamically evaluated expression adds ${expressionEvaluationUsageMebibytes} MiB of usage per input file; simple variable references such as \`\${file.meta.page_count}\` are free.`,
      )
      .optional(),
    split: z
      .boolean()
      .default(false)
      .describe(
        'Return one PDF per `pages` entry, or one PDF per page when `pages` is omitted. File names include a page or range suffix, such as `document_page_1.pdf` or `document_pages_2-3.pdf`. Split selections and output PDFs are subject to the service’s per-Job file limit. By default, returns one PDF containing all selected pages and keeps the input file name.',
      ),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotDocumentSplitInstructionsSchema.shape> =
  defineRobot(meta, robotDocumentSplitInstructionsSchema)

export const {
  withHiddenFields: robotDocumentSplitInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotDocumentSplitInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotDocumentSplitInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotDocumentSplitInstructions = Instructions['output']
export type RobotDocumentSplitInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotDocumentSplitInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotDocumentSplitInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotDocumentSplitInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotDocumentSplitInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
