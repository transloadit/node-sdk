import { z } from 'zod'

import type { RobotMeta } from './_instructions-primitives.ts'
import {
  color_without_alpha,
  colorspaceSchema,
  complexHeightSchema,
  complexWidthSchema,
  imagemagickStackVersionSchema,
  imageQualitySchema,
  outputMetaParamSchema,
  percentageSchema,
  positionSchema,
  unsafeCoordinatesSchema,
  useParamSchema,
  interpolationSchemaToYieldString,
  interpolationSchemaToYieldNumber,
} from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      resized: {
        robot: '/image/resize',
        use: ':original',
        width: 200,
      },
    },
  },
  example_code_description:
    'Resize uploaded images to a width of 200px while keeping their original aspect ratio:',
  minimum_charge: 0,
  output_factor: 0.6,
  override_lvl1: 'Image Manipulation',
  purpose_sentence:
    'resizes, crops, changes colorization, rotation, and applies text and watermarks to images',
  purpose_verb: 'convert',
  purpose_word: 'convert/resize/watermark',
  purpose_words: 'Convert, resize, or watermark images',
  service_slug: 'image-manipulation',
  slot_count: 5,
  title: 'Convert, resize, or watermark images',
  typical_file_size_mb: 0.8,
  typical_file_type: 'image',
}

export const robotImageResizeInstructionsInterpolatedSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/image/resize'),
    use: useParamSchema,
    output_meta: outputMetaParamSchema,
    // TODO: Use an enum
    format: z.string().nullable().default(null).describe(`
The output format for the modified image.

Some of the most important available formats are \`"jpg"\`, \`"png"\`, \`"gif"\`, and \`"tiff"\`. For a complete lists of all formats that we can write to please check [our supported image formats list](/docs/supported-formats/image-formats/).

If \`null\` (default), then the input image's format will be used as the output format.

If you wish to convert to \`"pdf"\`, please consider [🤖/document/convert](/docs/transcoding/document-processing/document-convert/) instead.
`),
    width: complexWidthSchema.optional().describe(`
Width of the result in pixels. If not specified, will default to the width of the original.
`),
    height: complexHeightSchema.optional().describe(`
Height of the new image, in pixels. If not specified, will default to the height of the input image.
`),
    resize_strategy: z.enum(['crop', 'fillcrop', 'fit', 'min_fit', 'pad', 'stretch']).default('fit')
      .describe(`
See the list of available [resize strategies](/docs/transcoding/image-manipulation/image-resize/#resize-strategies).
`),
    zoom: z.boolean().default(true).describe(`
If this is set to \`false\`, smaller images will not be stretched to the desired width and height. For details about the impact of zooming for your preferred resize strategy, see the list of available [resize strategies](/docs/transcoding/image-manipulation/image-resize/#resize-strategies).
`),
    crop: unsafeCoordinatesSchema.optional().describe(`
Specify an object containing coordinates for the top left and bottom right corners of the rectangle to be cropped from the original image(s). The coordinate system is rooted in the top left corner of the image. Values can be integers for absolute pixel values or strings for percentage based values.

For example:

\`\`\`json
{
  "x1": 80,
  "y1": 100,
  "x2": "60%",
  "y2": "80%"
}
\`\`\`

This will crop the area from \`(80, 100)\` to \`(600, 800)\` from a 1000×1000 pixels image, which is a square whose width is 520px and height is 700px. If \`crop\` is set, the width and height parameters are ignored, and the \`resize_strategy\` is set to \`crop\` automatically.

You can also use a JSON string of such an object with coordinates in similar fashion:

\`\`\`json
"{"x1": <Integer>, "y1": <Integer>, "x2": <Integer>, "y2": <Integer>}"
\`\`\`

To crop around human faces, see [🤖/image/facedetect](/docs/transcoding/artificial-intelligence/image-facedetect/).
`),
    gravity: positionSchema.default('center').describe(`
The direction from which the image is to be cropped, when \`"resize_strategy"\` is set to \`"crop"\`, but no crop coordinates are defined.
`),
    strip: z.boolean().default(false).describe(`
Strips all metadata from the image. This is useful to keep thumbnails as small as possible.
`),
    alpha: z
      .enum([
        'Activate',
        'Background',
        'Copy',
        'Deactivate',
        'Extract',
        'Off',
        'On',
        'Opaque',
        'Remove',
        'Set',
        'Shape',
        'Transparent',
      ])
      .optional().describe(`
Gives control of the alpha/matte channel of an image.
`),
    preclip_alpha: z
      .enum([
        'Activate',
        'Background',
        'Copy',
        'Deactivate',
        'Extract',
        'Off',
        'On',
        'Opaque',
        'Remove',
        'Set',
        'Shape',
        'Transparent',
      ])
      .optional().describe(`
Gives control of the alpha/matte channel of an image before applying the clipping path via \`clip: true\`.
`),
    flatten: z.boolean().default(true).describe(`
Flattens all layers onto the specified background to achieve better results from transparent formats to non-transparent formats, as explained in the [ImageMagick documentation](https://www.imagemagick.org/script/command-line-options.php?#layers).

To preserve animations, GIF files are not flattened when this is set to \`true\`. To flatten GIF animations, use the \`frame\` parameter.
`),
    correct_gamma: z.boolean().default(false).describe(`
Prevents gamma errors [common in many image scaling algorithms](https://www.4p8.com/eric.brasseur/gamma.html).
`),
    quality: imageQualitySchema,
    adaptive_filtering: z.boolean().default(false).describe(`
Controls the image compression for PNG images. Setting to \`true\` results in smaller file size, while increasing processing time. It is encouraged to keep this option disabled.
`),
    background: z
      .union([z.literal('transparent'), z.literal('none'), color_without_alpha])
      .default('#FFFFFF').describe(`
Either the hexadecimal code or [name](https://www.imagemagick.org/script/color.php#color_names) of the color used to fill the background (only used for the pad resize strategy).

By default, the background of transparent images is changed to white. For details about how to preserve transparency across all image types, see [this demo](/demos/image-manipulation/properly-preserve-transparency-across-all-image-types/).
`),
    frame: z.number().int().min(1).nullable().default(null).describe(`
Use this parameter when dealing with animated GIF files to specify which frame of the GIF is used for the operation. Specify \`1\` to use the first frame, \`2\` to use the second, and so on. \`null\` means all frames.
`),
    colorspace: colorspaceSchema.optional().describe(`
Sets the image colorspace. For details about the available values, see the [ImageMagick documentation](https://www.imagemagick.org/script/command-line-options.php#colorspace). Please note that if you were using \`"RGB"\`, we recommend using \`"sRGB"\` instead as of 2014-02-04. ImageMagick might try to find the most efficient \`colorspace\` based on the color of an image, and default to e.g. \`"Gray"\`. To force colors, you might have to use this parameter in combination with \`type: "TrueColor"\`.
`),
    type: z
      .enum([
        '',
        'Bilevel',
        'ColorSeparation',
        'ColorSeparationAlpha',
        'Grayscale',
        'GrayscaleAlpha',
        'Palette',
        'PaletteAlpha',
        'TrueColor',
        'TrueColorAlpha',
      ])
      .optional().describe(`
Sets the image color type. For details about the available values, see the [ImageMagick documentation](https://www.imagemagick.org/script/command-line-options.php#type). If you're using \`colorspace\`, ImageMagick might try to find the most efficient based on the color of an image, and default to e.g. \`"Gray"\`. To force colors, you could e.g. set this parameter to \`"TrueColor"\`
`),
    sepia: z.number().int().min(0).max(99).nullable().default(null).describe(`
Applies a sepia tone effect in percent.
`),
    rotation: z
      .union([z.literal(90), z.literal(180), z.literal(270), z.literal(360), z.boolean()])
      .default(true).describe(`
Determines whether the image should be rotated. Use integers to specify the rotation for each quarter revolution(\`90\`, \`180\`, \`270\`, \`360\`). Use the value \`true\` to auto-rotate images that are rotated incorrectly or depend on EXIF rotation settings. Otherwise, use \`false\` to disable auto-fixing altogether.
`),
    compress: z
      .enum(['BZip', 'Fax', 'Group4', 'JPEG', 'JPEG2000', 'Lossless', 'LZW', 'None', 'RLE', 'Zip'])
      .nullable()
      .default(null).describe(`
Specifies pixel compression for when the image is written. Compression is disabled by default.

Please also take a look at [🤖/image/optimize](/docs/transcoding/image-manipulation/image-optimize/).
`),
    blur: z
      .string()
      .regex(/^\d+(\.\d+)?x\d+(\.\d+)?$/)
      .nullable()
      .default(null).describe(`
Specifies gaussian blur, using a value with the form \`{radius}x{sigma}\`. The radius value specifies the size of area the operator should look at when spreading pixels, and should typically be either \`"0"\` or at least two times the sigma value. The sigma value is an approximation of how many pixels the image is "spread"; think of it as the size of the brush used to blur the image. This number is a floating point value, enabling small values like \`"0.5"\` to be used.
`),
    blur_regions: z
      .array(
        z.object({
          // TODO: These types are not documented.
          x: complexWidthSchema,
          y: complexHeightSchema,
          width: complexWidthSchema,
          height: complexHeightSchema,
        })
      )
      .nullable()
      .default(null).describe(`
Specifies an array of ellipse objects that should be blurred on the image. Each object has the following keys: \`x\`, \`y\`, \`width\`, \`height\`.  If \`blur_regions\` has a value, then the \`blur\` parameter is used as the strength of the blur for each region.
`),
    // TODO: An int according to the docs, a float in the example
    brightness: z.number().min(0).default(1).describe(`
Increases or decreases the brightness of the image by using a multiplier. For example \`1.5\` would increase the brightness by 50%, and \`0.75\` would decrease the brightness by 25%.
`),
    // TODO: An int according to the docs, a float in the example
    saturation: z.number().min(0).default(1).describe(`
Increases or decreases the saturation of the image by using a multiplier. For example \`1.5\` would increase the saturation by 50%, and \`0.75\` would decrease the saturation by 25%.
`),
    hue: z.number().min(0).default(100).describe(`
Changes the hue by rotating the color of the image. The value \`100\` would produce no change whereas \`0\` and \`200\` will negate the colors in the image.
`),
    monochrome: z.boolean().default(false).describe(`
  Transforms the image to black and white.
`),
    watermark_url: z.string().optional(),
    watermark_position: positionSchema.default('center'),
    watermark_x_offset: z.number().int().default(0),
    watermark_y_offset: z.number().int().default(0),
    watermark_size: percentageSchema.optional(),
    watermark_resize_strategy: z.enum(['area', 'fit', 'min_fit', 'stretch']).default('fit'),
    text: z
      .array(
        z.object({
          // TODO: Determine valid fonts
          text: z.string(),
          font: z.string().default('Arial'),
          size: z.number().int().min(1).default(12),
          rotate: z.number().int().default(0),
          color: z.union([color_without_alpha, z.literal('transparent')]).default('#000000'),
          background_color: z
            .union([color_without_alpha, z.literal('transparent')])
            .default('transparent'),
          stroke_width: z.number().int().min(0).default(0),
          stroke_color: z
            .union([color_without_alpha, z.literal('transparent')])
            .default('transparent'),
          align: z.enum(['center', 'left', 'right']).default('center'),
          valign: z.enum(['bottom', 'center', 'top']).default('center'),
          x_offset: z.number().int().default(0),
          y_offset: z.number().int().default(0),
        })
      )
      .default([]).describe(`
An array of objects each containing text rules. The following text parameters are intended to be used as properties for your array of text overlays. Here is an example:

\`\`\`json
"watermarked": {
  "use": "resized",
  "robot": "/image/resize",
  "imagemagick_stack": "{{stacks.imagemagick.recommended_version}}",
  "text": [
    {
      "text": "© 2018 Transloadit.com",
      "size": 12,
      "font": "Ubuntu",
      "color": "#eeeeee",
      "valign": "bottom",
      "align": "right",
      "x_offset": 16,
      "y_offset": -10
    }
  ]
}
\`\`\`
`),
    progressive: z.boolean().default(false).describe(`
Interlaces the image if set to \`true\`, which makes the image load progressively in browsers. Instead of rendering the image from top to bottom, the browser will first show a low-res blurry version of the images which is then quickly replaced with the actual image as the data arrives. This greatly increases the user experience, but comes at a cost of a file size increase by around 10%.
`),
    transparent: z.union([color_without_alpha, z.string().regex(/^\d+,\d+,\d+$/)]).optional()
      .describe(`
Make this color transparent within the image. Example: \`"255,255,255"\`.
`),
    trim_whitespace: z.boolean().default(false).describe(`
This determines if additional whitespace around the image should first be trimmed away. If you set this to \`true\` this parameter removes any edges that are exactly the same color as the corner pixels.
`),
    clip: z.union([z.string(), z.boolean()]).default(false).describe(`
Apply the clipping path to other operations in the resize job, if one is present. If set to \`true\`, it will automatically take the first clipping path. If set to a String it finds a clipping path by that name.
`),
    negate: z.boolean().default(false).describe(`
Replace each pixel with its complementary color, effectively negating the image. Especially useful when testing clipping.
`),
    density: z
      .string()
      .regex(/\d+(x\d+)?/)
      .nullable()
      .default(null).describe(`
While in-memory quality and file format depth specifies the color resolution, the density of an image is the spatial (space) resolution of the image. That is the density (in pixels per inch) of an image and defines how far apart (or how big) the individual pixels are. It defines the size of the image in real world terms when displayed on devices or printed.

You can set this value to a specific \`width\` or in the format \`width\`x\`height\`.

If your converted image is unsharp, please try increasing density.
`),
    imagemagick_stack: imagemagickStackVersionSchema.optional(),
    // TODO: Add missing properties
  })
  .strict()

