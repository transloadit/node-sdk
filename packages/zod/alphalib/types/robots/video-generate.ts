import { optionalWithV3Semantics } from '../../lib/sdkZodOptional.ts'

import type { RobotMetaInput, RobotSchemaPair } from './_instructions-primitives.ts'

import { z } from 'zod/v4'

import { videoGenerateDefaultModelIdentifier } from './_ai-models.ts'
import {
  autoProviderDescription,
  interpolateRobot,
  robotArtificialIntelligenceMeta,
  robotBase,
  robotParameterDocs,
  robotUse,
} from './_instructions-primitives.ts'
import { videoGenerationParameterEnforcementDate } from './_video-generate-description.ts'

export const meta: RobotMetaInput = {
  ...robotArtificialIntelligenceMeta,
  example_code: {
    steps: {
      generated_video: {
        robot: '/video/generate',
        prompt: 'A slow cinematic drone shot of ocean cliffs at sunrise, realistic lighting.',
        format: 'mp4',
      },
    },
  },
  example_code_description: 'Generate a short video from a text prompt:',
  purpose_sentence: 'generates videos from text prompts using AI',
  purpose_verb: 'generate',
  purpose_word: 'generate',
  purpose_words: 'Generate videos from text prompts',
  title: 'Generate videos from text prompts',
  typical_file_size_mb: 50,
  typical_file_type: 'video',
  name: 'VideoGenerateRobot',
  minimumChargeUsd: 0.06,
  applyCommunityPlanMediaTrim: true,
}

export const robotVideoGenerateInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/video/generate'),
    model: optionalWithV3Semantics(z
      .string()
      )
      .describe(
        `Video model; defaults to ${videoGenerateDefaultModelIdentifier}. Unsupported settings warn until ${videoGenerationParameterEnforcementDate}. MiniMax outputs are about six seconds.`,
      ),
    prompt: z.string().describe('The prompt describing the desired video content.'),
    format: optionalWithV3Semantics(z.enum(['mp4'])).describe('Format of the generated video.'),
    seed: optionalWithV3Semantics(z.number()).describe(robotParameterDocs.seed.description),
    aspect_ratio: optionalWithV3Semantics(z
      .string()
      )
      .describe('Aspect ratio for lightricks/ltx-video without an input image.'),
    height: optionalWithV3Semantics(z.number()).describe('Pixel height for tencent/hunyuan-video.'),
    width: optionalWithV3Semantics(z.number()).describe('Pixel width for tencent/hunyuan-video.'),
    style: optionalWithV3Semantics(z.string()).describe('Unsupported by current models; omit it.'),
    num_outputs: optionalWithV3Semantics(z
      .number()
      .int()
      .min(1)
      .max(10)
      )
      .describe('Number of video variants to generate.'),
    duration: optionalWithV3Semantics(z.number()).describe('Unsupported by current models; omit it.'),
    fps: optionalWithV3Semantics(z.number()).describe('Frames per second for tencent/hunyuan-video.'),
    motion_amount: optionalWithV3Semantics(z.number()).describe('Unsupported by current models; omit it.'),
    camera_motion: optionalWithV3Semantics(z.string()).describe('Unsupported by current models; omit it.'),
    negative_prompt: optionalWithV3Semantics(z.string()).describe('Content to avoid (lightricks/ltx-video).'),
    reference_strength: optionalWithV3Semantics(z.number()).describe('Unsupported by current models; omit it.'),
  })
  .strict()

export const robotVideoGenerateInstructionsWithHiddenFieldsSchema =
  robotVideoGenerateInstructionsSchema.extend({
    provider: z.string().default('auto').describe(autoProviderDescription),
    result: optionalWithV3Semantics(z
      .union([z.literal('debug'), robotVideoGenerateInstructionsSchema.shape.result])
      ),
  })

export type RobotVideoGenerateInstructions = z.infer<typeof robotVideoGenerateInstructionsSchema>
export type RobotVideoGenerateInstructionsWithHiddenFields = z.infer<
  typeof robotVideoGenerateInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotVideoGenerateInstructionsSchema = interpolateRobot(
  robotVideoGenerateInstructionsSchema,
)
export type InterpolatableRobotVideoGenerateInstructions =
  InterpolatableRobotVideoGenerateInstructionsInput

export type InterpolatableRobotVideoGenerateInstructionsInput = z.input<
  typeof interpolatableRobotVideoGenerateInstructionsSchema
>

export const interpolatableRobotVideoGenerateInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotVideoGenerateInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotVideoGenerateInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotVideoGenerateInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotVideoGenerateInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotVideoGenerateInstructionsWithHiddenFieldsSchema
>

export const robotDefinition: RobotSchemaPair<
  typeof interpolatableRobotVideoGenerateInstructionsSchema,
  typeof interpolatableRobotVideoGenerateInstructionsWithHiddenFieldsSchema
> = {
  meta,
  interpolatable: interpolatableRobotVideoGenerateInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotVideoGenerateInstructionsWithHiddenFieldsSchema,
}
