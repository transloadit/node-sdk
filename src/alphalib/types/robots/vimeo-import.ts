import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  interpolateRobot,
  path,
  robotBase,
  robotImport,
  vimeoBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      imported: {
        robot: '/vimeo/import',
        credentials: 'YOUR_VIMEO_CREDENTIALS',
        path: 'me/videos',
        rendition: '720p',
        page_number: 1,
        files_per_page: 20,
      },
    },
  },
  example_code_description: 'Import videos from your Vimeo account:',
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Importing',
  purpose_sentence: 'imports videos from your Vimeo account',
  purpose_verb: 'import',
  purpose_word: 'Vimeo',
  purpose_words: 'Import videos from Vimeo',
  requires_credentials: true,
  service_slug: 'file-importing',
  slot_count: 20,
  title: 'Import videos from Vimeo',
  typical_file_size_mb: 50,
  typical_file_type: 'video',
  name: 'VimeoImportRobot',
  priceFactor: 6.6666,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
}

export const robotVimeoImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(vimeoBase)
  .extend({
    robot: z.literal('/vimeo/import'),
    path: path.default('me/videos').describe(`
The Vimeo API path to import from. The most common paths are:
- \`me/videos\`: Your own videos
- \`me/likes\`: Videos you've liked
- \`me/albums/:album_id/videos\`: Videos from a specific album
- \`me/channels/:channel_id/videos\`: Videos from a specific channel
- \`me/groups/:group_id/videos\`: Videos from a specific group
- \`me/portfolios/:portfolio_id/videos\`: Videos from a specific portfolio
- \`me/watchlater\`: Videos in your watch later queue

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
    page_number: z
      .number()
      .int()
      .positive()
      .default(1)
      .describe('The page number to import from. Vimeo API uses pagination for large result sets.'),
    files_per_page: z
      .number()
      .int()
      .positive()
      .max(100)
      .default(20)
      .describe('The number of files to import per page. Maximum is 100 as per Vimeo API limits.'),
    rendition: z
      .enum(['240p', '360p', '540p', '720p', '1080p', 'source'])
      .default('720p')
      .describe(`The quality of the video to import.`),
  })
  .strict()

export type RobotVimeoImportInstructions = z.infer<typeof robotVimeoImportInstructionsSchema>
export type RobotVimeoImportInstructionsInput = z.input<typeof robotVimeoImportInstructionsSchema>

export const interpolatableRobotVimeoImportInstructionsSchema = interpolateRobot(
  robotVimeoImportInstructionsSchema,
)
export type InterpolatableRobotVimeoImportInstructions =
  InterpolatableRobotVimeoImportInstructionsInput

export type InterpolatableRobotVimeoImportInstructionsInput = z.input<
  typeof interpolatableRobotVimeoImportInstructionsSchema
>

export const robotVimeoImportInstructionsWithHiddenFieldsSchema =
  robotVimeoImportInstructionsSchema.extend({
    access_token: z
      .string()
      .optional()
      .describe('Legacy authentication field. Use credentials instead.'),
    return_file_stubs: z
      .boolean()
      .optional()
      .describe(
        'When true, returns file stubs instead of downloading the actual files. Used for testing.',
      ),
  })

export const interpolatableRobotVimeoImportInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotVimeoImportInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotVimeoImportInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotVimeoImportInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotVimeoImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotVimeoImportInstructionsWithHiddenFieldsSchema
>
