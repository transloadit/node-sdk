import type { RobotMetaInput, RobotSchemaPair } from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  imageGenerateDefaultModelIdentifier,
  imageGenerateLegacyModelAlias,
  imageGenerateModelIdentifiers,
} from './_ai-models.ts'
import { googleImageSeedMaximum } from './_google-image-seed.ts'
import { imageGenerateInpaintingModels } from './_image-inpainting.ts'
import { imageGenerateInpaintingForms, imageGenerateMaskForms } from './_image-inpainting-docs.ts'
import {
  autoProviderDescription,
  interpolateRobot,
  robotArtificialIntelligenceMeta,
  robotBase,
  robotParameterDocs,
  robotUse,
} from './_instructions-primitives.ts'

function formatEnglishModelList(values: readonly [string, string, ...string[]]): string {
  const formattedValues = values.map((model) => `\`${model}\``)
  return `${formattedValues.slice(0, -1).join(', ')}, and ${formattedValues.at(-1)}`
}

export const meta: RobotMetaInput = {
  ...robotArtificialIntelligenceMeta,
  example_code: {
    steps: {
      ':original': {
        robot: '/upload/handle',
      },
      inpainted: {
        robot: '/image/generate',
        use: [
          { name: ':original', fields: 'image', as: 'image' },
          { name: ':original', fields: 'mask', as: 'mask' },
        ],
        model: 'google/nano-banana-pro',
        inpainting: 'strict',
        prompt:
          'Replace the masked area with a breaching whale. Keep the rest of the image unchanged.',
        format: 'png',
      },
    },
  },
  example_code_description:
    'Upload a 1024×1024 source in the image field and a matching white-on-black edit mask in the mask field. This example preserves every decoded source pixel outside the mask:',
  purpose_sentence: 'generates images from text prompts using AI',
  purpose_verb: 'generate',
  purpose_word: 'generate',
  purpose_words: 'Generate images from text prompts',
  title: 'Generate images from text prompts',
  name: 'ImageGenerateRobot',
  planWatermarkOutput: 'image',
  minimumChargeUsd: 0.06,
}

