import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  colorspaceSchema,
  interpolateRobot,
  robotBase,
  robotImagemagick,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      thumbnailed: {
        use: ':original',
        robot: '/document/thumbs',
        width: 200,
        resize_strategy: 'fit',
        trim_whitespace: false,
      },
    },
  },
  example_code_description: 'Convert all pages of a PDF document into separate 200px-wide images:',
  minimum_charge: 524288,
  output_factor: 1,
  override_lvl1: 'Document Processing',
  purpose_sentence:
    'generates an image for each page in a PDF file or an animated GIF file that loops through all pages',
  purpose_verb: 'extract',
  purpose_word: 'thumbnail',
  purpose_words: 'Extract thumbnail images from documents',
  service_slug: 'document-processing',
  slot_count: 10,
  title: 'Extract thumbnail images from documents',
  typical_file_size_mb: 0.8,
  typical_file_type: 'document',
  uses_tools: ['imagemagick'],
  name: 'DocumentThumbsRobot',
  priceFactor: 1,
  queueSlotCount: 60,
  minimumCharge: 524288,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotDocumentThumbsInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotImagemagick)
  .extend({
    robot: z.literal('/document/thumbs').describe(`
## Things to keep in mind

- If you convert a multi-page PDF file into several images, all result images will be sorted with the first image being the thumbnail of the first document page, etc.
- You can also check the \`meta.thumb_index\` key of each result image to find out which page it corresponds to. Keep in mind that these thumb indices **start at 0,** not at 1.
`),
    page: z
      .number()
      .int()
      .nullable()
      .default(null)
      .describe(`
The PDF page that you want to convert to an image. By default the value is \`null\` which means that all pages will be converted into images.
`),
    format: z
      .enum(['gif', 'jpeg', 'jpg', 'png'])
      .default('png')
      .describe(`
The format of the extracted image(s).

If you specify the value \`"gif"\`, then an animated gif cycling through all pages is created. Please check out [this demo](/demos/document-processing/convert-all-pages-of-a-document-into-an-animated-gif/) to learn more about this.
`),
    delay: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(`
If your output format is \`"gif"\` then this parameter sets the number of 100th seconds to pass before the next frame is shown in the animation. Set this to \`100\` for example to allow 1 second to pass between the frames of the animated gif.

If your output format is not \`"gif"\`, then this parameter does not have any effect.
`),
    width: z
      .number()
      .int()
      .min(1)
      .max(5000)
      .optional()
      .describe(`
Width of the new image, in pixels. If not specified, will default to the width of the input image
`),
    height: z
      .number()
      .int()
      .min(1)
      .max(5000)
      .optional()
      .describe(`
Height of the new image, in pixels. If not specified, will default to the height of the input image
`),
    resize_strategy: z
      .enum(['crop', 'fillcrop', 'fit', 'min_fit', 'pad', 'stretch'])
      .default('pad')
      .describe(`
One of the [available resize strategies](/docs/topics/resize-strategies/).
`),
    // TODO: Determine the allowed colors
    background: z
      .string()
      .default('#FFFFFF')
      .describe(`
Either the hexadecimal code or [name](https://www.imagemagick.org/script/color.php#color_names) of the color used to fill the background (only used for the pad resize strategy).

By default, the background of transparent images is changed to white. For details about how to preserve transparency across all image types, see [this demo](/demos/image-manipulation/properly-preserve-transparency-across-all-image-types/).
`),
    // TODO: Update options list. Why are they capitalized? They are lowercase in th ImageMagick docs.
    alpha: z
      .enum(['Remove', 'Set'])
      .optional()
      .describe(`
Change how the alpha channel of the resulting image should work. Valid values are \`"Set"\` to enable transparency and \`"Remove"\` to remove transparency.

For a list of all valid values please check the ImageMagick documentation [here](http://www.imagemagick.org/script/command-line-options.php#alpha).
`),
    density: z
      .string()
      .regex(/\d+(x\d+)?/)
      .optional()
      .describe(`
While in-memory quality and file format depth specifies the color resolution, the density of an image is the spatial (space) resolution of the image. That is the density (in pixels per inch) of an image and defines how far apart (or how big) the individual pixels are. It defines the size of the image in real world terms when displayed on devices or printed.

You can set this value to a specific \`width\` or in the format \`width\`x\`height\`.

If your converted image has a low resolution, please try using the density parameter to resolve that.
`),
    antialiasing: z
      .boolean()
      .default(false)
      .describe(`
Controls whether or not antialiasing is used to remove jagged edges from text or images in a document.
`),
    colorspace: colorspaceSchema.optional().describe(`
Sets the image colorspace. For details about the available values, see the [ImageMagick documentation](https://www.imagemagick.org/script/command-line-options.php#colorspace).

Please note that if you were using \`"RGB"\`, we recommend using \`"sRGB"\`. ImageMagick might try to find the most efficient \`colorspace\` based on the color of an image, and default to e.g. \`"Gray"\`. To force colors, you might then have to use this parameter.
`),
    trim_whitespace: z
      .boolean()
      .default(true)
      .describe(`
This determines if additional whitespace around the PDF should first be trimmed away before it is converted to an image. If you set this to \`true\` only the real PDF page contents will be shown in the image.

If you need to reflect the PDF's dimensions in your image, it is generally a good idea to set this to \`false\`.
`),
    pdf_use_cropbox: z
      .boolean()
      .default(true)
      .describe(`
Some PDF documents lie about their dimensions. For instance they'll say they are landscape, but when opened in decent Desktop readers, it's really in portrait mode. This can happen if the document has a cropbox defined. When this option is enabled (by default), the cropbox is leading in determining the dimensions of the resulting thumbnails.
`),
    turbo: z
      .boolean()
      .default(true)
      .describe(`
If you set this to \`false\`, the robot will not emit files as they become available. This is useful if you are only interested in the final result and not in the intermediate steps.

Also, extracted pages will be resized a lot faster as they are sent off to other machines for the resizing. This is especially useful for large documents with many pages to get up to 20 times faster processing.

Turbo mode increases pricing, though, in that the input document's file size is added for every extracted page. There are no performance benefits nor increased charges for single-page documents.
`),
  })
  .strict()

