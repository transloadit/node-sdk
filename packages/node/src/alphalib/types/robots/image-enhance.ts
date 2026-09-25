import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  defineRobot,
  imageQualitySchema,
  robotBase,
  robotImagemagick,
  robotImageProcessingMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImageProcessingMeta,
  example_code: {
    steps: {
      enhanced_classic: {
        robot: '/image/enhance',
        use: ':original',
        enhance: 'auto',
        preset: 'vivid',
      },
      enhanced_ai: {
        robot: '/image/enhance',
        use: ':original',
        engine: 'ai',
        ai_preset: 'restore',
      },
    },
  },
  example_code_description: 'Enhance uploaded images with classic auto mode or AI restoration:',
  purpose_sentence:
    'automatically enhances images by adjusting levels, contrast, and sharpness, and optionally applies photo filter presets',
  purpose_verb: 'enhance',
  purpose_word: 'enhance',
  purpose_words: 'Enhance images',
  title: 'Enhance images',
  typical_file_size_mb: 1.2,
  name: 'ImageEnhanceRobot',
  queueSlotCount: 15,
  trackOutputFileSize: true,
  stage: 'ga',
}

const enhanceModeSchema = z.enum(['auto', 'auto_gentle', 'auto_aggressive', 'none']).default('auto')

const presetSchema = z
  .enum([
    'none',
    'warm',
    'cool',
    'vintage',
    'vivid',
    'matte',
    'cinematic',
    'golden_hour',
    'bw_dramatic',
    'bw_classic',
    'noir',
    'fade',
    'pastel',
    'teal_orange',
  ])
  .default('none')

const engineSchema = z.enum(['classic', 'ai']).default('classic')

const aiPresetSchema = z.enum(['restore', 'face_restore']).default('restore')

export const robotImageEnhanceInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotImagemagick)
  .extend({
    robot: z.literal('/image/enhance').describe(`
With this <dfn>Robot</dfn> you can automatically enhance images with one click — adjusting levels, contrast, saturation, sharpness, and white balance to produce an optimally balanced image. It also supports a library of named photo filter presets (e.g. \`warm\`, \`cool\`, \`vintage\`, \`vivid\`) that apply curated color grading and tone adjustments.

It works well together with [🤖/image/resize](/docs/robots/image-resize/) — you can enhance first, then resize, or vice versa.

This <dfn>Robot</dfn> accepts all image types supported by ImageMagick and passes unsupported types through unchanged. \`engine: "classic"\` uses \`enhance\`, \`preset\`, \`sharpen\`, and \`denoise\`, while \`engine: "ai"\` uses \`ai_preset\` and \`quality\`; classic controls are ignored in AI mode. Output keeps the original file extension when possible. In AI mode, if the target extension is not writable by the selected \`imagemagick_stack\`, the file is passed through unchanged.
`),
    enhance: enhanceModeSchema.describe(`
The auto-enhancement mode. \`"auto"\` applies balanced auto-levels, gamma correction, and subtle sharpening. \`"auto_gentle"\` is more conservative (good for already-decent photos). \`"auto_aggressive"\` applies stronger normalization and contrast. \`"none"\` skips auto-enhance (useful when only applying a preset filter).
`),
    preset: presetSchema.describe(`
A named color grading preset to apply. Applied after auto-enhancement. Use \`"none"\` to skip preset application.

Available presets:
- \`warm\` — Warm golden tones
- \`cool\` — Cool blue-shifted tones
- \`vintage\` — Faded retro look with warm shadows
- \`vivid\` — Boosted saturation and contrast
- \`matte\` — Lifted blacks for a matte film look
- \`cinematic\` — Teal-and-orange cinema grading
- \`golden_hour\` — Warm sunset-like glow
- \`bw_dramatic\` — High-contrast black and white
- \`bw_classic\` — Classic film black and white
- \`noir\` — Dark, moody black and white
- \`fade\` — Washed-out faded look
- \`pastel\` — Soft, desaturated pastel tones
- \`teal_orange\` — Complementary teal shadows and orange highlights
`),
    engine: engineSchema.describe(`
Enhancement engine to use.

- \`"classic"\` uses ImageMagick-based adjustments and presets.
- \`"ai"\` uses AI restoration models on Replicate (typically higher latency and cost than classic mode).
`),
    ai_preset: aiPresetSchema.describe(`
AI enhancement preset used when \`engine\` is set to \`"ai"\`:
- \`restore\` — General image restoration.
- \`face_restore\` — Portrait-focused face restoration.

AI mode is not intended for image upscaling. For dedicated upscaling, use [🤖/image/upscale](/docs/robots/image-upscale/).
`),
    sharpen: z
      .number()
      .min(0)
      .max(10)
      .default(0)
      .describe(`
Additional sharpening amount (\`0\` = none, \`10\` = maximum). The \`"auto"\` enhance mode already applies subtle sharpening; this parameter adds more on top.
`),
    denoise: z
      .number()
      .min(0)
      .max(10)
      .default(0)
      .describe(`
Noise reduction strength (\`0\` = none, \`10\` = maximum). Useful for high-ISO photos.
`),
    quality: imageQualitySchema.describe(`
Quality of the output image. A value between \`1\` and \`100\`. Defaults to \`${imageQualitySchema.parse(undefined)}\`.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotImageEnhanceInstructionsSchema.shape> =
  defineRobot(meta, robotImageEnhanceInstructionsSchema)

export const {
  withHiddenFields: robotImageEnhanceInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotImageEnhanceInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotImageEnhanceInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotImageEnhanceInstructions = Instructions['output']
export type RobotImageEnhanceInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotImageEnhanceInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotImageEnhanceInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotImageEnhanceInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotImageEnhanceInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
