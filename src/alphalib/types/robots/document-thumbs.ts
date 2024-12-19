import { z } from 'zod'

import {
  colorspaceSchema,
  imagemagickStackVersionSchema,
  outputMetaParamSchema,
  useParamSchema,
} from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  docs_redirect_from: ['/docs/extracting-images-of-documents/'],
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
}

export const robotDocumentThumbsInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/document/thumbs').describe(`
## Things to keep in mind

- If you convert a multi-page PDF file into several images, all result images will be sorted with the first image being the thumbnail of the first document page, etc.
- You can also check the \`meta.thumb_index\` key of each result image to find out which page it corresponds to. Keep in mind that these thumb indices **start at 0,** not at 1.
`),
    use: useParamSchema,
    page: z.number().int().nullable().default(null).describe(`
The PDF page that you want to convert to an image. By default the value is \`null\` which means that all pages will be converted into images.
`),
    format: z.enum(['gif', 'jpeg', 'jpg', 'png']).default('png').describe(`
The format of the extracted image(s).

If you specify the value \`"gif"\`, then an animated gif cycling through all pages is created. Please check out [this demo](/demos/document-processing/convert-all-pages-of-a-document-into-an-animated-gif/) to learn more about this.
`),
    delay: z.number().int().min(0).optional().describe(`
If your output format is \`"gif"\` then this parameter sets the number of 100th seconds to pass before the next frame is shown in the animation. Set this to \`100\` for example to allow 1 second to pass between the frames of the animated gif.

If your output format is not \`"gif"\`, then this parameter does not have any effect.
`),
    width: z.number().int().min(1).max(5000).optional().describe(`
Width of the new image, in pixels. If not specified, will default to the width of the input image
`),
    height: z.number().int().min(1).max(5000).optional().describe(`
Height of the new image, in pixels. If not specified, will default to the height of the input image
`),
    resize_strategy: z.enum(['crop', 'fillcrop', 'fit', 'min_fit', 'pad', 'stretch']).default('pad')
      .describe(`
One of the [available resize strategies](/docs/transcoding/image-manipulation/image-resize/#resize-strategies).
`),
    // TODO: Determine the allowed colors
    background: z.string().default('#FFFFFF').describe(`
Either the hexadecimal code or [name](https://www.imagemagick.org/script/color.php#color_names) of the color used to fill the background (only used for the pad resize strategy).

By default, the background of transparent images is changed to white. For details about how to preserve transparency across all image types, see [this demo](/demos/image-manipulation/properly-preserve-transparency-across-all-image-types/).
`),
    // TODO: Update options list. Why are they capitalized? They are lowercase in th ImageMagick docs.
    alpha: z.enum(['Remove', 'Set']).optional().describe(`
Change how the alpha channel of the resulting image should work. Valid values are \`"Set"\` to enable transparency and \`"Remove"\` to remove transparency.

For a list of all valid values please check the ImageMagick documentation [here](http://www.imagemagick.org/script/command-line-options.php?#alpha).
`),
    density: z
      .string()
      .regex(/\d+(x\d+)?/)
      .optional().describe(`
While in-memory quality and file format depth specifies the color resolution, the density of an image is the spatial (space) resolution of the image. That is the density (in pixels per inch) of an image and defines how far apart (or how big) the individual pixels are. It defines the size of the image in real world terms when displayed on devices or printed.

You can set this value to a specific \`width\` or in the format \`width\`x\`height\`.

If your converted image has a low resolution, please try using the density parameter to resolve that.
`),
    antialiasing: z.boolean().default(false).describe(`
Controls whether or not antialiasing is used to remove jagged edges from text or images in a document.
`),
    colorspace: colorspaceSchema.optional().describe(`
Sets the image colorspace. For details about the available values, see the [ImageMagick documentation](https://www.imagemagick.org/script/command-line-options.php#colorspace).

Please note that if you were using \`"RGB"\`, we recommend using \`"sRGB"\`. ImageMagick might try to find the most efficient \`colorspace\` based on the color of an image, and default to e.g. \`"Gray"\`. To force colors, you might then have to use this parameter.
`),
    trim_whitespace: z.boolean().default(true).describe(`
This determines if additional whitespace around the PDF should first be trimmed away before it is converted to an image. If you set this to \`true\` only the real PDF page contents will be shown in the image.

If you need to reflect the PDF's dimensions in your image, it is generally a good idea to set this to \`false\`.
`),
    pdf_use_cropbox: z.boolean().default(true).describe(`
Some PDF documents lie about their dimensions. For instance they'll say they are landscape, but when opened in decent Desktop readers, it's really in portrait mode. This can happen if the document has a cropbox defined. When this option is enabled (by default), the cropbox is leading in determining the dimensions of the resulting thumbnails.
`),
    output_meta: outputMetaParamSchema.describe(`
Generally, this parameter allows you to specify a set of metadata that is more expensive on cpu power to calculate, and thus is disabled by default to keep your Assemblies processing fast.

This Robot only supports the default value of \`{}\` (meaning all meta data will be extracted) and \`false\`. A value of \`false\` means that only width, height, size and thumb_index will be extracted for the result images, which would also provide a great performance boost for documents with many pages.
`),
    imagemagick_stack: imagemagickStackVersionSchema,
  })
  .strict()

export type RobotDocumentThumbsInstructions = z.infer<typeof robotDocumentThumbsInstructionsSchema>