export const robotDocumentThumbsInstructionsWithHiddenFieldsSchema =
  robotDocumentThumbsInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotDocumentThumbsInstructionsSchema.shape.result])
      .optional(),
    stack: z
      .string()
      .optional()
      .describe(`
The image processing stack to use. Defaults to the robot's preferred stack (ImageMagick).
`),
    // Override to support lowercase for BC:
    alpha: z
      .enum(['Remove', 'Set', 'remove', 'set'])
      .optional()
      .describe(`
Change how the alpha channel of the resulting image should work. Valid values are \`"Set"\` to enable transparency and \`"Remove"\` to remove transparency. Lowercase values are also accepted for backwards compatibility.
`),
    // Override to support 'none' for BC
    resize_strategy: z
      .enum(['crop', 'fillcrop', 'fit', 'min_fit', 'pad', 'stretch', 'none'])
      .optional()
      .describe(`
One of the [available resize strategies](/docs/transcoding/image-manipulation/image-resize/#resize-strategies). The 'none' value is supported for backwards compatibility.
`),
  })

export type RobotDocumentThumbsInstructions = z.infer<typeof robotDocumentThumbsInstructionsSchema>
export type RobotDocumentThumbsInstructionsWithHiddenFields = z.infer<
  typeof robotDocumentThumbsInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotDocumentThumbsInstructionsSchema = interpolateRobot(
  robotDocumentThumbsInstructionsSchema,
)
export type InterpolatableRobotDocumentThumbsInstructions =
  InterpolatableRobotDocumentThumbsInstructionsInput

export type InterpolatableRobotDocumentThumbsInstructionsInput = z.input<
  typeof interpolatableRobotDocumentThumbsInstructionsSchema
>

export const interpolatableRobotDocumentThumbsInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotDocumentThumbsInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotDocumentThumbsInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotDocumentThumbsInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotDocumentThumbsInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotDocumentThumbsInstructionsWithHiddenFieldsSchema
>
