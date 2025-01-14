import { z } from 'zod'

import {
  color_with_alpha,
  ffmpegParamSchema,
  ffmpegStackVersionSchema,
  outputMetaParamSchema,
  preset,
  resize_strategy,
  useParamSchema,
} from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: false,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  minimum_charge: 0,
  output_factor: 0.6,
  override_lvl1: 'Video Encoding',
  purpose_sentence:
    'composes a new video by adding an audio track to existing still image(s) or video',
  purpose_verb: 'merge',
  purpose_word: 'merge',
  purpose_words: 'Merge video, audio, images into one video',
  service_slug: 'video-encoding',
  slot_count: 60,
  title: 'Merge video, audio, images into one video',
  typical_file_size_mb: 80,
  typical_file_type: 'video',
}

export const robotVideoMergeInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/video/merge'),
    use: useParamSchema,
    output_meta: outputMetaParamSchema,
    preset: preset.describe(`
Generates the video according to [pre-configured video presets](/docs/transcoding/video-encoding/video-presets/).

If you specify your own FFmpeg parameters using the <dfn>Robot</dfn>'s \`ffmpeg\` parameter and you have not specified a preset, then the default \`"flash"\` preset is not applied. This is to prevent you from having to override each of the flash preset's values manually.
`),
    width: z.number().int().min(1).max(1920).optional().describe(`
Width of the new video, in pixels.

If the value is not specified and the \`preset\` parameter is available, the \`preset\`'s [supplied width](/docs/transcoding/video-encoding/video-presets/) will be implemented.
`),
    height: z.number().int().min(1).max(1080).optional().describe(`
Height of the new video, in pixels.

If the value is not specified and the \`preset\` parameter is available, the \`preset\`'s [supplied height](/docs/transcoding/video-encoding/video-presets/) will be implemented.
`),
    resize_strategy: resize_strategy.describe(`
If the given width/height parameters are bigger than the input image's dimensions, then the \`resize_strategy\` determines how the image will be resized to match the provided width/height. See the [available resize strategies](/docs/transcoding/image-manipulation/image-resize/#resize-strategies).
`),
    background: color_with_alpha.default('#00000000').describe(`
The background color of the resulting video the \`"rrggbbaa"\` format (red, green, blue, alpha) when used with the \`"pad"\` resize strategy. The default color is black.
`),
    framerate: z
      .string()
      .regex(/^\d+\/\d+$/)
      .default('1/5').describe(`
When merging images to generate a video this is the input framerate. A value of "1/5" means each image is given 5 seconds before the next frame appears (the inverse of a framerate of "5"). Likewise for "1/10", "1/20", etc. A value of "5" means there are 5 frames per second.
`),
    image_durations: z.array(z.number()).default([]).describe(`
When merging images to generate a video this allows you to define how long (in seconds) each image will be shown inside of the video. So if you pass 3 images and define \`[2.4, 5.6, 9]\` the first image will be shown for 2.4s, the second image for 5.6s and the last one for 9s. The \`duration\` parameter will automatically be set to the sum of the image_durations, so \`17\` in our example. It can still be overwritten, though, in which case the last image will be shown until the defined duration is reached.
`),
    duration: z.number().default(5).describe(`
When merging images to generate a video or when merging audio and video this is the desired target duration in seconds. The float value can take one decimal digit. If you want all images to be displayed exactly once, then you can set the duration according to this formula: \`duration = numberOfImages / framerate\`. This also works for the inverse framerate values like \`1/5\`.

If you set this value to \`null\` (default), then the duration of the input audio file will be used when merging images with an audio file.

When merging audio files and video files, the duration of the longest video or audio file is used by default.
`),
    audio_delay: z.number().default(0).describe(`
When merging a video and an audio file, and when merging images and an audio file to generate a video, this is the desired delay in seconds for the audio file to start playing. Imagine you merge a video file without sound and an audio file, but you wish the audio to start playing after 5 seconds and not immediately, then this is the parameter to use.
`),
    replace_audio: z.boolean().default(false).describe(`
Determines whether the audio of the video should be replaced with a provided audio file.
`),
    vstack: z.boolean().default(false).describe(`
Stacks the input media vertically. All streams need to have the same pixel format and width - so consider using a [/video/encode]({{robot_links["/video/encode"]}}) <dfn>Step</dfn> before using this parameter to enforce this.
`),
    ffmpeg_stack: ffmpegStackVersionSchema.optional(),
    ffmpeg: ffmpegParamSchema.optional(),
  })
  .strict()
export type RobotVideoMergeInstructions = z.infer<typeof robotVideoMergeInstructionsSchema>
