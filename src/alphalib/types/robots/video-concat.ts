import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  interpolateRobot,
  robotBase,
  robotFFmpegVideo,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: false,
  bytescount: 4,
  discount_factor: 0.25,
  discount_pct: 75,
  example_code: {
    steps: {
      concatenated: {
        robot: '/video/concat',
        use: {
          steps: [
            {
              name: ':original',
              fields: 'first_video_file',
              as: 'video_1',
            },
            {
              name: ':original',
              fields: 'second_video_file',
              as: 'video_2',
            },
            {
              name: ':original',
              fields: 'third_video_file',
              as: 'video_3',
            },
          ],
        },
      },
    },
  },
  example_code_description: `If you have a form with 3 file input fields and want to concatenate the uploaded videos in a specific order, instruct Transloadit using the \`name\` attribute of each input field. Use this attribute as the value for the \`fields\` key in the JSON, and set \`as\` to \`video_[[index]]\`. Transloadit will concatenate the files based on the ascending index order:`,
  minimum_charge: 0,
  output_factor: 0.6,
  override_lvl1: 'Video Encoding',
  purpose_sentence: 'concatenates several videos together',
  purpose_verb: 'concatenate',
  purpose_word: 'concatenate',
  purpose_words: 'Concatenate videos',
  service_slug: 'video-encoding',
  slot_count: 60,
  title: 'Concatenate videos',
  typical_file_size_mb: 80,
  typical_file_type: 'video',
  uses_tools: ['ffmpeg'],
  name: 'VideoConcatRobot',
  priceFactor: 4,
  queueSlotCount: 60,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotVideoConcatInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpegVideo)
  .extend({
    robot: z.literal('/video/concat').describe(`
> [!Note]
> Input videos may have differing dimensions and streams - the Robot can handle this fine. It will pre-transcode the input videos if necessary before concatenation at no additional cost.

Itʼs possible to concatenate a virtually infinite number of video files using [🤖/video/concat](/docs/robots/video-concat/).
`),
    video_fade_seconds: z
      .number()
      .default(1)
      .describe(`
When used this adds a video fade in and out effect between each section of your concatenated video. The float value is used so if you want a video delay effect of 500 milliseconds between each video section you would select \`0.5\`, however, integer values can also be represented.

This parameter does not add a video fade effect at the beginning or end of your video. If you want to do so, create an additional [🤖/video/encode](/docs/robots/video-encode/) Step and use our \`ffmpeg\` parameter as shown in this [demo](/demos/video-encoding/concatenate-fade-effect/).

Please note this parameter is independent of adding audio fades between sections.
`),
    audio_fade_seconds: z
      .number()
      .default(1)
      .describe(`
When used this adds an audio fade in and out effect between each section of your concatenated video. The float value is used so if you want an audio delay effect of 500 milliseconds between each video section you would select \`0.5\`, however, integer values can also be represented.

This parameter does not add an audio fade effect at the beginning or end of your video. If you want to do so, create an additional [🤖/video/encode](/docs/robots/video-encode/] Step and use our \`ffmpeg\` parameter as shown in this [demo](/demos/audio-encoding/ffmpeg-fade-in-and-out/).

Please note this parameter is independent of adding video fades between sections.
`),
  })
  .strict()

export const robotVideoConcatInstructionsWithHiddenFieldsSchema =
  robotVideoConcatInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotVideoConcatInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotVideoConcatInstructions = z.infer<typeof robotVideoConcatInstructionsSchema>
export type RobotVideoConcatInstructionsWithHiddenFields = z.infer<
  typeof robotVideoConcatInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotVideoConcatInstructionsSchema = interpolateRobot(
  robotVideoConcatInstructionsSchema,
)
export type InterpolatableRobotVideoConcatInstructions =
  InterpolatableRobotVideoConcatInstructionsInput

export type InterpolatableRobotVideoConcatInstructionsInput = z.input<
  typeof interpolatableRobotVideoConcatInstructionsSchema
>

export const interpolatableRobotVideoConcatInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotVideoConcatInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotVideoConcatInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotVideoConcatInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotVideoConcatInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotVideoConcatInstructionsWithHiddenFieldsSchema
>
