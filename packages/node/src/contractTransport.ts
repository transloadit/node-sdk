import type { ContractSignatureAlgorithm } from './generated-contract/client.ts'

import { createHmac, randomUUID } from 'node:crypto'

export interface UploadFile {
  readonly data: Blob
  readonly filename: string
}

export interface ContractClientOptions {
  readonly origin?: string
  /** Deployment-owned uploader origins. Never populate this list from an API response. */
  readonly assemblyOrigins?: readonly string[]
  readonly authentication:
    | {
        readonly kind: 'signed'
        readonly key: string
        readonly secret: string
        readonly algorithm?: ContractSignatureAlgorithm
      }
    | { readonly kind: 'bearer'; readonly token: string }
  /** Trusted transport injection, for tests or application-owned connection configuration. */
  readonly fetch?: typeof fetch
  readonly timeout?: number
  readonly clientName?: string
}

interface SigningProfile {
  readonly algorithms: readonly string[]
  readonly defaultAlgorithm: string
  readonly digestEncoding: 'hex'
  readonly inputEncoding: 'utf8'
  readonly prefixSeparator: string
  readonly kind: 'hmac'
  readonly signedValue: 'exact-serialized-params'
}

interface Operation {
  readonly id: string
  readonly method: string
  readonly path: string
  readonly rawPathPatterns: Readonly<Record<string, string>>
  readonly pathParameters: readonly { readonly name: string; readonly percentDecode: boolean }[]
  readonly auth:
    | { readonly kind: 'none' | 'basic' }
    | { readonly kind: 'api-key'; readonly bearerBypassesSignature: boolean }
  readonly request:
    | { readonly kind: 'dispatch-only' }
    | { readonly kind: 'form'; readonly mediaType: string }
    | {
        readonly kind: 'normalized-params'
        readonly transport:
          | {
              readonly kind: 'query'
              readonly paramsField: string
              readonly signatureField: string
            }
          | {
              readonly kind: 'form'
              readonly mediaType: string
              readonly paramsField: string
              readonly signatureField: string
            }
      }
}

interface Input {
  readonly path?: Readonly<Record<string, string>>
  readonly params?: object
  readonly body?: object
  readonly files?: Readonly<Record<string, UploadFile>>
  readonly fields?: Readonly<Record<string, string>>
  readonly signal?: AbortSignal
}

/** A bounded error whose message never includes credentials, request URLs or response bodies. */
export class ContractResponseError extends Error {
  readonly status: number
  readonly data: unknown
  /** A recognized public contract code, never arbitrary response text. */
  readonly code: string | undefined
  /** Server-requested delay in milliseconds, when a valid Retry-After header was supplied. */
  readonly retryAfter: number | undefined

  constructor(
    status: number,
    data: unknown,
    knownCodes: ReadonlySet<string> = new Set(),
    retryAfter?: number,
  ) {
    super(`API request failed with HTTP ${status}`)
    this.name = 'ContractResponseError'
    this.status = status
    this.data = data
    this.retryAfter = retryAfter
    this.code =
      typeof data === 'object' &&
      data !== null &&
      !Array.isArray(data) &&
      'error' in data &&
      typeof data.error === 'string' &&
      knownCodes.has(data.error)
        ? data.error
        : undefined
  }
}

function retryAfterMilliseconds(header: string | null): number | undefined {
  if (header === null) return
  const value = header.trim()
  if (/^[0-9]+$/u.test(value)) return Math.min(Number.MAX_SAFE_INTEGER, Number(value) * 1_000)
  if (!/[a-z]/iu.test(value)) return
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined
}

function parseConfiguredEndpoint(value: string): URL {
  const origin = new URL(value)
  if (
    !['https:', 'http:'].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash
  ) {
    throw new Error(
      'Contract client requires an HTTP(S) endpoint without credentials, query or fragment',
    )
  }
  if (origin.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname))
    throw new Error('HTTPS is required except for loopback development endpoints')
  return origin
}

/** Native transport for generated ordinary HTTP methods, not arbitrary URLs or capability calls. */
export class ContractTransport {
  #origin: string
  #basePath: string
  #timeout: number
  #clientName: string | undefined
  #authentication: ContractClientOptions['authentication']
  #fetch: typeof fetch
  #signing: SigningProfile
  #errorCodes: ReadonlySet<string>
  #assemblyOrigins: readonly string[]

