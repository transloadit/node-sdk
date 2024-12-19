import { z } from 'zod'

import {
  color_with_optional_alpha,
  complexHeightSchema,
  complexWidthSchema,
  interpolationSchemaToYieldNumber,
  optimize_priority,
  resize_strategy,
  useParamSchema,
} from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  docs_redirect_from: ['/docs/media-preview/', '/docs/transcoding/media-cataloging/media-preview/'],
  example_code: {
    steps: {
      previewed: {
        robot: '/file/preview',
        use: ':original',
        height: 400,
        width: 300,
        format: 'png',
      },
    },
  },
  example_code_description: 'Generate a preview thumbnail for any uploaded file:',
  minimum_charge: 1048576,
  output_factor: 1,
  override_lvl1: 'Media Cataloging',
  purpose_sentence:
    'generates a thumbnail for any uploaded file to preview its content, similar to the thumbnails in desktop file managers',
  purpose_verb: 'generate',
  purpose_word: 'generate',
  purpose_words: 'Generate a preview thumbnail',
  service_slug: 'media-cataloging',
  slot_count: 15,
  title: 'Generate a preview thumbnail',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotFilePreviewInstructionsInterpolatedSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/file/preview'),
    use: useParamSchema,
    format: z.enum(['gif', 'jpg', 'png']).default('png').describe(`
The output format for the generated thumbnail image. If a short video clip is generated using the \`clip\` strategy, its format is defined by \`clip_format\`.
`),
    width: complexWidthSchema.default(300).describe(`
Width of the thumbnail, in pixels.
`),
    height: complexHeightSchema.default(200).describe(`
Height of the thumbnail, in pixels.
`),
    resize_strategy: resize_strategy.describe(`
To achieve the desired dimensions of the preview thumbnail, the <dfn>Robot</dfn> might have to resize the generated image. This happens, for example, when the dimensions of a frame extracted from a video do not match the chosen \`width\` and \`height\` parameters.

See the list of available [resize strategies](/docs/transcoding/image-manipulation/image-resize/#resize-strategies) for more details.
`),
    strategy: z
      .object({
        archive: z.array(z.string()).default(['icon']),
        audio: z.array(z.string()).default(['artwork', 'waveform', 'icon']),
        document: z.array(z.string()).default(['page', 'icon']),
        image: z.array(z.string()).default(['image', 'icon']),
        unknown: z.array(z.string()).default(['icon']),
        video: z.array(z.string()).default(['artwork', 'frame', 'icon']),
        webpage: z.array(z.string()).default(['render', 'icon']),
      })
      .optional().describe(`
Definition of the thumbnail generation process per file category. The parameter must be an object whose keys can be one of the file categories: \`audio\`, \`video\`, \`image\`, \`document\`, \`archive\`, \`webpage\`, and \`unknown\`. The corresponding value is an array of strategies for the specific file category. See the above section for a list of all available strategies.

For each file, the <dfn>Robot</dfn> will attempt to use the first strategy to generate the thumbnail. If this process fails (e.g., because no artwork is available in a video file), the next strategy is attempted. This is repeated until either a thumbnail is generated or the list is exhausted. Selecting the \`icon\` strategy as the last entry provides a fallback mechanism to ensure that an appropriate strategy is always available.

The parameter defaults to the following definition:

\`\`\`json
{
  "audio": ["artwork", "waveform", "icon"],
  "video": ["artwork", "frame", "icon"],
  "document": ["page", "icon"],
  "image": ["image", "icon"],
  "webpage": ["render", "icon"],
  "archive": ["icon"],
  "unknown": ["icon"]
}
\`\`\`
`),
    waveform_center_color: color_with_optional_alpha.default('#000000ff').describe(`
The color used in the center of the waveform's gradient. The format is \`#rrggbb[aa]\` (red, green, blue, alpha). Only used if the \`waveform\` strategy for audio files is applied.
`),
    waveform_outer_color: color_with_optional_alpha.default('#000000ff').describe(`
The color used in the outer parts of the waveform's gradient. The format is \`#rrggbb[aa]\` (red, green, blue, alpha). Only used if the \`waveform\` strategy for audio files is applied.
`),
    waveform_height: z.number().int().min(1).max(5000).default(100).describe(`
Height of the waveform, in pixels. Only used if the \`waveform\` strategy for audio files is applied. It can be utilized to ensure that the waveform only takes up a section of the preview thumbnail.
`),
    waveform_width: z.number().int().min(1).max(5000).default(300).describe(`
Width of the waveform, in pixels. Only used if the \`waveform\` strategy for audio files is applied. It can be utilized to ensure that the waveform only takes up a section of the preview thumbnail.
`),
    icon_style: z.enum(['square', 'with-text']).default('with-text').describe(`
The style of the icon generated if the \`icon\` strategy is applied. The default style, \`with-text\`, includes an icon showing the file type and a text box below it, whose content can be controlled by the \`icon_text_content\` parameter and defaults to the file extension (e.g. MP4, JPEG). The \`square\` style only includes a square variant of the icon showing the file type. Below are exemplary previews generated for a text file utilizing the different styles:

<br><br> <strong>\`with-text\` style:</strong> <br>
![Image with text style]({{site.asset_cdn}}/assets/images/file-preview/icon-with-text.png)
<br><br> <strong>\`square\` style:</strong> <br>
![Image with square style]({{site.asset_cdn}}/assets/images/file-preview/icon-square.png)
`),
    icon_text_color: color_with_optional_alpha.default('#a2a2a2').describe(`
The color of the text used in the icon. The format is \`#rrggbb[aa]\`. Only used if the \`icon\` strategy is applied.
`),
    // TODO: Determine the font enum.
    icon_text_font: z.string().default('Roboto').describe(`
The font family of the text used in the icon. Only used if the \`icon\` strategy is applied. [Here](/docs/supported-formats/fonts/) is a list of all supported fonts.
`),
    icon_text_content: z.enum(['extension', 'none']).default('extension').describe(`
The content of the text box in generated icons. Only used if the \`icon_style\` parameter is set to \`with-text\`. The default value, \`extension\`, adds the file extension (e.g. MP4, JPEG) to the icon. The value \`none\` can be used to render an empty text box, which is useful if no text should not be included in the raster image, but some place should be reserved in the image for later overlaying custom text over the image using HTML etc.
`),
    optimize: z.boolean().default(true).describe(`
Specifies whether the generated preview image should be optimized to reduce the image's file size while keeping their quaility. If enabled, the images will be optimized using [🤖/image/optimize](/docs/transcoding/image-manipulation/image-optimize/).
`),
    optimize_priority: optimize_priority.describe(`
Specifies whether conversion speed or compression ratio is prioritized when optimizing images. Only used if \`optimize\` is enabled. Please see the [🤖/image/optimize documentation](/docs/transcoding/image-manipulation/image-optimize/#param-priority) for more details.
`),
    optimize_progressive: z.boolean().default(false).describe(`
Specifies whether images should be interlaced, which makes the result image load progressively in browsers. Only used if \`optimize\` is enabled. Please see the [🤖/image/optimize documentation](/docs/transcoding/image-manipulation/image-optimize/#param-progressive) for more details.
`),
    clip_format: z.enum(['apng', 'avif', 'gif', 'webp']).default('webp').describe(`
The animated image format for the generated video clip. Only used if the \`clip\` strategy for video files is applied.

Please consult the [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types) for detailed information about the image formats and their characteristics. GIF enjoys the broadest support in software, but only supports a limit color palette. APNG supports a variety of color depths, but its lossless compression produces large images for videos. AVIF is a modern image format that offers great compression, but proper support for animations is still lacking in some browsers. WebP on the other hand, enjoys broad support while offering a great balance between small file sizes and good visual quality, making it the default clip format.
`),
    clip_offset: z.number().min(0).default(1).describe(`
The start position in seconds of where the clip is cut. Only used if the \`clip\` strategy for video files is applied. Be aware that for larger video only the first few MBs of the file may be imported to improve speed. Larger offsets may seek to a position outside of the imported part and thus fail to generate a clip.
`),
    clip_duration: z.number().min(0).default(5).describe(`
The duration in seconds of the generated video clip. Only used if the \`clip\` strategy for video files is applied. Be aware that a longer clip duration also results in a larger file size, which might be undesirable for previews.
`),
    clip_framerate: z.number().int().min(1).max(60).default(5).describe(`
The framerate of the generated video clip. Only used if the \`clip\` strategy for video files is applied. Be aware that a higher framerate appears smoother but also results in a larger file size, which might be undesirable for previews.
`),
    clip_loop: z.boolean().default(true).describe(`
Specifies whether the generated animated image should loop forever (\`true\`) or stop after playing the animation once (\`false\`). Only used if the \`clip\` strategy for video files is applied.
`),
  })
  .strict()

export const robotFilePreviewInstructionsSchema =
  robotFilePreviewInstructionsInterpolatedSchema.extend({
    width: robotFilePreviewInstructionsInterpolatedSchema.shape.width.or(
      interpolationSchemaToYieldNumber,
    ),
    height: robotFilePreviewInstructionsInterpolatedSchema.shape.height.or(
      interpolationSchemaToYieldNumber,
    ),
  })

export type RobotFilePreviewInstructions = z.infer<typeof robotFilePreviewInstructionsSchema>
export type RobotFilePreviewInstructionsInput = z.input<typeof robotFilePreviewInstructionsSchema>