export const robotImageGenerateInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/generate'),
    use: robotUse.shape.use.describe(
      `
Specifies which Step(s) to use as input.

For inpainting, select source and mask with upload fields or \`use.as\` roles.

Multiple source selectors fail with “Supply exactly one inpainting source image.” Competing edit selectors, including both edit roles on one input, fail with “Supply exactly one inpainting mask or cutout.” An edit field overrides inherited edit roles.

Accepted input forms:
${imageGenerateInpaintingForms.map((form) => `- ${form.description}`).join('\n')}

Mask formats (source and mask must have matching dimensions):
${imageGenerateMaskForms.map((form) => `- ${form.description}`).join('\n')}
- A cutout edits alpha below 128. A separate source supplies protected pixels; otherwise only the cutout’s remaining pixels can be preserved. Alongside references, give the cutout an image field or role to select it as the source.

Source and mask must be rasters with matching display dimensions, at most 40,000,000 pixels each (16,777,216 in strict). Strict refuses SVG/SVGZ; best_effort decoding draws them once. Best-effort applies EXIF orientation and uses the first frame; strict requires one frame and applied orientation.

Masks are converted for each provider. Supported inpainting models: ${imageGenerateInpaintingModels
        .filter((model) => model !== 'gpt-image-2')
        .map((model) => `\`${model}\``)
        .join(
          ', ',
        )}. The legacy \`gpt-image-2\` alias uses the same OpenAI route. FLUX, Recraft and legacy self-hosted Stable Diffusion do not have an inpainting route here; inpainting requests are refused instead of silently ignoring a mask. Ordinary non-masked generation retains its existing behavior.

Without strict mode the full provider image is returned; masks only guide it. Exterior content, colors, size or transparency can change, even with a fixed seed. Select strict for exact exterior pixels. Auxiliary images such as gain maps are not retained in strict PNG output.

Strict mode uses the source canvas without resizing. Google requires a native canvas: at 1K, Nano Banana accepts 1024×1024, 864×1184, 1184×864, 768×1344 or 1344×768; Nano Banana Pro and Nano Banana 2 accept 1024×1024, 896×1200, 1200×896, 768×1376 or 1376×768, with 2× and 4× sizes also accepted within the pixel limit. OpenAI canvas edges must be multiples of 16, no longer than 3840 pixels, with an aspect ratio no greater than 3:1 and 655,360–8,294,400 pixels in total. Replicate inpainting requires each edge to be a multiple of 64, from 64 to 1024 pixels. Unsupported canvases fail before generation; an unexpectedly different provider result also fails. Resize the source and mask together in an earlier Step if needed.
`,
    ),
    model: z
      .string()
      .optional()
      .describe(
        `The AI model to use. Defaults to \`${imageGenerateDefaultModelIdentifier}\`. Supported models include ${formatEnglishModelList(imageGenerateModelIdentifiers)}. The legacy alias \`${imageGenerateLegacyModelAlias}\` is also accepted for backwards compatibility.`,
      ),
    prompt: z
      .string()
      .describe(
        'Prompt describing the desired image. For inpainting, describe what should appear in the masked/transparent region and that the rest should stay unchanged.',
      ),
    format: z
      .enum(['jpeg', 'jpg', 'png', 'webp', 'svg'])
      .optional()
      .describe(
        'Output format. Defaults depend on model: png for Google and OpenAI models, svg for recraft-v3, jpeg for others. Google may return JPEG bytes in best_effort mode even when png is requested; strict mode encodes PNG locally.',
      ),
    inpainting: z
      .enum(['best_effort', 'strict'])
      .default('best_effort')
      .describe(
        'best_effort normalizes masks and returns the full provider result. strict copies decoded source RGBA outside the hard-thresholded mask and provider RGBA inside, preserving alpha; no feathering or extra AI call. Strict needs matching raster canvases, format png, single-frame 8-bit sRGB source/output without embedded profiles, and applied orientation. Masks may be 8-bit grayscale without profiles. Each image is limited to 16,777,216 pixels. Watermarked plans are refused. Width/height must match the source; omitted dimensions use its size. Omit aspect_ratio. Model-native canvas limits apply. Incompatible inputs or results fail. PNG metadata/file bytes can change; downstream resizing, watermarking or lossy encoding can change pixels.',
      ),
    // Provider-specific limits are checked by the Robot so other models retain their seed range.
    seed: z
      .number()
      .optional()
      .describe(
        `${robotParameterDocs.seed.description} For Google models, use an integer from 0 to ${googleImageSeedMaximum}. Each output increments the seed by 1, so the final output’s seed must also fit this range. A seed does not guarantee identical images.`,
      ),
    aspect_ratio: z
      .string()
      .optional()
      .describe(
        'Requested output aspect ratio. For Google models, width/height can also be used and orientation is derived automatically when aspect_ratio is omitted.',
      ),
    height: z
      .number()
      .optional()
      .describe(
        'Requested output height in pixels (mainly used by Google and OpenAI image models).',
      ),
    width: z
      .number()
      .optional()
      .describe(
        'Requested output width in pixels (mainly used by Google and OpenAI image models).',
      ),
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
    provider: z.string().default('auto').describe(autoProviderDescription),
    result: z
      .union([z.literal('debug'), robotImageGenerateInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotImageGenerateInstructions = z.infer<typeof robotImageGenerateInstructionsSchema>
export type RobotImageGenerateInstructionsWithHiddenFields = z.infer<
  typeof robotImageGenerateInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotImageGenerateInstructionsSchema = interpolateRobot(
  robotImageGenerateInstructionsSchema,
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

export const robotDefinition: RobotSchemaPair<
  typeof interpolatableRobotImageGenerateInstructionsSchema,
  typeof interpolatableRobotImageGenerateInstructionsWithHiddenFieldsSchema
> = {
  meta,
  interpolatable: interpolatableRobotImageGenerateInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotImageGenerateInstructionsWithHiddenFieldsSchema,
}
