import type { ContractClientOptions } from './contractTransport.ts'

import { setTimeout as delay } from 'node:timers/promises'

import { ContractResponseError } from './contractTransport.ts'

/** A bounded wait for any terminal Assembly status, not just successful processing. */
export interface AssemblyWorkflowOptions {
  readonly assemblyId: string
  /** Overall deadline in milliseconds, including discovery and in-flight requests. Default: 300000. */
  readonly timeout?: number
  /** Delay between status requests in milliseconds. Default: 1000. */
  readonly interval?: number
  readonly signal?: AbortSignal
}

/** Portable facts emitted from API2's lifecycle owners and existing capability policy. */
export interface AssemblyWorkflowPolicy {
  readonly busyCodes: readonly string[]
  readonly terminalOkCodes: readonly string[]
  readonly errorCodes: readonly string[]
  readonly publicHostPattern: string
  readonly rejectedHostPrefixes: readonly string[]
  readonly identityField: string
  readonly assemblyField: string
  readonly path: string
  readonly parameter: string
  readonly pattern: string
}

/** Waiting stopped without proving that the remote Assembly reached a terminal state. */
export class AssemblyWorkflowTimeoutError extends Error {
  readonly code = 'ASSEMBLY_WORKFLOW_TIMED_OUT'

  constructor() {
    super('Assembly workflow deadline exceeded; remote completion is not confirmed')
    this.name = 'AssemblyWorkflowTimeoutError'
  }
}

function invalid(): never {
  // Resource URLs are capabilities. Never include raw URLs or response bodies in diagnostics.
  throw new Error('Invalid Assembly workflow response or uploader destination')
}

