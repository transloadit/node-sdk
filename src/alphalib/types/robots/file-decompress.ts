import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 0.8,
  discount_pct: 20,
  example_code: {
    steps: {
      decompressed: {
        robot: '/file/decompress',
        use: ':original',
      },
    },
  },
  example_code_description: 'Decompress an uploaded archive:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Compressing',
  purpose_sentence:
    'extracts entire archives of files to be consumed by other Robots or exported as individual files',
  purpose_verb: 'decompress',
  purpose_word: 'decompress',
  purpose_words: 'Decompress archives',
  service_slug: 'file-compressing',
  slot_count: 10,
  title: 'Decompress archives',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'FileDecompressRobot',
  priceFactor: 1.25,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
}

export const robotFileDecompressInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/decompress').describe(`
This Robot supports the following archive formats:

- ZIP archives (with uncompressed or "deflate"-compressed entries)
- 7-Zip archives
- RAR archives
- GNU tar format (including GNU long filenames, long link names, and sparse files)
- Solaris 9 extended tar format (including ACLs)
- Old V7 tar archives
- POSIX ustar
- POSIX pax interchange format
- POSIX octet-oriented cpio
- SVR4 ASCII cpio
- POSIX octet-oriented cpio
- Binary cpio (big-endian or little-endian)
- ISO9660 CD-ROM images (with optional Rockridge or Joliet extensions)
- GNU and BSD "ar" archives
- "mtree" format
- Microsoft CAB format
- LHA and LZH archives
- XAR archives

This <dfn>Robot</dfn> also detects and handles any of the following before evaluating the archive file:

- uuencoded files
- Files with RPM wrapper
- gzip compression
- bzip2 compression
- compress/LZW compression
- lzma, lzip, and xz compression

For security reasons, archives that contain symlinks to outside the archived dir, will error out the <dfn>Assembly</dfn>. Decompressing password-protected archives (encrypted archives) is currently not fully supported but will not cause an <dfn>Assembly</dfn> to fail.
`),
    ignore_errors: z
      .union([z.boolean(), z.array(z.enum(['meta']))])
      .transform((ignoreErrors): 'meta'[] =>
        ignoreErrors === true ? ['meta'] : ignoreErrors === false ? [] : ignoreErrors,
      )
      .default([])
      .describe(`
A possible array member is only \`"meta"\`.

You might see an error when trying to extract metadata from the files inside your archive. This happens, for example, for files with a size of zero bytes. Setting this to \`true\` will cause the <dfn>Robot</dfn> to not stop the file decompression (and the entire <dfn>Assembly</dfn>) when that happens.

To keep backwards compatibility, setting this parameter to \`true\` will set it to \`["meta"]\` internally.
`),
  })
  .strict()

export const robotFileDecompressInstructionsWithHiddenFieldsSchema =
  robotFileDecompressInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotFileDecompressInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotFileDecompressInstructions = z.infer<typeof robotFileDecompressInstructionsSchema>
export type RobotFileDecompressInstructionsWithHiddenFields = z.infer<
  typeof robotFileDecompressInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotFileDecompressInstructionsSchema = interpolateRobot(
  robotFileDecompressInstructionsSchema,
)
export type InterpolatableRobotFileDecompressInstructions =
  InterpolatableRobotFileDecompressInstructionsInput

export type InterpolatableRobotFileDecompressInstructionsInput = z.input<
  typeof interpolatableRobotFileDecompressInstructionsSchema
>

export const interpolatableRobotFileDecompressInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotFileDecompressInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotFileDecompressInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotFileDecompressInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotFileDecompressInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotFileDecompressInstructionsWithHiddenFieldsSchema
>
