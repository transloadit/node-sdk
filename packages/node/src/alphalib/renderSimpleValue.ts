import { truncateCodePointsWithEllipsis, truncateStringWithEllipsis } from './truncateString.ts'

/** A safe scalar rendering policy for one customer-visible validation reason. */
export interface SimpleValueReason {
  readonly message: string
  readonly suffix?: string
  readonly value: 'integer-prefix' | 'string' | 'trimmed-string'
}

type SimpleArrayItem = string | number | boolean | bigint | null | Date

function isSimpleArrayItem(value: unknown): value is SimpleArrayItem {
  return (
    value === null ||
    value instanceof Date ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  )
}

function isSimpleValueArray(value: unknown): value is SimpleArrayItem[] {
  return Array.isArray(value) && value.every(isSimpleArrayItem)
}

function renderSimpleArrayItem(value: SimpleArrayItem): string {
  return value === null ? '' : String(value)
}

function* renderSimpleArrayCharacters(
  values: readonly SimpleArrayItem[],
  trim: boolean,
): Generator<string, void, undefined> {
  for (let index = 0; index < values.length; index += 1) {
    if (index > 0) {
      yield ','
    }
    let renderedItem = renderSimpleArrayItem(values[index])
    if (trim && index === 0) {
      renderedItem = renderedItem.trimStart()
    }
    if (trim && index === values.length - 1) {
      renderedItem = renderedItem.trimEnd()
    }
    yield* renderedItem
  }
}

/**
 * Renders a scalar, Date, or flat scalar array without traversing arbitrary objects. Semantic
 * predicates use the complete string; customer-facing reasons use the bounded formatter below.
 */
export function renderSimpleValueAsString(value: unknown): string | undefined {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value)
  }
  if (value === null) {
    return 'null'
  }
  if (value instanceof Date) {
    return Date.prototype.toString.call(value)
  }
  if (isSimpleValueArray(value)) {
    return value.map(renderSimpleArrayItem).join(',')
  }
  return undefined
}

/** Formats a bounded validation reason without traversing or stringifying arbitrary objects. */
export function formatSimpleValueReason(
  reason: SimpleValueReason,
  value: unknown,
  maxCharacters: number,
): string {
  const suffix = reason.suffix ?? ''
  if (reason.value === 'integer-prefix') {
    const renderedValue = renderSimpleValueAsString(value)
    if (renderedValue == null) {
      return `${reason.message}${suffix}`
    }

    const parsedValue = Number.parseInt(renderedValue, 10)
    const normalizedValue = Number.isFinite(parsedValue) ? String(parsedValue) : renderedValue
    if (normalizedValue === '') {
      return `${reason.message}${suffix}`
    }
    return `${reason.message}: ${truncateStringWithEllipsis(normalizedValue, maxCharacters)}${suffix}`
  }

  if (Array.isArray(value)) {
    if (!isSimpleValueArray(value)) {
      return `${reason.message}${suffix}`
    }
    const renderedValue = truncateCodePointsWithEllipsis(
      renderSimpleArrayCharacters(value, reason.value === 'trimmed-string'),
      maxCharacters,
    )
    return renderedValue === ''
      ? `${reason.message}${suffix}`
      : `${reason.message}: ${renderedValue}${suffix}`
  }

  const renderedValue = renderSimpleValueAsString(value)
  if (renderedValue == null) {
    return `${reason.message}${suffix}`
  }

  const normalizedValue = reason.value === 'trimmed-string' ? renderedValue.trim() : renderedValue
  if (normalizedValue === '') {
    return `${reason.message}${suffix}`
  }

  return `${reason.message}: ${truncateStringWithEllipsis(normalizedValue, maxCharacters)}${suffix}`
}
