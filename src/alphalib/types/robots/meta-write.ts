import { z } from 'zod'

import { robotFFmpeg, robotBase, robotUse } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      attributed: {
        robot: '/meta/write',
        use: ':original',
        data_to_write: {
          copyright: '© Transloadit',
        },
        ffmpeg_stack: '{{ stacks.ffmpeg.recommended_version }}',
      },
    },
  },
  example_code_description: 'Add a copyright notice to uploaded images:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'Media Cataloging',
  purpose_sentence: 'writes metadata into files',
  purpose_verb: 'write',
  purpose_word: 'write metadata',
  purpose_words: 'Write metadata to media',
  service_slug: 'media-cataloging',
  slot_count: 10,
  title: 'Write metadata to media',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotMetaWriteInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpeg)
  .extend({
    robot: z.literal('/meta/write').describe(`
**Note:** This <dfn>Robot</dfn> currently accepts images, videos and audio files.
`),
    data_to_write: z.object({}).passthrough().default({}).describe(`
A key/value map defining the metadata to write into the file.

Valid metadata keys can be found [here](https://exiftool.org/TagNames/EXIF.html). For example: \`ProcessingSoftware\`.
`),
  })
  .strict()

export type RobotMetaWriteInstructions = z.infer<typeof robotMetaWriteInstructionsSchema>
