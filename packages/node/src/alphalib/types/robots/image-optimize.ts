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
  purpose_sentence: 'reduces image file sizes with format-specific compression tools',
  purpose_verb: 'optimize',
  purpose_word: 'optimize',
  purpose_words: 'Optimize image file sizes',
  title: 'Optimize image file sizes',
  name: 'ImageOptimizeRobot',
  queueSlotCount: 5,
  trackOutputFileSize: true,
}

export const robotImageOptimizeInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/optimize').describe(`
This <dfn>Robot</dfn> reduces the file size of JPEG, PNG, GIF, WebP and SVG images using format-specific compression tools. Depending on the format and settings, optimization can be lossless or lossy.

This <dfn>Robot</dfn> enables you to lower your storage and bandwidth costs, and improves your user experience and monetization by reducing the load time of image-intensive web pages.

It works well together with [🤖/image/resize](/docs/robots/image-resize/) to bring the full power of resized and optimized images to your website or app.

For JPEGs, the default \`priority: "compression-ratio"\` and \`preserve_meta_data: true\` settings compare a lossless jpegtran result with a lossy MozJPEG cjpeg result and select the smallest valid result. The cjpeg encoder uses its default quality of 75, so the selected result can introduce compression artifacts. This does not mean every JPEG is re-encoded at quality 75: a lossless result can win instead.

To optimize JPEGs without further quality loss, use \`priority: "conversion-speed"\`, which runs jpegoptim in lossless mode. Progressive JPEG conversion itself can also be lossless. For example:

\`\`\`json
{
  "steps": {
    "optimized": {
      "robot": "/image/optimize",
      "use": ":original",
      "priority": "conversion-speed",
      "progressive": true,
      "preserve_meta_data": true
    }
  }
}
\`\`\`

With these settings, jpegoptim may keep the original JPEG if the progressive result would be larger, so progressive output is not guaranteed. For workflows sensitive to compression artifacts, such as images used as input for AI video generation, use the lossless JPEG settings above or keep the original images.

> [!Note]
> This <dfn>Robot</dfn> accepts all image types and will just pass on unsupported image types unoptimized, including JPEG XL (\`.jxl\`) images when no smaller optimized result can be produced. Hence, there is no need to set up [🤖/file/filter](/docs/robots/file-filter/) workflows for this.

> [!Note]
> PNG optimization is lossless by default. To also enable lossy compression (pngquant), set \`lossy: true\` and \`preserve_meta_data: false\`. pngquant then runs first, and its result is used whenever it is smaller than the input, which may cause color shifts in some images. The lossless optimizer only runs when pngquant cannot shrink the file.

> [!Note]
> Lossless PNG optimization with the default \`priority: "compression-ratio"\` uses optipng, which can take tens of seconds for large images. Set \`priority: "conversion-speed"\` to use oxipng instead. It uses several CPU cores and fewer compression trials, so it typically finishes sooner, though its files can be slightly larger.
`),
    priority: optimize_priority.default('compression-ratio').describe(`
Selects the JPEG and PNG optimization tools. The default, \`"compression-ratio"\`, favors smaller files. For JPEGs, it can use lossy re-encoding at quality 75 when \`preserve_meta_data: true\`, and for PNGs it uses optipng. Use \`"conversion-speed"\` for lossless JPEG optimization with jpegoptim and for faster lossless PNG optimization with oxipng. This parameter does not change the tools used for GIF, WebP, or SVG images.
`),
    progressive: z
      .boolean()
      .default(false)
      .describe(`
Requests progressive or interlaced output from the selected tools when set to \`true\`. Browsers can then show an initial low-detail image and refine it as more data arrives. For JPEGs, progressive conversion does not itself require quality loss; the \`priority\` setting determines whether lossy re-encoding is allowed. With \`priority: "conversion-speed"\`, jpegoptim may keep the original JPEG if progressive conversion would increase its file size.
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

When set to \`true\`, pngquant runs first, and its result is used whenever it is smaller than the input. The lossless optimizer selected by \`priority\` only runs when pngquant cannot shrink the file. pngquant cannot keep metadata, so it only runs when \`preserve_meta_data\` is \`false\`. It is a lossy compressor that reduces PNGs to a 256-color palette, which may cause noticeable color shifts in images with rich color palettes, subtle gradients, or brand-specific colors.

> [!Note]
> This parameter only affects PNG optimization. Setting \`lossy: false\` does not disable lossy JPEG re-encoding. Use \`priority: "conversion-speed"\` for lossless JPEG optimization. GIF, WebP, and SVG optimization is unaffected.
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
