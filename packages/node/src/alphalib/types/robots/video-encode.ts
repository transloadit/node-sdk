import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import {
  createProcessingExample,
  defineRobotWithHiddenFields,
  robotBase,
  robotUse,
  robotVideoEncodingMeta,
  videoEncodeSpecificInstructionsSchema,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotVideoEncodingMeta,
  example_code: createProcessingExample('hevc_encoded', '/video/encode', {
    preset: 'hevc',
  }),
  example_code_description:
    'Transcode uploaded video to [HEVC](https://en.wikipedia.org/wiki/High_Efficiency_Video_Coding) (H.265):',
  purpose_sentence: 'encodes, resizes, applies watermarks to videos and animated GIFs',
  purpose_verb: 'transcode',
  purpose_word: 'transcode/resize/watermark',
  purpose_words: 'Transcode, resize, or watermark videos',
  title: 'Transcode, resize, or watermark videos',
  uses_tools: ['ffmpeg'],
  name: 'VideoEncodeRobot',
}

export const robotVideoEncodeInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(videoEncodeSpecificInstructionsSchema)
  .extend({
    robot: z.literal('/video/encode').describe(`
The /video/encode Robot is a versatile tool for video processing that handles transcoding, resizing, and watermarking. It supports various formats including modern standards like HEVC (H.265), and provides features such as presets for common devices, custom FFmpeg parameters for powerusers, watermark positioning, and more.

## Adding text overlays with FFmpeg

You can add text overlays to videos using FFmpeg's \`drawtext\` filter through this <dfn>Robot</dfn>'s \`ffmpeg\` parameter. Here are two examples — one with the default font and one with a custom font family name:

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
      "ffmpeg_stack": "${stackVersions.ffmpeg.recommendedVersion}",
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
      "ffmpeg_stack": "${stackVersions.ffmpeg.recommendedVersion}",
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
- File-loading \`drawtext\` options such as \`textfile\` and \`fontfile\` are not supported. Use
  inline \`text\` and a font family name instead.
- Preserve the source audio by setting \`"codec:a": "copy"\`.
- Position text with the \`x\` and \`y\` expressions. The example above centers the text.

See the [live text overlay demo](/demos/video-encoding/add-text-overlay/).
`),
    font_size: z.number().optional(),
    font_color: z.string().optional(),
    text_background_color: z.string().optional(),
  })
  .strict()

const hiddenFields = {
  chunked_transcoding: z.boolean().optional(),
  freeze_detect: z.boolean().optional(),
  realtime: z.boolean().optional(),
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotVideoEncodeInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotVideoEncodeInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotVideoEncodeInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotVideoEncodeInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotVideoEncodeInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotVideoEncodeInstructions = Instructions['output']
export type RobotVideoEncodeInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotVideoEncodeInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotVideoEncodeInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotVideoEncodeInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotVideoEncodeInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
