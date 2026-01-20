import type { AssemblyStatus } from '@transloadit/types/assemblyStatus'
import type { AssemblyInstructions } from '@transloadit/types/template'
import type { z } from 'zod/v4'
import type { assemblyStatusSchema } from '../src/v4/assemblyStatus.ts'
import type { assemblyInstructionsSchema } from '../src/v4/template.ts'

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

type Assert<T extends true> = T

export type _AssemblyStatusCheck = Assert<
  Equal<AssemblyStatus, z.infer<typeof assemblyStatusSchema>>
>
export type _AssemblyInstructionsCheck = Assert<
  Equal<AssemblyInstructions, z.infer<typeof assemblyInstructionsSchema>>
>
