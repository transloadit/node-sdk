import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  interpolateRobot,
  robotBase,
  robotUse,
  videoEncodeSpecificInstructionsSchema,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: false,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      hevc_encoded: {
        robot: '/video/encode',
        use: ':original',
        preset: 'hevc',
      },
    },
  },
  example_code_description:
    'Transcode uploaded video to [HEVC](https://en.wikipedia.org/wiki/High_Efficiency_Video_Coding) (H.265):',
  minimum_charge: 0,
  output_factor: 0.6,
  override_lvl1: 'Video Encoding',
  purpose_sentence: 'encodes, resizes, applies watermarks to videos and animated GIFs',
  purpose_verb: 'transcode',
  purpose_word: 'transcode/resize/watermark',
  purpose_words: 'Transcode, resize, or watermark videos',
  service_slug: 'video-encoding',
  slot_count: 60,
  title: 'Transcode, resize, or watermark videos',
  typical_file_size_mb: 80,
  typical_file_type: 'video',
  uses_tools: ['ffmpeg'],
  name: 'VideoEncodeRobot',
  priceFactor: 1,
  queueSlotCount: 60,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  stage: 'ga',
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotVideoEncodeInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(videoEncodeSpecificInstructionsSchema)
  .extend({
    robot: z.literal('/video/encode').describe(`
The /video/encode Robot is a versatile tool for video processing that handles transcoding, resizing, and watermarking. It supports various formats including modern standards like HEVC (H.265), and provides features such as presets for common devices, custom FFmpeg parameters for powerusers, watermark positioning, and more.

## Adding text overlays with FFmpeg

You can add text overlays to videos using FFmpeg's \`drawtext\` filter through this <Definition term="Robot">Robot</Definition>'s \`ffmpeg\` parameter. Here are two examples — one with the default font and one with a custom font family name:

\`\`\`json
{
  "steps": {
    ":original": {
      "robot": "/upload/handle"
    },
    "text_overlay_default": {
      "use": ":original",
      "robot": "/video/encode",
      "preset": "empty",
      "ffmpeg_stack": "{{stacks.ffmpeg.recommended_version}}",
      "ffmpeg": {
        "codec:a": "copy",
        "vf": "drawtext=text='My text overlay':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=(h-text_h)/2"
      },
      "result": true
    },
    "text_overlay_custom": {
      "use": ":original",
      "robot": "/video/encode",
      "preset": "empty",
      "ffmpeg_stack": "{{stacks.ffmpeg.recommended_version}}",
      "ffmpeg": {
        "codec:a": "copy",
        "vf": "drawtext=font='Times New Roman':text='My text overlay':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=(h-text_h)/2"
      },
      "result": true
    }
  }
}
\`\`\`

**Notes:**

- Use the \`font\` attribute to reference a font by family name with FFmpeg's \`drawtext\`
- FFmpeg font family names typically do not contain dashes (e.g. \`Times New Roman\`), while
  ImageMagick uses dashed names (e.g. \`Times-New-Roman\`).
- Preserve the source audio by setting \`"codec:a": "copy"\`.
- Position text with the \`x\` and \`y\` expressions. The example above centers the text.

See the live demo [here](/demos/video-encoding/add-text-overlay/).
`),
    font_size: z.number().optional(),
    font_color: z.string().optional(),
    text_background_color: z.string().optional(),
  })
  .strict()

export const robotVideoEncodeInstructionsWithHiddenFieldsSchema =
  robotVideoEncodeInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotVideoEncodeInstructionsSchema.shape.result])
      .optional(),
    chunked_transcoding: z.boolean().optional(),
    realtime: z.boolean().optional(),
  })

export type RobotVideoEncodeInstructions = z.infer<typeof robotVideoEncodeInstructionsSchema>
export type RobotVideoEncodeInstructionsWithHiddenFields = z.infer<
  typeof robotVideoEncodeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotVideoEncodeInstructionsSchema = interpolateRobot(
  robotVideoEncodeInstructionsSchema,
)
export type InterpolatableRobotVideoEncodeInstructions =
  InterpolatableRobotVideoEncodeInstructionsInput

export type InterpolatableRobotVideoEncodeInstructionsInput = z.input<
  typeof interpolatableRobotVideoEncodeInstructionsSchema
>

export const interpolatableRobotVideoEncodeInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotVideoEncodeInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotVideoEncodeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotVideoEncodeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotVideoEncodeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotVideoEncodeInstructionsWithHiddenFieldsSchema
>
