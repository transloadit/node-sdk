import { z } from 'zod'
import type { Steps } from '../alphalib/types/template.ts'
import { optionalStepsSchema } from '../alphalib/types/template.ts'
import type { BillResponse, ListedTemplate, TemplateResponse } from '../apiTypes.ts'
import type { AssemblyStatus, Transloadit } from '../Transloadit.ts'
import type { IOutputCtl } from './OutputCtl.ts'

// Re-export transloadit types for CLI use
export type { AssemblyStatus, BillResponse, ListedTemplate, TemplateResponse }
export type { Transloadit }
export type { CreateAssemblyOptions } from '../Transloadit.ts'

// Zod schemas for runtime validation
export const APIErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
})
export type APIError = z.infer<typeof APIErrorSchema>

export const TransloaditAPIErrorSchema = z.object({
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

export const TemplateFileDataSchema: z.ZodType<TemplateFileData> = z
  .object({
    transloadit_template_id: z.string().optional(),
    steps: optionalStepsSchema,
  })
  .passthrough() as z.ZodType<TemplateFileData>

export interface TemplateFile {
  file: string
  data: TemplateFileData
}

// Template list item (from API)
export interface TemplateListItem {
  id: string
  modified: string
  name?: string
}

// CLI Invocation types
export interface BaseInvocation {
  error?: boolean
  message?: string
  mode: string
  action?: string
  logLevel?: number
  jsonMode?: boolean
}

export interface AssemblyInvocation extends BaseInvocation {
  mode: 'assemblies'
  action?: 'create' | 'get' | 'list' | 'delete' | 'replay'
  inputs: string[]
  output?: string
  recursive?: boolean
  watch?: boolean
  del?: boolean
  reprocessStale?: boolean
  steps?: string
  template?: string
  fields?: Record<string, string>
  assemblies?: string[]
  before?: string
  after?: string
  keywords?: string[]
  notify_url?: string
  reparse?: boolean
}

export interface TemplateInvocation extends BaseInvocation {
  mode: 'templates'
  action?: 'create' | 'get' | 'list' | 'delete' | 'modify' | 'sync'
  templates?: string[]
  template?: string
  name?: string
  file?: string
  files?: string[]
  before?: string
  after?: string
  order?: 'asc' | 'desc'
  sort?: string
  fields?: string[]
  recursive?: boolean
}

export interface BillInvocation extends BaseInvocation {
  mode: 'bills'
  action?: 'get'
  months: string[]
}

export interface NotificationInvocation extends BaseInvocation {
  mode: 'assembly-notifications'
  action?: 'list' | 'replay'
  assemblies?: string[]
  notify_url?: string
  type?: string
  assembly_id?: string
  pagesize?: number
}

export interface HelpInvocation extends BaseInvocation {
  mode: 'help' | 'version' | 'register'
}

export type Invocation =
  | AssemblyInvocation
  | TemplateInvocation
  | BillInvocation
  | NotificationInvocation
  | HelpInvocation

// Command handler type
export type CommandHandler<T extends BaseInvocation = BaseInvocation> = (
  output: IOutputCtl,
  client: Transloadit | undefined,
  invocation: T,
) => void | Promise<void>

// Type guard for Error
export function isError(value: unknown): value is Error {
  return value instanceof Error
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

// Safe array access helper
export function safeGet<T>(arr: T[], index: number): T | undefined {
  return arr[index]
}

// Assert defined helper
export function assertDefined<T>(value: T | undefined | null, message: string): T {
  if (value === undefined || value === null) {
    throw new Error(message)
  }
  return value
}
