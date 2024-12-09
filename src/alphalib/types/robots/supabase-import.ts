import { z } from 'zod'

import {
  credentials,
  files_per_page,
  ignore_errors,
  page_number,
  path,
  recursive,
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
        robot: '/supabase/import',
        credentials: 'YOUR_SUPABASE_CREDENTIALS',
        path: 'path/to/files/',
        recursive: true,
      },
    },
  },
  example_code_description:
    'Import files from the `path/to/files` directory and its subdirectories:',
  has_small_icon: true,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Importing',
  purpose_sentence: 'imports whole directories of files from your supabase bucket',
  purpose_verb: 'import',
  purpose_word: 'supabase',
  purpose_words: 'Import files from Supabase',
  requires_credentials: true,
  service_slug: 'file-importing',
  slot_count: 20,
  title: 'Import files from Supabase',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotSupabaseImportInstructionsSchema = z
  .object({
    robot: z.literal('/supabase/import'),
    ignore_errors,
    credentials: credentials.describe(`
Please create your associated <dfn>Template Credentials</dfn> in your Transloadit account and use the name of your <dfn>Template Credentials</dfn> as this parameter's value. They will contain the values for your supabase bucket, Key, Secret and Bucket region.

While we recommend to use <dfn>Template Credentials</dfn> at all times, some use cases demand dynamic credentials for which using <dfn>Template Credentials</dfn> is too unwieldy because of their static nature. If you have this requirement, feel free to use the following parameters instead: \`"bucket"\`, \`"host"\`, \`"key"\`, \`"secret"\`.

If you do use these parameters, make sure to use the **Endpoint** value under \`Storage > S3 Connection\` in the Supabase console for the \`"host"\` value, and the values under **S3 Access Keys** on the same page for your \`"key"\` and \`"secret"\`.
`),
    path: path.describe(`
The path in your bucket to the specific file or directory. If the path points to a file, only this file will be imported. For example: \`images/avatar.jpg\`.

If it points to a directory, indicated by a trailing slash (\`/\`), then all files that are direct descendants of this directory will be imported. For example: \`images/\`.

Directories are **not** imported recursively. If you want to import files from subdirectories and sub-subdirectories, enable the \`recursive\` parameter.

If you want to import all files from the root directory, please use \`/\` as the value here. In this case, make sure all your objects belong to a path. If you have objects in the root of your bucket that aren't prefixed with \`/\`, you'll receive an error: \`A client error (NoSuchKey) occurred when calling the GetObject operation: The specified key does not exist.\`

You can also use an array of path strings here to import multiple paths in the same <dfn>Robot</dfn>'s <dfn>Step</dfn>.
`),
    recursive: recursive.describe(`
Setting this to \`true\` will enable importing files from subfolders and sub-subfolders, etc. of the given path.

Please use the pagination parameters \`page_number\` and \`files_per_page\` wisely here.
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

export type RobotSupabaseImportInstructions = z.infer<typeof robotSupabaseImportInstructionsSchema>
