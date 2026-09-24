import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createProcessingExample,
  defineRobot,
  robotBase,
  robotParameterDocs,
  robotProcessingMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotProcessingMeta,
  example_code: createProcessingExample('decompressed', '/file/decompress'),
  example_code_description: 'Decompress an uploaded archive:',
  override_lvl1: 'File Compressing',
  purpose_sentence:
    'extracts entire archives of files to be consumed by other Robots or exported as individual files',
  purpose_verb: 'decompress',
  purpose_word: 'decompress',
  purpose_words: 'Decompress archives',
  service_slug: 'file-compressing',
  title: 'Decompress archives',
  name: 'FileDecompressRobot',
  priceFactor: 1.25,
  trackOutputFileSize: true,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
}

// Keep the inherited runtime contract while appending guidance specific to archive metadata.
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

For security reasons, archives containing symlinks that point outside the archived directory will cause the <dfn>Assembly</dfn> to fail.

Password-protected archives (ZIP with ZipCrypto or AES encryption, RAR encrypted, 7z with AES-256) are supported via the \`password\` parameter.
`),
    ignore_errors:
      robotBase.shape.ignore_errors.describe(`${robotParameterDocs.ignore_errors.description}
Metadata extraction can fail for files inside an archive, for example when an archived file has a size of zero bytes. Configure the \`"meta"\` phase when decompression should continue in that case.
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

export const robotDefinition: RobotDefinition<typeof robotFileDecompressInstructionsSchema.shape> =
  defineRobot(meta, robotFileDecompressInstructionsSchema)

export const {
  withHiddenFields: robotFileDecompressInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotFileDecompressInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotFileDecompressInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotFileDecompressInstructions = Instructions['output']
export type RobotFileDecompressInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotFileDecompressInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotFileDecompressInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotFileDecompressInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotFileDecompressInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
