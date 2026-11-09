import type { RobotMetaInput, RobotSchemaPair } from './_instructions-primitives.ts'

import { z } from 'zod'

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
    model: z
      .string()
      .optional()
      .describe(
        `Video model; defaults to ${videoGenerateDefaultModelIdentifier}. Unsupported settings warn until ${videoGenerationParameterEnforcementDate}. MiniMax outputs are about six seconds.`,
      ),
    prompt: z.string().describe('The prompt describing the desired video content.'),
    format: z.enum(['mp4']).optional().describe('Format of the generated video.'),
    seed: z.number().optional().describe(robotParameterDocs.seed.description),
    aspect_ratio: z
      .string()
      .optional()
      .describe('Aspect ratio for lightricks/ltx-video without an input image.'),
    height: z.number().optional().describe('Pixel height for tencent/hunyuan-video.'),
    width: z.number().optional().describe('Pixel width for tencent/hunyuan-video.'),
    style: z.string().optional().describe('Unsupported by current models; omit it.'),
    num_outputs: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe('Number of video variants to generate.'),
    duration: z.number().optional().describe('Unsupported by current models; omit it.'),
    fps: z.number().optional().describe('Frames per second for tencent/hunyuan-video.'),
    motion_amount: z.number().optional().describe('Unsupported by current models; omit it.'),
    camera_motion: z.string().optional().describe('Unsupported by current models; omit it.'),
    negative_prompt: z.string().optional().describe('Content to avoid (lightricks/ltx-video).'),
    reference_strength: z.number().optional().describe('Unsupported by current models; omit it.'),
  })
  .strict()

export const robotVideoGenerateInstructionsWithHiddenFieldsSchema =
  robotVideoGenerateInstructionsSchema.extend({
    provider: z.string().default('auto').describe(autoProviderDescription),
    result: z
      .union([z.literal('debug'), robotVideoGenerateInstructionsSchema.shape.result])
      .optional(),
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
