/** An array of an object's own enumerable entries with typed keys and values. */
export type ObjectEntries<T extends object> =
  T extends Map<infer Key, infer Value>
    ? [Key, Value][]
    : T extends Set<infer Item>
      ? [Item, Item][]
      : T extends readonly unknown[]
        ? [number, T[number]][]
        : T extends object
          ? [keyof T, T[keyof T]][]
          : never

/** A value that may be returned directly or through a promise-like object. */
export type Promisable<T> = T | PromiseLike<T>

type Simplify<T> = { [Key in keyof T]: T[Key] } & {}

type PickIndexSignature<T> = {
  // biome-ignore lint/complexity/noBannedTypes: Empty-object assignability distinguishes index signatures from required keys.
  [Key in keyof T as {} extends Record<Key, unknown> ? Key : never]: T[Key]
}

type OmitIndexSignature<T> = {
  // biome-ignore lint/complexity/noBannedTypes: Empty-object assignability distinguishes index signatures from required keys.
  [Key in keyof T as {} extends Record<Key, unknown> ? never : Key]: T[Key]
}

type SimpleMerge<Destination, Source> = {
  [Key in keyof Destination as Key extends keyof Source ? never : Key]: Destination[Key]
} & Source

/** An object type formed by overwriting destination properties with source properties. */
export type MergeObjects<Destination, Source> = Simplify<
  SimpleMerge<PickIndexSignature<Destination>, PickIndexSignature<Source>> &
    SimpleMerge<OmitIndexSignature<Destination>, OmitIndexSignature<Source>>
>

/** A string literal type with every search occurrence replaced. */
export type StringReplaceAll<
  Input extends string,
  Search extends string,
  Replacement extends string,
  Accumulator extends string = '',
> = Search extends string
  ? Search extends ''
    ? Input
    : Replacement extends string
      ? Input extends `${infer Head}${Search}${infer Tail}`
        ? StringReplaceAll<Tail, Search, Replacement, `${Accumulator}${Head}${Replacement}`>
        : `${Accumulator}${Input}`
      : never
  : never
