import { z } from 'zod'

import {
  credentials,
  files_per_page,
  ignore_errors,
  page_number,
  path,
} from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      imported: {
        robot: '/cloudfiles/import',
        credentials: 'YOUR_CLOUDFILES_CREDENTIALS',
        path: 'path/to/files/',
        recursive: true,
      },
    },
  },
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Importing',
  purpose_sentence: 'imports whole directories of files from your Rackspace Cloud Files container',
  purpose_verb: 'import',
  purpose_word: 'Rackspace Cloud Files',
  purpose_words: 'Import files from Rackspace Cloud Files',
  requires_credentials: true,
  service_slug: 'file-importing',
  slot_count: 20,
  title: 'Import files from Rackspace Cloud Files',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotCloudfilesImportInstructionsSchema = z
  .object({
    robot: z.literal('/cloudfiles/import'),
    ignore_errors,
    credentials: credentials.describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your [Template Credentials](/c/template-credentials/) as this parameter's value. They will contain the values for your Cloud Files Container, User, Key, Account type and Data center.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"account_type"\` ("us" or "uk"), \`"data_center"\` ("dfw" for Dallas or "ord" for Chicago for example), \`"user"\`, \`"key"\`, \`"container"\`.
`),
    path: path.describe(`
The path in your bucket to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are direct descendants of this directory will be imported. For example: \`images/\`.

Directories are **not** imported recursively. If you want to import files from subdirectories and sub-subdirectories, enable the \`recursive\` parameter.

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
    recursive: z.boolean().default(false).describe(`
Setting this to \`true\` will enable importing files from subdirectories and sub-subdirectories (etc.) of the given path.

Please use the pagination parameters \`page_number\` and \`files_per_page\`wisely here.
`),
    page_number: page_number.describe(`
The pagination page number. For now, in order to not break backwards compatibility in non-recursive imports, this only works when recursive is set to \`true\`.

When doing big imports, make sure no files are added or removed from other scripts within your path, otherwise you might get weird results with the pagination.
`),
    files_per_page: files_per_page.describe(`
The pagination page size. This only works when recursive is \`true\` for now, in order to not break backwards compatibility in non-recursive imports.
`),
  })
  .strict()

export type RobotCloudfilesImportInstructions = z.infer<
  typeof robotCloudfilesImportInstructionsSchema
>
