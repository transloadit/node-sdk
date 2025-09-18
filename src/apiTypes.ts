import type { AssemblyInstructions, AssemblyInstructionsInput } from './alphalib/types/template.ts'

export {
  type AssemblyIndexItem,
  assemblyIndexItemSchema,
  assemblyStatusSchema,
} from './alphalib/types/assemblyStatus.ts'
export { assemblyInstructionsSchema } from './alphalib/types/template.ts'

export interface OptionalAuthParams {
  auth?: { key?: string; expires?: string }
}

// todo make zod schemas for these types in the backend for these too (in alphalib?)
// currently the types are not entirely correct, and probably lacking some props

export interface BaseResponse {
  // todo are these always there? maybe sometimes missing or null
  ok: string // todo should we type the different possible `ok` responses?
  message: string
}

export interface PaginationList<T> {
  items: T[]
}

export interface PaginationListWithCount<T> extends PaginationList<T> {
  count: number
}

// `auth` is not required in the JS API because it can be specified in the constructor,
// and it will then be auto-added before the request
export type CreateAssemblyParams = Omit<AssemblyInstructionsInput, 'auth'> & OptionalAuthParams

export type ListAssembliesParams = OptionalAuthParams & {
  page?: number
  pagesize?: number
  type?: 'all' | 'uploading' | 'executing' | 'canceled' | 'completed' | 'failed' | 'request_aborted'
  fromdate?: string
  todate?: string
  keywords?: string[]
}

export type ReplayAssemblyParams = Pick<
  CreateAssemblyParams,
  'auth' | 'template_id' | 'notify_url' | 'fields'
> & {
  reparse_template?: number
}

export interface ReplayAssemblyResponse extends BaseResponse {
  success: boolean
  assembly_id: string
  assembly_url: string
  assembly_ssl_url: string
  notify_url?: string
}

export type ReplayAssemblyNotificationParams = OptionalAuthParams & {
  notify_url?: string
  wait?: boolean
}

export interface ReplayAssemblyNotificationResponse {
  ok: string
  success: boolean
  notification_id: string
}

export type TemplateContent = Pick<
  CreateAssemblyParams,
  'allow_steps_override' | 'steps' | 'auth' | 'notify_url'
>

export type ResponseTemplateContent = Pick<
  AssemblyInstructions,
  'allow_steps_override' | 'steps' | 'auth' | 'notify_url'
>

export type CreateTemplateParams = OptionalAuthParams & {
  name: string
  template: TemplateContent
  require_signature_auth?: number
}

export type EditTemplateParams = OptionalAuthParams & {
  name?: string
  template?: TemplateContent
  require_signature_auth?: number
}

export type ListTemplatesParams = OptionalAuthParams & {
  page?: number
  pagesize?: number
  sort?: 'id' | 'name' | 'created' | 'modified'
  order?: 'desc' | 'asc'
  fromdate?: string
  todate?: string
  keywords?: string[]
}

interface TemplateResponseBase {
  id: string
  name: string
  content: ResponseTemplateContent
  require_signature_auth: number
}

export interface ListedTemplate extends TemplateResponseBase {
  encryption_version: number
  last_used?: string
  created: string
  modified: string
}

export interface TemplateResponse extends TemplateResponseBase, BaseResponse {}

// todo type this according to api2 valid values for better dx?
export type TemplateCredentialContent = Record<string, string>

export type CreateTemplateCredentialParams = OptionalAuthParams & {
  name: string
  type: string
  content: TemplateCredentialContent
}

export type ListTemplateCredentialsParams = OptionalAuthParams & {
  page?: number
  sort?: string
  order: 'asc' | 'desc'
}

// todo
export interface TemplateCredential {
  id: string
  name: string
  type: string
  content: TemplateCredentialContent
  account_id?: string
  created?: string
  modified?: string
  stringified?: string
}

export interface TemplateCredentialResponse extends BaseResponse {
  credential: TemplateCredential
}

export interface TemplateCredentialsResponse extends BaseResponse {
  credentials: TemplateCredential[]
}

export type BillResponse = unknown // todo
