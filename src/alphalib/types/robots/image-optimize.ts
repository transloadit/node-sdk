import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  interpolateRobot,
  optimize_priority,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      optimized: {
        robot: '/image/optimize',
        use: ':original',
      },
    },
  },
  example_code_description: 'Optimize uploaded images:',
  minimum_charge: 0,
  output_factor: 0.6,
  override_lvl1: 'Image Manipulation',
  purpose_sentence: 'reduces the size of images while maintaining the same visual quality',
  purpose_verb: 'optimize',
  purpose_word: 'optimize',
  purpose_words: 'Optimize images without quality loss',
  service_slug: 'image-manipulation',
  slot_count: 15,
  title: 'Optimize images without quality loss',
  typical_file_size_mb: 0.8,
  typical_file_type: 'image',
  name: 'ImageOptimizeRobot',
  priceFactor: 1,
  queueSlotCount: 15,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotImageOptimizeInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/optimize').describe(`
With this <dfn>Robot</dfn> it's possible to reduce the file size of your JPEG, PNG, GIF, WEBP and SVG images by up to 80% for big images and 65% for small to medium sized ones — while keeping their original quality!

This <dfn>Robot</dfn> enables you to lower your storage and bandwidth costs, and improves your user experience and monetization by reducing the load time of image-intensive web pages.

It works well together with [🤖/image/resize](/docs/robots/image-resize/) to bring the full power of resized and optimized images to your website or app.

> [!Note]
> This <dfn>Robot</dfn> accepts all image types and will just pass on unsupported image types unoptimized. Hence, there is no need to set up [🤖/file/filter](/docs/robots/file-filter/) workflows for this.
`),
    priority: optimize_priority.describe(`
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
  })
  .strict()

export const robotImageOptimizeInstructionsWithHiddenFieldsSchema =
  robotImageOptimizeInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotImageOptimizeInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotImageOptimizeInstructions = z.infer<typeof robotImageOptimizeInstructionsSchema>
export type RobotImageOptimizeInstructionsWithHiddenFields = z.infer<
  typeof robotImageOptimizeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotImageOptimizeInstructionsSchema = interpolateRobot(
  robotImageOptimizeInstructionsSchema,
)
export type InterpolatableRobotImageOptimizeInstructions =
  InterpolatableRobotImageOptimizeInstructionsInput

export type InterpolatableRobotImageOptimizeInstructionsInput = z.input<
  typeof interpolatableRobotImageOptimizeInstructionsSchema
>

export const interpolatableRobotImageOptimizeInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotImageOptimizeInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotImageOptimizeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotImageOptimizeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotImageOptimizeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotImageOptimizeInstructionsWithHiddenFieldsSchema
>
