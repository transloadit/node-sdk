import type { AssemblyStatus } from '../alphalib/types/assemblyStatus.ts'
import type { Steps } from '../alphalib/types/template.ts'

import { z } from 'zod'

/** Public diagnostics from one Assembly, excluding instructions and request internals. */
export type AssemblySummary = Pick<
  AssemblyStatus,
  | 'assembly_id'
  | 'assembly_url'
  | 'assembly_ssl_url'
  | 'ok'
  | 'error'
  | 'message'
  | 'ignored_errors'
  | 'ignored_error_count'
>

// Zod schemas for runtime validation
const APIErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
})
export type APIError = z.infer<typeof APIErrorSchema>

const TransloaditAPIErrorSchema = z.object({
  error: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
  transloaditErrorCode: z.string().optional(),
  response: z
    .object({
      body: z
        .object({
          error: z.string().optional(),
        })
        .optional(),
      statusCode: z.number().optional(),
    })
    .optional(),
})
export type TransloaditAPIError = z.infer<typeof TransloaditAPIErrorSchema>

// Template file data - explicit type to avoid TS inference limits
export interface TemplateFileData {
  transloadit_template_id?: string
  steps?: Steps
  [key: string]: unknown // passthrough
}

export interface TemplateFile {
  file: string
  data: TemplateFileData
}

// Helper to ensure error is Error type
export function ensureError(value: unknown): Error {
  if (value instanceof Error) {
    return value
  }
  return new Error(`Non-error was thrown: ${String(value)}`)
}

// Type guard for APIError
export function isAPIError(value: unknown): value is APIError {
  return APIErrorSchema.safeParse(value).success
}

// Type guard for TransloaditAPIError
export function isTransloaditAPIError(value: unknown): value is TransloaditAPIError {
  return TransloaditAPIErrorSchema.safeParse(value).success
}

// Type guard for NodeJS.ErrnoException
export function isErrnoException(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && 'code' in value
}
