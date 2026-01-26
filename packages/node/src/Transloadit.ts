import * as assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { constants, createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'
import type { Readable } from 'node:stream'
import { setTimeout as delay } from 'node:timers/promises'
import { getSignedSmartCdnUrl, signParamsSync } from '@transloadit/utils/node'
import debug from 'debug'
import FormData from 'form-data'
import type { Delays, Headers, OptionsOfJSONResponseBody, RetryOptions } from 'got'
import got, { HTTPError, RequestError } from 'got'
import intoStream, { type Input as IntoStreamInput } from 'into-stream'
import { isReadableStream, isStream } from 'is-stream'
import pMap from 'p-map'
import packageJson from '../package.json' with { type: 'json' }
import type { TransloaditErrorResponseBody } from './ApiError.ts'
import { ApiError } from './ApiError.ts'
import type {
  AssemblyIndex,
  AssemblyIndexItem,
  AssemblyStatus,
} from './alphalib/types/assemblyStatus.ts'
import { assemblyIndexSchema, assemblyStatusSchema } from './alphalib/types/assemblyStatus.ts'
import { zodParseWithContext } from './alphalib/zodParseWithContext.ts'
import type {
  BaseResponse,
  BillResponse,
  CreateAssemblyParams,
  CreateTemplateCredentialParams,
  CreateTemplateParams,
  EditTemplateParams,
  ListAssembliesParams,
  ListedTemplate,
  ListTemplateCredentialsParams,
  ListTemplatesParams,
  OptionalAuthParams,
  PaginationListWithCount,
  ReplayAssemblyNotificationParams,
  ReplayAssemblyNotificationResponse,
  ReplayAssemblyParams,
  ReplayAssemblyResponse,
  TemplateCredentialResponse,
  TemplateCredentialsResponse,
  TemplateResponse,
} from './apiTypes.ts'
import InconsistentResponseError from './InconsistentResponseError.ts'
import PaginationStream from './PaginationStream.ts'
import PollingTimeoutError from './PollingTimeoutError.ts'
import type { Stream } from './tus.ts'
import { sendTusRequest } from './tus.ts'

// See https://github.com/sindresorhus/got/tree/v11.8.6?tab=readme-ov-file#errors
// Expose relevant errors
export {
  HTTPError,
  MaxRedirectsError,
  ParseError,
  ReadError,
  RequestError,
  TimeoutError,
  UploadError,
} from 'got'

export type { AssemblyStatus } from './alphalib/types/assemblyStatus.ts'
export * from './apiTypes.ts'
export { InconsistentResponseError, ApiError }

const log = debug('transloadit')
const logWarn = debug('transloadit:warn')

export interface UploadProgress {
  uploadedBytes?: number | undefined
  totalBytes?: number | undefined
}

const { version } = packageJson

export type AssemblyProgress = (assembly: AssemblyStatus) => void

export interface CreateAssemblyOptions {
  params?: CreateAssemblyParams
  files?: {
    [name: string]: string
  }
  uploads?: {
    [name: string]: Readable | IntoStreamInput
  }
  waitForCompletion?: boolean
  chunkSize?: number
  uploadConcurrency?: number
  timeout?: number
  onUploadProgress?: (uploadProgress: UploadProgress) => void
  onAssemblyProgress?: AssemblyProgress
  assemblyId?: string
  /**
   * Optional AbortSignal to cancel the assembly creation and upload.
   * When aborted, any in-flight HTTP requests and TUS uploads will be cancelled.
   */
  signal?: AbortSignal
}

export interface AwaitAssemblyCompletionOptions {
  onAssemblyProgress?: AssemblyProgress
  timeout?: number
  interval?: number
  startTimeMs?: number
  /**
   * Optional AbortSignal to cancel polling.
   * When aborted, the polling loop will stop and throw an AbortError.
   */
  signal?: AbortSignal
  /**
   * Optional callback invoked before each poll iteration.
   * Return `false` to stop polling early and return the current assembly status.
   * Useful for watch mode where a newer job may supersede the current one.
   */
  onPoll?: () => boolean | undefined
}

export interface SmartCDNUrlOptions {
  /**
   * Workspace slug
   */
  workspace: string
  /**
   * Template slug or template ID
   */
  template: string
  /**
   * Input value that is provided as `${fields.input}` in the template
   */
  input: string
  /**
   * Additional parameters for the URL query string
   */
  urlParams?: Record<string, boolean | number | string | (boolean | number | string)[]>
  /**
   * Expiration timestamp of the signature in milliseconds since UNIX epoch.
   * Defaults to 1 hour from now.
   */
  expiresAt?: number
}

export type Fields = Record<string, string | number>

// A special promise that lets the user immediately get the assembly ID (synchronously before the request is sent)
interface CreateAssemblyPromise extends Promise<AssemblyStatus> {
  assemblyId: string
}

// Not sure if this is still a problem with the API, but throw a special error type so the user can retry if needed
function checkAssemblyUrls(result: AssemblyStatus) {
  if (result.assembly_url == null || result.assembly_ssl_url == null) {
    throw new InconsistentResponseError('Server returned an incomplete assembly response (no URL)')
  }
}

function getHrTimeMs(): number {
  return Number(process.hrtime.bigint() / 1000000n)
}

function checkResult<T>(result: T | { error: string }): asserts result is T {
  // In case server returned a successful HTTP status code, but an `error` in the JSON object
  // This happens sometimes, for example when createAssembly with an invalid file (IMPORT_FILE_ERROR)
  if (
    typeof result === 'object' &&
    result !== null &&
    'error' in result &&
    typeof result.error === 'string'
  ) {
    throw new ApiError({ body: result }) // in this case there is no `cause` because we don't have an HTTPError
  }
}

export interface Options {
  authKey: string
  authSecret: string
  endpoint?: string
  maxRetries?: number
  timeout?: number
  gotRetry?: Partial<RetryOptions>
  validateResponses?: boolean
}

export class Transloadit {
  private _authKey: string

  private _authSecret: string

  private _endpoint: string

  private _maxRetries: number

  private _defaultTimeout: number

  private _gotRetry: Partial<RetryOptions>

  private _lastUsedAssemblyUrl = ''

  private _validateResponses = false

  constructor(opts: Options) {
    if (opts?.authKey == null) {
      throw new Error('Please provide an authKey')
    }

    if (opts.authSecret == null) {
      throw new Error('Please provide an authSecret')
    }

    if (opts.endpoint?.endsWith('/')) {
      throw new Error('Trailing slash in endpoint is not allowed')
    }

    this._authKey = opts.authKey
    this._authSecret = opts.authSecret
    this._endpoint = opts.endpoint || 'https://api2.transloadit.com'
    this._maxRetries = opts.maxRetries != null ? opts.maxRetries : 5
    this._defaultTimeout = opts.timeout != null ? opts.timeout : 60000

    // Passed on to got https://github.com/sindresorhus/got/blob/main/documentation/7-retry.md
    this._gotRetry = opts.gotRetry != null ? opts.gotRetry : { limit: 0 }

    if (opts.validateResponses != null) this._validateResponses = opts.validateResponses
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
  createAssembly(opts: CreateAssemblyOptions = {}): CreateAssemblyPromise {
    const {
      params = {},
      waitForCompletion = false,
      chunkSize: requestedChunkSize = Number.POSITIVE_INFINITY,
      uploadConcurrency = 10,
      timeout = 24 * 60 * 60 * 1000, // 1 day
      onUploadProgress = () => {},
      onAssemblyProgress = () => {},
      files = {},
      uploads = {},
      assemblyId,
      signal,
    } = opts

    // Keep track of how long the request took
    const startTimeMs = getHrTimeMs()

    // Undocumented feature to allow specifying a custom assembly id from the client
    // Not recommended for general use due to security. E.g if the user doesn't provide a cryptographically
    // secure ID, then anyone could access the assembly.
    let effectiveAssemblyId: string
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
        async ([, path]) => access(path, constants.F_OK | constants.R_OK),
        { concurrency: 5 },
      )

      // Convert uploads to streams
      const streamsMap = Object.fromEntries(
        Object.entries(uploads).map(([label, value]) => {
          const isReadable = isReadableStream(value)
          if (!isReadable && isStream(value)) {
            // https://github.com/transloadit/node-sdk/issues/92
            throw new Error(`Upload named "${label}" is not a Readable stream`)
          }

          return [label, isReadableStream(value) ? value : intoStream(value)]
        }),
      )

      // Wrap in object structure (so we can store whether it's a pathless stream or not)
      const allStreamsMap = Object.fromEntries<Stream>(
        Object.entries(streamsMap).map(([label, stream]) => [label, { stream }]),
      )

      // Create streams from files too
      for (const [label, path] of Object.entries(files)) {
        const stream = createReadStream(path)
        allStreamsMap[label] = { stream, path } // File streams have path
      }

      const allStreams = Object.values(allStreamsMap)

      // Pause all streams
      for (const { stream } of allStreams) {
        stream.pause()
      }

      // If any stream emits error, we want to handle this and exit with error.
      // This promise races against createAssemblyAndUpload() below via Promise.race().
      // When createAssemblyAndUpload wins the race, this promise becomes "orphaned" -
      // it's no longer awaited, but stream error handlers remain attached.
      // The no-op catch prevents Node's unhandled rejection warning if a stream
      // errors after the race is already won.
      const streamErrorPromise = new Promise<AssemblyStatus>((_resolve, reject) => {
        for (const { stream } of allStreams) {
          stream.on('error', reject)
        }
      })
      streamErrorPromise.catch(() => {})

      const createAssemblyAndUpload = async () => {
        const result: AssemblyStatus = await this._remoteJson({
          urlSuffix,
          method: 'post',
          timeout: { request: timeout },
          params,
          fields: {
            tus_num_expected_upload_files: allStreams.length,
          },
          signal,
        })
        checkResult(result)

        if (Object.keys(allStreamsMap).length > 0) {
          await sendTusRequest({
            streamsMap: allStreamsMap,
            assembly: result,
            onProgress: onUploadProgress,
            requestedChunkSize,
            uploadConcurrency,
            signal,
          })
        }

        if (!waitForCompletion) return result

        if (result.assembly_id == null) {
          throw new InconsistentResponseError(
            'Server returned an assembly response without an assembly_id after creation',
          )
        }
        const awaitResult = await this.awaitAssemblyCompletion(result.assembly_id, {
          timeout,
          onAssemblyProgress,
          startTimeMs,
          signal,
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
      signal,
      onPoll,
    }: AwaitAssemblyCompletionOptions = {},
  ): Promise<AssemblyStatus> {
    assert.ok(assemblyId)

    let lastResult: AssemblyStatus | undefined

    while (true) {
      // Check if caller wants to stop polling early
      if (onPoll?.() === false && lastResult) {
        return lastResult
      }

      // Check if aborted before making the request
      if (signal?.aborted) {
        throw signal.reason ?? new DOMException('Aborted', 'AbortError')
      }

      const result = await this.getAssembly(assemblyId, { signal })
      lastResult = result

      // If 'ok' is not in result, it implies a terminal state (e.g., error, completed, canceled).
      // If 'ok' is present, then we check if it's one of the non-terminal polling states.
      if (
        !('ok' in result) ||
        (result.ok !== 'ASSEMBLY_UPLOADING' &&
          result.ok !== 'ASSEMBLY_EXECUTING' &&
          // ASSEMBLY_REPLAYING is not a valid 'ok' status for polling, it means it's done replaying.
          // The API does not seem to have an ASSEMBLY_REPLAYING status in the typical polling loop.
          // It's usually a final status from the replay endpoint.
          // For polling, we only care about UPLOADING and EXECUTING.
          // If a replay operation puts it into a pollable state, that state would be EXECUTING.
          result.ok !== 'ASSEMBLY_REPLAYING') // This line might need review based on actual API behavior for replayed assembly polling
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

      // Make the sleep abortable, ensuring listener cleanup to prevent memory leaks
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort)
          resolve()
        }, interval)

        function onAbort() {
          clearTimeout(timeoutId)
          reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'))
        }

        signal?.addEventListener('abort', onAbort, { once: true })
      })
    }
  }

  maybeThrowInconsistentResponseError(message: string) {
    const err = new InconsistentResponseError(message)

    // @TODO, once our schemas have matured, we should remove the option and always throw the error here.
    // But as it stands, schemas are new, and we can't easily update all customer's node-sdks,
    // so there will be a long tail of throws if we enable this now.
    if (this._validateResponses) {
      throw err
    }

    console.error(
      `---\nPlease report this error to Transloadit (support@transloadit.com). We are working on better schemas for our API and this looks like something we do not cover yet: \n\n${err}\nThank you in advance!\n---\n`,
    )
  }

  /**
   * Cancel the assembly
   *
   * @param assemblyId assembly ID
   * @returns after the assembly is deleted
   */
  async cancelAssembly(assemblyId: string): Promise<AssemblyStatus> {
    const { assembly_ssl_url: url } = await this.getAssembly(assemblyId)
    const rawResult = await this._remoteJson<Record<string, unknown>, OptionalAuthParams>({
      url,
      method: 'delete',
    })

    const parsedResult = zodParseWithContext(assemblyStatusSchema, rawResult)

    if (!parsedResult.success) {
      this.maybeThrowInconsistentResponseError(
        `The API responded with data that does not match the expected schema while cancelling Assembly: ${assemblyId}.\n${parsedResult.humanReadable}`,
      )
    }

    checkAssemblyUrls(rawResult as AssemblyStatus)
    return rawResult as AssemblyStatus
  }

  /**
   * Replay an Assembly
   *
   * @param assemblyId of the assembly to replay
   * @param optional params
   * @returns after the replay is started
   */
  async replayAssembly(
    assemblyId: string,
    params: ReplayAssemblyParams = {},
  ): Promise<ReplayAssemblyResponse> {
    const result: ReplayAssemblyResponse = await this._remoteJson({
      urlSuffix: `/assemblies/${assemblyId}/replay`,
      method: 'post',
      ...(Object.keys(params).length > 0 && { params }),
    })
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
    params: ReplayAssemblyNotificationParams = {},
  ): Promise<ReplayAssemblyNotificationResponse> {
    return await this._remoteJson({
      urlSuffix: `/assembly_notifications/${assemblyId}/replay`,
      method: 'post',
      ...(Object.keys(params).length > 0 && { params }),
    })
  }

  /**
   * List all assemblies
   *
   * @param params optional request options
   * @returns list of Assemblies
   */
  async listAssemblies(
    params?: ListAssembliesParams,
  ): Promise<PaginationListWithCount<AssemblyIndexItem>> {
    const rawResponse = await this._remoteJson<
      PaginationListWithCount<Record<string, unknown>>,
      ListAssembliesParams
    >({
      urlSuffix: '/assemblies',
      method: 'get',
      params: params || {},
    })

    if (
      rawResponse == null ||
      typeof rawResponse !== 'object' ||
      !Array.isArray(rawResponse.items)
    ) {
      throw new InconsistentResponseError(
        'API response for listAssemblies is malformed or missing items array',
      )
    }

    const parsedResult = zodParseWithContext(assemblyIndexSchema, rawResponse.items)

    if (!parsedResult.success) {
      this.maybeThrowInconsistentResponseError(
        `API response for listAssemblies contained items that do not match the expected schema.\n${parsedResult.humanReadable}`,
      )
    }

    return {
      items: rawResponse.items as AssemblyIndex,
      count: rawResponse.count,
    }
  }

  streamAssemblies(params: ListAssembliesParams): Readable {
    return new PaginationStream(async (page) => this.listAssemblies({ ...params, page }))
  }

  /**
   * Get an Assembly
   *
   * @param assemblyId the Assembly Id
   * @param options optional request options
   * @returns the retrieved Assembly
   */
  async getAssembly(
    assemblyId: string,
    options?: { signal?: AbortSignal },
  ): Promise<AssemblyStatus> {
    const rawResult = await this._remoteJson<Record<string, unknown>, OptionalAuthParams>({
      urlSuffix: `/assemblies/${assemblyId}`,
      signal: options?.signal,
    })

    const parsedResult = zodParseWithContext(assemblyStatusSchema, rawResult)

    if (!parsedResult.success) {
      this.maybeThrowInconsistentResponseError(
        `The API responded with data that does not match the expected schema while getting Assembly: ${assemblyId}.\n${parsedResult.humanReadable}`,
      )
    }

    checkAssemblyUrls(rawResult as AssemblyStatus)
    return rawResult as AssemblyStatus
  }

  /**
   * Create a Credential
   *
   * @param params optional request options
   * @returns when the Credential is created
   */
  async createTemplateCredential(
    params: CreateTemplateCredentialParams,
  ): Promise<TemplateCredentialResponse> {
    return await this._remoteJson({
      urlSuffix: '/template_credentials',
      method: 'post',
      params: params || {},
    })
  }

  /**
   * Edit a Credential
   *
   * @param credentialId the Credential ID
   * @param params optional request options
   * @returns when the Credential is edited
   */
  async editTemplateCredential(
    credentialId: string,
    params: CreateTemplateCredentialParams,
  ): Promise<TemplateCredentialResponse> {
    return await this._remoteJson({
      urlSuffix: `/template_credentials/${credentialId}`,
      method: 'put',
      params: params || {},
    })
  }

  /**
   * Delete a Credential
   *
   * @param credentialId the Credential ID
   * @returns when the Credential is deleted
   */
  async deleteTemplateCredential(credentialId: string): Promise<BaseResponse> {
    return await this._remoteJson({
      urlSuffix: `/template_credentials/${credentialId}`,
      method: 'delete',
    })
  }

  /**
   * Get a Credential
   *
   * @param credentialId the Credential ID
   * @returns when the Credential is retrieved
   */
  async getTemplateCredential(credentialId: string): Promise<TemplateCredentialResponse> {
    return await this._remoteJson({
      urlSuffix: `/template_credentials/${credentialId}`,
      method: 'get',
    })
  }

  /**
   * List all TemplateCredentials
   *
   * @param params optional request options
   * @returns the list of templates
   */
  async listTemplateCredentials(
    params?: ListTemplateCredentialsParams,
  ): Promise<TemplateCredentialsResponse> {
    return await this._remoteJson({
      urlSuffix: '/template_credentials',
      method: 'get',
      params: params || {},
    })
  }

  streamTemplateCredentials(params: ListTemplateCredentialsParams) {
    return new PaginationStream(async (page) => ({
      items: (await this.listTemplateCredentials({ ...params, page })).credentials,
    }))
  }

  /**
   * Create an Assembly Template
   *
   * @param params optional request options
   * @returns when the template is created
   */
  async createTemplate(params: CreateTemplateParams): Promise<TemplateResponse> {
    return await this._remoteJson({
      urlSuffix: '/templates',
      method: 'post',
      params: params || {},
    })
  }

  /**
   * Edit an Assembly Template
   *
   * @param templateId the template ID
   * @param params optional request options
   * @returns when the template is edited
   */
  async editTemplate(templateId: string, params: EditTemplateParams): Promise<TemplateResponse> {
    return await this._remoteJson({
      urlSuffix: `/templates/${templateId}`,
      method: 'put',
      params: params || {},
    })
  }

  /**
   * Delete an Assembly Template
   *
   * @param templateId the template ID
   * @returns when the template is deleted
   */
  async deleteTemplate(templateId: string): Promise<BaseResponse> {
    return await this._remoteJson({
      urlSuffix: `/templates/${templateId}`,
      method: 'delete',
    })
  }

  /**
   * Get an Assembly Template
   *
   * @param templateId the template ID
   * @returns when the template is retrieved
   */
  async getTemplate(templateId: string): Promise<TemplateResponse> {
    return await this._remoteJson({
      urlSuffix: `/templates/${templateId}`,
      method: 'get',
    })
  }

  /**
   * List all Assembly Templates
   *
   * @param params optional request options
   * @returns the list of templates
   */
  async listTemplates(
    params?: ListTemplatesParams,
  ): Promise<PaginationListWithCount<ListedTemplate>> {
    return await this._remoteJson({
      urlSuffix: '/templates',
      method: 'get',
      params: params || {},
    })
  }

  streamTemplates(params?: ListTemplatesParams): PaginationStream<ListedTemplate> {
    return new PaginationStream(async (page) => this.listTemplates({ ...params, page }))
  }

  /**
   * Get account Billing details for a specific month
   *
   * @param month the date for the required billing in the format yyyy-mm
   * @returns with billing data
   * @see https://transloadit.com/docs/api/bill-date-get/
   */
  async getBill(month: string): Promise<BillResponse> {
    assert.ok(month, 'month is required')
    return await this._remoteJson({
      urlSuffix: `/bill/${month}`,
      method: 'get',
    })
  }

  calcSignature(
    params: OptionalAuthParams,
    algorithm?: string,
  ): { signature: string; params: string } {
    const jsonParams = this._prepareParams(params)
    const signature = this._calcSignature(jsonParams, algorithm)

    return { signature, params: jsonParams }
  }

  /**
   * Construct a signed Smart CDN URL. See https://transloadit.com/docs/topics/signature-authentication/#smart-cdn.
   */
  getSignedSmartCDNUrl(opts: SmartCDNUrlOptions): string {
    return getSignedSmartCdnUrl({
      ...opts,
      authKey: this._authKey,
      authSecret: this._authSecret,
    })
  }

  private _calcSignature(toSign: string, algorithm = 'sha384'): string {
    return signParamsSync(toSign, this._authSecret, algorithm)
  }

  // Sets the multipart/form-data for POST, PUT and DELETE requests, including
  // the streams, the signed params, and any additional fields.
  private _appendForm(form: FormData, params: OptionalAuthParams, fields?: Fields): void {
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
  }

  // Implements HTTP GET query params, handling the case where the url already
  // has params.
  private _appendParamsToUrl(url: string, params: OptionalAuthParams): string {
    const { signature, params: jsonParams } = this.calcSignature(params)

    const prefix = url.indexOf('?') === -1 ? '?' : '&'

    return `${url}${prefix}signature=${signature}&params=${encodeURIComponent(jsonParams)}`
  }

  // Responsible for including auth parameters in all requests
  private _prepareParams(paramsIn?: OptionalAuthParams): string {
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
  private _getExpiresDate(): string {
    const expiresDate = new Date()
    expiresDate.setDate(expiresDate.getDate() + 1)
    return expiresDate.toISOString()
  }

  // Responsible for making API calls. Automatically sends streams with any POST,
  // PUT or DELETE requests. Automatically adds signature parameters to all
  // requests. Also automatically parses the JSON response.
  private async _remoteJson<TRet, TParams extends OptionalAuthParams>(opts: {
    urlSuffix?: string
    url?: string
    timeout?: Delays
    method?: 'delete' | 'get' | 'post' | 'put'
    params?: TParams
    fields?: Fields
    headers?: Headers
    signal?: AbortSignal
  }): Promise<TRet> {
    const {
      urlSuffix,
      url: urlInput,
      timeout = { request: this._defaultTimeout },
      method = 'get',
      params = {},
      fields,
      headers,
      signal,
    } = opts

    // Allow providing either a `urlSuffix` or a full `url`
    if (!urlSuffix && !urlInput) throw new Error('No URL provided')
    let url = urlInput || `${this._endpoint}${urlSuffix}`

    if (method === 'get') {
      url = this._appendParamsToUrl(url, params)
    }

    log('Sending request', method, url)

    // todo use got.retry instead because we are no longer using FormData (which is a stream and can only be used once)
    // https://github.com/sindresorhus/got/issues/1282
    for (let retryCount = 0; ; retryCount++) {
      let form: FormData | undefined

      if (method === 'post' || method === 'put' || method === 'delete') {
        form = new FormData()
        this._appendForm(form, params, fields)
      }

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
        signal,
      }

      try {
        const request = got[method]<TRet>(url, requestOpts)
        const { body } = await request
        // console.log(body)
        return body
      } catch (err) {
        if (!(err instanceof RequestError)) throw err

        if (err instanceof HTTPError) {
          const { statusCode, body } = err.response
          logWarn('HTTP error', statusCode, body)

          // check whether we should retry
          // https://transloadit.com/blog/2012/04/introducing-rate-limiting/
          const retryAfterHeader = err.response?.headers?.['retry-after']
          const retryAfterSeconds =
            typeof retryAfterHeader === 'string' ? Number(retryAfterHeader) : undefined
          const retryInFromInfo =
            typeof body === 'object' &&
            body != null &&
            'info' in body &&
            typeof body.info === 'object' &&
            body.info != null &&
            'retryIn' in body.info &&
            typeof body.info.retryIn === 'number' &&
            body.info.retryIn > 0
              ? body.info.retryIn
              : undefined
          const retryInSec =
            retryInFromInfo ??
            (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0
              ? retryAfterSeconds
              : undefined)
          const shouldRetry =
            retryCount < this._maxRetries && // 413 taken from https://transloadit.com/blog/2012/04/introducing-rate-limiting/
            // todo can 413 be removed?
            ((statusCode === 413 &&
              body &&
              typeof body === 'object' &&
              body.error === 'RATE_LIMIT_REACHED') ||
              statusCode === 429)

          if (shouldRetry) {
            const retryDelaySec = retryInSec ?? 1
            logWarn(
              `Rate limit reached, retrying request in approximately ${retryDelaySec} seconds.`,
            )
            const retryInMs = 1000 * (retryDelaySec * (1 + 0.1 * Math.random()))
            await delay(retryInMs)
            // Retry
          } else {
            throw new ApiError({
              cause: err,
              body: err.response?.body as TransloaditErrorResponseBody | undefined,
            }) // todo don't assert type
          }
        } else {
          throw err
        }
      }
    }
  }
}
