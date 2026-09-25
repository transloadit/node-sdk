import type { ObjectEntries } from './types/utility.ts'

export type UnknownRecord = Record<PropertyKey, unknown>

/**
 * See https://github.com/microsoft/TypeScript/pull/12253#issuecomment-263132208 for
 * some background on why this exists and why this isn't in TypeScript by default.
 */

/**
 * Create a predicate that narrows an object property to a present value.
 */
export function hasPresentKey<K extends PropertyKey>(key: K) {
  return <T, V>(
    value: T & { [Property in K]?: V | null | undefined },
  ): value is T & { [Property in K]: V } => value[key] !== undefined && value[key] !== null
}

/**
 * Create a predicate that narrows an object property to one exact value.
 */
export function hasValueAtKey<K extends PropertyKey, V>(key: K, expectedValue: V) {
  return <T extends Record<K, unknown>>(value: T): value is T & Record<K, V> =>
    value[key] === expectedValue
}

/** Return whether a value is not undefined. */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

/** Return whether a value is neither null nor undefined. */
// biome-ignore lint/suspicious/noConfusingVoidType: Shared callers filter results from callbacks that may return void.
export function isPresent<T>(value: T | null | undefined | void): value is T {
  return value !== undefined && value !== null
}

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isObjectLike(value: unknown): value is UnknownRecord {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

export function isPlainRecord(value: unknown): value is UnknownRecord {
  return isRecord(value)
}

export function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) {
    return false
  }

  return Object.values(value).every((entry) => typeof entry === 'string')
}

/**
 * Return the enumerable entries of a record except for the requested keys.
 *
 * This intentionally targets data records rather than preserving prototypes, symbols, or property
 * descriptors.
 */
export function omitRecordKeys(
  record: object,
  omittedKeys: readonly PropertyKey[],
): Record<string, unknown> {
  const omitted = new Set(omittedKeys)
  return Object.fromEntries(Object.entries(record).filter(([key]) => !omitted.has(key)))
}

const unsafeRecordPathSegments = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Set a dot-delimited path on a data record, creating missing record segments along the way.
 */
export function setRecordPath(record: object, path: string, value: unknown): void {
  const segments = path.split('.')
  if (segments.some((segment) => segment === '')) {
    throw new Error(`Invalid record path: ${path}`)
  }
  if (segments.some((segment) => unsafeRecordPathSegments.has(segment))) {
    throw new Error(`Unsafe record path: ${path}`)
  }

  if (!isRecord(record)) {
    throw new Error('Expected a data record')
  }

  let current = record
  for (const [index, segment] of segments.entries()) {
    if (index === segments.length - 1) {
      current[segment] = value
      return
    }

    const child = current[segment]
    if (isRecord(child)) {
      current = child
      continue
    }

    const newChild: UnknownRecord = {}
    current[segment] = newChild
    current = newChild
  }
}

function isFlattenable(value: unknown): value is object {
  return (
    Array.isArray(value) ||
    (typeof value === 'object' &&
      value !== null &&
      Object.prototype.toString.call(value) === '[object Object]')
  )
}

/**
 * Flatten nested objects and arrays into delimiter-separated keys.
 *
 * Empty containers and non-plain objects remain leaf values.
 */
export function flattenObject(value: object, delimiter = '.'): Record<string, unknown> {
  const flattened: Record<string, unknown> = {}

  function visit(currentValue: unknown, keyPath: string): void {
    const childEntries = isFlattenable(currentValue) ? Object.entries(currentValue) : []

    if (childEntries.length === 0) {
      flattened[keyPath] = currentValue
      return
    }

    for (const [key, childValue] of childEntries) {
      visit(childValue, keyPath ? `${keyPath}${delimiter}${key}` : key)
    }
  }

  for (const [key, childValue] of Object.entries(value)) {
    visit(childValue, key)
  }

  return flattened
}

export function getRecordProperty(value: unknown, property: PropertyKey): unknown {
  if (!isRecord(value)) {
    return undefined
  }

  return value[property]
}

/** Read a nested property from own data-record keys without traversing arrays or prototypes. */
export function getPropertyByPath(value: unknown, properties: readonly PropertyKey[]): unknown {
  let result = value
  for (const property of properties) {
    if (!isRecord(result) || !Object.hasOwn(result, property)) return undefined
    result = result[property]
  }

  return result
}

export function getNestedRecordProperty(
  value: unknown,
  first: PropertyKey,
  second: PropertyKey,
): unknown {
  return getRecordProperty(getRecordProperty(value, first), second)
}

export function getStringProperty(value: unknown, property: PropertyKey): string | undefined {
  const propertyValue = getRecordProperty(value, property)
  return typeof propertyValue === 'string' ? propertyValue : undefined
}

export function getNestedStringProperty(
  value: unknown,
  first: PropertyKey,
  second: PropertyKey,
): string | undefined {
  const propertyValue = getNestedRecordProperty(value, first, second)
  return typeof propertyValue === 'string' ? propertyValue : undefined
}

export function getNumberProperty(value: unknown, property: PropertyKey): number | undefined {
  const propertyValue = getRecordProperty(value, property)
  return typeof propertyValue === 'number' ? propertyValue : undefined
}

export function getNestedNumberProperty(
  value: unknown,
  first: PropertyKey,
  second: PropertyKey,
): number | undefined {
  const propertyValue = getNestedRecordProperty(value, first, second)
  return typeof propertyValue === 'number' ? propertyValue : undefined
}

/**
 * Returns properly typed entries of an object
 */
export function entries<T extends { [K in keyof T]: T[K] }>(object: T): ObjectEntries<T> {
  // Object.entries loses the relationship between T's keys and values in the standard library.
  return Object.entries(object) as ObjectEntries<T>
}

/**
 * Returns properly typed values of an object
 */
export function values<T extends object>(object: T): T[keyof T][] {
  return Object.values(object)
}

/**
 * Returns properly typed keys of an object
 */
export function keys<T extends object>(object: T): (keyof T)[] {
  return Object.keys(object) as (keyof T)[]
}

type SortPriorities = Record<string, (RegExp | string)[]>

/** Return a shallow object copy with its string keys sorted. */
export function sortObject<T extends Record<string, unknown>>(
  object: T,
  compare?: (firstKey: string, secondKey: string) => number,
): T {
  const sortedEntries = Object.keys(object)
    .sort(compare)
    .map((key) => [key, object[key]])

  // Object.fromEntries cannot express that reordering entries preserves T's keys and values.
  return Object.fromEntries(sortedEntries) as T
}

/**
 * Sort object keys alphabetically while pulling `_` matches forward and pushing other prefixes
 * backward in their configured order.
 */
export function sortObjectByPrio<T extends Record<string, unknown>>(
  object: T,
  priorities: SortPriorities,
): T {
  return sortObject(object, (firstKey, secondKey) => {
    let firstSortableKey = firstKey
    let secondSortableKey = secondKey

    for (const [prefix, matchers] of Object.entries(priorities)) {
      for (const [index, matcher] of matchers.entries()) {
        const modifier = prefix === '_' ? matchers.length - index : index
        const sortablePrefix = prefix.repeat(2 + modifier)
        const matches = (key: string): boolean =>
          matcher instanceof RegExp ? matcher.test(key) : key === matcher

        if (matches(firstSortableKey)) {
          firstSortableKey = `${sortablePrefix}${firstSortableKey}`
        }
        if (matches(secondSortableKey)) {
          secondSortableKey = `${sortablePrefix}${secondSortableKey}`
        }
      }
    }

    return firstSortableKey.localeCompare(secondSortableKey)
  })
}
