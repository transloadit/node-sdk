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

export const meta: RobotMetaInput = {
  ...robotArtificialIntelligenceMeta,
  example_code: {
    steps: {
      generated_video: {
        robot: '/video/generate',
        prompt: 'A slow cinematic drone shot of ocean cliffs at sunrise, realistic lighting.',
        duration: 5,
        aspect_ratio: '16:9',
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
        `The AI model to use for video generation. Defaults to ${videoGenerateDefaultModelIdentifier}.`,
      ),
    prompt: z.string().describe('The prompt describing the desired video content.'),
    format: z.enum(['mp4', 'gif']).optional().describe('Format of the generated video.'),
    seed: z.number().optional().describe(robotParameterDocs.seed.description),
    aspect_ratio: z.string().optional().describe('Aspect ratio of the generated video.'),
    height: z.number().optional().describe('Height of the generated video.'),
    width: z.number().optional().describe('Width of the generated video.'),
    style: z.string().optional().describe('Style of the generated video.'),
    num_outputs: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe('Number of video variants to generate.'),
    duration: z.number().optional().describe('Duration of the generated video in seconds.'),
    fps: z.number().optional().describe('Frames per second of the output video.'),
    motion_amount: z
      .number()
      .optional()
      .describe('Controls the intensity of motion in the generated video.'),
    camera_motion: z
      .string()
      .optional()
      .describe(
        'Camera movement type (e.g., pan-left, pan-right, zoom-in, zoom-out, orbit, static, dolly, crane).',
      ),
    negative_prompt: z
      .string()
      .optional()
      .describe('Describes what should be avoided in the generated video.'),
    reference_strength: z
      .number()
      .optional()
      .describe('How closely the output should follow the reference input (0.0 - 1.0).'),
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
