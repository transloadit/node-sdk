import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  color_with_alpha,
  complexHeightSchema,
  complexWidthSchema,
  createProcessingExample,
  defineRobot,
  imageQualityValueSchema,
  optimize_priority,
  resize_strategy,
  robotBase,
  robotMediaCatalogingMeta,
  robotUse,
} from './_instructions-primitives.ts'

/** Fallback order shared by schema defaults, published examples and worker normalization. */
export const filePreviewStrategyDefaults = {
  archive: ['icon'],
  audio: ['artwork', 'waveform', 'icon'],
  document: ['page', 'icon'],
  image: ['image', 'embedded-preview', 'icon'],
  unknown: ['icon'],
  video: ['artwork', 'frame', 'icon'],
  webpage: ['render', 'icon'],
}

export const meta: RobotMetaInput = {
  ...robotMediaCatalogingMeta,
  example_code: createProcessingExample('previewed', '/file/preview', {
    height: 400,
    width: 300,
    format: 'png',
  }),
  example_code_description: 'Generate a preview thumbnail for any uploaded file:',
  purpose_sentence:
    'generates a thumbnail for any uploaded file to preview its content, similar to the thumbnails in desktop file managers',
  purpose_verb: 'generate',
  purpose_word: 'generate',
  purpose_words: 'Generate a preview thumbnail',
  title: 'Generate a preview thumbnail',
  name: 'FilePreviewRobot',
  minimumCharge: 1048576,
  trackOutputFileSize: true,
  importRanges: ['0-19999999', '-1000000'],
  stage: 'beta',
}

