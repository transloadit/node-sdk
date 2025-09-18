import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  digitalOceanBase,
  files_per_page,
  interpolateRobot,
  page_number,
  path,
  recursive,
  return_file_stubs,
  robotBase,
  robotImport,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      imported: {
        robot: '/digitalocean/import',
        credentials: 'YOUR_DIGITALOCEAN_CREDENTIALS',
        path: 'path/to/files/',
        recursive: true,
      },
    },
  },
  example_code_description: `Import files from the \`path/to/files\` directory and its subdirectories:`,
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Importing',
  purpose_sentence: 'imports whole directories of files from DigitalOcean Spaces',
  purpose_verb: 'import',
  purpose_word: 'DigitalOcean Spaces',
  purpose_words: 'Import files from DigitalOcean Spaces',
  service_slug: 'file-importing',
  slot_count: 20,
  title: 'Import files from DigitalOcean Spaces',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'DigitalOceanImportRobot',
  priceFactor: 6.6666,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
}

export const robotDigitaloceanImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(digitalOceanBase)
  .extend({
    robot: z.literal('/digitalocean/import'),
    path: path.describe(`
The path in your bucket to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are direct descendants of this directory will be imported. For example: \`images/\`.

Directories are **not** imported recursively. If you want to import files from subdirectories and sub-subdirectories, enable the \`recursive\` parameter.

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
    recursive: recursive.describe(`
Setting this to \`true\` will enable importing files from subdirectories and sub-subdirectories (etc.) of the given path.

Please use the pagination parameters \`page_number\` and \`files_per_page\` wisely here.
`),
    page_number: page_number.describe(`
The pagination page number. For now, in order to not break backwards compatibility in non-recursive imports, this only works when recursive is set to \`true\`.

When doing big imports, make sure no files are added or removed from other scripts within your path, otherwise you might get weird results with the pagination.
`),
    files_per_page: files_per_page.describe(`
The pagination page size. This only works when recursive is \`true\` for now, in order to not break backwards compatibility in non-recursive imports.
`),
    return_file_stubs,
  })
  .strict()

export const robotDigitaloceanImportInstructionsWithHiddenFieldsSchema =
  robotDigitaloceanImportInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotDigitaloceanImportInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotDigitaloceanImportInstructions = z.infer<
  typeof robotDigitaloceanImportInstructionsSchema
>
export type RobotDigitaloceanImportInstructionsWithHiddenFields = z.infer<
  typeof robotDigitaloceanImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotDigitaloceanImportInstructionsSchema = interpolateRobot(
  robotDigitaloceanImportInstructionsSchema,
)
export type InterpolatableRobotDigitaloceanImportInstructions =
  InterpolatableRobotDigitaloceanImportInstructionsInput

export type InterpolatableRobotDigitaloceanImportInstructionsInput = z.input<
  typeof interpolatableRobotDigitaloceanImportInstructionsSchema
>

export const interpolatableRobotDigitaloceanImportInstructionsWithHiddenFieldsSchema =
  interpolateRobot(robotDigitaloceanImportInstructionsWithHiddenFieldsSchema)
export type InterpolatableRobotDigitaloceanImportInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotDigitaloceanImportInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotDigitaloceanImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotDigitaloceanImportInstructionsWithHiddenFieldsSchema
>
