import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  interpolateRobot,
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
  name: 'HttpImportRobot',
  priceFactor: 10,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
}

export const robotHttpImportInstructionsSchema = robotBase
  .merge(robotImport)
  .extend({
    robot: z.literal('/http/import').describe(`
The result of this <dfn>Robot</dfn> will carry a field \`import_url\` in their metadata, which references the URL from which they were imported. Further conversion results that use this file will also carry this \`import_url\` field. This allows you to to match conversion results with the original import URL that you used.

This <dfn>Robot</dfn> knows to interpret links to files on these services:

- Dropbox
- Google Drive
- Google Docs
- OneDrive

Instead of downloading the HTML page previewing the file, the actual file itself will be imported.
`),
    url: z.union([z.string().url(), z.array(z.string().url())]).describe(`
The URL from which the file to be imported can be retrieved.

You can also specify an array of URLs or a string of \`|\` delimited URLs to import several files at once. Please also check the \`url_delimiter\` parameter for that.
`),
    url_delimiter: z
      .string()
      .default('|')
      .describe(`
Provides the delimiter that is used to split the URLs in your \`url\` parameter value.
`),
    headers: z
      .union([
        z.array(z.string()),
        z.array(z.record(z.string())),
        z.string(), // For JSON strings like '{"X-Database":"volt"}'
      ])
      .default([])
      .describe(`
Custom headers to be sent for file import.

This is an empty array by default, such that no additional headers except the necessary ones (e.g. Host) are sent.

Headers can be specified as:
- An array of strings in the format "Header-Name: value"
- An array of objects with header names as keys and values as values
- A JSON string that will be parsed into an object
`),
    import_on_errors: z
      .array(z.string())
      .default([])
      .describe(`
Setting this to \`"meta"\` will still import the file on metadata extraction errors. \`ignore_errors\` is similar, it also ignores the error and makes sure the Robot doesn't stop, but it doesn't import the file.
`),
    fail_fast: z
      .boolean()
      .default(false)
      .describe(`
Disable the internal retry mechanism, and fail immediately if a resource can't be imported. This can be useful for performance critical applications.
`),
    return_file_stubs,
    range: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(`
Allows you to specify one or more byte ranges to import from the file. The server must support range requests for this to work.

**Single range**: Use a string like \`"0-99"\` to import bytes 0-99 (the first 100 bytes).

**Multiple ranges**: Use an array like \`["0-99", "200-299"]\` to import multiple separate ranges. The resulting file will contain all requested ranges concatenated together, with zero bytes (\\0) filling any gaps between non-contiguous ranges.

**Range formats**:
- \`"0-99"\`: Bytes 0 through 99 (inclusive)
- \`"100-199"\`: Bytes 100 through 199 (inclusive)
- \`"-100"\`: The last 100 bytes of the file

**Important notes**:
- The server must support HTTP range requests (respond with 206 Partial Content)
- If the server doesn't support range requests, the entire file will be imported instead
- Overlapping ranges are allowed and will be included as requested
- The resulting file size will be the highest byte position requested, with gaps filled with zero bytes
`),
  })
  .strict()

export const robotHttpImportInstructionsWithHiddenFieldsSchema =
  robotHttpImportInstructionsSchema.extend({
    force_original_id: z.string().optional(),
    force_name: z
      .union([z.string(), z.record(z.string())])
      .optional()
      .describe(`
Force a specific filename for imported files. Can be a string to apply to all imports, or an object mapping URLs to filenames.
`),
    result: z
      .union([z.literal('debug'), robotHttpImportInstructionsSchema.shape.result])
      .optional(),
    credentials: z.string().optional(), // For test purposes
    bucket: z.string().optional(), // For test purposes
    // Override url to support relative URLs in tests with bucket
    url: z.union([z.string(), z.array(z.string())]).optional(),
  })

export type RobotHttpImportInstructions = z.infer<typeof robotHttpImportInstructionsSchema>
export type RobotHttpImportInstructionsWithHiddenFields = z.infer<
  typeof robotHttpImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotHttpImportInstructionsSchema = interpolateRobot(
  robotHttpImportInstructionsSchema,
)
export type InterpolatableRobotHttpImportInstructions =
  InterpolatableRobotHttpImportInstructionsInput

export type InterpolatableRobotHttpImportInstructionsInput = z.input<
  typeof interpolatableRobotHttpImportInstructionsSchema
>

export const interpolatableRobotHttpImportInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotHttpImportInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotHttpImportInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotHttpImportInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotHttpImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotHttpImportInstructionsWithHiddenFieldsSchema
>
