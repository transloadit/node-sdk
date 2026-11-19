import { z } from 'zod'

/** Upper bound requested by dominant-color image metadata extraction. */
export const dominantColorExtractionLimit = 10

/** Maximum side length of each frame used by opt-in dominant-color sampling. */
export const dominantColorSampleMaxDimension = 256

/** Default file-count ceiling enforced per processing or import Job. */
export const defaultMaxFilesPerJob = 3000

/** Broad file categories emitted in Assembly status file objects. */
export const assemblyFileTypeSchema = z.enum([
  'audio',
  'document',
  'image',
  'office',
  'pdf',
  'swf',
  'video',
  'xls',
])
export const assemblyFileTypes = assemblyFileTypeSchema.enum
export const assemblyFileTypeValues = assemblyFileTypeSchema.options
export type AssemblyFileType = z.infer<typeof assemblyFileTypeSchema>

export const fileAsSchema = z.union([z.string(), z.array(z.string())]).nullable()
export type FileAs = z.infer<typeof fileAsSchema>
