import type { AssemblyStatus, AssemblyStatusMeta } from '@transloadit/types/assemblyStatus'
import type { AssemblyInstructions } from '@transloadit/types/template'
import type { z } from 'zod/v3'

import type { assemblyStatusMetaSchema, assemblyStatusSchema } from '../src/v3/assemblyStatus.ts'
import type { assemblyInstructionsSchema } from '../src/v3/template.ts'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type Assert<T extends true> = T

export type _XPKeywordsTypeCheck = Assert<
  Equal<AssemblyStatusMeta['xp_keywords'], string | number | null | undefined>
>
export type _XPKeywordsInputCheck = Assert<
  Equal<z.input<typeof assemblyStatusMetaSchema>['xp_keywords'], AssemblyStatusMeta['xp_keywords']>
>
export type _XPKeywordsOutputCheck = Assert<
  Equal<z.output<typeof assemblyStatusMetaSchema>['xp_keywords'], AssemblyStatusMeta['xp_keywords']>
>

export type _AssemblyStatusCheck = Assert<
  Equal<AssemblyStatus, z.infer<typeof assemblyStatusSchema>>
>
export type _AssemblyInstructionsCheck = Assert<
  Equal<AssemblyInstructions, z.infer<typeof assemblyInstructionsSchema>>
>
