import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: false,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      compressed: {
        robot: '/file/compress',
        use: {
          steps: [':original'],
          bundle_steps: true,
        },
        format: 'zip',
      },
    },
  },
  example_code_description: 'Compress uploaded files into a ZIP archive:',
  extended_description: `
### Archive structure for the \`"advanced"\` file layout.

There are a few things that we kept in mind when designing the \`"advanced"\` archive structure:

- There could be naming collisions.
- You want to know which <dfn>Step</dfn> a result file belongs to.
- You want to know from which originally uploaded file a result file was generated.
- Ideally, you want subfolders for a better structure of files.

To achieve all this, we have created the following archive file structure.

- There is a subfolder for each <dfn>Step</dfn> name that has result files in the archive.
- Files are named according to the first two letters of the unique original prefix + "_" + the first two letters of the unique prefix + "_" + the original file name. If you do not know what the original prefixes are, please check [our available Assembly variables](/docs/topics/assembly-instructions/#assembly-variables) and look for \`\${unique_original_prefix}\` and \`\${unique_prefix}\`.
- Files that belong to the \`:original\` <dfn>Step</dfn> (originally uploaded files) do **not** include the first two letters of the \`unique_original_prefix\`.
- If you are dealing with thumbnails from [🤖/video/thumbs](/docs/robots/video-thumbs/), there is an additional digit representing the order in the file name.

Here is an example:

\`\`\`yaml
":original":
  - gh_a.mov          # "gh" are the first 2 letters of the unique prefix.
                      # "a.mov" was the file name of the uploaded file.
  - ff_b.mov
"thumbed":
  - gh_e8_thumb_1.jpg # "gh" is the unique original prefix, meaning it's a result of a.mov.
                      # "e8" is the file's unique prefix.
                      # The "1" shows the thumbnail order.
  - gh_cv_thumb_2.jpg
  - ff_9b_thumb_3.jpg
"resized":
  - gh_ll_thumb.jpg
  - gh_df_thumb.jpg
  - ff_jk_thumb.jpg   # is a child of b.mov, as it starts with "ff"
\`\`\`
`,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Compressing',
  purpose_sentence: 'creates archives of files or file conversion results',
  purpose_verb: 'compress',
  purpose_word: 'compress',
  purpose_words: 'Compress files',
  service_slug: 'file-compressing',
  slot_count: 15,
  title: 'Compress files',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'FileCompressRobot',
  priceFactor: 1,
  queueSlotCount: 15,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotFileCompressInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/compress'),
    format: z
      .enum(['tar', 'zip'])
      .default('tar')
      .describe(`
The format of the archive to be created. Supported values are \`"tar"\` and \`"zip"\`.

Note that \`"tar"\` without setting \`gzip\` to \`true\` results in an archive that's not compressed in any way.
`),
    gzip: z
      .boolean()
      .default(false)
      .describe(`
Determines if the result archive should also be gzipped. Gzip compression is only applied if you use the \`"tar"\` format.
`),
    password: z
      .string()
      .nullable()
      .default(null)
      .describe(`
This allows you to encrypt all archive contents with a password and thereby protect it against unauthorized use. To unzip the archive, the user will need to provide the password in a text input field prompt.

This parameter has no effect if the format parameter is anything other than \`"zip"\`.
`),
    compression_level: z
      .number()
      .int()
      .min(-9)
      .max(0)
      .default(-6)
      .describe(`
Determines how fiercely to try to compress the archive. \`-0\` is compressionless, which is suitable for media that is already compressed. \`-1\` is fastest with lowest compression. \`-9\` is slowest with the highest compression.

If you are using \`-0\` in combination with the \`tar\` format with \`gzip\` enabled, consider setting \`gzip: false\` instead. This results in a plain Tar archive, meaning it already has no compression.
`),
    file_layout: z
      .enum(['advanced', 'simple', 'relative-path'])
      .default('advanced')
      .describe(`
Determines if the result archive should contain all files in one directory (value for this is \`"simple"\`) or in subfolders according to the explanation below (value for this is \`"advanced"\`). The \`"relative-path"\` option preserves the relative directory structure of the input files.

Files with same names are numbered in the \`"simple"\` file layout to avoid naming collisions.
`),
    archive_name: z
      .string()
      .optional()
      .describe(`
The name of the archive file to be created (without the file extension).
`),
  })
  .strict()

export const robotFileCompressInstructionsWithHiddenFieldsSchema =
  robotFileCompressInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotFileCompressInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotFileCompressInstructions = z.infer<typeof robotFileCompressInstructionsSchema>
export type RobotFileCompressInstructionsWithHiddenFields = z.infer<
  typeof robotFileCompressInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotFileCompressInstructionsSchema = interpolateRobot(
  robotFileCompressInstructionsSchema,
)
export type InterpolatableRobotFileCompressInstructions =
  InterpolatableRobotFileCompressInstructionsInput

export type InterpolatableRobotFileCompressInstructionsInput = z.input<
  typeof interpolatableRobotFileCompressInstructionsSchema
>

export const interpolatableRobotFileCompressInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotFileCompressInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotFileCompressInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotFileCompressInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotFileCompressInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotFileCompressInstructionsWithHiddenFieldsSchema
>
