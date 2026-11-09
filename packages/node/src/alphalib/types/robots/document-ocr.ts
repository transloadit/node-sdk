import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  awsGcpAiProviderSchema,
  createProcessingExample,
  defineRobot,
  granularitySchema,
  robotArtificialIntelligenceMeta,
  robotBase,
  robotParameterDocs,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotArtificialIntelligenceMeta,
  example_code: createProcessingExample('recognized', '/document/ocr', {
    provider: 'gcp',
  }),
  example_code_description: 'Recognize text in an uploaded document and save it to a JSON file:',
  extended_description: `
> [!Warning]
> Transloadit aims to be deterministic, but this <dfn>Robot</dfn> uses third-party AI services. The providers (AWS, GCP) will evolve their models over time, giving different responses for the same input PDFs. Avoid relying on exact responses in your tests and application.

> [!Note]
> Currently, this <dfn>Robot</dfn> only supports character recognition for PDFs. To use this <dfn>Robot</dfn> with other document formats, use [/document/convert](/docs/robots/document-convert/) first to convert the document into a PDF.
`,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence: 'recognizes text in documents and returns it in a machine-readable format',
  purpose_verb: 'recognize',
  purpose_word: 'recognize text',
  purpose_words: 'Recognize text in documents (OCR)',
  title: 'Recognize text in documents',
  typical_file_size_mb: 0.8,
  typical_file_type: 'document',
  name: 'DocumentOcrRobot',
  minimumChargeUsdPerDocumentOcrPage: {
    aws: 0.02,
    gcp: 0.015,
  },
}

export const robotDocumentOcrInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/document/ocr').describe(`
With this <dfn>Robot</dfn>, you can detect and extract text from PDFs using optical character recognition (OCR).

For example, you can use the results to obtain the content of invoices, legal documents or restaurant menus. You can also pass the text down to other <dfn>Robots</dfn> to filter documents that contain (or do not contain) certain phrases.
`),
    provider: awsGcpAiProviderSchema.describe(robotParameterDocs.ocr_provider.description),
    granularity: granularitySchema.describe(robotParameterDocs.ocr_granularity.description),
    format: z
      .enum(['json', 'meta', 'text'])
      .default('json')
      .describe(robotParameterDocs.ocr_format.description),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotDocumentOcrInstructionsSchema.shape> =
  defineRobot(meta, robotDocumentOcrInstructionsSchema)

export const {
  withHiddenFields: robotDocumentOcrInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotDocumentOcrInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotDocumentOcrInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotDocumentOcrInstructions = Instructions['output']
export type RobotDocumentOcrInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotDocumentOcrInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotDocumentOcrInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotDocumentOcrInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotDocumentOcrInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
