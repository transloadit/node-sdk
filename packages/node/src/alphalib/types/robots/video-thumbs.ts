import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import {
  color_with_alpha,
  createProcessingExample,
  defineRobot,
  percentageSchema,
  resize_strategy,
  robotBase,
  robotFFmpeg,
  robotUse,
  robotVideoEncodingMeta,
} from './_instructions-primitives.ts'

/** Markup over the AI provider cost for smart thumbnail selection. */
export const smartThumbnailMarkupPercent = 50

const thumbnailCountSchema = z.number().int().min(1).max(999).default(8)
const smartMaximumCandidatesSchema = z.number().int().min(2).max(100).default(20)
const defaultThumbnailCount = thumbnailCountSchema.parse(undefined)
const defaultSmartMaximumCandidates = smartMaximumCandidatesSchema.parse(undefined)

/** Candidate-pool size shared by smart thumbnail execution and its documented default example. */
export function getSmartThumbnailCandidateCount(count: number, maximumCandidates: number): number {
  return Math.max(count, Math.min(maximumCandidates, count * 3))
}

export const meta: RobotMetaInput = {
  ...robotVideoEncodingMeta,
  example_code: createProcessingExample('thumbnailed', '/video/thumbs', {
    count: 3,
    ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
    smart: true,
    smart_max_candidates: 12,
  }),
  example_code_description:
    'Select three visually appealing thumbnails from each uploaded video with AI:',
  purpose_sentence: 'extracts any number of images from videos for use as previews',
  purpose_verb: 'extract',
  purpose_word: 'thumbnail',
  purpose_words: 'Extract thumbnails from videos',
  title: 'Extract thumbnails from videos',
  uses_tools: ['ffmpeg'],
  name: 'VideoThumbsRobot',
  priceFactor: 10,
  queueSlotCount: 15,
}