export const robotFilePreviewInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/preview').describe(`
This <dfn>Robot</dfn>'s purpose is to generate a meaningful preview image for any file, in such a way that the resulting thumbnail highlights the file's content. The goal is not to losslessly present the original media in a smaller way. Instead, it is to maximize the chance of a person recognizing the media at a glance, while being visually pleasing and consistent with other previews. The generation process depends on the file type. For example, the <dfn>Robot</dfn> can extract artwork from media files, frames from videos, generate a waveform for audio files, and preview the content of documents and images. The [\`strategy\` parameter](#strategy) lists the available strategies and controls their fallback order.

With the default strategy configuration, a generic icon is the fallback when no file-specific thumbnail can be generated. The default \`with-text\` icon style includes the file extension; \`icon_style\` and \`icon_text_content\` control its appearance.

The default parameters produce still previews at the configured dimensions and format for integration into your application's UI. The optional \`clip\` strategy produces animated previews using \`clip_format\`. Preview images are optimized by default to reduce their file size while maintaining visual quality.
`),
    format: z
      .enum(['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp'])
      .default('png')
      .describe(`
The output format for the generated thumbnail image. If a short video clip is generated using the \`clip\` strategy, its format is defined by \`clip_format\`.
`),
    quality: imageQualityValueSchema.optional().describe(`
Compression quality for still previews, from 1 to 100. When specified, the final image resize encodes directly into the requested format at this quality and strips embedded metadata. Omit it to retain the default encoding behavior. Animated clips use their own encoding settings. If \`optimize\` is enabled, optimization runs after this encoding.
`),
    width: complexWidthSchema.default(300).describe(`
Width of the thumbnail, in pixels.
`),
    height: complexHeightSchema.default(200).describe(`
Height of the thumbnail, in pixels.
`),
    resize_strategy: resize_strategy.describe(`
To achieve the desired dimensions of the preview thumbnail, the <dfn>Robot</dfn> might have to resize the generated image. This happens, for example, when the dimensions of a frame extracted from a video do not match the chosen \`width\` and \`height\` parameters.

See the list of available [resize strategies](/docs/topics/resize-strategies/) for more details.
`),
    background: color_with_alpha.default('#ffffffff').describe(`
The hexadecimal code of the color used to fill the background (only used for the pad resize strategy). The format is \`#rrggbb[aa]\` (red, green, blue, alpha). Use \`#00000000\` for a transparent padding.
`),
    zoom: z
      .boolean()
      .default(true)
      .describe(`
If set to \`false\`, smaller images will not be stretched to the desired \`width\` and \`height\`. This is useful if you want to retain the original image dimensions and only limit the output to a maximum size. For details about the impact of zooming for your preferred resize strategy, see the list of available [resize strategies](/docs/topics/resize-strategies/).

Note that this parameter only affects strategies that produce a still image. Animated clips generated by the \`clip\` strategy are not affected.
`),
    strategy: z
      .object({
        archive: z.array(z.string()).default(filePreviewStrategyDefaults.archive),
        audio: z.array(z.string()).default(filePreviewStrategyDefaults.audio),
        document: z.array(z.string()).default(filePreviewStrategyDefaults.document),
        image: z.array(z.string()).default(filePreviewStrategyDefaults.image),
        unknown: z.array(z.string()).default(filePreviewStrategyDefaults.unknown),
        video: z.array(z.string()).default(filePreviewStrategyDefaults.video),
        webpage: z.array(z.string()).default(filePreviewStrategyDefaults.webpage),
      })
      .optional()
      .describe(`
Definition of the thumbnail generation process per file category. Each key selects a file category and its value is an ordered array of strategies:

| File category | Available strategies |
|---------------|----------------------|
| \`audio\` | \`artwork\`, \`waveform\`, \`icon\` |
| \`video\` | \`artwork\`, \`frame\`, \`clip\`, \`icon\` |
| \`image\` | \`image\`, \`embedded-preview\`, \`icon\` |
| \`document\` | \`page\`, \`icon\` |
| \`archive\` | \`icon\` |
| \`webpage\` | \`render\`, \`icon\` |
| \`unknown\` | \`icon\` |

\`artwork\` extracts embedded artwork, \`waveform\` draws an audio waveform, \`frame\` extracts a video frame, and \`clip\` creates an animated video preview. For images, \`image\` resizes the original and \`embedded-preview\` extracts an embedded preview when available. \`page\` renders the first document page, \`render\` captures a webpage, and \`icon\` generates a file-type icon.

For each file, the <dfn>Robot</dfn> will attempt to use the first strategy to generate the thumbnail. If this process fails (e.g., because no artwork is available in a video file), the next strategy is attempted. This is repeated until either a thumbnail is generated or the list is exhausted. Selecting the \`icon\` strategy as the last entry provides a fallback mechanism to ensure that an appropriate strategy is always available.

The parameter defaults to the following definition:

\`\`\`json
${JSON.stringify(filePreviewStrategyDefaults, null, 2)}
\`\`\`
`),
    artwork_outer_color: color_with_alpha.optional().describe(`
  The color used in the outer parts of the artwork's gradient.
  `),
    artwork_center_color: color_with_alpha.optional().describe(`
  The color used in the center of the artwork's gradient.
  `),
    waveform_center_color: color_with_alpha.default('#000000ff').describe(`
The color used in the center of the waveform's gradient. The format is \`#rrggbb[aa]\` (red, green, blue, alpha). Only used if the \`waveform\` strategy for audio files is applied.
`),
    waveform_outer_color: color_with_alpha.default('#000000ff').describe(`
The color used in the outer parts of the waveform's gradient. The format is \`#rrggbb[aa]\` (red, green, blue, alpha). Only used if the \`waveform\` strategy for audio files is applied.
`),
    waveform_height: z
      .number()
      .int()
      .min(1)
      .max(5000)
      .default(100)
      .describe(`
Height of the waveform, in pixels. Only used if the \`waveform\` strategy for audio files is applied. It can be utilized to ensure that the waveform only takes up a section of the preview thumbnail.
`),
    waveform_width: z
      .number()
      .int()
      .min(1)
      .max(5000)
      .default(300)
      .describe(`
Width of the waveform, in pixels. Only used if the \`waveform\` strategy for audio files is applied. It can be utilized to ensure that the waveform only takes up a section of the preview thumbnail.
`),
    icon_style: z
      .enum(['square', 'with-text'])
      .default('with-text')
      .describe(`
The style of the icon generated if the \`icon\` strategy is applied. The default style, \`with-text\`, includes an icon showing the file type and a text box below it, whose content can be controlled by the \`icon_text_content\` parameter and defaults to the file extension (e.g. MP4, JPEG). The \`square\` style only includes a square variant of the icon showing the file type. Below are exemplary previews generated for a text file utilizing the different styles:

<br /><br /> <strong>\`with-text\` style:</strong> <br />
![Image with text style]({{site.asset_cdn}}/assets/images/file-preview/icon-with-text.png)
<br /><br /> <strong>\`square\` style:</strong> <br />
![Image with square style]({{site.asset_cdn}}/assets/images/file-preview/icon-square.png)
`),
    icon_text_color: color_with_alpha.default('#a2a2a2').describe(`
The color of the text used in the icon. The format is \`#rrggbb[aa]\`. Only used if the \`icon\` strategy is applied.
`),
    // TODO: Determine the font enum.
    icon_text_font: z
      .string()
      .default('Roboto')
      .describe(`
The font family of the text used in the icon. Only used if the \`icon\` strategy is applied. [Here](/docs/supported-formats/fonts/) is a list of all supported fonts.
`),
    icon_text_content: z
      .enum(['extension', 'none'])
      .default('extension')
      .describe(`
The content of the text box in generated icons. Only used if the \`icon_style\` parameter is set to \`with-text\`. The default value, \`extension\`, adds the file extension (e.g. MP4, JPEG) to the icon. The value \`none\` leaves the text box empty while reserving space for a custom text overlay, for example using HTML in your application.
`),
    optimize: z
      .boolean()
      .default(true)
      .describe(`
Specifies whether the generated preview image should be optimized to reduce its file size while maintaining visual quality. If enabled, the image will be optimized using [🤖/image/optimize](/docs/robots/image-optimize/).
`),
    optimize_priority: optimize_priority.default('conversion-speed').describe(`
Specifies whether conversion speed or compression ratio is prioritized when optimizing images. Only used if \`optimize\` is enabled. Please see the [🤖/image/optimize documentation](/docs/robots/image-optimize/#priority) for more details.
`),
    optimize_progressive: z
      .boolean()
      .default(false)
      .describe(`
Specifies whether images should be interlaced, which makes the result image load progressively in browsers. Only used if \`optimize\` is enabled. Please see the [🤖/image/optimize documentation](/docs/robots/image-optimize/#progressive) for more details.
`),
    clip_format: z
      .enum(['apng', 'avif', 'gif', 'webp'])
      .default('webp')
      .describe(`
The animated image format for the generated video clip. Only used if the \`clip\` strategy for video files is applied.

Please consult the [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types) for detailed information about the image formats and their characteristics. GIF enjoys broad support in software, but only supports a limited color palette. APNG supports a variety of color depths, but its lossless compression produces large images for videos. AVIF offers efficient compression, but animation support varies between browsers. WebP offers a balance between small file sizes and visual quality and is the default clip format.
`),
    clip_offset: z
      .number()
      .min(0)
      .default(1)
      .describe(`
The start position in seconds of where the clip is cut. Only used if the \`clip\` strategy for video files is applied. For large videos, only portions of the file may be imported to improve speed. An offset outside the available media data can prevent clip generation.
`),
    clip_duration: z
      .number()
      .min(0)
      .default(5)
      .describe(`
The duration in seconds of the generated video clip. Only used if the \`clip\` strategy for video files is applied. Be aware that a longer clip duration also results in a larger file size, which might be undesirable for previews.
`),
    clip_framerate: z
      .number()
      .int()
      .min(1)
      .max(60)
      .default(5)
      .describe(`
The framerate of the generated video clip. Only used if the \`clip\` strategy for video files is applied. Be aware that a higher framerate appears smoother but also results in a larger file size, which might be undesirable for previews.
`),
    clip_loop: z
      .boolean()
      .default(true)
      .describe(`
Specifies whether the generated animated image should loop forever (\`true\`) or stop after playing the animation once (\`false\`). Only used if the \`clip\` strategy for video files is applied.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotFilePreviewInstructionsSchema.shape> =
  defineRobot(meta, robotFilePreviewInstructionsSchema)

export const {
  withHiddenFields: robotFilePreviewInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotFilePreviewInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotFilePreviewInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotFilePreviewInstructions = Instructions['output']
export type RobotFilePreviewInstructionsInput = Instructions['input']
export type RobotFilePreviewInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotFilePreviewInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotFilePreviewInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotFilePreviewInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotFilePreviewInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
