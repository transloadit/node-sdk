import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  files_per_page,
  interpolateRobot,
  page_number,
  path,
  recursive,
  return_file_stubs,
  robotBase,
  robotImport,
  swiftBase,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      imported: {
        robot: '/swift/import',
        credentials: 'YOUR_SWIFT_CREDENTIALS',
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
  purpose_sentence: 'imports whole directories of files from your Openstack/Swift bucket',
  purpose_verb: 'import',
  purpose_word: 'Openstack/Swift',
  purpose_words: 'Import files from Openstack/Swift',
  requires_credentials: true,
  service_slug: 'file-importing',
  slot_count: 20,
  title: 'Import files from Openstack/Swift',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'SwiftImportRobot',
  priceFactor: 6.6666,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
}

export const robotSwiftImportInstructionsSchema = robotBase
  .merge(robotImport)
  .merge(swiftBase)
  .extend({
    robot: z.literal('/swift/import'),
    path: path.describe(`
The path in your bucket to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are direct descendants of this directory will be imported. For example: \`images/\`.

Directories are **not** imported recursively. If you want to import files from subdirectories and sub-subdirectories, enable the \`recursive\` parameter.

If you want to import all files from the root directory, please use \`/\` as the value here. In this case, make sure all your objects belong to a path. If you have objects in the root of your bucket that aren't prefixed with \`/\`, you'll receive an error: \`A client error (NoSuchKey) occurred when calling the GetObject operation: The specified key does not exist.\`

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

export const robotSwiftImportInstructionsWithHiddenFieldsSchema =
  robotSwiftImportInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotSwiftImportInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotSwiftImportInstructions = z.infer<typeof robotSwiftImportInstructionsSchema>
export type RobotSwiftImportInstructionsWithHiddenFields = z.infer<
  typeof robotSwiftImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotSwiftImportInstructionsSchema = interpolateRobot(
  robotSwiftImportInstructionsSchema,
)
export type InterpolatableRobotSwiftImportInstructions =
  InterpolatableRobotSwiftImportInstructionsInput

export type InterpolatableRobotSwiftImportInstructionsInput = z.input<
  typeof interpolatableRobotSwiftImportInstructionsSchema
>

export const interpolatableRobotSwiftImportInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotSwiftImportInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotSwiftImportInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotSwiftImportInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotSwiftImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotSwiftImportInstructionsWithHiddenFieldsSchema
>
