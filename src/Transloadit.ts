import { createHmac, randomUUID } from 'crypto'
import got, { RequiredRetryOptions, Headers, OptionsOfJSONResponseBody } from 'got'
import FormData from 'form-data'
import { constants, createReadStream } from 'fs'
import { access } from 'fs/promises'
import debug from 'debug'
import intoStream from 'into-stream'
import isStream from 'is-stream'
import * as assert from 'assert'
import pMap from 'p-map'
import { InconsistentResponseError } from './InconsistentResponseError'
import { PaginationStream } from './PaginationStream'
import { PollingTimeoutError } from './PollingTimeoutError'
import { TransloaditError } from './TransloaditError'
import { version } from '../package.json'
import { sendTusRequest, Stream } from './tus'

import type { Readable } from 'stream'

// See https://github.com/sindresorhus/got#errors
// Expose relevant errors
export {
  RequestError,
  ReadError,
  ParseError,
  UploadError,
  HTTPError,
  MaxRedirectsError,
  TimeoutError,
} from 'got'
export { InconsistentResponseError }

const log = debug('transloadit')
const logWarn = debug('transloadit:warn')

interface RequestOptions {
  urlSuffix?: string
  url?: string
  timeout?: number
  method?: 'delete' | 'get' | 'post' | 'put'
  params?: KeyVal
  fields?: Record<string, string | number>
  headers?: Headers
}

interface CreateAssemblyPromise extends Promise<Assembly> {
  assemblyId: string
}

function decorateHttpError(err: TransloaditError, body: any): TransloaditError {
  if (!body) return err

  let newMessage = err.message
  let newStack = err.stack

  // Provide a more useful message if there is one
  if (body.message && body.error) newMessage += ` ${body.error}: ${body.message}`
  else if (body.error) newMessage += ` ${body.error}`

  if (body.assembly_ssl_url) newMessage += ` - ${body.assembly_ssl_url}`

  if (typeof err.stack === 'string') {
    const indexOfMessageEnd = err.stack.indexOf(err.message) + err.message.length
    const stacktrace = err.stack.slice(indexOfMessageEnd)
    newStack = `${newMessage}${stacktrace}`
  }

  /* eslint-disable no-param-reassign */
  err.message = newMessage
  err.stack = newStack
  if (body.assembly_id) err.assemblyId = body.assembly_id
  if (body.error) err.transloaditErrorCode = body.error
  /* eslint-enable no-param-reassign */

  return err
}

// Not sure if this is still a problem with the API, but throw a special error type so the user can retry if needed
function checkAssemblyUrls(result: Assembly) {
  if (result.assembly_url == null || result.assembly_ssl_url == null) {
    throw new InconsistentResponseError('Server returned an incomplete assembly response (no URL)')
  }
}

function getHrTimeMs(): number {
  return Number(process.hrtime.bigint() / 1000000n)
}

function checkResult<T>(result: T | { error: string }): asserts result is T {
  // In case server returned a successful HTTP status code, but an `error` in the JSON object
  // This happens sometimes when createAssembly with an invalid file (IMPORT_FILE_ERROR)
  if (
    typeof result === 'object' &&
    result !== null &&
    'error' in result &&
    typeof result.error === 'string'
  ) {
    throw decorateHttpError(new TransloaditError('Error in response', result), result)
  }
}

export declare namespace Transloadit {
  interface Options {
    authKey: string
    authSecret: string
    endpoint?: string
    maxRetries?: number
    timeout?: number
    gotRetry?: RequiredRetryOptions
  }
}

export class Transloadit {
  private _authKey: string
  private _authSecret: string
  private _endpoint: string
  private _maxRetries: number
  private _defaultTimeout: number
  private _gotRetry: RequiredRetryOptions | number
  private _lastUsedAssemblyUrl = ''

  constructor(opts: Transloadit.Options) {
    if (opts?.authKey == null) {
      throw new Error('Please provide an authKey')
    }

    if (opts.authSecret == null) {
      throw new Error('Please provide an authSecret')
    }

    if (opts.endpoint && opts.endpoint.endsWith('/')) {
      throw new Error('Trailing slash in endpoint is not allowed')
    }

    this._authKey = opts.authKey
    this._authSecret = opts.authSecret
    this._endpoint = opts.endpoint || 'https://api2.transloadit.com'
    this._maxRetries = opts.maxRetries != null ? opts.maxRetries : 5
    this._defaultTimeout = opts.timeout != null ? opts.timeout : 60000

    // Passed on to got https://github.com/sindresorhus/got/blob/main/documentation/7-retry.md
    this._gotRetry = opts.gotRetry != null ? opts.gotRetry : 0
  }

