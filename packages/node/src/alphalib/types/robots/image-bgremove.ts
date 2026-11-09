import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  autoProviderDescription,
  createProcessingExample,
  defineRobot,
  robotBase,
  robotImageProcessingMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImageProcessingMeta,
  example_code: createProcessingExample('remove_background', '/image/bgremove'),
  example_code_description: 'Remove the background from the uploaded image:',
  purpose_sentence: 'removes the background from images',
  purpose_verb: 'remove',
  purpose_word: 'remove',
  purpose_words: 'Remove the background from images',
  title: 'Remove the background from images',
  name: 'ImageBgremoveRobot',
  minimumChargeUsd: 0.006,
  trackOutputFileSize: true,
}

export const robotImageBgremoveInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/bgremove'),
    select: z
      .enum(['foreground', 'background'])
      .optional()
      .describe('Region to select and keep in the image. The other region is removed.'),
    format: z
      .enum(['png', 'gif', 'webp'])
      .default('png')
      .describe('Format of the generated image. Defaults to PNG when not provided.'),
    provider: z
      .enum(['auto', 'transloadit', 'replicate', 'fal'])
      .default('auto')
      .describe(
        `${autoProviderDescription}\n\nSelect a specific provider to override automatic selection.`,
      ),
    model: z
      .string()
      .optional()
      .describe(
        'Provider-specific model to use for removing the background. Mostly intended for testing and evaluation.',
      ),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotImageBgremoveInstructionsSchema.shape> =
  defineRobot(meta, robotImageBgremoveInstructionsSchema)

export const {
  withHiddenFields: robotImageBgremoveInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotImageBgremoveInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotImageBgremoveInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotImageBgremoveInstructions = Instructions['output']
export type RobotImageBgremoveInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotImageBgremoveInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotImageBgremoveInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotImageBgremoveInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotImageBgremoveInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