  constructor(
    options: ContractClientOptions,
    signing: SigningProfile,
    defaultOrigin: string,
    errorCodes: readonly string[] = [],
  ) {
    this.#errorCodes = new Set(errorCodes)
    this.#assemblyOrigins = (options.assemblyOrigins ?? []).map((value) => {
      const origin = parseConfiguredEndpoint(value)
      if (origin.pathname !== '/')
        throw new Error('Assembly uploader origins cannot include a path')
      return origin.origin
    })
    const origin = parseConfiguredEndpoint(options.origin ?? defaultOrigin)
    this.#origin = origin.origin
    // Normalize only the join boundary; internal proxy path segments remain significant.
    this.#basePath = origin.pathname.replace(/\/+$/, '')
    this.#timeout = options.timeout ?? 60_000
    if (!Number.isSafeInteger(this.#timeout) || this.#timeout < 0)
      throw new Error('Request timeout must be a nonnegative integer')
    this.#clientName = options.clientName
    this.#authentication = { ...options.authentication }
    this.#fetch = options.fetch ?? globalThis.fetch
    this.#signing = { ...signing, algorithms: [...signing.algorithms] }
    if (this.#authentication.kind === 'signed') {
      if (!this.#authentication.key || !this.#authentication.secret)
        throw new Error('Auth Key credentials are required')
      if (
        !this.#signing.algorithms.includes(
          this.#authentication.algorithm ?? this.#signing.defaultAlgorithm,
        )
      )
        throw new Error('Unsupported request signature algorithm')
    } else if (!this.#authentication.token) throw new Error('Bearer token is required')
  }

  /** Snapshot native connection settings for the generated workflow adapter's private owner client. */
  protected workflowOptions(): ContractClientOptions {
    return {
      origin: `${this.#origin}${this.#basePath}`,
      authentication: { ...this.#authentication },
      assemblyOrigins: [...this.#assemblyOrigins],
      fetch: this.#fetch,
      timeout: this.#timeout,
      ...(this.#clientName === undefined ? {} : { clientName: this.#clientName }),
    }
  }

  protected async request<Result>(operation: Operation, input: Input): Promise<Result> {
    const target = operation.path.replaceAll(/\{([^}]+)\}/g, (_match: string, name: string) => {
      const value = input.path?.[name]
      // Only producer-owned, runtime-derived ASCII grammars can opt into a slash-bearing value.
      // There is no endpoint-name or built-in Template inventory in this native transport.
      const rawPattern = operation.rawPathPatterns[name]
      if (
        typeof value === 'string' &&
        rawPattern !== undefined &&
        ![...value].some(
          (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
        ) &&
        new RegExp(rawPattern).test(value)
      )
        return value
      if (
        typeof value !== 'string' ||
        value.length === 0 ||
        value === '.' ||
        value === '..' ||
        [...value].some(
          (character) =>
            character === '/' ||
            character === '\\' ||
            character.charCodeAt(0) < 32 ||
            character.charCodeAt(0) === 127,
        )
      ) {
        throw new Error(`Invalid path parameter: ${name}`)
      }
      return encodeURIComponent(value)
    })
    const url = new URL(`${this.#basePath}${target}`, this.#origin)
    if (url.origin !== this.#origin) throw new Error('Invalid generated request destination')
    const headers = new Headers({ Accept: 'application/json' })
    if (this.#clientName !== undefined) headers.set('Transloadit-Client', this.#clientName)
    const fields = new URLSearchParams()
    const authentication = this.#authentication
    if (operation.auth.kind === 'basic') {
      if (authentication.kind !== 'signed')
        throw new Error('This operation requires Auth Key credentials')
      headers.set(
        'Authorization',
        `Basic ${Buffer.from(`${authentication.key}:${authentication.secret}`).toString('base64')}`,
      )
    } else if (operation.auth.kind === 'api-key' && authentication.kind === 'bearer') {
      if (!operation.auth.bearerBypassesSignature)
        throw new Error('This operation requires signed authentication')
      headers.set('Authorization', `Bearer ${authentication.token}`)
    }
    const request = operation.request
    if (request.kind === 'normalized-params') {
      const params: Record<string, unknown> = { ...input.params }
      let auth: Record<string, unknown> = {}
      if (Object.hasOwn(params, 'auth') && params.auth !== undefined) {
        if (typeof params.auth !== 'object' || params.auth === null || Array.isArray(params.auth))
          throw new Error('Expected auth metadata object')
        auth = { ...params.auth }
        if (Object.hasOwn(auth, 'key') || Object.hasOwn(auth, 'expires'))
          throw new Error('The SDK owns auth credentials; configure authentication on the client')
      }
      if (operation.auth.kind === 'api-key' && authentication.kind === 'signed') {
        params.auth = {
          ...auth,
          key: authentication.key,
          expires: new Date(Date.now() + 300_000).toISOString(),
        }
        params.nonce ??= randomUUID()
      }
      const serialized = JSON.stringify(params)
      fields.set(request.transport.paramsField, serialized)
      if (operation.auth.kind === 'api-key' && authentication.kind === 'signed') {
        const algorithm = authentication.algorithm ?? this.#signing.defaultAlgorithm
        if (!this.#signing.algorithms.includes(algorithm))
          throw new Error('Unsupported request signature algorithm')
        const digest = createHmac(algorithm, authentication.secret)
          .update(serialized, this.#signing.inputEncoding)
          .digest(this.#signing.digestEncoding)
        fields.set(
          request.transport.signatureField,
          `${algorithm}${this.#signing.prefixSeparator}${digest}`,
        )
      }
    } else if (request.kind === 'form') {
      for (const [name, value] of Object.entries(input.body ?? {})) {
        if (value === undefined) continue
        if (typeof value !== 'string') throw new Error(`Expected string form field: ${name}`)
        fields.set(name, value)
      }
    }
    let body: FormData | URLSearchParams | undefined
    if (request.kind === 'normalized-params' && request.transport.kind === 'query') {
      url.search = fields.toString()
    } else if (
      request.kind === 'normalized-params' &&
      request.transport.kind === 'form' &&
      request.transport.mediaType === 'multipart/form-data'
    ) {
      const multipart = new FormData()
      for (const [name, value] of fields) multipart.append(name, value)
      for (const [name, value] of Object.entries(input.fields ?? {})) {
        if (fields.has(name)) throw new Error(`Reserved form field: ${name}`)
        multipart.append(name, value)
      }
      for (const [name, file] of Object.entries(input.files ?? {})) {
        if (fields.has(name) || Object.hasOwn(input.fields ?? {}, name))
          throw new Error(`Duplicate or reserved file field: ${name}`)
        multipart.append(name, file.data, file.filename)
      }
      body = multipart
    } else if (request.kind !== 'dispatch-only') {
      body = fields
    }
    const deadline = this.#timeout === 0 ? undefined : AbortSignal.timeout(this.#timeout)
    const controller =
      input.signal !== undefined && deadline !== undefined ? new AbortController() : undefined
    const abortCaller = (): void => controller?.abort(input.signal?.reason)
    const abortDeadline = (): void => controller?.abort(deadline?.reason)
    if (controller !== undefined) {
      if (input.signal?.aborted) abortCaller()
      else input.signal?.addEventListener('abort', abortCaller, { once: true })
      deadline?.addEventListener('abort', abortDeadline, { once: true })
    }
    const signal =
      input.signal === undefined
        ? deadline
        : deadline === undefined
          ? input.signal
          : controller?.signal
    // This low-level namespace performs one HTTP attempt. Legacy gotRetry/maxRetries policies
    // are not copied across: replay safety for signed writes belongs to a higher-level workflow.
    try {
      const response = await this.#fetch(url, {
        method: operation.method,
        headers,
        ...(body === undefined ? {} : { body }),
        redirect: 'error',
        credentials: 'omit',
        ...(signal === undefined ? {} : { signal }),
      })
      if (response.redirected || (response.url !== '' && response.url !== url.href)) {
        await response.body?.cancel()
        throw new Error('API redirects are not followed')
      }
      // Bound decoded bytes even when Content-Length is absent or compressed on the wire.
      const reader = response.body?.getReader()
      const chunks: Uint8Array[] = []
      let length = 0
      if (reader !== undefined) {
        try {
          for (;;) {
            const chunk = await reader.read()
            if (chunk.done) break
            length += chunk.value.byteLength
            if (length > 128 * 1024 * 1024) {
              await reader.cancel()
              throw new Error('API response exceeds size limit')
            }
            chunks.push(chunk.value)
          }
        } finally {
          reader.releaseLock()
        }
      }
      const source = Buffer.concat(chunks, length).toString('utf8')
      const retryAfter = retryAfterMilliseconds(response.headers.get('retry-after'))
      let data: unknown
      try {
        data = JSON.parse(source)
      } catch (error) {
        if (!response.ok)
          throw new ContractResponseError(response.status, undefined, this.#errorCodes, retryAfter)
        throw new Error('API returned an invalid JSON response', { cause: error })
      }
      if (!response.ok)
        throw new ContractResponseError(response.status, data, this.#errorCodes, retryAfter)
      // Result is supplied only by generator-owned methods derived from the response contract.
      // Static wire types do not claim client-side validation of every JSON Schema constraint.
      return data as Result
    } finally {
      // A workflow can issue many requests with one signal. Older supported Node versions retain
      // composite-signal dependencies; detach our forwarding listeners after every response/error.
      input.signal?.removeEventListener('abort', abortCaller)
      deadline?.removeEventListener('abort', abortDeadline)
    }
  }
}
