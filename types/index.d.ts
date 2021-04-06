// Type definitions for transloadit

import { Readable } from 'stream'
import * as intoStream from 'into-stream'

import { RequestError, ReadError, ParseError, UploadError, HTTPError, MaxRedirectsError, TimeoutError } from 'got'

export default class Transloadit {
  constructor (options: {
    authKey: string;
    authSecret: string;
    endpoint?: string;
    maxRetries?: number;
    timeout?: number;
  })

  setDefaultTimeout(timeout: number): void

  createAssembly(options: {
    params?: CreateAssemblyParams,
    files?: {
      [name: string]: string
    },
    uploads?: {
      [name: string]: Readable | intoStream.Input
    }
    waitForCompletion?: boolean,
    isResumable?: boolean,
    timeout?: number
    onUploadProgress?: (uploadProgress: UploadProgress) => void,
    onAssemblyProgress?: AssemblyProgress,
  }): Promise<Assembly>

  replayAssembly(assemblyId: string, params?: KeyVal): Promise<ReplayedAssembly>
  cancelAssembly(assemblyId: string): Promise<Assembly>
  listAssemblies(params?: KeyVal): Promise<{ count: number, items: ListedAssembly[] }>
  getAssembly(assemblyId: string) : Promise<Assembly>
  streamAssemblies(params?: KeyVal): Readable

  awaitAssemblyCompletion(assemblyId: string, options: {
    onAssemblyProgress?: AssemblyProgress,
    timeout?: number,
    interval?: number,
  }) : Promise<Assembly>

  replayAssemblyNotification(assemblyId: string, params?: KeyVal): Promise<{ ok: string, success: boolean }>
  listAssemblyNotifications(params?: KeyVal): Promise<{ count: number, items: AssemblyNotification[] }>
  streamAssemblyNotifications(params?: KeyVal): Readable

  getLastUsedAssemblyUrl(): string

  createTemplate(params: KeyVal): Promise<TemplateResponse>
  editTemplate(templateId: string, params: KeyVal): Promise<TemplateResponse>
  deleteTemplate(templateId: string): Promise<{ ok: string, message: string }>
  listTemplates(params: KeyVal): Promise<{ count: number, items: ListedTemplate[] }>
  getTemplate(templateId: string): Promise<TemplateResponse>
  streamTemplates(params?: KeyVal): Readable

  /** https://transloadit.com/docs/api/#bill-date-get */
  getBill(month: string): Promise<KeyVal>

  calcSignature(params: KeyVal): { signature: string, params: string }
}

type AssemblyProgress = (assembly: Assembly) => void;

export interface CreateAssemblyParams {
  /** See https://transloadit.com/docs/#assembly-instructions */
  steps?: KeyVal,
  template_id?: string,
  notify_url?: string,
  fields?: KeyVal,
  allow_steps_override?: boolean,
}

// TODO
/** Object with properties. See https://transloadit.com/docs/api/ */
export interface KeyVal {
  [key: string]: any
}

export interface UploadProgress {
  uploadedBytes?: number,
  totalBytes?: number
}

/** https://transloadit.com/docs/api/#explanation-of-fields */
export interface Assembly {
  ok?: string,
  message?: string,
  assembly_id: string,
  parent_id?: string,
  account_id: string,
  template_id?: string,
  instance: string,
  assembly_url: string,
  assembly_ssl_url: string,
  uppyserver_url: string,
  companion_url: string,
  websocket_url: string,
  tus_url: string,
  bytes_received: number,
  bytes_expected: number,
  upload_duration: number,
  client_agent?: string,
  client_ip?: string,
  client_referer?: string,
  transloadit_client: string,
  start_date: string,
  upload_meta_data_extracted: boolean,
  warnings: any[],
  is_infinite: boolean,
  has_dupe_jobs: boolean,
  execution_start: string,
  execution_duration: number,
  queue_duration: number,
  jobs_queue_duration: number,
  notify_start?: any,
  notify_url?: string,
  notify_status?: any,
  notify_response_code?: any,
  notify_duration?: any,
  last_job_completed?: string,
  fields: KeyVal,
  running_jobs: any[],
  bytes_usage: number,
  executing_jobs: any[],
  started_jobs: string[],
  parent_assembly_status: any,
  params: string,
  template?: any,
  merged_params: string,
  uploads: any[],
  results: any,
  build_id: string,
  error?: string,
  stderr?: string,
  stdout?: string,
  reason?: string,
}

/** See https://transloadit.com/docs/api/#assemblies-assembly-id-get */
export interface ListedAssembly {
  id?: string,
  parent_id?: string,
  account_id: string,
  template_id?: string,
  instance: string,
  notify_url?: string,
  redirect_url?: string,
  files: string,
  warning_count: number,
  execution_duration: number,
  execution_start: string,
  ok?: string,
  error?: string,
  created: string
}

export interface ReplayedAssembly {
  ok?: string,
  message?: string,
  success: boolean,
  assembly_id: string,
  assembly_url: string,
  assembly_ssl_url: string,
  notify_url?: string,
}

export interface AssemblyNotification {
  id: string,
  assembly_id: string,
  account_id: string,
  response_code: number,
  response_data?: string,
  url: string,
  duration: number,
  error?: string,
  created: string,
}

export interface ListedTemplate {
  id: string,
  name: string,
  encryption_version: number,
  require_signature_auth: number,
  last_used?: string,
  created: string,
  modified: string,
  content: TemplateContent
}

export interface TemplateResponse {
  ok: string,
  message: string,
  id: string,
  content: TemplateContent,
  name: string,
  require_signature_auth: number,
}

export interface TemplateContent {
  steps: KeyVal,
}

export class InconsistentResponseError extends Error {
}

export {
  RequestError,
  ReadError,
  ParseError,
  UploadError,
  HTTPError,
  MaxRedirectsError,
  TimeoutError,
}