function parseDestination(value: string): URL {
  // Reject ambiguous spellings before URL parsing can normalize them. Assembly routes use raw,
  // portable IDs, so encoded path/host bytes are unnecessary here and deliberately inadmissible.
  const authority = /^https?:\/\/([a-z0-9.-]+(?::[0-9]+)?)(?:\/[^?#]*)?$/iu.exec(value)?.[1]
  if (
    authority === undefined ||
    /[\s\\%]/u.test(value) ||
    [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  )
    invalid()
  const hostname = authority.split(':')[0].toLowerCase()
  if (hostname.endsWith('.') || hostname.split('.').some((part) => part.startsWith('xn--')))
    invalid()
  const parsed = URL.canParse(value) ? new URL(value) : undefined
  if (
    parsed === undefined ||
    parsed.hostname !== hostname ||
    (parsed.protocol !== 'https:' &&
      !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(hostname)))
  )
    invalid()
  if (value.split('/').some((part) => part === '.' || part === '..')) invalid()
  return parsed
}

function admittedOwner(
  value: unknown,
  assemblyId: string,
  policy: AssemblyWorkflowPolicy,
  options: ContractClientOptions,
): string {
  if (typeof value !== 'string' || options.origin === undefined) invalid()
  const expectedPath = policy.path.replace(`{${policy.parameter}}`, assemblyId)
  // The transport validated this caller-owned endpoint. Only an exact match may reuse its proxy
  // prefix/encoding or loopback spelling; response data cannot introduce another prefix.
  if (value === `${options.origin}${expectedPath}`) return options.origin
  const url = parseDestination(value)
  if (url.pathname !== expectedPath) invalid()
  const origins = [new URL(options.origin).origin]
  for (const origin of options.assemblyOrigins ?? []) {
    const parsed = parseDestination(origin)
    if (parsed.pathname !== '/') invalid()
    origins.push(parsed.origin)
  }
  if (
    !origins.includes(url.origin) &&
    !(
      url.protocol === 'https:' &&
      url.port === '' &&
      !policy.rejectedHostPrefixes.some((prefix) => url.hostname.startsWith(prefix)) &&
      new RegExp(policy.publicHostPattern, 'u').test(url.hostname)
    )
  )
    invalid()
  return url.origin
}

function isResponse(value: unknown): value is Record<string, unknown> {
  // Keep the native canary standalone; this only narrows the few fields needed for lifecycle safety,
  // not a claim to validate the generated response's complete JSON Schema.
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Orchestrate only generated operation callbacks; no legacy SDK calls or HTTP route inventory. */
export async function runAssemblyWorkflow<Result>(
  input: AssemblyWorkflowOptions,
  cancel: boolean,
  policy: AssemblyWorkflowPolicy,
  options: ContractClientOptions,
  discover: (signal: AbortSignal) => Promise<Result>,
  bind: (options: ContractClientOptions) => {
    read: (signal: AbortSignal) => Promise<Result>
    cancel: (signal: AbortSignal) => Promise<Result>
  },
): Promise<Result> {
  const timeout = input.timeout ?? 300_000
  const interval = input.interval ?? 1_000
  if (
    !Number.isSafeInteger(timeout) ||
    timeout <= 0 ||
    timeout > 2_147_483_647 ||
    !Number.isSafeInteger(interval) ||
    interval <= 0 ||
    interval > 2_147_483_647
  )
    throw new Error('Workflow timeout and interval must be positive timer-safe integers')
  if (!new RegExp(policy.pattern, 'u').test(input.assemblyId)) invalid()
  input.signal?.throwIfAborted()
  const controller = new AbortController()
  const abort = (): void => controller.abort(input.signal?.reason)
  input.signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => controller.abort(new AssemblyWorkflowTimeoutError()), timeout)
  const deadline = performance.now() + timeout
  const { signal } = controller
  try {
    const checkDeadline = (): void => {
      if (performance.now() >= deadline && !signal.aborted)
        controller.abort(new AssemblyWorkflowTimeoutError())
      signal.throwIfAborted()
    }
    const read = async (request: (signal: AbortSignal) => Promise<Result>): Promise<Result> => {
      for (;;) {
        checkDeadline()
        try {
          return await request(signal)
        } catch (error) {
          if (
            !(error instanceof ContractResponseError) ||
            !(error.status === 429 || (error.status >= 500 && error.status <= 599))
          )
            throw error
          // Retry only safe status reads. The overall signal bounds even a very long server hint.
          await delay(Math.min(timeout, Math.max(interval, error.retryAfter ?? 0)), undefined, {
            signal,
          })
        }
      }
    }
    const inspect = (value: Result): { terminal: boolean; fields: Record<string, unknown> } => {
      checkDeadline()
      if (!isResponse(value) || value[policy.identityField] !== input.assemblyId) invalid()
      const fields = value
      if (typeof fields.error === 'string' && fields.ok === undefined) {
        if (!policy.errorCodes.includes(fields.error)) invalid()
        return { terminal: true, fields }
      }
      if (typeof fields.ok !== 'string' || fields.error !== undefined) invalid()
      if (policy.terminalOkCodes.includes(fields.ok)) return { terminal: true, fields }
      if (!policy.busyCodes.includes(fields.ok)) invalid()
      return { terminal: false, fields }
    }
    let result = await read(discover)
    let state = inspect(result)
    if (state.terminal) return result
    const origin = admittedOwner(
      state.fields[policy.assemblyField],
      input.assemblyId,
      policy,
      options,
    )
    const owner = bind({ ...options, origin })
    // Cancellation is one attempt, never a retried write. An active reply is not cleanup proof.
    if (cancel) {
      try {
        result = await owner.cancel(signal)
      } catch (error) {
        if (!(error instanceof ContractResponseError)) throw error
        // An Assembly can fail/expire between discovery and DELETE. Confirm through the generated
        // GET instead of casting arbitrary HTTP-error data to a result or retrying the write.
        const confirmed = await read(owner.read)
        if (!inspect(confirmed).terminal) throw error
        return confirmed
      }
      state = inspect(result)
    }
    for (;;) {
      if (state.terminal) return result
      // A live response cannot silently move the retained capability to another destination.
      if (
        admittedOwner(state.fields[policy.assemblyField], input.assemblyId, policy, options) !==
        origin
      )
        invalid()
      await delay(interval, undefined, { signal })
      checkDeadline()
      result = await read(owner.read)
      state = inspect(result)
    }
  } catch (error) {
    // Timer helpers wrap aborts; preserve the caller's reason and our overall-deadline identity.
    if (signal.aborted) throw signal.reason
    throw error
  } finally {
    clearTimeout(timer)
    input.signal?.removeEventListener('abort', abort)
  }
}
