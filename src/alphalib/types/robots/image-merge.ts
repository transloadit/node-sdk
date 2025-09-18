import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  color_without_alpha,
  imageQualitySchema,
  interpolateRobot,
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
      merged: {
        robot: '/image/merge',
        use: {
          steps: [':original'],
          bundle_steps: true,
        },
        border: 5,
      },
    },
  },
  example_code_description:
    'Merge uploaded images into one, with a 5px gap between them on the spritesheet:',
  minimum_charge: 0,
  output_factor: 0.6,
  override_lvl1: 'Image Manipulation',
  purpose_sentence: 'merges several images into a single spritesheet',
  purpose_verb: 'merge',
  purpose_word: 'merge',
  purpose_words: 'Merge several images into one image',
  service_slug: 'image-manipulation',
  slot_count: 10,
  title: 'Merge several images into a single image',
  typical_file_size_mb: 0.8,
  typical_file_type: 'image',
  name: 'ImageMergeRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotImageMergeInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/merge').describe(`
The final result will be a spritesheet, with the images displayed horizontally or vertically.

It's recommended to use this Robot with
[🤖/image/resize](/docs/robots/image-resize/) so your images are of a
similar size before merging them.
`),
    format: z
      .enum(['jpg', 'png'])
      .default('png')
      .describe('The output format for the modified image.'),
    direction: z
      .enum(['horizontal', 'vertical'])
      .default('horizontal')
      .describe('Specifies the direction which the images are displayed.'),
    // TODO: default is not between 1 and 10
    border: z
      .number()
      .int()
      .default(0)
      .describe(`
An integer value which defines the gap between images on the spritesheet.

A value of \`10\` would cause the images to have the largest gap between them, while a value of \`1\` would place the images side-by-side.
`),
    background: color_without_alpha.default('#FFFFFF').describe(`
Either the hexadecimal code or [name](https://www.imagemagick.org/script/color.php#color_names) of the color used to fill the background (only shown with a border > 1).

By default, the background of transparent images is changed to white.

For details about how to preserve transparency across all image types, see [this demo](/demos/image-manipulation/properly-preserve-transparency-across-all-image-types/).
`),
    adaptive_filtering: z
      .boolean()
      .default(false)
      .describe(`
Controls the image compression for PNG images. Setting to \`true\` results in smaller file size, while increasing processing time. It is encouraged to keep this option disabled.
`),
    quality: imageQualitySchema,
  })
  .strict()

export const robotImageMergeInstructionsWithHiddenFieldsSchema =
  robotImageMergeInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotImageMergeInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotImageMergeInstructions = z.infer<typeof robotImageMergeInstructionsSchema>
export type RobotImageMergeInstructionsWithHiddenFields = z.infer<
  typeof robotImageMergeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotImageMergeInstructionsSchema = interpolateRobot(
  robotImageMergeInstructionsSchema,
)
export type InterpolatableRobotImageMergeInstructions =
  InterpolatableRobotImageMergeInstructionsInput

export type InterpolatableRobotImageMergeInstructionsInput = z.input<
  typeof interpolatableRobotImageMergeInstructionsSchema
>

export const interpolatableRobotImageMergeInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotImageMergeInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotImageMergeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotImageMergeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotImageMergeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotImageMergeInstructionsWithHiddenFieldsSchema
>
