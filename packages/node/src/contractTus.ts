import type { ContractClientOptions, UploadFile } from './contractTransport.ts'
import type { AssemblyWorkflowPolicy } from './contractWorkflows.ts'

import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

import {
  ContractResponseError,
  ContractTransportError,
  contractIo,
  requestDeadline,
  retryAfterMilliseconds,
} from './contractTransport.ts'
import {
  AssemblyWorkflowTimeoutError,
  admittedWorkflowDestination,
  inspectAssemblyState,
  isWorkflowResponse,
} from './contractWorkflows.ts'

/** Persist privately before sending file bytes. This record contains a secret capability URL. */
export interface AssemblyUploadSession {
  readonly version: 1
  readonly assemblyId: string
  readonly uploadUrl: string
  readonly size: number
  readonly filename: string
  readonly fieldname: string
  readonly sha256: string
}

/** Upload a fixed-size, replayable Blob without buffering the entire file in memory. */
export interface AssemblyUploadOptions {
  readonly assemblyId: string
  readonly file: UploadFile
  readonly fieldname?: string
  /** Bytes per request, from 1 through 64 MiB. Default: 5 MiB. */
  readonly chunkSize?: number
  /** Overall deadline in milliseconds, including hashing and discovery. Default: 300000. */
  readonly timeout?: number
  readonly signal?: AbortSignal
  /** Persist before the first PATCH; an exception stops upload. Use the signal to stop your I/O. */
  readonly onSession?: (session: AssemblyUploadSession, signal: AbortSignal) => void | Promise<void>
  /** Maximum recovery attempts across the whole transfer. Default: 5. Creation never retries. */
  readonly maxRetries?: number
  /** Delay between recovery attempts in milliseconds. Default: 1000. */
  readonly retryDelay?: number
}

/** Resume requires the original bytes, verified against the saved SHA-256 digest. */
export interface ResumeAssemblyUploadOptions extends AssemblyUploadOptions {
  readonly session: AssemblyUploadSession
}

/** A failed transfer may still have received bytes. The session permits explicit later recovery. */
export class AssemblyUploadError extends Error {
  readonly session: AssemblyUploadSession | undefined
  /** Known terminal Assembly code, when status stopped further upload writes. */
  readonly assemblyCode: string | undefined

  constructor(session: AssemblyUploadSession | undefined, cause: unknown, assemblyCode?: string) {
    super('Assembly upload stopped; remote cleanup is not confirmed', { cause })
    this.name = 'AssemblyUploadError'
    this.session = session
    this.assemblyCode = assemblyCode
  }
}

interface TusHeaderRule {
  readonly name: string
  readonly required: boolean
  readonly values?: readonly string[]
  readonly pattern?: string
  readonly minLength?: number
  readonly maxLength?: number
}

/** A generated protocol descriptor; native transport owns no endpoint or header inventory. */
export interface TusOperation {
  readonly method: string
  readonly path: string
  readonly parameters: readonly { readonly name: string }[]
  readonly success: number
  readonly headers: { readonly alternatives: readonly (readonly TusHeaderRule[])[] }
}

/** Portable tus policy mechanically projected from API2's contract. */
export interface TusWorkflowPolicy {
  readonly assembly: AssemblyWorkflowPolicy
  readonly wire: {
    readonly version: string
    readonly headers: {
      readonly resumable: string
      readonly length: string
      readonly offset: string
      readonly contentType: string
      readonly metadata: string
      readonly location: string
    }
    readonly mediaType: string
    readonly filename: string
    readonly fieldname: string
    readonly identity: {
      readonly keyPattern: string
      readonly valuePattern: string
      readonly encoding: 'canonical-base64'
      readonly comparison: 'decoded-bytes'
      readonly duplicateKeys: 'reject'
    }
    readonly receipt: {
      readonly collectionField: string
      readonly fields: {
        readonly filename: string
        readonly fieldname: string
        readonly size: string
        readonly offset: string
        readonly finished: string
        readonly url: string
      }
      readonly finishedValue: true
      readonly matchCount: 1
    }
  }
  readonly collectionField: string
  readonly metadataName: string
  readonly create: TusOperation
  readonly head: TusOperation
  readonly patch: TusOperation
}

