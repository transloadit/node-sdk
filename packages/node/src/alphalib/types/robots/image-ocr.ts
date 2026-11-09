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
  example_code: createProcessingExample('recognized', '/image/ocr', {
    provider: 'gcp',
    format: 'text',
  }),
  example_code_description: 'Recognize text in an uploaded image and save it to a text file:',
  extended_description: `
> [!Warning]
> Transloadit aims to be deterministic, but this <dfn>Robot</dfn> uses third-party AI services. The providers (AWS, GCP) will evolve their models over time, giving different responses for the same input images. Avoid relying on exact responses in your tests and application.
`,
  override_lvl1: 'Artificial Intelligence',
  purpose_sentence: 'recognizes text in images and returns it in a machine-readable format',
  purpose_verb: 'recognize',
  purpose_word: 'recognize text',
  purpose_words: 'Recognize text in images (OCR)',
  title: 'Recognize text in images',
  typical_file_size_mb: 0.8,
  name: 'ImageOcrRobot',
  minimumChargeUsd: 0.0013,
}

export const robotImageOcrInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/ocr').describe(`
With this <dfn>Robot</dfn> you can detect and extract text from images using optical character recognition (OCR).

For example, you can use the results to obtain the content of traffic signs, name tags, package labels and many more. You can also pass the text down to other <dfn>Robots</dfn> to filter images that contain (or do not contain) certain phrases. For images of dense documents, results may vary and be less accurate than for small pieces of text in photos.
`),
    provider: awsGcpAiProviderSchema.describe(robotParameterDocs.ocr_provider.description),
    granularity: granularitySchema.describe(robotParameterDocs.ocr_granularity.description),
    format: z
      .enum(['json', 'meta', 'text'])
      .default('json')
      .describe(robotParameterDocs.ocr_format.description),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotImageOcrInstructionsSchema.shape> =
  defineRobot(meta, robotImageOcrInstructionsSchema)

export const {
  withHiddenFields: robotImageOcrInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotImageOcrInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotImageOcrInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotImageOcrInstructions = Instructions['output']
export type RobotImageOcrInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotImageOcrInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotImageOcrInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotImageOcrInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotImageOcrInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
