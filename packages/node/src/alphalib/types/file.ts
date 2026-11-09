import { z } from 'zod'

/** Upper bound requested by dominant-color image metadata extraction. */
export const dominantColorExtractionLimit = 10

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
