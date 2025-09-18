import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  color_with_alpha,
  interpolateRobot,
  resize_strategy,
  robotBase,
  robotFFmpegVideo,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
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
  uses_tools: ['ffmpeg'],
  name: 'VideoMergeRobot',
  priceFactor: 1,
  queueSlotCount: 60,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotVideoMergeInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegVideo)
  .extend({
    robot: z.literal('/video/merge'),
    resize_strategy: resize_strategy.describe(`
If the given width/height parameters are bigger than the input image's dimensions, then the \`resize_strategy\` determines how the image will be resized to match the provided width/height. See the [available resize strategies](/docs/topics/resize-strategies/).
`),
    background: color_with_alpha.default('#00000000').describe(`
The background color of the resulting video the \`"rrggbbaa"\` format (red, green, blue, alpha) when used with the \`"pad"\` resize strategy. The default color is black.
`),
    framerate: z
      .union([z.number().int().min(1), z.string().regex(/^\d+(?:\/\d+)?$/)])
      .default('1/5')
      .describe(`
When merging images to generate a video this is the input framerate. A value of "1/5" means each image is given 5 seconds before the next frame appears (the inverse of a framerate of "5"). Likewise for "1/10", "1/20", etc. A value of "5" means there are 5 frames per second.
`),
    image_durations: z
      .array(z.number())
      .default([])
      .describe(`
When merging images to generate a video this allows you to define how long (in seconds) each image will be shown inside of the video. So if you pass 3 images and define \`[2.4, 5.6, 9]\` the first image will be shown for 2.4s, the second image for 5.6s and the last one for 9s. The \`duration\` parameter will automatically be set to the sum of the image_durations, so \`17\` in our example. It can still be overwritten, though, in which case the last image will be shown until the defined duration is reached.
`),
    duration: z
      .number()
      .default(5)
      .describe(`
When merging images to generate a video or when merging audio and video this is the desired target duration in seconds. The float value can take one decimal digit. If you want all images to be displayed exactly once, then you can set the duration according to this formula: \`duration = numberOfImages / framerate\`. This also works for the inverse framerate values like \`1/5\`.

If you set this value to \`null\` (default), then the duration of the input audio file will be used when merging images with an audio file.

When merging audio files and video files, the duration of the longest video or audio file is used by default.
`),
    audio_delay: z
      .number()
      .default(0)
      .describe(`
When merging a video and an audio file, and when merging images and an audio file to generate a video, this is the desired delay in seconds for the audio file to start playing. Imagine you merge a video file without sound and an audio file, but you wish the audio to start playing after 5 seconds and not immediately, then this is the parameter to use.
`),
    loop: z
      .boolean()
      .default(false)
      .describe(`
  Determines whether the shorter media file should be looped to match the duration of the longer one. For example, if you merge a 1-minute video with a 3-minute audio file and enable this option, the video will play three times in a row to match the audio length.`),
    replace_audio: z
      .boolean()
      .default(false)
      .describe(`
Determines whether the audio of the video should be replaced with a provided audio file.
`),
    vstack: z
      .boolean()
      .default(false)
      .describe(`
Stacks the input media vertically. All streams need to have the same pixel format and width - so consider using a [/video/encode](/docs/robots/video-encode/) <dfn>Step</dfn> before using this parameter to enforce this.
`),
    image_url: z
      .string()
      .url()
      .optional()
      .describe(`
The URL of an image to be merged with the audio or video. When this parameter is provided, the robot will download the image from the URL and merge it with the other media.
`),
  })
  .strict()

export const robotVideoMergeInstructionsWithHiddenFieldsSchema =
  robotVideoMergeInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotVideoMergeInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotVideoMergeInstructions = z.infer<typeof robotVideoMergeInstructionsSchema>
export type RobotVideoMergeInstructionsWithHiddenFields = z.infer<
  typeof robotVideoMergeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotVideoMergeInstructionsSchema = interpolateRobot(
  robotVideoMergeInstructionsSchema,
)
export type InterpolatableRobotVideoMergeInstructions =
  InterpolatableRobotVideoMergeInstructionsInput

export type InterpolatableRobotVideoMergeInstructionsInput = z.input<
  typeof interpolatableRobotVideoMergeInstructionsSchema
>

export const interpolatableRobotVideoMergeInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotVideoMergeInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotVideoMergeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotVideoMergeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotVideoMergeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotVideoMergeInstructionsWithHiddenFieldsSchema
>