function invalid(): never {
  throw new Error('Invalid upload session, protocol response or destination')
}

/** One credential-free protocol request. Only generated workflow bindings call this transport. */
export async function requestTus(
  options: ContractClientOptions,
  operation: TusOperation,
  url: string,
  headers: Readonly<Record<string, string>>,
  body: Blob | undefined,
  signal: AbortSignal,
): Promise<Headers> {
  if (
    !operation.headers.alternatives.some(
      (rules) =>
        Object.keys(headers).every((name) => rules.some((rule) => rule.name === name)) &&
        rules.every((rule) => {
          const value = headers[rule.name]
          if (value === undefined) return !rule.required
          return (
            (rule.values === undefined || rule.values.includes(value)) &&
            (rule.pattern === undefined || new RegExp(rule.pattern, 'u').test(value)) &&
            (rule.minLength === undefined || [...value].length >= rule.minLength) &&
            (rule.maxLength === undefined || [...value].length <= rule.maxLength)
          )
        }),
    )
  )
    invalid()
  const deadline = requestDeadline(signal, options.timeout ?? 60_000)
  const requestSignal = deadline.signal ?? signal
  try {
    const response = await contractIo(() =>
      (options.fetch ?? globalThis.fetch)(url, {
        method: operation.method,
        headers,
        ...(body === undefined ? {} : { body }),
        signal: requestSignal,
        credentials: 'omit',
        redirect: 'error',
      }),
    )
    // No protocol response body is needed. Cancel it even for hostile/unbounded error responses.
    const responseBody = response.body
    let cleanupError: unknown
    if (responseBody !== null) {
      try {
        await contractIo(() => responseBody.cancel())
      } catch (error) {
        // Received HTTP failure headers still govern recovery and Retry-After when cleanup fails.
        if (response.ok) throw error
        cleanupError = error
      }
    }
    // Caller/workflow cancellation wins, but our request timeout cannot erase received failure
    // headers. A cloned body's cleanup can settle only after that timeout aborts the source.
    signal.throwIfAborted()
    if (response.redirected || (response.url !== '' && response.url !== url)) invalid()
    if (!response.ok)
      throw new ContractResponseError(
        response.status,
        undefined,
        undefined,
        retryAfterMilliseconds(response.headers.get('retry-after')),
        requestSignal.aborted ? requestSignal.reason : cleanupError,
      )
    requestSignal.throwIfAborted()
    if (response.status !== operation.success) invalid()
    return response.headers
  } finally {
    deadline.dispose()
  }
}

