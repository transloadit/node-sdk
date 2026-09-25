import { createHmac, randomUUID } from 'node:crypto'

export interface UploadFile {
  readonly data: Blob
  readonly filename: string
}

export interface ContractClientOptions {
  readonly origin?: string
  readonly authentication:
    | {
        readonly kind: 'signed'
        readonly key: string
        readonly secret: string
        readonly algorithm?: string
      }
    | { readonly kind: 'bearer'; readonly token: string }
  /** Trusted transport injection, for tests or application-owned connection configuration. */
  readonly fetch?: typeof fetch
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

  constructor(status: number, data: unknown) {
    super(`API request failed with HTTP ${status}`)
    this.name = 'ContractResponseError'
    this.status = status
    this.data = data
  }
}

/** Native transport for generated ordinary HTTP methods, not arbitrary URLs or capability calls. */
export class ContractTransport {
  #origin: string
  #authentication: ContractClientOptions['authentication']
  #fetch: typeof fetch
  #signing: SigningProfile

  constructor(options: ContractClientOptions, signing: SigningProfile, defaultOrigin: string) {
    const origin = new URL(options.origin ?? defaultOrigin)
    if (
      !['https:', 'http:'].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash
    ) {
      throw new Error(
        'Contract client requires an HTTP(S) origin without credentials, path or query',
      )
    }
    this.#origin = origin.origin
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

  protected async request<Result>(operation: Operation, input: Input): Promise<Result> {
    const target = operation.path.replaceAll(/\{([^}]+)\}/g, (_match: string, name: string) => {
      const value = input.path?.[name]
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
    const url = new URL(target, this.#origin)
    if (url.origin !== this.#origin) throw new Error('Invalid generated request destination')
    const headers = new Headers({ Accept: 'application/json' })
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
      if (Object.hasOwn(params, 'auth'))
        throw new Error('The SDK owns params.auth; configure authentication on the client')
      if (operation.auth.kind === 'api-key' && authentication.kind === 'signed') {
        params.auth = {
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
    const response = await this.#fetch(url, {
      method: operation.method,
      headers,
      ...(body === undefined ? {} : { body }),
      redirect: 'error',
      credentials: 'omit',
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    })
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
    let data: unknown
    try {
      data = JSON.parse(source)
    } catch (error) {
      if (!response.ok) throw new ContractResponseError(response.status, undefined)
      throw new Error('API returned an invalid JSON response', { cause: error })
    }
    if (!response.ok) throw new ContractResponseError(response.status, data)
    // Result is supplied only by generator-owned methods derived from the response contract.
    // Static wire types do not claim client-side validation of every JSON Schema constraint.
    return data as Result
  }
}
