import { getRecordProperty, isRecord } from './object.ts'

export function normalizeError(err: unknown): Error {
  if (err instanceof Error) {
    return err
  }

  return new Error(`Was thrown a non-error: ${String(err)}`, { cause: err })
}

export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function getErrorMessageWithCauses(err: unknown): string {
  if (err instanceof AggregateError) {
    return [err.message, ...err.errors.map((error) => getErrorMessageWithCauses(error))]
      .filter(Boolean)
      .join('\n')
  }

  if (err instanceof Error) {
    const cause = 'cause' in err ? err.cause : undefined
    const name = err.name && err.name !== 'Error' ? err.name : ''
    return [name, err.message, cause == null ? '' : getErrorMessageWithCauses(cause)]
      .filter(Boolean)
      .join('\n')
  }

  return String(err)
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

export function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return isRecord(err) && 'code' in err
}

export function getErrorProperty(err: unknown, property: PropertyKey): unknown {
  return getRecordProperty(err, property)
}