function admitUrl(
  raw: unknown,
  operation: TusOperation,
  policy: TusWorkflowPolicy,
  options: ContractClientOptions,
): string {
  if (typeof raw !== 'string' || !URL.canParse(raw) || /[\s\\?#]/u.test(raw)) invalid()
  if (raw.split('/').some((part) => part === '.' || part === '..')) invalid()
  const parsed = new URL(raw)
  const candidate = operation.parameters.length === 0 && raw.endsWith('/') ? raw.slice(0, -1) : raw
  let path = operation.path
  if (operation.parameters.length === 1) {
    // These bounded helpers intentionally exclude encoded/nested IDs. Reject before following
    // Location, not by guessing how a different store maps multiple path segments to a resource.
    const parameter = operation.parameters[0]
    if (parameter === undefined) invalid()
    const prefix = path.split(`{${parameter.name}}`)[0]
    const id = parsed.pathname.slice(parsed.pathname.lastIndexOf('/') + 1)
    if (
      !id ||
      id.includes('%') ||
      id === '.' ||
      id === '..' ||
      !parsed.pathname.endsWith(`${prefix}${id}`)
    )
      invalid()
    path = path.replace(`{${parameter.name}}`, id)
  }
  const origin = admittedWorkflowDestination(candidate, path, policy.assembly, options)
  return `${origin}${path}`
}

function offset(headers: Headers, name: string, size: number): number {
  const text = headers.get(name)
  if (text === null || !/^(?:0|[1-9][0-9]*)$/u.test(text)) invalid()
  const value = Number(text)
  if (!Number.isSafeInteger(value) || value > size) invalid()
  return value
}

function record(value: unknown): Record<string, unknown> {
  if (!isWorkflowResponse(value)) invalid()
  return value
}

function verifyUploadMetadata(
  raw: string,
  expected: Readonly<Record<string, string>>,
  policy: TusWorkflowPolicy['wire']['identity'],
): void {
  const keyPattern = new RegExp(policy.keyPattern, 'u')
  const valuePattern = new RegExp(policy.valuePattern, 'u')
  const values = new Map<string, Buffer>()
  for (const entry of raw.split(',')) {
    const separator = entry.indexOf(' ')
    const key = separator === -1 ? entry : entry.slice(0, separator)
    const encoded = separator === -1 ? '' : entry.slice(separator + 1)
    if (
      keyPattern.exec(key)?.[0] !== key ||
      valuePattern.exec(encoded)?.[0] !== encoded ||
      values.has(key)
    )
      invalid()
    const bytes = Buffer.from(encoded, 'base64')
    // Buffer's decoder ignores malformed input; round-trip the serialized value before comparing
    // bytes. UTF-8 replacement decoding must not make a different filename look identical.
    if (bytes.toString('base64') !== encoded) invalid()
    values.set(key, bytes)
  }
  for (const [key, text] of Object.entries(expected)) {
    if (!values.get(key)?.equals(Buffer.from(text, 'utf8'))) invalid()
  }
}

async function persistSession(
  session: AssemblyUploadSession,
  signal: AbortSignal,
  callback: AssemblyUploadOptions['onSession'],
): Promise<void> {
  if (callback === undefined) return
  await new Promise<void>((resolve, reject) => {
    const abort = (): void => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    Promise.resolve()
      .then(() => {
        signal.throwIfAborted()
        return callback(session, signal)
      })
      .then(
        () => {
          signal.removeEventListener('abort', abort)
          resolve()
        },
        (error: unknown) => {
          signal.removeEventListener('abort', abort)
          reject(error)
        },
      )
  })
}

/** Native orchestration over generated discovery and protocol bindings, with no legacy fallback. */
export async function runTusUpload(
  input: AssemblyUploadOptions,
  resume: AssemblyUploadSession | undefined,
  policy: TusWorkflowPolicy,
  options: ContractClientOptions,
  discover: (id: string, signal: AbortSignal) => Promise<unknown>,
  send: (
    kind: 'create' | 'head' | 'patch',
    url: string,
    headers: Readonly<Record<string, string>>,
    body: Blob | undefined,
    signal: AbortSignal,
  ) => Promise<Headers>,
): Promise<AssemblyUploadSession> {
  const timeout = input.timeout ?? 300_000
  const chunkSize = input.chunkSize ?? 5 * 1024 * 1024
  const maxRetries = input.maxRetries ?? 5
  const retryDelay = input.retryDelay ?? 1000
  if (
    !Number.isSafeInteger(timeout) ||
    timeout <= 0 ||
    timeout > 2_147_483_647 ||
    !Number.isSafeInteger(chunkSize) ||
    chunkSize <= 0 ||
    chunkSize > 64 * 1024 * 1024 ||
    !Number.isSafeInteger(maxRetries) ||
    maxRetries < 0 ||
    maxRetries > 100 ||
    !Number.isSafeInteger(retryDelay) ||
    retryDelay < 0 ||
    retryDelay > 2_147_483_647 ||
    !(input.file.data instanceof Blob) ||
    !Number.isSafeInteger(input.file.data.size) ||
    !new RegExp(policy.assembly.pattern, 'u').test(input.assemblyId)
  )
    invalid()
  const size = input.file.data.size
  const blob = input.file.data
  const filename = input.file.filename
  const fieldname = input.fieldname ?? 'file'
  if (!filename || !fieldname || /[\r\n\0]/u.test(filename + fieldname)) invalid()
  let session = resume === undefined ? undefined : Object.freeze({ ...resume })
  let assemblyCode: string | undefined
  const controller = new AbortController()
  const abort = (): void => controller.abort(input.signal?.reason)
  input.signal?.addEventListener('abort', abort, { once: true })
  if (input.signal?.aborted) abort()
  const timer = setTimeout(() => controller.abort(new AssemblyWorkflowTimeoutError()), timeout)
  const deadline = performance.now() + timeout
  const { signal } = controller
  const check = (): void => {
    if (performance.now() >= deadline && !signal.aborted)
      controller.abort(new AssemblyWorkflowTimeoutError())
    signal.throwIfAborted()
  }
  try {
    check()
    const digest = createHash('sha256')
    // Blob slices keep hashing and upload memory bounded. Hashing prevents resuming with another file.
    for (let start = 0; start < size; start += chunkSize) {
      digest.update(new Uint8Array(await blob.slice(start, start + chunkSize).arrayBuffer()))
      check()
    }
    const sha256 = digest.digest('hex')
    if (
      session !== undefined &&
      (session.version !== 1 ||
        session.assemblyId !== input.assemblyId ||
        session.size !== size ||
        session.filename !== filename ||
        session.fieldname !== fieldname ||
        session.sha256 !== sha256)
    )
      invalid()
    if (session !== undefined) admitUrl(session.uploadUrl, policy.head, policy, options)
    let retries = 0
    const recover = async (error: unknown, allowOffsetConflict = true): Promise<void> => {
      check()
      if (
        !(error instanceof ContractTransportError) &&
        !(error instanceof DOMException && error.name === 'TimeoutError') &&
        !(
          error instanceof ContractResponseError &&
          ((allowOffsetConflict && error.status === 409) ||
            error.status === 429 ||
            (error.status >= 500 && error.status <= 599))
        )
      )
        throw error
      if (retries++ >= maxRetries) throw error
      const serverDelay = error instanceof ContractResponseError ? (error.retryAfter ?? 0) : 0
      await delay(Math.min(timeout, Math.max(retryDelay, serverDelay)), undefined, { signal })
      check()
    }
    const discoverStatus = async (): Promise<unknown> => {
      for (;;) {
        check()
        try {
          return await discover(input.assemblyId, signal)
        } catch (error) {
          await recover(error, false)
        }
      }
    }
    const inspect = (value: unknown): { status: Record<string, unknown>; canWrite: boolean } => {
      check()
      const {
        fields: status,
        code,
        kind,
      } = inspectAssemblyState(value, input.assemblyId, policy.assembly)
      if (kind === 'busy') return { status, canWrite: true }
      assemblyCode = code
      // Receipt proves file transfer, not processing success. Saved sessions can confirm finished
      // bytes after any stopped state, but that state never authorizes another upload write.
      if (
        session !== undefined &&
        typeof status[policy.assembly.assemblyField] === 'string' &&
        status[policy.assembly.assemblyField] !== '' &&
        typeof status[policy.collectionField] === 'string' &&
        status[policy.collectionField] !== ''
      )
        return { status, canWrite: false }
      throw new Error('Assembly is not accepting upload writes')
    }
    const { status, canWrite } = inspect(await discoverStatus())
    const ownerPath = policy.assembly.path.replace(
      `{${policy.assembly.parameter}}`,
      input.assemblyId,
    )
    const owner = admittedWorkflowDestination(
      status[policy.assembly.assemblyField],
      ownerPath,
      policy.assembly,
      options,
    )
    const assemblyUrl = `${owner}${ownerPath}`
    const collection = admitUrl(status[policy.collectionField], policy.create, policy, options)
    const wire = policy.wire
    const expectedMetadata = {
      [policy.metadataName]: assemblyUrl,
      [wire.filename]: filename,
      [wire.fieldname]: fieldname,
    }
    const baseHeaders = { [wire.headers.resumable]: wire.version }
    if (session === undefined) {
      const headers = await send(
        'create',
        collection,
        {
          ...baseHeaders,
          [wire.headers.length]: String(size),
          [wire.headers.metadata]: Object.entries(expectedMetadata)
            .map(([key, value]) => `${key} ${Buffer.from(value).toString('base64')}`)
            .join(','),
        },
        undefined,
        signal,
      )
      check()
      if (headers.get(wire.headers.resumable) !== wire.version) invalid()
      const location = headers.get(wire.headers.location)
      if (
        !location ||
        /[\s\\?#]/u.test(location) ||
        /^(?:[a-z][a-z0-9+.-]*:)?\/\/[^/]*%/iu.test(location) ||
        location.split('/').some((part) => /^(?:\.|%2e){1,2}$/iu.test(part))
      )
        invalid()
      const uploadUrl = admitUrl(new URL(location, collection).href, policy.head, policy, options)
      session = Object.freeze({
        version: 1,
        assemblyId: input.assemblyId,
        uploadUrl,
        size,
        filename,
        fieldname,
        sha256,
      })
      await persistSession(session, signal, input.onSession)
      check()
    }
    const uploadUrl = admitUrl(session.uploadUrl, policy.head, policy, options)
    const head = async (): Promise<number> => {
      for (;;) {
        let headers: Headers
        try {
          headers = await send('head', uploadUrl, baseHeaders, undefined, signal)
        } catch (error) {
          if (error instanceof ContractResponseError && error.status === 404) {
            // API2 retains finished tus receipts after temporary files disappear. Never infer
            // receipt from Assembly completion or absence alone, and never recreate the upload.
            const refreshed = inspect(await discoverStatus()).status
            const receiptPolicy = wire.receipt
            const fields = receiptPolicy.fields
            const uploads = refreshed[receiptPolicy.collectionField]
            const receipts = Array.isArray(uploads)
              ? uploads.filter((upload: unknown) => {
                  if (!isWorkflowResponse(upload)) return false
                  // Count only admitted identities. URL normalization alone can make an unsafe
                  // dot-segment spelling look like a second receipt for this exact resource.
                  try {
                    return admitUrl(upload[fields.url], policy.head, policy, options) === uploadUrl
                  } catch {
                    return false
                  }
                })
              : []
            const receipt: unknown = receipts[0]
            if (
              receipts.length === receiptPolicy.matchCount &&
              isWorkflowResponse(receipt) &&
              receipt[fields.finished] === receiptPolicy.finishedValue &&
              receipt[fields.size] === size &&
              receipt[fields.offset] === size &&
              receipt[fields.filename] === filename &&
              receipt[fields.fieldname] === fieldname
            )
              return size
            throw error
          }
          await recover(error)
          continue
        }
        check()
        if (
          headers.get(wire.headers.resumable) !== wire.version ||
          offset(headers, wire.headers.length, size) !== size
        )
          invalid()
        verifyUploadMetadata(
          headers.get(wire.headers.metadata) ?? '',
          expectedMetadata,
          wire.identity,
        )
        return offset(headers, wire.headers.offset, size)
      }
    }
    let position = await head()
    // This is the observed state; API2 remains responsible for races after status discovery.
    if (position < size && !canWrite) throw new Error('Assembly is not accepting upload writes')
    while (position < size) {
      check()
      const end = Math.min(size, position + chunkSize)
      let headers: Headers
      try {
        headers = await send(
          'patch',
          uploadUrl,
          {
            ...baseHeaders,
            [wire.headers.offset]: String(position),
            [wire.headers.contentType]: wire.mediaType,
          },
          blob.slice(position, end),
          signal,
        )
      } catch (error) {
        await recover(error)
        const confirmed = await head()
        if (confirmed < position || confirmed > end) invalid()
        position = confirmed
        continue
      }
      check()
      const next = offset(headers, wire.headers.offset, size)
      // tus acknowledges bytes actually stored, which may be fewer than this request offered.
      if (headers.get(wire.headers.resumable) !== wire.version || next <= position || next > end)
        invalid()
      position = next
    }
    check()
    return session
  } catch (error) {
    throw new AssemblyUploadError(session, signal.aborted ? signal.reason : error, assemblyCode)
  } finally {
    clearTimeout(timer)
    input.signal?.removeEventListener('abort', abort)
  }
}