export const robotImageResizeInstructionsSchema =
  robotImageResizeInstructionsInterpolatedSchema.extend({
    width: robotImageResizeInstructionsInterpolatedSchema.shape.width.or(
      interpolationSchemaToYieldNumber
    ),
    height: robotImageResizeInstructionsInterpolatedSchema.shape.height.or(
      interpolationSchemaToYieldNumber
    ),
    background: robotImageResizeInstructionsInterpolatedSchema.shape.background.or(
      interpolationSchemaToYieldString
    ),
    resize_strategy: robotImageResizeInstructionsInterpolatedSchema.shape.resize_strategy.or(
      interpolationSchemaToYieldString
    ),
    blur_regions: robotImageResizeInstructionsInterpolatedSchema.shape.blur_regions.or(
      z.array(
        z.object({
          x: complexWidthSchema.or(interpolationSchemaToYieldNumber),
          y: complexHeightSchema.or(interpolationSchemaToYieldNumber),
          width: complexWidthSchema.or(interpolationSchemaToYieldNumber),
          height: complexHeightSchema.or(interpolationSchemaToYieldNumber),
        })
      )
    ),
  })

export type RobotImageResizeInstructions = z.infer<typeof robotImageResizeInstructionsSchema>
export type RobotImageResizeInstructionsInput = z.input<typeof robotImageResizeInstructionsSchema>
