import { z } from 'zod'

const exampleSchema = z.object({
  // TODO: replace with a real schema export once @transloadit/zod/v3 exists.
})

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false

type Assert<T extends true> = T

// TODO: replace GeneratedExample with a real type from @transloadit/types.
// import type * as Types from '@transloadit/types'
// type GeneratedExample = Types.Example
type GeneratedExample = z.infer<typeof exampleSchema>

export type _ExampleCheck = Assert<Equal<GeneratedExample, z.infer<typeof exampleSchema>>>

export { exampleSchema }
