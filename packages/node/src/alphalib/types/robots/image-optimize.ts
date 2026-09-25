import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createProcessingExample,
  defineRobot,
  optimize_priority,
  robotBase,
  robotImageProcessingMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotImageProcessingMeta,
  example_code: createProcessingExample('optimized', '/image/optimize'),
  example_code_description: 'Optimize uploaded images:',
  purpose_sentence: 'reduces the size of images while maintaining the same visual quality',
  purpose_verb: 'optimize',
  purpose_word: 'optimize',
  purpose_words: 'Optimize images without quality loss',
  title: 'Optimize images without quality loss',
  name: 'ImageOptimizeRobot',
  queueSlotCount: 5,
  trackOutputFileSize: true,
}

export const robotImageOptimizeInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/optimize').describe(`
With this <dfn>Robot</dfn> it's possible to reduce the file size of your JPEG, PNG, GIF, WEBP and SVG images by up to 80% for big images and 65% for small to medium sized ones — while keeping their original quality!

This <dfn>Robot</dfn> enables you to lower your storage and bandwidth costs, and improves your user experience and monetization by reducing the load time of image-intensive web pages.

It works well together with [🤖/image/resize](/docs/robots/image-resize/) to bring the full power of resized and optimized images to your website or app.

> [!Note]
> This <dfn>Robot</dfn> accepts all image types and will just pass on unsupported image types unoptimized, including JPEG XL (\`.jxl\`) images when no smaller optimized result can be produced. Hence, there is no need to set up [🤖/file/filter](/docs/robots/file-filter/) workflows for this.

> [!Note]
> PNG optimization uses only lossless (optipng) compressors by default. To also enable lossy compression (pngquant), set \`lossy: true\`. When enabled, both lossy and lossless compressors compete and the smallest result wins, which may cause color shifts in some images.
`),
    priority: optimize_priority.default('compression-ratio').describe(`
Provides different algorithms for better or worse compression for your images, but that run slower or faster. The value \`"conversion-speed"\` will result in an average compression ratio of 18%. \`"compression-ratio"\` will result in an average compression ratio of 31%.
`),
    progressive: z
      .boolean()
      .default(false)
      .describe(`
Interlaces the image if set to \`true\`, which makes the result image load progressively in browsers. Instead of rendering the image from top to bottom, the browser will first show a low-res blurry version of the image which is then quickly replaced with the actual image as the data arrives. This greatly increases the user experience, but comes at a loss of about 10% of the file size reduction.
`),
    preserve_meta_data: z
      .boolean()
      .default(true)
      .describe(`
Specifies if the image's metadata should be preserved during the optimization, or not. If it is not preserved, the file size is even further reduced. But be aware that this could strip a photographer's copyright information, which for obvious reasons can be frowned upon.
`),
    fix_breaking_images: z
      .boolean()
      .default(true)
      .describe(`
If set to \`true\` this parameter tries to fix images that would otherwise make the underlying tool error out and thereby break your <dfn>Assemblies</dfn>. This can sometimes result in a larger file size, though.
`),
    lossy: z
      .boolean()
      .default(false)
      .describe(`
When set to \`false\` (the default), only lossless PNG optimizers are used, disabling pngquant to preserve color accuracy.

When set to \`true\`, both lossy and lossless PNG optimizers compete and the smallest result wins. This allows pngquant, a lossy compressor that reduces PNGs to a 256-color palette, which may cause noticeable color shifts in images with rich color palettes, subtle gradients, or brand-specific colors.

> [!Note]
> This parameter only affects PNG optimization. JPEG, GIF, WebP, and SVG optimization is unaffected.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotImageOptimizeInstructionsSchema.shape> =
  defineRobot(meta, robotImageOptimizeInstructionsSchema)

export const {
  withHiddenFields: robotImageOptimizeInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotImageOptimizeInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotImageOptimizeInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotImageOptimizeInstructions = Instructions['output']
export type RobotImageOptimizeInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotImageOptimizeInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotImageOptimizeInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotImageOptimizeInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotImageOptimizeInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
