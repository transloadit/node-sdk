import type { Entries } from 'type-fest'

export type UnknownRecord = Record<PropertyKey, unknown>

/**
 * See https://github.com/microsoft/TypeScript/pull/12253#issuecomment-263132208 for
 * some background on why this exists and why this isn't in TypeScript by default.
 */

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

export function getRecordProperty(value: unknown, property: PropertyKey): unknown {
  if (!isRecord(value)) {
    return undefined
  }

  return value[property]
}

export function getStringProperty(value: unknown, property: PropertyKey): string | undefined {
  const propertyValue = getRecordProperty(value, property)
  return typeof propertyValue === 'string' ? propertyValue : undefined
}

export function getNumberProperty(value: unknown, property: PropertyKey): number | undefined {
  const propertyValue = getRecordProperty(value, property)
  return typeof propertyValue === 'number' ? propertyValue : undefined
}

/**
 * Returns properly typed entries of an object
 */
export function entries<T extends { [K in keyof T]: T[K] }>(object: T): Entries<T> {
  return Object.entries(object) as Entries<T>
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
