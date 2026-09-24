import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

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
    robot: z.literal('/document/split'),
    pages: z
      .union([z.string(), z.array(z.string())])
      .describe(
        'The pages to select from the input PDF and to be included in the output PDF. Each entry can be a single page number (e.g. 5), or a range (e.g. `5-10`). Page numbers start at 1. By default all pages are extracted.',
      )
      .optional(),
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
