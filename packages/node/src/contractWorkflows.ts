import type { ContractClientOptions } from './contractTransport.ts'

import { setTimeout as delay } from 'node:timers/promises'

import { ContractResponseError, ContractTransportError } from './contractTransport.ts'

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
  readonly cancelableTerminalOkCodes: readonly string[]
  readonly error: { readonly minLength: number }
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

/** Explicit cancellation could not discover an owner for a potentially still-running Assembly. */
export class AssemblyWorkflowUnconfirmedError extends Error {
  readonly code = 'ASSEMBLY_WORKFLOW_UNCONFIRMED'

  constructor() {
    super('Assembly cancellation could not be confirmed; no uploader destination is available')
    this.name = 'AssemblyWorkflowUnconfirmedError'
  }
}

function invalid(): never {
  // Resource URLs are capabilities. Never include raw URLs or response bodies in diagnostics.
  throw new Error('Invalid Assembly workflow response or uploader destination')
}

export function parseWorkflowDestination(value: string): URL {
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
  return admittedWorkflowDestination(value, expectedPath, policy, options)
}

/** Admit an exact producer-owned path without allowing response data to widen trusted origins. */
export function admittedWorkflowDestination(
  value: unknown,
  expectedPath: string,
  policy: AssemblyWorkflowPolicy,
  options: ContractClientOptions,
): string {
  if (typeof value !== 'string' || options.origin === undefined) invalid()
  // The transport validated this caller-owned endpoint. Only an exact match may reuse its proxy
  // prefix/encoding or loopback spelling; response data cannot introduce another prefix.
  if (value === `${options.origin}${expectedPath}`) return options.origin
  // Additional deployment-owned origins received the same transport validation. In particular,
  // exact IPv6 matches are safe here without admitting IPv6 supplied only by an API response.
  for (const origin of options.assemblyOrigins ?? []) {
    if (value === `${origin}${expectedPath}`) return origin
  }
  const url = parseWorkflowDestination(value)
  if (url.pathname !== expectedPath) invalid()
  const entry = new URL(options.origin)
  // A configured proxy path is part of the trusted endpoint, not permission for its bare origin.
  if (
    url.origin === entry.origin &&
    entry.pathname !== '/' &&
    !(options.assemblyOrigins ?? []).includes(url.origin)
  )
    invalid()
  const origins = [entry.origin, ...(options.assemblyOrigins ?? [])]
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

export function isWorkflowResponse(value: unknown): value is Record<string, unknown> {
  // Keep the native canary standalone; this only narrows the few fields needed for lifecycle safety,
  // not a claim to validate the generated response's complete JSON Schema.
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Classify only the source-owned lifecycle fields, not the full response schema. */
export function inspectAssemblyState(
  value: unknown,
  assemblyId: string,
  policy: AssemblyWorkflowPolicy,
): { fields: Record<string, unknown>; code: string; kind: 'busy' | 'terminal' | 'error' } {
  if (!isWorkflowResponse(value) || value[policy.identityField] !== assemblyId) invalid()
  if (typeof value.error === 'string' && (value.ok === undefined || value.ok === null)) {
    if (Array.from(value.error).length < policy.error.minLength) invalid()
    return { fields: value, code: value.error, kind: 'error' }
  }
  if (typeof value.ok !== 'string' || value.error !== undefined) invalid()
  if (policy.terminalOkCodes.includes(value.ok))
    return { fields: value, code: value.ok, kind: 'terminal' }
  if (policy.busyCodes.includes(value.ok)) return { fields: value, code: value.ok, kind: 'busy' }
  return invalid()
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
            !(error instanceof ContractTransportError) &&
            !(error instanceof DOMException && error.name === 'TimeoutError') &&
            !(
              error instanceof ContractResponseError &&
              (error.status === 429 || (error.status >= 500 && error.status <= 599))
            )
          )
            throw error
          // Retry only safe status reads. The overall signal bounds even a very long server hint.
          const serverDelay = error instanceof ContractResponseError ? (error.retryAfter ?? 0) : 0
          await delay(Math.min(timeout, Math.max(interval, serverDelay)), undefined, {
            signal,
          })
        }
      }
    }
    const inspect = (
      value: Result,
      requireCancellation = false,
    ): { terminal: boolean; fields: Record<string, unknown> } => {
      checkDeadline()
      const { fields, code, kind } = inspectAssemblyState(value, input.assemblyId, policy)
      if (kind === 'error') return { terminal: true, fields }
      if (requireCancellation && policy.cancelableTerminalOkCodes.includes(code)) {
        // A failed request is finite for waiters, but an explicit cancel must still reach its owner.
        return { terminal: false, fields }
      }
      return { terminal: kind === 'terminal', fields }
    }
    let result = await read(discover)
    let state = inspect(result, cancel)
    if (state.terminal) return result
    if (
      cancel &&
      typeof state.fields.ok === 'string' &&
      policy.cancelableTerminalOkCodes.includes(state.fields.ok) &&
      (typeof state.fields[policy.assemblyField] !== 'string' ||
        state.fields[policy.assemblyField] === '')
    )
      throw new AssemblyWorkflowUnconfirmedError()
    const origin = admittedOwner(
      state.fields[policy.assemblyField],
      input.assemblyId,
      policy,
      options,
    )
    const owner = bind({ ...options, origin })
    // Cancellation is one attempt, never a retried write. Client finality is not worker quiescence.
    if (cancel) {
      try {
        result = await owner.cancel(signal)
      } catch (error) {
        checkDeadline()
        if (
          !(error instanceof ContractResponseError) &&
          !(error instanceof ContractTransportError) &&
          !(error instanceof DOMException && error.name === 'TimeoutError')
        )
          throw error
        // A DELETE can race completion or lose its reply after it was applied. Confirm through
        // the generated GET, never by casting error data or repeating the cancellation write.
        try {
          const confirmed = await read(owner.read)
          if (inspect(confirmed, true).terminal) return confirmed
        } catch (confirmationError) {
          checkDeadline()
          // Failed reads and unusable confirmations both retain the original DELETE diagnostic.
          throw new AggregateError(
            [error, confirmationError],
            'Assembly cancellation could not be confirmed',
            { cause: error },
          )
        }
        throw error
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
