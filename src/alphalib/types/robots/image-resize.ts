import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  color_without_alpha_with_named,
  colorspaceSchema,
  complexHeightSchema,
  complexWidthSchema,
  imageQualitySchema,
  interpolateRobot,
  percentageSchema,
  positionSchema,
  robotBase,
  robotImagemagick,
  robotUse,
  unsafeCoordinatesSchema,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
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
  uses_tools: ['imagemagick'],
  name: 'ImageResizeRobot',
  priceFactor: 1,
  queueSlotCount: 5,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const oneTextSchema = z.object({
  // TODO: Determine valid fonts
  text: z.string(),
  font: z
    .string()
    .default('Arial')
    .describe(`
The font family to use. Also includes boldness and style of the font.

[Here](/docs/supported-formats/fonts/) is a list of all
supported fonts.
`),
  size: z
    .number()
    .int()
    .min(1)
    .default(12)
    .describe(`
The text size in pixels.
`),
  rotate: z
    .number()
    .int()
    .default(0)
    .describe(`
The rotation angle in degrees.
`),
  color: color_without_alpha_with_named.default('#000000').describe(`
The text color. All hex colors in the form \`"#xxxxxx"\` are supported, where each x can be \`0-9\` or \`a-f\`. Named colors like \`"black"\`, \`"white"\`, \`"transparent"\` etc. are also supported. If you want a transparent text color, use "stroke" instead, otherwise your text will not be visible.
`),
  background_color: color_without_alpha_with_named.default('transparent').describe(`
The background color behind the text. All hex colors in the form \`"#xxxxxx"\` are supported, where each x can be \`0-9\` or \`a-f\`. Named colors like \`"black"\`, \`"white"\`, \`"transparent"\` etc. are also supported.
`),
  stroke_width: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(`
The stroke's width in pixels.
`),
  stroke_color: color_without_alpha_with_named.default('transparent').describe(`
The stroke's color. All hex colors in the form \`"#xxxxxx"\` are supported, where each x can be \`0-9\` or \`a-f\`. Named colors like \`"black"\`, \`"white"\`, \`"transparent"\` etc. are also supported.
`),
  align: z
    .enum(['center', 'left', 'right'])
    .default('center')
    .describe(`
The horizontal text alignment. Can be \`"left"\`, \`"center"\` and \`"right"\`.
`),
  valign: z
    .enum(['bottom', 'center', 'top'])
    .default('center')
    .describe(`
The vertical text alignment. Can be \`"top"\`, \`"center"\` and \`"bottom"\`.
`),
  x_offset: z
    .number()
    .int()
    .default(0)
    .describe(`
The horizontal offset for the text in pixels that is added (positive integer) or removed (negative integer) from the horizontal alignment.
`),
  y_offset: z
    .number()
    .int()
    .default(0)
    .describe(`
The vertical offset for the text in pixels that is added (positive integer) or removed (negative integer) from the vertical alignment.
`),
})

const TEXT_DESCRIPTION = `
Text overlays to be applied to the image. Can be either a single text object or an array of text objects. Each text object contains text rules. The following text parameters are intended to be used as properties for your text overlays. Here is an example:

\`\`\`json
"watermarked": {
  "use": "resized",
  "robot": "/image/resize",
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
\`\`\``

