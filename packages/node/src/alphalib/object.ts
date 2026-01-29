import type { Entries } from 'type-fest'

/**
 * See https://github.com/microsoft/TypeScript/pull/12253#issuecomment-263132208 for
 * some background on why this exists and why this isn't in TypeScript by default.
 */

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
