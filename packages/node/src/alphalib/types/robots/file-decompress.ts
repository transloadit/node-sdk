import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
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
  stage: 'ga',
}

export const robotFileDecompressInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/decompress').describe(`
This Robot supports the following archive formats:

- ZIP archives (with uncompressed or "deflate"-compressed entries, including password-protected)
- 7-Zip archives (including AES-256 encrypted)
- RAR archives (including encrypted)
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

For security reasons, archives that contain symlinks to outside the archived dir, will error out the <dfn>Assembly</dfn>.

Password-protected archives (ZIP with ZipCrypto or AES encryption, RAR encrypted, 7z with AES-256) are supported via the \`password\` parameter.
`),
    password: z
      .string()
      .optional()
      .describe(`
The password to use for decrypting password-protected archives.

Supports encrypted ZIP (ZipCrypto and AES), RAR (encrypted), and 7z (AES-256 encrypted) archives.

For security, this value should be passed via Template Variables (\`\${fields.archive_password}\`) or Template Credentials rather than hardcoded in your Assembly Instructions. The password is never logged or included in Assembly status responses.

If the archive is encrypted and no password is provided, or if the password is incorrect, the <dfn>Assembly</dfn> will fail with a \`FILE_DECOMPRESS_PASSWORD_REQUIRED\` or \`FILE_DECOMPRESS_PASSWORD_INCORRECT\` error.
`),
    ignore_errors: z
      .union([z.boolean(), z.array(z.enum(['meta', 'execute']))])
      .transform((ignoreErrors): ('meta' | 'execute')[] =>
        ignoreErrors === true ? ['meta', 'execute'] : ignoreErrors === false ? [] : ignoreErrors,
      )
      .default([])
      .describe(`
A possible array member is only \`"meta"\`.

You might see an error when trying to extract metadata from the files inside your archive. This happens, for example, for files with a size of zero bytes. Setting this to \`true\` will cause the <dfn>Robot</dfn> to not stop the file decompression (and the entire <dfn>Assembly</dfn>) when that happens.

To keep backwards compatibility, setting this parameter to \`true\` will set it to \`["meta"]\` internally.
`),
    turbo: z
      .boolean()
      .default(true)
      .describe(`
Enables Turbo Mode for \`/file/decompress\`.

This setting defaults to \`true\`. Set it to \`false\` to disable Turbo Mode.

When enabled, extracted files are emitted as soon as they are available, which can speed up downstream processing for large archives.

Turbo Mode also changes usage accounting: emitted extracted-file bytes and original input-archive bytes are billed with a surcharge (25% by default).
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