export const robotImageResizeInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotImagemagick)
  .extend({
    robot: z.literal('/image/resize'),
    // TODO: Use an enum
    format: z
      .string()
      .nullable()
      .default(null)
      .describe(`
The output format for the modified image.

Some of the most important available formats are \`"jpg"\`, \`"png"\`, \`"gif"\`, and \`"tiff"\`. For a complete lists of all formats that we can write to please check [our supported image formats list](/docs/supported-formats/image-formats/).

If \`null\` (default), then the input image's format will be used as the output format.

If you wish to convert to \`"pdf"\`, please consider [🤖/document/convert](/docs/robots/document-convert/) instead.
`),
    width: complexWidthSchema.optional().describe(`
Width of the result in pixels. If not specified, will default to the width of the original.
`),
    height: complexHeightSchema.optional().describe(`
Height of the new image, in pixels. If not specified, will default to the height of the input image.
`),
    resize_strategy: z
      .union([
        z
          .literal('crop')
          .describe(`Cuts an area out of an image, discarding any overlapping parts. If the source image is smaller than the crop frame, it will be zoomed. This strategy is implied when you specify coordinates in the \`crop\` parameter, and cannot be used without it.

To crop around human faces, see [🤖/image/facedetect](https://transloadit.com/docs/robots/image-facedetect/) instead.`),
        z
          .literal('fillcrop')
          .describe(`Scales the image to fit into our 100×100 target while preserving aspect ratio, while trimming away any excess surface. This means both sides will become exactly 100 pixels, at the tradeoff of destroying parts of the image.

By default the resulting image is horizontally/vertically centered to fill the target rectangle. Use the \`gravity\` parameter to change where to crop the image, such as \`"bottom\`" or \`"left\`".`),
        z
          .literal('fit')
          .describe(`Uses the larger side of the original image as a base for the resize. Aspect ratio is preserved. Either side will become at most 100 pixels.

For example: resizing a 400×300 image into 100×100, would produce a 100×75 image.`),
        z
          .literal('min_fit')
          .describe(`Uses the **smaller** side of the original image as a base for the resize. After resizing, the larger side will have a larger value than specified. Aspect ratio is preserved. Either side will become at least 100 pixels.

For example: resizing a 400×300 image into 100×100, would produce a 133×100 image.`),
        z
          .literal('pad')
          .describe(`Scales the image to fit while preserving aspect ratio. Both sides of the resized image become exactly 100 pixels, and any remaining surface is filled with a background color.

In this example, the background color is determined by the [Assembly Variable](https://transloadit.com/docs/topics/assembly-instructions/#assembly-variables) \`\${file.meta.average_color}\`. If you set \`zoom\` to \`false\` (default is \`true\`), smaller images will be centered horizontally and vertically, and have the background padding all around them.`),
        z
          .literal('stretch')
          .describe(
            'Ignores aspect ratio, resizing the image to the exact width and height specified. This may result in a stretched or distorted image.',
          ),
      ])
      .default('fit')
      .describe(`
See the list of available [resize strategies](/docs/topics/resize-strategies/).
`),
    zoom: z
      .boolean()
      .default(true)
      .describe(`
If this is set to \`false\`, smaller images will not be stretched to the desired width and height. For details about the impact of zooming for your preferred resize strategy, see the list of available [resize strategies](/docs/topics/resize-strategies/).
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
"{\\"x1\\": <Integer>, \\"y1\\": <Integer>, \\"x2\\": <Integer>, \\"y2\\": <Integer>}"
\`\`\`

To crop around human faces, see [🤖/image/facedetect](/docs/robots/image-facedetect/).
`),
    gravity: positionSchema.default('center').describe(`
The direction from which the image is to be cropped, when \`"resize_strategy"\` is set to \`"crop"\`, but no crop coordinates are defined.
`),
    strip: z
      .boolean()
      .default(false)
      .describe(`
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
      .optional()
      .describe(`
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
      .optional()
      .describe(`
Gives control of the alpha/matte channel of an image before applying the clipping path via \`clip: true\`.
`),
    flatten: z
      .boolean()
      .default(true)
      .describe(`
Flattens all layers onto the specified background to achieve better results from transparent formats to non-transparent formats, as explained in the [ImageMagick documentation](https://www.imagemagick.org/script/command-line-options.php#layers).

To preserve animations, GIF files are not flattened when this is set to \`true\`. To flatten GIF animations, use the \`frame\` parameter.
`),
    correct_gamma: z
      .boolean()
      .default(false)
      .describe(`
Prevents gamma errors [common in many image scaling algorithms](https://www.4p8.com/eric.brasseur/gamma.html).
`),
    quality: imageQualitySchema,
    adaptive_filtering: z
      .boolean()
      .default(false)
      .describe(`
Controls the image compression for PNG images. Setting to \`true\` results in smaller file size, while increasing processing time. It is encouraged to keep this option disabled.
`),
    background: color_without_alpha_with_named.default('#FFFFFF').describe(`
Either the hexadecimal code or [name](https://www.imagemagick.org/script/color.php#color_names) of the color used to fill the background (used for the \`pad\` resize strategy).

**Note:** By default, the background of transparent images is changed to white. To preserve transparency, set \`"background"\` to \`"none"\`.
`),
    frame: z
      .number()
      .int()
      .min(1)
      .nullable()
      .default(null)
      .describe(`
Use this parameter when dealing with animated GIF files to specify which frame of the GIF is used for the operation. Specify \`1\` to use the first frame, \`2\` to use the second, and so on. \`null\` means all frames.
`),
    colorspace: colorspaceSchema.optional().describe(`
Sets the image colorspace. For details about the available values, see the [ImageMagick documentation](https://www.imagemagick.org/script/command-line-options.php#colorspace). Please note that if you were using \`"RGB"\`, we recommend using \`"sRGB"\` instead as of 2014-02-04. ImageMagick might try to find the most efficient \`colorspace\` based on the color of an image, and default to e.g. \`"Gray"\`. To force colors, you might have to use this parameter in combination with \`type: "TrueColor"\`.
`),
    type: z
      .enum([
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
      .optional()
      .describe(`
Sets the image color type. For details about the available values, see the [ImageMagick documentation](https://www.imagemagick.org/script/command-line-options.php#type). If you're using \`colorspace\`, ImageMagick might try to find the most efficient based on the color of an image, and default to e.g. \`"Gray"\`. To force colors, you could e.g. set this parameter to \`"TrueColor"\`
`),
    sepia: z
      .number()
      .int()
      .min(0)
      .max(99)
      .nullable()
      .default(null)
      .describe(`
Applies a sepia tone effect in percent.
`),
    rotation: z
      .union([
        z.number(), // Support any numeric rotation value (including precise angles like 2.9)
        z.boolean(),
        z.literal('auto'), // Support 'auto' string value
      ])
      .default(true)
      .describe(`
Determines whether the image should be rotated. Use any number to specify the rotation angle in degrees (e.g., \`90\`, \`180\`, \`270\`, \`360\`, or precise values like \`2.9\`). Use the value \`true\` or \`"auto"\` to auto-rotate images that are rotated incorrectly or depend on EXIF rotation settings. Otherwise, use \`false\` to disable auto-fixing altogether.
`),
    compress: z
      .enum(['BZip', 'Fax', 'Group4', 'JPEG', 'JPEG2000', 'Lossless', 'LZW', 'None', 'RLE', 'Zip'])
      .nullable()
      .default(null)
      .describe(`
Specifies pixel compression for when the image is written. Compression is disabled by default.

Please also take a look at [🤖/image/optimize](/docs/robots/image-optimize/).
`),
    blur: z
      .string()
      .regex(/^\d+(\.\d+)?x\d+(\.\d+)?$/)
      .nullable()
      .default(null)
      .describe(`
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
        }),
      )
      .nullable()
      .default(null)
      .describe(`
Specifies an array of ellipse objects that should be blurred on the image. Each object has the following keys: \`x\`, \`y\`, \`width\`, \`height\`.  If \`blur_regions\` has a value, then the \`blur\` parameter is used as the strength of the blur for each region.
`),
    // TODO: An int according to the docs, a float in the example
    brightness: z
      .number()
      .min(0)
      .default(1)
      .describe(`
Increases or decreases the brightness of the image by using a multiplier. For example \`1.5\` would increase the brightness by 50%, and \`0.75\` would decrease the brightness by 25%.
`),
    // TODO: An int according to the docs, a float in the example
    saturation: z
      .number()
      .min(0)
      .default(1)
      .describe(`
Increases or decreases the saturation of the image by using a multiplier. For example \`1.5\` would increase the saturation by 50%, and \`0.75\` would decrease the saturation by 25%.
`),
    hue: z
      .number()
      .min(0)
      .default(100)
      .describe(`
Changes the hue by rotating the color of the image. The value \`100\` would produce no change whereas \`0\` and \`200\` will negate the colors in the image.
`),
    watermark_url: z
      .string()
      .optional()
      .describe(`
A URL indicating a PNG image to be overlaid above this image. Please note that you can also  [supply the watermark via another Assembly Step](/docs/topics/use-parameter/#supplying-the-watermark-via-an-assembly-step). With watermarking you can add an image onto another image. This is usually used for logos.
`),
    watermark_position: z
      .union([positionSchema, z.array(positionSchema)])
      .default('center')
      .describe(`
The position at which the watermark is placed. The available options are \`"center"\`, \`"top"\`, \`"bottom"\`, \`"left"\`, and \`"right"\`. You can also combine options, such as \`"bottom-right"\`.

An array of possible values can also be specified, in which case one value will be selected at random, such as \`[ "center", "left", "bottom-left", "bottom-right" ]\`.

This setting puts the watermark in the specified corner. To use a specific pixel offset for the watermark, you will need to add the padding to the image itself.
`),
    watermark_x_offset: z
      .number()
      .int()
      .default(0)
      .describe(`
The x-offset in number of pixels at which the watermark will be placed in relation to the position it has due to \`watermark_position\`.

Values can be both positive and negative and yield different results depending on the \`watermark_position\` parameter. Positive values move the watermark closer to the image's center point, whereas negative values move the watermark further away from the image's center point.
`),
    watermark_y_offset: z
      .number()
      .int()
      .default(0)
      .describe(`
The y-offset in number of pixels at which the watermark will be placed in relation to the position it has due to \`watermark_position\`.

Values can be both positive and negative and yield different results depending on the \`watermark_position\` parameter. Positive values move the watermark closer to the image's center point, whereas negative values move the watermark further away from the image's center point.
`),
    watermark_size: percentageSchema.optional().describe(`
The size of the watermark, as a percentage.

For example, a value of \`"50%"\` means that size of the watermark will be 50% of the size of image on which it is placed. The exact sizing depends on \`watermark_resize_strategy\`, too.
`),
    watermark_resize_strategy: z
      .enum(['area', 'fit', 'min_fit', 'stretch'])
      .default('fit')
      .describe(`
Available values are \`"fit"\`, \`"min_fit"\`, \`"stretch"\` and \`"area"\`.

To explain how the resize strategies work, let's assume our target image size is 800×800 pixels and our watermark image is 400×300 pixels. Let's also assume, the \`watermark_size\` parameter is set to \`"25%"\`.

For the \`"fit"\` resize strategy, the watermark is scaled so that the longer side of the watermark takes up 25% of the corresponding image side. And the other side is scaled according to the aspect ratio of the watermark image. So with our watermark, the width is the longer side, and 25% of the image size would be 200px. Hence, the watermark would be resized to 200×150 pixels. If the \`watermark_size\` was set to \`"50%"\`, it would be resized to 400×300 pixels (so just left at its original size).

For the \`"min_fit"\` resize strategy, the watermark is scaled so that the shorter side of the watermark takes up 25% of the corresponding image side. And the other side is scaled according to the aspect ratio of the watermark image. So with our watermark, the height is the shorter side, and 25% of the image size would be 200px. Hence, the watermark would be resized to 267×200 pixels. If the \`watermark_size\` was set to \`"50%"\`, it would be resized to 533×400 pixels (so larger than its original size).

For the \`"stretch"\` resize strategy, the watermark is stretched (meaning, it is resized without keeping its aspect ratio in mind) so that both sides take up 25% of the corresponding image side. Since our image is 800×800 pixels, for a watermark size of 25% the watermark would be resized to 200×200 pixels. Its height would appear stretched, because keeping the aspect ratio in mind it would be resized to 200×150 pixels instead.

For the \`"area"\` resize strategy, the watermark is resized (keeping its aspect ratio in check) so that it covers \`"xx%"\` of the image's surface area. The value from \`watermark_size\` is used for the percentage area size.
`),
    text: z
      .union([
        // Support single text object (backward compatibility)
        oneTextSchema,
        // Support array of text objects (current schema)
        z.array(oneTextSchema),
      ])
      .optional()
      .describe(TEXT_DESCRIPTION),
    progressive: z
      .boolean()
      .default(false)
      .describe(`
Interlaces the image if set to \`true\`, which makes the image load progressively in browsers. Instead of rendering the image from top to bottom, the browser will first show a low-res blurry version of the images which is then quickly replaced with the actual image as the data arrives. This greatly increases the user experience, but comes at a cost of a file size increase by around 10%.
`),
    transparent: z
      .union([color_without_alpha_with_named, z.string().regex(/^\d+,\d+,\d+$/)])
      .optional()
      .describe(`
Make this color transparent within the image. Example: \`"255,255,255"\`.
`),
    trim_whitespace: z
      .boolean()
      .default(false)
      .describe(`
This determines if additional whitespace around the image should first be trimmed away. If you set this to \`true\` this parameter removes any edges that are exactly the same color as the corner pixels.
`),
    clip: z
      .union([z.string(), z.boolean()])
      .default(false)
      .describe(`
Apply the clipping path to other operations in the resize job, if one is present. If set to \`true\`, it will automatically take the first clipping path. If set to a String it finds a clipping path by that name.
`),
    negate: z
      .boolean()
      .default(false)
      .describe(`
Replace each pixel with its complementary color, effectively negating the image. Especially useful when testing clipping.
`),
    density: z
      .string()
      .regex(/\d+(x\d+)?/)
      .nullable()
      .default(null)
      .describe(`
While in-memory quality and file format depth specifies the color resolution, the density of an image is the spatial (space) resolution of the image. That is the density (in pixels per inch) of an image and defines how far apart (or how big) the individual pixels are. It defines the size of the image in real world terms when displayed on devices or printed.

You can set this value to a specific \`width\` or in the format \`width\`x\`height\`.

If your converted image is unsharp, please try increasing density.
`),
    monochrome: z
      .boolean()
      .default(false)
      .describe(`
Transform the image to black and white. This is a shortcut for setting the colorspace to Gray and type to Bilevel.
`),
    shave: z
      .union([
        z.string().regex(/^\d+(x\d+)?$/),
        z
          .number()
          .int()
          .min(0)
          .transform(String), // Accept numbers and convert to string
      ])
      .optional()
      .describe(`
Shave pixels from the image edges. The value should be in the format \`width\` or \`width\`x\`height\` to specify the number of pixels to remove from each side.
`),
  })
  .strict()

export const robotImageResizeInstructionsWithHiddenFieldsSchema =
  robotImageResizeInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotImageResizeInstructionsSchema.shape.result])
      .optional(),
    stack: z.string().optional().describe('Legacy parameter, use imagemagick_stack instead'),
    text: z
      .union([
        // Support single text object (backward compatibility)
        oneTextSchema.extend({
          gravity: positionSchema
            .default('top-left')
            .optional()
            .describe(`
            Legacy. The direction from which to start the offsets.
            `),
        }),
        // Support array of text objects (current schema)
        z.array(
          oneTextSchema.extend({
            gravity: positionSchema
              .default('top-left')
              .optional()
              .describe(`
              Legacy. The direction from which to start the offsets.
              `),
          }),
        ),
      ])
      .optional()
      .describe(TEXT_DESCRIPTION),
    watermark_position_x: z
      .number()
      .int()
      .optional()
      .describe(`
      Legacy alias for \`watermark_x_offset\`. The x-offset in number of pixels at which the watermark will be placed.
      `),
    watermark_position_y: z
      .number()
      .int()
      .optional()
      .describe(`
      Legacy alias for \`watermark_y_offset\`. The y-offset in number of pixels at which the watermark will be placed.
      `),
  })

export type RobotImageResizeInstructions = z.infer<typeof robotImageResizeInstructionsSchema>
export type RobotImageResizeInstructionsWithHiddenFields = z.infer<
  typeof robotImageResizeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotImageResizeInstructionsSchema = interpolateRobot(
  robotImageResizeInstructionsSchema,
)
export type InterpolatableRobotImageResizeInstructions =
  InterpolatableRobotImageResizeInstructionsInput

export type InterpolatableRobotImageResizeInstructionsInput = z.input<
  typeof interpolatableRobotImageResizeInstructionsSchema
>

export const interpolatableRobotImageResizeInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotImageResizeInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotImageResizeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotImageResizeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotImageResizeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotImageResizeInstructionsWithHiddenFieldsSchema
>
