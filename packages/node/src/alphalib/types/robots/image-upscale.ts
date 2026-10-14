import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { formatEnglishInteger } from '../../englishInteger.ts'
import { imageUpscaleDefaultModelIdentifier, imageUpscaleModelIdentifiers } from './_ai-models.ts'
import {
  autoProviderDescription,
  createProcessingExample,
  defineRobotWithHiddenFields,
  robotArtificialIntelligenceMeta,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotArtificialIntelligenceMeta,
  example_code: createProcessingExample('upscaled', '/image/upscale', {
    scale: 2,
    face_enhance: true,
  }),
  example_code_description: 'Upscale uploaded images and enhance faces:',
  purpose_sentence: 'upscales images using AI',
  purpose_verb: 'generate',
  purpose_word: 'upscale',
  purpose_words: 'Upscale images',
  title: 'Upscale images',
  name: 'ImageUpscaleRobot',
  // Preserve the runtime fallback; positive provider costs replace it during usage accounting.
  minimumChargeUsd: 0.06,
  providerCostPricing: {
    provider: 'replicate',
    model: imageUpscaleDefaultModelIdentifier,
    models: [...imageUpscaleModelIdentifiers],
  },
  stage: 'beta',
}

const upscaleModelSchema = z
  .enum(imageUpscaleModelIdentifiers)
  .default(imageUpscaleDefaultModelIdentifier)
const upscaleScaleSchema = z.union([z.literal(2), z.literal(4)]).default(2)
const upscaleFaceEnhanceSchema = z.boolean().default(false)

/**
 * Maximum input area accepted by the pinned Real-ESRGAN Replicate predictor.
 * @see https://github.com/replicate/cog-real-esrgan/blob/6cbd5e6ce8bd0fa90db54af899a8a9a85eb3db41/predict.py#L19
 */
export const realEsrganMaxInputPixels = 1448 * 1448

export const robotImageUpscaleInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/upscale'),
    // Outer optional preserves parsed input; normalization applies the published inner defaults.
    model: upscaleModelSchema
      .optional()
      .describe(
        `The AI model to use for image upscaling. Defaults to ${upscaleModelSchema.parse(undefined)}. Real-ESRGAN inputs exceeding ${formatEnglishInteger(realEsrganMaxInputPixels)} pixels are resized proportionally before upscaling.`,
      ),
    scale: upscaleScaleSchema
      .optional()
      .describe(
        `Upscale factor, applied after any input resizing. Defaults to ${upscaleScaleSchema.parse(undefined)}. GFPGAN results are resized after restoration to match this factor.`,
      ),
    face_enhance: upscaleFaceEnhanceSchema
      .optional()
      .describe(
        `Enable face enhancement for better face restoration. Defaults to ${upscaleFaceEnhanceSchema.parse(undefined)}.`,
      ),
  })
  .strict()

const hiddenFields = {
  provider: z.string().default('auto').describe(autoProviderDescription),
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotImageUpscaleInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotImageUpscaleInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotImageUpscaleInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotImageUpscaleInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotImageUpscaleInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotImageUpscaleInstructions = Instructions['output']
export type RobotImageUpscaleInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotImageUpscaleInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotImageUpscaleInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotImageUpscaleInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotImageUpscaleInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