export const robotVideoThumbsInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpeg)
  .extend({
    robot: z.literal('/video/thumbs').describe(`
Set \`smart: true\` to select strong preview images with AI instead of taking frames only at regular intervals. The Robot scores candidate frames for clarity, brightness, composition, faces, expressions, action, and visual interest, then returns the best \`count\` frames in chronological order. Smart results include \`file.meta.smart_score\` and \`file.meta.smart_reasons\`. If AI scoring is unavailable, the Assembly continues with the candidate frames in fallback order. No AI credentials are required.

## AI pricing

Regular \`/video/thumbs\` processing charges still apply. AI frame analysis is billed separately at the underlying provider cost plus a ${smartThumbnailMarkupPercent}% Transloadit markup. The exact AI charge varies with the number of candidate frames, the internally selected model and provider pricing, and the image payload size.

\`smart_max_candidates\` is the main cost and latency control. The Robot analyzes up to three candidates per requested thumbnail, capped by \`smart_max_candidates\`, but never fewer than \`count\`. With the defaults of \`count: ${defaultThumbnailCount}\` and \`smart_max_candidates: ${defaultSmartMaximumCandidates}\`, it analyzes ${getSmartThumbnailCandidateCount(defaultThumbnailCount, defaultSmartMaximumCandidates)} frames and returns the best ${defaultThumbnailCount}. Lower the candidate limit to reduce AI cost and latency; raise it to give the AI more frames to choose from.

> [!Note]
> Use \`count\` with smart selection. To consistently extract exact timestamps with \`offsets\`, set \`smart: false\`.

> [!Note]
> Even though thumbnails are extracted from videos in parallel, we sort the thumbnails before adding them to the Assembly results. So the order in which they appear there reflects the order in which they appear in the video. You can also make sure by checking the \`thumb_index\` meta key.

For an upload-to-poster Template, SDK usage, and publication checks, see the [HTML video workflow guide](/guides/html-video-production-checklist/#html-video-production-checklist-section-6). The [video and S3 demo](/demos/file-exporting/store-encoding-and-thumbnails-on-s3/) includes a recorded input and extracted frames.
`),
    count: thumbnailCountSchema.describe(`
The number of thumbnails to be extracted. As some videos have incorrect durations, the actual number of thumbnails generated may be less in rare cases. The maximum number of thumbnails we currently allow is 999.

The thumbnails are taken at regular intervals, determined by dividing the video duration by the count. For example, a count of 3 will produce thumbnails at 25%, 50% and 75% through the video.

To extract thumbnails for specific timestamps, use the \`offsets\` parameter.
`),
    offsets: z
      .union([z.array(z.number()), z.array(percentageSchema)])
      .default([])
      .describe(`
An array of offsets representing seconds of the file duration, such as \`[ 2, 45, 120 ]\`. Millisecond durations of a file can also be used by using decimal place values. For example, an offset from 1250 milliseconds would be represented with \`1.25\`. Offsets can also be percentage values such as \`[ "2%", "50%", "75%" ]\`.

This option cannot be used with the \`count\` parameter, and takes precedence if both are specified. Out-of-range offsets are silently ignored.

When \`smart\` is \`true\`, smart selection ignores \`offsets\` and uses \`count\` to select from its own candidate timestamps. If no smart candidates can be extracted, the Robot falls back to standard extraction, where \`offsets\` takes precedence. Use \`smart: false\` to consistently extract the specified timestamps.
`),
    format: z
      .enum(['jpeg', 'jpg', 'png'])
      .default('jpeg')
      .describe(`
The format of the extracted thumbnail. Supported values are \`"jpg"\`, \`"jpeg"\` and \`"png"\`. Even if you specify the format to be \`"jpeg"\` the resulting thumbnails will have a \`"jpg"\` file extension.
`),
    width: z
      .number()
      .int()
      .min(1)
      .max(1920)
      .optional()
      .describe(`
The width of the thumbnail, in pixels. Defaults to the original width of the video.
`),
    height: z
      .number()
      .int()
      .min(1)
      .max(1080)
      .optional()
      .describe(`
The height of the thumbnail, in pixels. Defaults to the original height of the video.
`),
    resize_strategy: resize_strategy.describe(`
One of the [available resize strategies](/docs/topics/resize-strategies/).
`),
    background: color_with_alpha.default('#00000000').describe(`
The background color of the resulting thumbnails in the \`"rrggbbaa"\` format (red, green, blue, alpha) when used with the \`"pad"\` resize strategy. The default color is black.
`),
    rotate: z
      .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270), z.literal(360)])
      .default(0)
      .describe(`
Forces the video to be rotated by the specified degree integer. Currently, only multiples of 90 are supported. We automatically correct the orientation of many videos when the orientation is provided by the camera. This option is only useful for videos requiring rotation because it was not detected by the camera.
`),
    input_codec: z
      .string()
      .optional()
      .describe(`
Specifies the input codec to use when decoding the video. This is useful for videos with special codecs that require specific decoders.
`),
    smart: z
      .boolean()
      .default(false)
      .describe(`
When set to \`true\`, enables AI-powered smart thumbnail selection. Instead of returning thumbnails at regular intervals, the Robot will analyze candidate frames and select the most visually appealing ones.

The AI evaluates frames based on:
- Visual clarity (avoiding blurry or dark frames)
- Composition quality
- Face presence and expressions
- Action and motion (avoiding transition frames)
- Overall visual interest

Regular \`/video/thumbs\` processing charges still apply. AI frame analysis is billed separately at the underlying provider cost plus a ${smartThumbnailMarkupPercent}% Transloadit markup. You do not need to provide AI credentials.

Smart mode generates its own regularly spaced candidate timestamps; use \`smart: false\` with \`offsets\` when you need specified timestamps. Selected smart thumbnails are returned in chronological order, not score order. Inspect \`meta.thumb_offset\`, \`meta.smart_score\`, and \`meta.smart_reasons\` when evaluating the selection.

If AI scoring fails, the Robot selects from the extracted candidates in chronological order and records a fallback reason. If no candidates can be extracted, it attempts standard thumbnail extraction. A completed Assembly does not guarantee a representative or publication-safe poster; check that outputs exist and apply your application’s review policy.
`),
    smart_max_candidates: smartMaximumCandidatesSchema.describe(`
The maximum size of the candidate pool when \`smart\` is \`true\`. The Robot analyzes up to three candidates per requested thumbnail, capped by this value, but it will never analyze fewer candidates than the requested \`count\`.

A higher number may yield better results but increases processing time and AI cost. With the defaults of \`count: ${defaultThumbnailCount}\` and \`smart_max_candidates: ${defaultSmartMaximumCandidates}\`, the Robot analyzes ${getSmartThumbnailCandidateCount(defaultThumbnailCount, defaultSmartMaximumCandidates)} frames and returns the best ${defaultThumbnailCount} in chronological order.

This parameter is only used when \`smart\` is \`true\`.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotVideoThumbsInstructionsSchema.shape> =
  defineRobot(meta, robotVideoThumbsInstructionsSchema)

export const {
  withHiddenFields: robotVideoThumbsInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotVideoThumbsInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotVideoThumbsInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotVideoThumbsInstructions = Instructions['output']
export type RobotVideoThumbsInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotVideoThumbsInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotVideoThumbsInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotVideoThumbsInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotVideoThumbsInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
