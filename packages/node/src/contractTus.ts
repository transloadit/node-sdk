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
    if (responseBody !== null) {
      try {
        await contractIo(() => responseBody.cancel())
      } catch (error) {
        // Received HTTP failure headers still govern recovery and Retry-After when cleanup fails.
        if (response.ok) throw error
      }
    }
    requestSignal.throwIfAborted()
    if (response.redirected || (response.url !== '' && response.url !== url)) invalid()
    if (!response.ok)
      throw new ContractResponseError(
        response.status,
        undefined,
        undefined,
        retryAfterMilliseconds(response.headers.get('retry-after')),
      )
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
    const recover = async (error: unknown): Promise<void> => {
      check()
      if (
        !(error instanceof ContractTransportError) &&
        !(error instanceof DOMException && error.name === 'TimeoutError') &&
        !(
          error instanceof ContractResponseError &&
          (error.status === 409 ||
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
          await recover(error)
        }
      }
    }
    const inspect = (value: unknown): { status: Record<string, unknown>; canWrite: boolean } => {
      const status = record(value)
      check()
      if (status[policy.assembly.identityField] !== input.assemblyId) invalid()
      if (typeof status.error === 'string' && (status.ok === undefined || status.ok === null)) {
        if (!policy.assembly.errorCodes.includes(status.error)) invalid()
        assemblyCode = status.error
      } else {
        if (typeof status.ok !== 'string' || status.error !== undefined) invalid()
        if (policy.assembly.busyCodes.includes(status.ok)) return { status, canWrite: true }
        if (!policy.assembly.terminalOkCodes.includes(status.ok)) invalid()
        assemblyCode = status.ok
      }
      // Receipt proves file transfer, not processing success. Saved sessions can confirm finished
      // bytes after any known stopped state, but that state never authorizes another upload write.
      if (
        session !== undefined &&
        typeof status[policy.assembly.assemblyField] === 'string' &&
        status[policy.assembly.assemblyField] !== '' &&
        typeof status[policy.collectionField] === 'string' &&
        status[policy.collectionField] !== ''
      )
        return { status, canWrite: false }
      throw new Error(`Assembly is not accepting upload writes (${assemblyCode})`)
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
            const receipts = Array.isArray(refreshed.tus_uploads)
              ? refreshed.tus_uploads.filter(
                  (upload: unknown) =>
                    isWorkflowResponse(upload) &&
                    typeof upload.upload_url === 'string' &&
                    URL.canParse(upload.upload_url) &&
                    new URL(upload.upload_url).href === uploadUrl,
                )
              : []
            const receipt: unknown = receipts[0]
            if (
              receipts.length === 1 &&
              isWorkflowResponse(receipt) &&
              admitUrl(receipt.upload_url, policy.head, policy, options) === uploadUrl &&
              receipt.finished === true &&
              receipt.size === size &&
              receipt.offset === size &&
              receipt.filename === filename &&
              receipt.fieldname === fieldname
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
        const entries = (headers.get(wire.headers.metadata) ?? '')
          .split(',')
          .map((entry) => entry.trim().split(' '))
        const metadata = new Map(
          entries.map(([name, value]) => [
            name,
            value === undefined ? '' : Buffer.from(value, 'base64').toString('utf8'),
          ]),
        )
        if (
          metadata.size !== entries.length ||
          Object.entries(expectedMetadata).some(([key, value]) => metadata.get(key) !== value)
        )
          invalid()
        return offset(headers, wire.headers.offset, size)
      }
    }
    let position = await head()
    // This is the observed state; API2 remains responsible for races after status discovery.
    if (position < size && !canWrite)
      throw new Error(`Assembly is not accepting upload writes (${assemblyCode})`)
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