  getLastUsedAssemblyUrl(): string {
    return this._lastUsedAssemblyUrl
  }

  setDefaultTimeout(timeout: number): void {
    this._defaultTimeout = timeout
  }

  /**
   * Create an Assembly
   *
   * @param opts assembly options
   */
  createAssembly(opts: CreateAssemblyOptions = {}, arg2?: void): CreateAssemblyPromise {
    // Warn users of old callback API
    if (typeof arg2 === 'function') {
      throw new TypeError(
        'You are trying to send a function as the second argument. This is no longer valid in this version. Please see github README for usage.'
      )
    }

    const {
      params = {},
      waitForCompletion = false,
      isResumable = true,
      chunkSize: requestedChunkSize = Infinity,
      uploadConcurrency = 10,
      timeout = 24 * 60 * 60 * 1000, // 1 day
      onUploadProgress = () => {},
      onAssemblyProgress = () => {},
      files = {},
      uploads = {},
      assemblyId,
    } = opts

    if (!isResumable) {
      process.emitWarning(
        'Parameter value isResumable = false is deprecated. All uploads will be resumable (using TUS) in the future',
        'DeprecationWarning'
      )
    }

    // Keep track of how long the request took
    const startTimeMs = getHrTimeMs()

    // Undocumented feature to allow specifying a custom assembly id from the client
    // Not recommended for general use due to security. E.g if the user doesn't provide a cryptographically
    // secure ID, then anyone could access the assembly.
    let effectiveAssemblyId
    if (assemblyId != null) {
      effectiveAssemblyId = assemblyId
    } else {
      effectiveAssemblyId = randomUUID().replace(/-/g, '')
    }
    const urlSuffix = `/assemblies/${effectiveAssemblyId}`

    // We want to be able to return the promise immediately with custom data
    const promise = (async () => {
      this._lastUsedAssemblyUrl = `${this._endpoint}${urlSuffix}`

      await pMap(
        Object.entries(files),
        // eslint-disable-next-line no-bitwise
        async ([, path]) => access(path, constants.F_OK | constants.R_OK),
        { concurrency: 5 }
      )

      // Convert uploads to streams
      const streamsMap = Object.fromEntries(
        Object.entries(uploads).map(([label, value]) => {
          const isReadable = isStream.readable(value)
          if (!isReadable && isStream(value)) {
            // https://github.com/transloadit/node-sdk/issues/92
            throw new Error(`Upload named "${label}" is not a Readable stream`)
          }

          return [label, isStream.readable(value) ? value : intoStream(value)]
        })
      )

      // Wrap in object structure (so we can know if it's a pathless stream or not)
      const allStreamsMap = Object.fromEntries<Stream>(
        Object.entries(streamsMap).map(([label, stream]) => [label, { stream }])
      )

      // Create streams from files too
      for (const [label, path] of Object.entries(files)) {
        const stream = createReadStream(path)
        allStreamsMap[label] = { stream, path } // File streams have path
      }

      const allStreams = Object.values(allStreamsMap)

      // Pause all streams
      allStreams.forEach(({ stream }) => stream.pause())

      // If any stream emits error, we want to handle this and exit with error
      const streamErrorPromise = new Promise<Assembly>((resolve, reject) => {
        allStreams.forEach(({ stream }) => stream.on('error', reject))
      })

      const createAssemblyAndUpload = async () => {
        const requestOpts: RequestOptions = {
          urlSuffix,
          method: 'post',
          timeout,
          params,
        }

        if (isResumable) {
          requestOpts.fields = {
            tus_num_expected_upload_files: allStreams.length,
          }
        }

        // upload as form multipart or tus?
        const formUploadStreamsMap: Record<string, Stream> = isResumable ? {} : allStreamsMap

        const result = await this._remoteJson<Assembly>(
          requestOpts,
          formUploadStreamsMap,
          onUploadProgress
        )
        checkResult(result)

        if (isResumable && Object.keys(allStreamsMap).length > 0) {
          await sendTusRequest({
            streamsMap: allStreamsMap,
            assembly: result,
            onProgress: onUploadProgress,
            requestedChunkSize,
            uploadConcurrency,
          })
        }

        if (!waitForCompletion) return result
        const awaitResult = await this.awaitAssemblyCompletion(result.assembly_id, {
          timeout,
          onAssemblyProgress,
          startTimeMs,
        })
        checkResult(awaitResult)
        return awaitResult
      }

      return Promise.race([createAssemblyAndUpload(), streamErrorPromise])
    })()

    // This allows the user to use or log the assemblyId even before it has been created for easier debugging
    return Object.assign(promise, { assemblyId: effectiveAssemblyId })
  }

