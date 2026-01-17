import type { AssemblyStatus } from '@transloadit/types/assemblyStatus'
import type { AssemblyInstructions } from '@transloadit/types/template'
import type { z } from 'zod/v3'
import type { assemblyStatusSchema } from '../src/v3/assemblyStatus.js'
import type { assemblyInstructionsSchema } from '../src/v3/template.js'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type Assert<T extends true> = T

export type _AssemblyStatusCheck = Assert<
  Equal<AssemblyStatus, z.infer<typeof assemblyStatusSchema>>
>
export type _AssemblyInstructionsCheck = Assert<
  Equal<AssemblyInstructions, z.infer<typeof assemblyInstructionsSchema>>
>
