import { getRecordProperty, isPresent, isRecord } from './object.ts'

export function normalizeError(err: unknown): Error {
  if (err instanceof Error) {
    return err
  }

  return new Error(`Was thrown a non-error: ${String(err)}`, { cause: err })
}

/** Log a normalized terminal error and stop the current CLI process. */
export function exitWithError(error: unknown): never {
  console.error(normalizeError(error))
  process.exit(1)
}

export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

interface ErrorBranchSummary {
  issueCount: number
  messages: string[]
  stackFrames: string[]
}

/** Cycle-safe summary of unique errors and non-error values in one error graph. */
export interface ErrorTreeSummary {
  issueCount: number
  message: string
  stackFrames: string[]
}

function getExpectedErrorStackMessageLines(error: Error): string[] {
  const [firstMessageLine = '', ...remainingMessageLines] = error.message.split('\n')
  const headline =
    error.name === ''
      ? firstMessageLine
      : firstMessageLine === ''
        ? error.name
        : `${error.name}: ${firstMessageLine}`
  return [headline, ...remainingMessageLines]
}

function getStackWithoutMessageDetails(error: Error): string | undefined {
  const { stack } = error
  if (stack === undefined) return

  const lines = stack.split('\n')
  const headline = lines[0]
  if (headline === undefined) return

  const expectedMessageLines = getExpectedErrorStackMessageLines(error)
  const hasExpectedMessage = expectedMessageLines.every(
    (expectedLine, index) => lines[index] === expectedLine,
  )
  if (!hasExpectedMessage) return stack

  return [headline, ...lines.slice(expectedMessageLines.length)].join('\n')
}

function getStackFrameDetails(error: Error): string | undefined {
  const stack = getStackWithoutMessageDetails(error)
  if (stack === undefined) return

  const [expectedHeadline] = getExpectedErrorStackMessageLines(error)
  if (stack === expectedHeadline) return
  return expectedHeadline !== undefined && stack.startsWith(`${expectedHeadline}\n`)
    ? stack.slice(expectedHeadline.length + 1)
    : stack
}

function summarizeErrorBranch(value: unknown, visited: Set<Error>): ErrorBranchSummary | undefined {
  if (!(value instanceof Error)) {
    return { issueCount: 1, messages: [String(value)], stackFrames: [] }
  }
  if (visited.has(value)) return
  visited.add(value)

  const nestedValues =
    value instanceof AggregateError ? value.errors : value.cause == null ? [] : [value.cause]
  const nestedSummaries = nestedValues
    .map((nestedValue) => summarizeErrorBranch(nestedValue, visited))
    .filter(isPresent)
  let nestedIssueCount = 0
  for (const summary of nestedSummaries) {
    nestedIssueCount += summary.issueCount
  }
  const nestedStackFrames = nestedSummaries.flatMap(({ stackFrames }) => stackFrames)
  const ownMessages =
    value instanceof AggregateError
      ? [value.message]
      : [value.name && value.name !== 'Error' ? value.name : '', value.message]
  const ownStack = getStackFrameDetails(value)

  return {
    issueCount: Math.max(1, nestedIssueCount),
    messages: [...ownMessages, ...nestedSummaries.flatMap(({ messages }) => messages)].filter(
      (message) => message !== '',
    ),
    stackFrames: nestedStackFrames.length > 0 ? nestedStackFrames : [ownStack].filter(isPresent),
  }
}

/** Summarize an error graph once, deduplicating shared Error object references by identity. */
export function summarizeErrorTree(errors: readonly unknown[]): ErrorTreeSummary {
  const visited = new Set<Error>()
  const summaries = errors.map((error) => summarizeErrorBranch(error, visited)).filter(isPresent)
  let issueCount = 0
  for (const summary of summaries) {
    issueCount += summary.issueCount
  }

  return {
    issueCount,
    message: summaries.flatMap(({ messages }) => messages).join('\n'),
    stackFrames: summaries.flatMap(({ stackFrames }) => stackFrames),
  }
}

export function getErrorMessageWithCauses(err: unknown): string {
  return summarizeErrorTree([err]).message
}

/** Create one contextual AggregateError from independently collected failures. */
export function createCollectedError(
  errors: readonly Error[],
  context: string,
  includeDetails = false,
): AggregateError {
  const errorTree = summarizeErrorTree(errors)
  const summary = `${context} found ${errorTree.issueCount} ${errorTree.issueCount === 1 ? 'issue' : 'issues'}`
  const message = includeDetails ? [summary, errorTree.message].filter(Boolean).join('\n') : summary
  const aggregateError = new AggregateError(errors, message)
  if (includeDetails) {
    aggregateError.stack = [getStackWithoutMessageDetails(aggregateError), ...errorTree.stackFrames]
      .filter(isPresent)
      .join('\nCollected error:\n')
  }
  return aggregateError
}

/** Throw a contextual AggregateError when at least one collected failure exists. */
export function throwCollectedErrors(
  errors: readonly Error[],
  context: string,
  includeDetails = false,
): void {
  if (errors.length === 0) return

  throw createCollectedError(errors, context, includeDetails)
}

export function getErrorCode(err: unknown): unknown {
  return isRecord(err) && 'code' in err ? err.code : undefined
}

export function getErrorCodeOrValue(err: unknown): unknown {
  return isRecord(err) && 'code' in err ? err.code : err
}

export function getNodeErrorCode(err: unknown): string | undefined {
  const code = getErrorCode(err)
  return typeof code === 'string' ? code : undefined
}

/** Summarize bounded error names and codes without retaining messages, stacks, or response data. */
export function summarizeErrorForDiagnostics(error: unknown): string {
  const pending: unknown[] = [error]
  const seen = new Set<unknown>()
  const reasons: string[] = []

  // Error messages, stacks and response objects can contain credentials.
  for (let index = 0; index < pending.length && index < 8; index += 1) {
    const current = pending[index]
    if (!isRecord(current) || seen.has(current)) continue
    seen.add(current)
    const name =
      typeof current.name === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(current.name)
        ? current.name
        : 'Error'
    const code = getNodeErrorCode(current)
    const reason = code && /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? `${name} (${code})` : name
    if (!reasons.includes(reason)) reasons.push(reason)
    if (current.cause != null) pending.push(current.cause)
    if (current instanceof AggregateError) pending.push(...current.errors.slice(0, 8))
  }

  return (reasons.join(' → ') || 'UnknownError').slice(0, 220)
}

export function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return isRecord(err) && 'code' in err
}

export function getErrorProperty(err: unknown, property: PropertyKey): unknown {
  return getRecordProperty(err, property)
}
