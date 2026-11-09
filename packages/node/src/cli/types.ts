import type { Steps } from '../alphalib/types/template.ts'

import { z } from 'zod'

const ignoredErrorDetailsSchema = z
  .union([
    z.string(),
    z.object({
      code: z.string().optional().catch(undefined),
      message: z.string().optional().catch(undefined),
    }),
  ])
  .optional()
  .catch(undefined)

const ignoredErrorSummarySchema = z
  .object({
    step: z.string().nullable().optional().catch(undefined),
    phase: z.string().optional().catch(undefined),
    error: ignoredErrorDetailsSchema,
    message: z.string().optional().catch(undefined),
  })
  .catch({})

/** Project unchecked API responses to CLI diagnostics without nested request metadata. */
export const assemblySummarySchema = z.object({
  assembly_id: z.string().optional().catch(undefined),
  assembly_url: z.string().nullable().optional().catch(undefined),
  assembly_ssl_url: z.string().nullable().optional().catch(undefined),
  ok: z.string().nullable().optional().catch(undefined),
  error: z.string().optional().catch(undefined),
  message: z.string().optional().catch(undefined),
  ignored_error_count: z.number().finite().int().nonnegative().default(0).catch(0),
  ignored_errors: z.array(ignoredErrorSummarySchema).default([]).catch([]),
})

/** Public diagnostics from one Assembly, excluding instructions and request internals. */
export type AssemblySummary = z.infer<typeof assemblySummarySchema>

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
