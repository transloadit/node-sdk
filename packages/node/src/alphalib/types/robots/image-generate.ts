import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      ':original': {
        robot: '/upload/handle',
      },
      inpainted: {
        robot: '/image/generate',
        use: [
          { name: ':original', as: 'image' },
          { name: ':original', as: 'mask' },
        ],
        model: 'google/nano-banana-pro',
        prompt:
          'Replace the masked area with a breaching whale. Keep the rest of the image unchanged.',
        format: 'png',
      },
    },
  },
  example_code_description:
    'Inpaint an image by uploading an original image and a mask image, then use both files in /image/generate.',
  minimum_charge: 0,
  output_factor: 0.6,
  purpose_sentence: 'generates images from text prompts using AI',
  purpose_verb: 'generate',
  purpose_word: 'generate',
  purpose_words: 'Generate images from text prompts',
  service_slug: 'artificial-intelligence',
  slot_count: 10,
  title: 'Generate images from text prompts',
  typical_file_size_mb: 1.2,
  typical_file_type: 'image',
  name: 'ImageGenerateRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  minimumChargeUsd: 0.06,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'ga',
}

// Internal documentation (for public docs, see transloadit.com/docs)
//
// Inpainting: When input files are provided via `use`, file metadata (field name, mime) is
// prepended to the prompt so the model understands each file's role. Users should name upload
// fields semantically (e.g., "mask", "image") or use the `as` directive. Field is checked first,
// then `as`. Models that accept explicit image/mask inputs use these roles deterministically.
// Models that infer roles from prompt context receive this file metadata in the prompt.
export const robotImageGenerateInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/generate'),
    use: robotUse.shape.use.describe(
      `
Specifies which Step(s) to use as input.

For inpainting, provide both the source image and mask through \`use\`, typically with:

\`\`\`json
{
  "use": [
    { "name": ":original", "as": "image" },
    { "name": ":original", "as": "mask" }
  ]
}
\`\`\`

Best practice:
- Tag source and mask inputs explicitly using \`as\` (or semantic upload field names)
- Keep the prompt focused on what should change in the masked/transparent region
- Leave the model/provider choice to the robot defaults unless you have a specific need
`,
    ),
    model: z
      .string()
      .optional()
      .describe(
        'The AI model to use. Defaults to google/nano-banana. Supported models include flux-1.1-pro-ultra, flux-schnell, recraft-v3, google/nano-banana, google/nano-banana-2, google/nano-banana-pro, gpt-image-2, and stability-ai/stable-diffusion-inpainting.',
      ),
    prompt: z
      .string()
      .describe(
        'Prompt describing the desired image. For inpainting, describe what should appear in the masked/transparent region and that the rest should stay unchanged.',
      ),
    format: z
      .enum(['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg'])
      .optional()
      .describe(
        'Output format. Defaults depend on model: png for Google models and gpt-image-2, svg for recraft-v3, jpeg for others. Google models currently return PNG only.',
      ),
    seed: z.number().optional().describe('Seed for the random number generator.'),
    aspect_ratio: z
      .string()
      .optional()
      .describe(
        'Requested output aspect ratio. For Google models, width/height can also be used and orientation is derived automatically when aspect_ratio is omitted.',
      ),
    height: z
      .number()
      .optional()
      .describe('Requested output height in pixels (mainly used by Google image models and gpt-image-2).'),
    width: z
      .number()
      .optional()
      .describe('Requested output width in pixels (mainly used by Google image models and gpt-image-2).'),
    style: z.string().optional().describe('Style of the generated image.'),
    num_outputs: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe('Number of output variants to generate (1-10).'),
  })
  .strict()

export const robotImageGenerateInstructionsWithHiddenFieldsSchema =
  robotImageGenerateInstructionsSchema.extend({
    provider: z.string().optional().describe('Provider for generating the image.'),
    result: z
      .union([z.literal('debug'), robotImageGenerateInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotImageGenerateInstructions = z.infer<typeof robotImageGenerateInstructionsSchema>
export type RobotImageGenerateInstructionsWithHiddenFields = z.infer<
  typeof robotImageGenerateInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotImageGenerateInstructionsSchema = interpolateRobot(
  robotImageGenerateInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotImageGenerateInstructions =
  InterpolatableRobotImageGenerateInstructionsInput

export type InterpolatableRobotImageGenerateInstructionsInput = z.input<
  typeof interpolatableRobotImageGenerateInstructionsSchema
>

export const interpolatableRobotImageGenerateInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotImageGenerateInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotImageGenerateInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotImageGenerateInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotImageGenerateInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotImageGenerateInstructionsWithHiddenFieldsSchema
>