  async awaitAssemblyCompletion(
    assemblyId: string,
    {
      onAssemblyProgress = () => {},
      timeout,
      startTimeMs = getHrTimeMs(),
      interval = 1000,
    }: AwaitAssemblyCompletionOptions = {}
  ): Promise<Assembly> {
    assert.ok(assemblyId)

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await this.getAssembly(assemblyId)

      if (
        result.ok !== 'ASSEMBLY_UPLOADING' &&
        result.ok !== 'ASSEMBLY_EXECUTING' &&
        result.ok !== 'ASSEMBLY_REPLAYING'
      ) {
        return result // Done!
      }

      try {
        onAssemblyProgress(result)
      } catch (err) {
        log('Caught onAssemblyProgress error', err)
      }

      const nowMs = getHrTimeMs()
      if (timeout != null && nowMs - startTimeMs >= timeout) {
        throw new PollingTimeoutError('Polling timed out')
      }
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  /**
   * Cancel the assembly
   *
   * @param assemblyId assembly ID
   * @returns after the assembly is deleted
   */
  async cancelAssembly(assemblyId: string): Promise<Assembly> {
    // You may wonder why do we need to call getAssembly first:
    // If we use the default base URL (instead of the one returned in assembly_url_ssl),
    // the delete call will hang in certain cases
    // See test "should stop the assembly from reaching completion"
    const { assembly_ssl_url: url } = await this.getAssembly(assemblyId)
    const opts: RequestOptions = {
      url,
      // urlSuffix: `/assemblies/${assemblyId}`, // Cannot simply do this, see above
      method: 'delete',
    }

    return this._remoteJson(opts)
  }

  /**
   * Replay an Assembly
   *
   * @param assemblyId of the assembly to replay
   * @param optional params
   * @returns after the replay is started
   */
  async replayAssembly(assemblyId: string, params: KeyVal = {}): Promise<ReplayedAssembly> {
    const requestOpts: RequestOptions = {
      urlSuffix: `/assemblies/${assemblyId}/replay`,
      method: 'post',
    }
    if (Object.keys(params).length > 0) requestOpts.params = params
    const result = await this._remoteJson<ReplayedAssembly>(requestOpts)
    checkResult(result)
    return result
  }

  /**
   * Replay an Assembly notification
   *
   * @param assemblyId of the assembly whose notification to replay
   * @param optional params
   * @returns after the replay is started
   */
  async replayAssemblyNotification(
    assemblyId: string,
    params: KeyVal = {}
  ): Promise<{ ok: string; success: boolean }> {
    const requestOpts: RequestOptions = {
      urlSuffix: `/assembly_notifications/${assemblyId}/replay`,
      method: 'post',
    }
    if (Object.keys(params).length > 0) requestOpts.params = params
    return this._remoteJson(requestOpts)
  }

  /**
   * List all assembly notifications
   *
   * @param params optional request options
   * @returns the list of Assembly notifications
   */
  async listAssemblyNotifications(params: object): Promise<PaginationList<object>> {
    const requestOpts: RequestOptions = {
      urlSuffix: '/assembly_notifications',
      method: 'get',
      params: params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamAssemblyNotifications(params: object): PaginationStream<object> {
    return new PaginationStream(async (page) => this.listAssemblyNotifications({ ...params, page }))
  }

  /**
   * List all assemblies
   *
   * @param params optional request options
   * @returns list of Assemblies
   */
  async listAssemblies(params?: KeyVal): Promise<PaginationList<ListedAssembly>> {
    const requestOpts: RequestOptions = {
      urlSuffix: '/assemblies',
      method: 'get',
      params: params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamAssemblies(params: KeyVal): Readable {
    return new PaginationStream(async (page) => this.listAssemblies({ ...params, page }))
  }

  /**
   * Get an Assembly
   *
   * @param assemblyId the Assembly Id
   * @returns the retrieved Assembly
   */
  async getAssembly(assemblyId: string): Promise<Assembly> {
    const result = await this._remoteJson<Assembly>({
      urlSuffix: `/assemblies/${assemblyId}`,
    })
    checkAssemblyUrls(result)
    return result
  }

  /**
   * Create a Credential
   *
   * @param params optional request options
   * @returns when the Credential is created
   */
  async createTemplateCredential(params: object): Promise<any> {
    const requestOpts: RequestOptions = {
      urlSuffix: '/template_credentials',
      method: 'post',
      params: params || {},
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * Edit a Credential
   *
   * @param credentialId the Credential ID
   * @param params optional request options
   * @returns when the Credential is edited
   */
  async editTemplateCredential(credentialId: string, params: object): Promise<any> {
    const requestOpts: RequestOptions = {
      urlSuffix: `/template_credentials/${credentialId}`,
      method: 'put',
      params: params || {},
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * Delete a Credential
   *
   * @param credentialId the Credential ID
   * @returns when the Credential is deleted
   */
  async deleteTemplateCredential(credentialId: string): Promise<any> {
    const requestOpts: RequestOptions = {
      urlSuffix: `/template_credentials/${credentialId}`,
      method: 'delete',
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * Get a Credential
   *
   * @param credentialId the Credential ID
   * @returns when the Credential is retrieved
   */
  async getTemplateCredential(credentialId: string): Promise<any> {
    const requestOpts: RequestOptions = {
      urlSuffix: `/template_credentials/${credentialId}`,
      method: 'get',
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * List all TemplateCredentials
   *
   * @param params optional request options
   * @returns the list of templates
   */
  async listTemplateCredentials(params?: object): Promise<any> {
    const requestOpts: RequestOptions = {
      urlSuffix: '/template_credentials',
      method: 'get',
      params: params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamTemplateCredentials(params: object): PaginationStream<any> {
    return new PaginationStream(async (page) => this.listTemplateCredentials({ ...params, page }))
  }

  /**
   * Create an Assembly Template
   *
   * @param params optional request options
   * @returns when the template is created
   */
  async createTemplate(params: KeyVal = {}): Promise<TemplateResponse> {
    const requestOpts: RequestOptions = {
      urlSuffix: '/templates',
      method: 'post',
      params: params || {},
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * Edit an Assembly Template
   *
   * @param templateId the template ID
   * @param params optional request options
   * @returns when the template is edited
   */
  async editTemplate(templateId: string, params: KeyVal): Promise<TemplateResponse> {
    const requestOpts: RequestOptions = {
      urlSuffix: `/templates/${templateId}`,
      method: 'put',
      params: params || {},
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * Delete an Assembly Template
   *
   * @param templateId the template ID
   * @returns when the template is deleted
   */
  async deleteTemplate(templateId: string): Promise<{ ok: string; message: string }> {
    const requestOpts: RequestOptions = {
      urlSuffix: `/templates/${templateId}`,
      method: 'delete',
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * Get an Assembly Template
   *
   * @param templateId the template ID
   * @returns when the template is retrieved
   */
  async getTemplate(templateId: string): Promise<TemplateResponse> {
    const requestOpts: RequestOptions = {
      urlSuffix: `/templates/${templateId}`,
      method: 'get',
    }

    return this._remoteJson(requestOpts)
  }

  /**
   * List all Assembly Templates
   *
   * @param params optional request options
   * @returns the list of templates
   */
  async listTemplates(params?: KeyVal): Promise<PaginationList<ListedTemplate>> {
    const requestOpts: RequestOptions = {
      urlSuffix: '/templates',
      method: 'get',
      params: params || {},
    }

    return this._remoteJson(requestOpts)
  }

  streamTemplates(params?: KeyVal): PaginationStream<ListedTemplate> {
    return new PaginationStream(async (page) => this.listTemplates({ ...params, page }))
  }

  /**
   * Get account Billing details for a specific month
   *
   * @param month the date for the required billing in the format yyyy-mm
   * @returns with billing data
   * @see https://transloadit.com/docs/api/bill-date-get/
   */
  async getBill(month: string): Promise<KeyVal> {
    assert.ok(month, 'month is required')
    const requestOpts: RequestOptions = {
      urlSuffix: `/bill/${month}`,
      method: 'get',
    }

    return this._remoteJson(requestOpts)
  }

  calcSignature(params: KeyVal): { signature: string; params: string } {
    const jsonParams = this._prepareParams(params)
    const signature = this._calcSignature(jsonParams)

    return { signature, params: jsonParams }
  }

  private _calcSignature(toSign: string, algorithm = 'sha384'): string {
    return `${algorithm}:${createHmac(algorithm, this._authSecret)
      .update(Buffer.from(toSign, 'utf-8'))
      .digest('hex')}`
  }

  // Sets the multipart/form-data for POST, PUT and DELETE requests, including
  // the streams, the signed params, and any additional fields.
  private _appendForm(
    form: FormData,
    params: KeyVal,
    streamsMap?: Record<string, Stream>,
    fields?: Record<string, string | number>
  ): void {
    const sigData = this.calcSignature(params)
    const jsonParams = sigData.params
    const { signature } = sigData

    form.append('params', jsonParams)

    if (fields != null) {
      for (const [key, val] of Object.entries(fields)) {
        form.append(key, val)
      }
    }

    form.append('signature', signature)

    if (streamsMap) {
      Object.entries(streamsMap).forEach(([label, { stream, path }]) => {
        const options = path ? undefined : { filename: label } // https://github.com/transloadit/node-sdk/issues/86
        form.append(label, stream, options)
      })
    }
  }

  // Implements HTTP GET query params, handling the case where the url already
  // has params.
  private _appendParamsToUrl(url: string, params: KeyVal): string {
    const { signature, params: jsonParams } = this.calcSignature(params)

    const prefix = url.indexOf('?') === -1 ? '?' : '&'

    return `${url}${prefix}signature=${signature}&params=${encodeURIComponent(jsonParams)}`
  }

  // Responsible for including auth parameters in all requests
  private _prepareParams(paramsIn: KeyVal): string {
    let params = paramsIn
    if (params == null) {
      params = {}
    }
    if (params.auth == null) {
      params.auth = {}
    }
    if (params.auth.key == null) {
      params.auth.key = this._authKey
    }
    if (params.auth.expires == null) {
      params.auth.expires = this._getExpiresDate()
    }

    return JSON.stringify(params)
  }

  // We want to mock this method
  // eslint-disable-next-line class-methods-use-this
  private _getExpiresDate(): string {
    const expiresDate = new Date()
    expiresDate.setDate(expiresDate.getDate() + 1)
    return expiresDate.toISOString()
  }

  // Responsible for making API calls. Automatically sends streams with any POST,
  // PUT or DELETE requests. Automatically adds signature parameters to all
  // requests. Also automatically parses the JSON response.
  private async _remoteJson<T>(
    opts: RequestOptions,
    streamsMap?: Record<string, Stream>,
    onProgress: CreateAssemblyOptions['onUploadProgress'] = () => {}
  ): Promise<T> {
    const {
      urlSuffix,
      url: urlInput,
      timeout = this._defaultTimeout,
      method = 'get',
      params = {},
      fields,
      headers,
    } = opts

    // Allow providing either a `urlSuffix` or a full `url`
    if (!urlSuffix && !urlInput) throw new Error('No URL provided')
    let url = urlInput || `${this._endpoint}${urlSuffix}`

    if (method === 'get') {
      url = this._appendParamsToUrl(url, params)
    }

    log('Sending request', method, url)

    // Cannot use got.retry because we are using FormData which is a stream and can only be used once
    // https://github.com/sindresorhus/got/issues/1282
    for (let retryCount = 0; ; retryCount++) {
      let form

      if (method === 'post' || method === 'put' || method === 'delete') {
        form = new FormData()
        this._appendForm(form, params, streamsMap, fields)
      }

      const isUploadingStreams = streamsMap && Object.keys(streamsMap).length > 0

      const requestOpts: OptionsOfJSONResponseBody = {
        retry: this._gotRetry,
        body: form,
        timeout,
        headers: {
          'Transloadit-Client': `node-sdk:${version}`,
          'User-Agent': undefined, // Remove got's user-agent
          ...headers,
        },
        responseType: 'json',
      }

      // For non-file streams transfer encoding does not get set, and the uploaded files will not get accepted
      // https://github.com/transloadit/node-sdk/issues/86
      // https://github.com/form-data/form-data/issues/394#issuecomment-573595015
      if (isUploadingStreams) requestOpts.headers!['transfer-encoding'] = 'chunked'

      try {
        const request = got[method]<T>(url, requestOpts)
        if (isUploadingStreams) {
          request.on('uploadProgress', ({ transferred, total }) =>
            onProgress({ uploadedBytes: transferred, totalBytes: total })
          )
        }
        const { body } = await request
        return body
      } catch (err) {
        if (!(err instanceof got.HTTPError)) throw err

        const { statusCode, body } = err.response
        logWarn('HTTP error', statusCode, body)

        const shouldRetry =
          statusCode === 413 &&
          typeof body === 'object' &&
          body != null &&
          'error' in body &&
          body.error === 'RATE_LIMIT_REACHED' &&
          'info' in body &&
          typeof body.info === 'object' &&
          body.info != null &&
          'retryIn' in body.info &&
          Boolean(body.info.retryIn) &&
          retryCount < this._maxRetries

        // https://transloadit.com/blog/2012/04/introducing-rate-limiting/
        if (!shouldRetry) throw decorateHttpError(err, body)

        const { retryIn: retryInSec } = body.info as { retryIn: number }
        logWarn(`Rate limit reached, retrying request in approximately ${retryInSec} seconds.`)
        const retryInMs = 1000 * (retryInSec * (1 + 0.1 * Math.random()))
        await new Promise((resolve) => setTimeout(resolve, retryInMs))
        // Retry
      }
    }
  }
}

export interface CreateAssemblyOptions {
  params?: CreateAssemblyParams
  files?: {
    [name: string]: string
  }
  uploads?: {
    [name: string]: Readable | intoStream.Input
  }
  waitForCompletion?: boolean
  isResumable?: boolean
  chunkSize?: number
  uploadConcurrency?: number
  timeout?: number
  onUploadProgress?: (uploadProgress: UploadProgress) => void
  onAssemblyProgress?: AssemblyProgress
  assemblyId?: string
}

export type AssemblyProgress = (assembly: Assembly) => void

export interface CreateAssemblyParams {
  /** See https://transloadit.com/docs/topics/assembly-instructions/ */
  steps?: KeyVal
  template_id?: string
  notify_url?: string
  fields?: KeyVal
  allow_steps_override?: boolean
}

// TODO
/** Object with properties. See https://transloadit.com/docs/api/ */
export interface KeyVal {
  [key: string]: any
}

export interface UploadProgress {
  uploadedBytes?: number
  totalBytes?: number
}

/** https://transloadit.com/docs/api/assembly-status-response/#explanation-of-fields */
export interface Assembly {
  ok?: string
  message?: string
  assembly_id: string
  parent_id?: string
  account_id: string
  template_id?: string
  instance: string
  assembly_url: string
  assembly_ssl_url: string
  uppyserver_url: string
  companion_url: string
  websocket_url: string
  tus_url: string
  bytes_received: number
  bytes_expected: number
  upload_duration: number
  client_agent?: string
  client_ip?: string
  client_referer?: string
  transloadit_client: string
  start_date: string
  upload_meta_data_extracted: boolean
  warnings: any[]
  is_infinite: boolean
  has_dupe_jobs: boolean
  execution_start: string
  execution_duration: number
  queue_duration: number
  jobs_queue_duration: number
  notify_start?: any
  notify_url?: string
  notify_status?: any
  notify_response_code?: any
  notify_duration?: any
  last_job_completed?: string
  fields: KeyVal
  running_jobs: any[]
  bytes_usage: number
  executing_jobs: any[]
  started_jobs: string[]
  parent_assembly_status: any
  params: string
  template?: any
  merged_params: string
  uploads: any[]
  results: any
  build_id: string
  error?: string
  stderr?: string
  stdout?: string
  reason?: string
}

/** See https://transloadit.com/docs/api/assemblies-assembly-id-get/ */
export interface ListedAssembly {
  id?: string
  parent_id?: string
  account_id: string
  template_id?: string
  instance: string
  notify_url?: string
  redirect_url?: string
  files: string
  warning_count: number
  execution_duration: number
  execution_start: string
  ok?: string
  error?: string
  created: string
}

export interface ReplayedAssembly {
  ok?: string
  message?: string
  success: boolean
  assembly_id: string
  assembly_url: string
  assembly_ssl_url: string
  notify_url?: string
}

export interface ListedTemplate {
  id: string
  name: string
  encryption_version: number
  require_signature_auth: number
  last_used?: string
  created: string
  modified: string
  content: TemplateContent
}

export interface TemplateResponse {
  ok: string
  message: string
  id: string
  content: TemplateContent
  name: string
  require_signature_auth: number
}

export interface TemplateContent {
  steps: KeyVal
}

export interface AwaitAssemblyCompletionOptions {
  onAssemblyProgress?: AssemblyProgress
  timeout?: number
  interval?: number
  startTimeMs?: number
}

export interface PaginationList<T> {
  count: number
  items: T[]
}
