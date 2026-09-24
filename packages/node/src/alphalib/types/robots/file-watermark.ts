import type { RobotMetaInput, RobotSchemaVariantTypes } from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createProcessingExample,
  createRobotSchemaVariants,
  robotBase,
  robotImageProcessingMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImageProcessingMeta,
  example_code: createProcessingExample('watermarked', '/file/watermark', {
    randomize: true,
  }),
  example_code_description: 'Apply randomized watermarking to uploaded files:',
  purpose_sentence: 'applies randomized watermarks to uploaded media',
  purpose_verb: 'write',
  purpose_word: 'watermark files',
  purpose_words: 'Watermark files',
  title: 'Apply watermarks to files',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'FileWatermarkRobot',
  priceFactor: 4,
  queueSlotCount: 20,
  trackOutputFileSize: false,
}

export const robotFileWatermarkInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/watermark'),
    randomize: z.boolean().optional(),
  })
  .strict()

const schemaVariants: ReturnType<
  typeof createRobotSchemaVariants<typeof robotFileWatermarkInstructionsSchema.shape>
> = createRobotSchemaVariants(robotFileWatermarkInstructionsSchema)
export const {
  withHiddenFields: robotFileWatermarkInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotFileWatermarkInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotFileWatermarkInstructionsWithHiddenFieldsSchema,
} = schemaVariants

type Instructions = RobotSchemaVariantTypes<typeof schemaVariants>

export type RobotFileWatermarkInstructions = Instructions['output']
export type RobotFileWatermarkInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotFileWatermarkInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotFileWatermarkInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotFileWatermarkInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotFileWatermarkInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
