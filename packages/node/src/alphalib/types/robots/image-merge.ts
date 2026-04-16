import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  color_without_alpha_with_named,
  interpolateRobot,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
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
  stage: 'ga',
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
      .enum(['jpg', 'png', 'webp'])
      .default('png')
      .describe('The output format for the modified image.'),
    direction: z
      .enum(['horizontal', 'vertical'])
      .default('horizontal')
      .describe(`
Specifies the direction which the images are displayed.

Only applies to the default spritesheet layout. Ignored when \`effect\` is set to \`polaroid-stack\` or \`mosaic\`, as those effects use their own layout algorithms.
`),
    effect: z
      .enum(['mosaic', 'polaroid-stack'])
      .optional()
      .describe(`
Applies a styled collage layout instead of a plain horizontal or vertical spritesheet.

Currently supports \`polaroid-stack\`, which renders the inputs as overlapping instant photos on a canvas, and \`mosaic\`, which builds a justified tiled collage.
`),
    // TODO: default is not between 1 and 10
    border: z
      .number()
      .int()
      .default(0)
      .describe(`
An integer value which defines the gap between images on the spritesheet.

A value of \`10\` would cause the images to have the largest gap between them, while a value of \`1\` would place the images side-by-side.

When \`effect\` is \`polaroid-stack\`, this value is instead used as canvas padding so the outermost photos keep that many pixels of distance from the edge.

When \`effect\` is \`mosaic\`, this value is used both as the outer canvas padding and as the gutter width between neighbouring tiles.
`),
    background: color_without_alpha_with_named.default('#fff').describe(`
Either the hexadecimal code or [name](https://www.imagemagick.org/script/color.php#color_names) of the color used to fill the background (only shown with a border > 1).

By default, the background of transparent images is changed to white. Set to \`none\` or \`transparent\` for a transparent canvas — requires \`format\` \`png\` or \`webp\` to preserve alpha.

For details about how to preserve transparency across all image types, see [this demo](/demos/image-manipulation/properly-preserve-transparency-across-all-image-types/).
`),
    width: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(`
The output canvas width in pixels.

This is mainly used by styled effects such as \`polaroid-stack\` and \`mosaic\`.
`),
    height: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(`
The output canvas height in pixels.

This is mainly used by styled effects such as \`polaroid-stack\` and \`mosaic\`.
`),
    seed: z
      .number()
      .int()
      .optional()
      .describe(`
Optional deterministic seed used by styled effects such as \`polaroid-stack\` and \`mosaic\`.
`),
    shuffle: z
      .boolean()
      .default(false)
      .describe(`
Whether styled effects such as \`polaroid-stack\` and \`mosaic\` may shuffle the input order before laying out the canvas.
`),
    coverage: z
      .number()
      .min(0.5)
      .max(3)
      .optional()
      .describe(`
Area-coverage multiplier for the \`polaroid-stack\` effect. Controls how large each polaroid is relative to the canvas and consequently how much of the canvas is covered by photos.

The default of \`1.5\` leaves a subtle beige border along some edges. Use \`2.0\`–\`2.5\` for edge-to-edge coverage (photos overlap more). Values below \`1.0\` produce smaller, more widely spaced polaroids.

Has no effect on the \`mosaic\` style or on plain spritesheets.
`),
    adaptive_filtering: z
      .boolean()
      .default(false)
      .describe(`
Controls the image compression for PNG images. Setting to \`true\` results in smaller file size, while increasing processing time. It is encouraged to keep this option disabled.
`),
    quality: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(100)
      .describe(`
Controls the image compression for JPG, PNG, and WebP images. Please also take a look at [🤖/image/optimize](/docs/robots/image-optimize/).
`),
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
