import { z } from 'zod'

import { ignore_errors } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  docs_redirect_from: ['/docs/import-files-over-http/'],
  example_code: {
    steps: {
      imported: {
        robot: '/http/import',
        url: 'https://demos.transloadit.com/inputs/chameleon.jpg',
      },
    },
  },
  example_code_description: 'Import an image from a specific URL:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Importing',
  purpose_sentence: 'imports any file that is publicly available via a web URL into Transloadit',
  purpose_verb: 'import',
  purpose_word: 'Webservers',
  purpose_words: 'Import files from web servers',
  service_slug: 'file-importing',
  slot_count: 10,
  title: 'Import files from web servers',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotHttpImportInstructionsSchema = z
  .object({
    robot: z.literal('/http/import'),
    ignore_errors,
    url: z.union([z.string().url(), z.array(z.string().url())]).describe(`
The URL from which the file to be imported can be retrieved.

You can also specify an array of URLs or a string of \`|\` delimited URLs to import several files at once. Please also check the \`url_delimiter\` parameter for that.
`),
    url_delimiter: z.string().default('|').describe(`
Provides the delimiter that is used to split the URLs in your \`url\` parameter value.
`),
    headers: z.array(z.string()).default([]).describe(`
Custom headers to be sent for file import.

This is an empty array by default, such that no additional headers except the necessary ones (e.g. Host) are sent.
`),
    force_name: z
      .union([z.string(), z.array(z.string())])
      .nullable()
      .default(null).describe(`
Custom name for the imported file(s). Defaults to \`null\`, which means the file names are derived from the supplied URL(s).
`),
    import_on_errors: z.array(z.string()).default([]).describe(`
Setting this to \`"meta"\` will still import the file on metadata extraction errors. \`ignore_errors\` is similar, it also ignores the error and makes sure the Robot doesn't stop, but it doesn't import the file.
`),
    fail_fast: z.boolean().default(false).describe(`
Disable the internal retry mechanism, and fail immediately if a resource can't be imported. This can be useful for performance critical applications.
`),
  })
  .strict()

export type RobotHttpImportInstructions = z.infer<typeof robotHttpImportInstructionsSchema>